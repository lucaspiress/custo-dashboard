import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { baixarBlob } from '../lib/format'
import type { AnaliseUpload } from '../lib/types'
import { construirRotaProjeto, ROTAS_CANONICAS } from '../lib/routes'
import VisaoGeralTab from '../components/tabs/VisaoGeralTab'
import CustosTab from '../components/tabs/CustosTab'
import PaybackTab from '../components/tabs/PaybackTab'
import InsightsTab from '../components/tabs/InsightsTab'
import ComparativoTab from '../components/tabs/ComparativoTab'
import UsuariosTab from '../components/tabs/UsuariosTab'
import { DashboardCarregando } from '../components/ProjetoLoading'
import AppShell from '../components/AppShell'
import Botao from '../components/ui/Botao'

const ABAS_PADRAO = ['Visão Geral', 'Custos', 'Payback', 'Insights', 'Comparativo']

const ICONE_PDF = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></svg>)
const ICONE_XLSX = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /></svg>)
const ICONE_PLANILHA = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /></svg>)
const ICONE_DASHBOARD = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>)

const ICONES_ABAS: Record<string, ReactNode> = {
  'Visão Geral': (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  Custos: (<><circle cx="12" cy="12" r="9" /><path d="M12 6v12" /><path d="M15.5 9.5c0-1.2-1.6-2-3.5-2s-3.5.8-3.5 2 1.6 2 3.5 2 3.5.8 3.5 2-1.6 2-3.5 2-3.5-.8-3.5-2" /></>),
  Payback: (<><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></>),
  Insights: (<><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.8.7 1.3 1.6 1.5 2.5h5c.2-.9.7-1.8 1.5-2.5A6 6 0 0 0 12 3z" /></>),
  Comparativo: (<><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20V7" /></>),
  Usuários: (<><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
}

interface DashboardPageProps {
  abaInicial?: string
}

export function obterRotasDashboard(projetoId: number) {
  const rotaProjetos = ROTAS_CANONICAS.projetos
  return {
    dados: construirRotaProjeto(ROTAS_CANONICAS.projetoDados, projetoId) ?? rotaProjetos,
    datasets: construirRotaProjeto(ROTAS_CANONICAS.projetoDatasets, projetoId) ?? rotaProjetos,
    dashboards: construirRotaProjeto(ROTAS_CANONICAS.projetoDashboards, projetoId) ?? rotaProjetos,
  }
}

export function geracaoDashboardAtiva(cancelado: boolean, geracao: number, geracaoAtual: number): boolean {
  return !cancelado && geracao === geracaoAtual
}

export default function DashboardPage({ abaInicial = 'Visão Geral' }: DashboardPageProps) {
  const { id } = useParams<{ id: string }>()
  const projetoId = Number(id)
  const rotas = obterRotasDashboard(projetoId)
  const { usuario } = useAuth()
  const [analise, setAnalise] = useState<AnaliseUpload | null>(null)
  const [localNome, setLocalNome] = useState<string | null>(null)
  const [aba, setAba] = useState(abaInicial)
  const [categoriasFiltro, setCategoriasFiltro] = useState<string[]>([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [projetoRenderizadoId, setProjetoRenderizadoId] = useState<number | null>(null)
  const geracaoRotaRef = useRef(0)
  const geracaoDaRenderizacao = geracaoRotaRef.current

  const abas = usuario?.papel === 'admin' ? [...ABAS_PADRAO, 'Usuários'] : ABAS_PADRAO
  const usuariosSelecionados = aba === 'Usuários' && usuario?.papel === 'admin'

  const local = analise?.locais.find((l) => l.nome === localNome) ?? analise?.locais[0] ?? null

  const categorias = useMemo(
    () => (local ? Array.from(new Set(local.itens.map((i) => i.categoria))).sort() : []),
    [local]
  )

  useEffect(() => {
    let cancelado = false
    const geracao = ++geracaoRotaRef.current
    const aindaAtiva = () => geracaoDashboardAtiva(cancelado, geracao, geracaoRotaRef.current)

    setAnalise(null)
    setLocalNome(null)
    setCategoriasFiltro([])
    setProjetoRenderizadoId(null)
    setCarregando(true)
    setErro('')
    async function carregarProjeto() {
      try {
        const dados = await api.get<AnaliseUpload>(`/api/projetos/${projetoId}`)
        if (!aindaAtiva()) return
        setAnalise(dados)
        setLocalNome(dados.locais[0]?.nome ?? null)
        setCategoriasFiltro([])
      } catch (e) {
        if (aindaAtiva()) setErro(e instanceof Error ? e.message : 'Erro ao carregar projeto.')
      } finally {
        if (aindaAtiva()) {
          setProjetoRenderizadoId(projetoId)
          setCarregando(false)
        }
      }
    }

    void carregarProjeto()
    return () => {
      cancelado = true
      if (geracaoRotaRef.current === geracao) geracaoRotaRef.current += 1
    }
  }, [projetoId])

  useEffect(() => {
    setAba(abaInicial)
  }, [abaInicial])

  function alternarCategoria(categoria: string) {
    setCategoriasFiltro((atual) =>
      atual.includes(categoria) ? atual.filter((c) => c !== categoria) : [...atual, categoria]
    )
  }

  async function baixarPdf() {
    const geracao = geracaoDaRenderizacao
    try {
      const blob = await api.postBlob(`/api/projetos/${projetoId}/relatorio`, {})
      if (!geracaoDashboardAtiva(false, geracao, geracaoRotaRef.current)) return
      baixarBlob(blob, `Dashboard_Financeiro_${analise?.filename ?? 'Projeto'}.pdf`)
    } catch (e) {
      if (geracaoDashboardAtiva(false, geracao, geracaoRotaRef.current)) {
        setErro(e instanceof Error ? e.message : 'Erro ao gerar o PDF.')
      }
    }
  }

  async function baixarPlanilha() {
    const geracao = geracaoDaRenderizacao
    try {
      const blob = await api.blob(`/api/projetos/${projetoId}/planilha.xlsx`)
      if (!geracaoDashboardAtiva(false, geracao, geracaoRotaRef.current)) return
      baixarBlob(blob, `Planilha_${analise?.filename ?? 'Projeto'}.xlsx`)
    } catch (e) {
      if (geracaoDashboardAtiva(false, geracao, geracaoRotaRef.current)) {
        setErro(e instanceof Error ? e.message : 'Erro ao exportar planilha.')
      }
    }
  }

  if (carregando || projetoRenderizadoId !== projetoId) {
    return <DashboardCarregando />
  }

  return (
    <AppShell
      titulo={analise?.filename ?? 'Projeto'}
      acoes={
        analise && (
          <>
            <Botao variante="secundario" onClick={() => void baixarPdf()} aria-label="Relatório PDF">
              {ICONE_PDF}
              <span className="hidden sm:inline">Relatório PDF</span>
            </Botao>
            <Botao variante="secundario" onClick={() => void baixarPlanilha()} aria-label="Exportar planilha">
              {ICONE_XLSX}
              <span className="hidden sm:inline">Exportar planilha</span>
            </Botao>
            {usuario?.papel !== 'cliente' && (
              <Link to={rotas.dados} aria-label="Editar dados" className="h-9 rounded-lg px-3.5 text-[13px] font-medium inline-flex items-center gap-2 transition-colors" style={{ background: 'var(--cor-elevado)', color: 'var(--cor-tinta)', border: '1px solid var(--cor-borda)' }}>
                {ICONE_PLANILHA}
                <span className="hidden sm:inline">Editar dados</span>
              </Link>
            )}
            <Link to={rotas.datasets} aria-label="Datasets" className="h-9 rounded-lg px-3.5 text-[13px] font-medium inline-flex items-center gap-2 transition-colors" style={{ background: 'var(--cor-elevado)', color: 'var(--cor-tinta)', border: '1px solid var(--cor-borda)' }}>
              {ICONE_PLANILHA}
              <span className="hidden sm:inline">Datasets</span>
            </Link>
            <Link to={rotas.dashboards} aria-label="Dashboards" className="h-9 rounded-lg px-3.5 text-[13px] font-medium inline-flex items-center gap-2 transition-colors" style={{ background: 'var(--cor-elevado)', color: 'var(--cor-tinta)', border: '1px solid var(--cor-borda)' }}>
              {ICONE_DASHBOARD}
              <span className="hidden sm:inline">Dashboards</span>
            </Link>
          </>
        )
      }
    >
      <div className="flex flex-col lg:flex-row gap-5">
        <aside
          className="w-full lg:w-64 shrink-0 rounded-2xl border p-4 lg:self-start"
          style={{
            background: 'var(--cor-sidebar)',
            borderColor: 'var(--cor-borda)',
          }}
        >
          <nav className="flex lg:flex-col gap-1 overflow-x-auto">
            {abas.map((nome) => (
              <button
                key={nome}
                onClick={() => setAba(nome)}
                className={`flex shrink-0 items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium ring-1 ring-inset transition-colors whitespace-nowrap ${
                  aba === nome ? '' : ''
                }`}
                style={
                  aba === nome
                    ? {
                        background: 'rgba(46, 89, 246, 0.14)',
                        color: 'var(--cor-tinta)',
                        borderColor: 'var(--cor-primaria)',
                      }
                    : {
                        borderColor: 'transparent',
                        color: 'var(--cor-mutado)',
                      }
                }
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  {ICONES_ABAS[nome]}
                </svg>
                {nome}
              </button>
            ))}
          </nav>

          {analise && analise.locais.length > 0 && (
            <div className="mt-4 flex flex-col gap-4 border-t pt-4" style={{ borderColor: 'var(--cor-borda)' }}>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--cor-mutado)' }}>
                  Local
                </div>
                <select
                  value={localNome ?? ''}
                  onChange={(e) => setLocalNome(e.target.value)}
                  className="w-full rounded-lg px-2 py-1.5 text-sm border outline-none"
                  style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-superficie)', color: 'var(--cor-tinta)' }}
                >
                  {analise.locais.map((l) => (
                    <option key={l.nome} value={l.nome}>{l.nome}</option>
                  ))}
                </select>
              </div>

              {categorias.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--cor-mutado)' }}>
                    Categorias
                  </div>
                  <div className="flex lg:flex-col flex-wrap gap-1">
                    <button
                      onClick={() => setCategoriasFiltro([])}
                      className={`text-left text-[12.5px] px-2.5 py-1.5 rounded-md border transition-colors ${
                        categoriasFiltro.length === 0 ? '' : ''
                      }`}
                      style={
                        categoriasFiltro.length === 0
                          ? { borderColor: 'var(--cor-primaria)', color: 'var(--cor-tinta)', background: 'rgba(46, 89, 246, 0.14)' }
                          : { borderColor: 'transparent', color: 'var(--cor-mutado)' }
                      }
                    >
                      Todas
                    </button>
                    {categorias.map((c) => (
                      <button
                        key={c}
                        onClick={() => alternarCategoria(c)}
                        className={`text-left text-[12.5px] px-2.5 py-1.5 rounded-md border transition-colors ${
                          categoriasFiltro.includes(c) ? '' : ''
                        }`}
                        style={
                          categoriasFiltro.includes(c)
                            ? { borderColor: 'var(--cor-primaria)', color: 'var(--cor-tinta)', background: 'rgba(46, 89, 246, 0.14)' }
                            : { borderColor: 'transparent', color: 'var(--cor-mutado)' }
                        }
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        <main className="flex-1 min-w-0">
          {erro && <div className="text-sm mb-4" style={{ color: 'var(--cor-alerta)' }}>{erro}</div>}

          {analise && analise.locais.length === 0 && !usuariosSelecionados && (
            <div className="rounded-2xl border p-7 text-center" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
              <div className="text-[15px] font-semibold mb-1.5" style={{ color: 'var(--cor-tinta)' }}>Nenhum local cadastrado</div>
              <div className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--cor-mutado)' }}>
                Preencha os dados na tela de planilha (ou importe uma planilha do template) para ver
                os gráficos e a análise do projeto.
              </div>
              <Link
                to={rotas.dados}
                className="h-9 rounded-lg px-4 text-[13px] font-semibold text-white inline-flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #2e59f6 0%, #3061d9 100%)' }}
              >
                {ICONE_PLANILHA}
                Abrir planilha de dados
              </Link>
            </div>
          )}

          {analise && analise.locais.length > 0 && (
            <>
              {analise.avisos.map((aviso, indice) => (
                <div key={indice} className="text-sm rounded-lg px-3 py-2 mb-3"
                  style={{ color: 'var(--cor-destaque)', background: 'rgba(224, 123, 26, 0.10)', border: '1px solid rgba(224, 123, 26, 0.30)' }}>
                  {aviso}
                </div>
              ))}
              {aba === 'Visão Geral' && local && <VisaoGeralTab analise={analise} local={local} />}
              {aba === 'Custos' && local && (
                <CustosTab local={local} categorias={categoriasFiltro} onCategorias={setCategoriasFiltro} />
              )}
              {aba === 'Payback' && local && <PaybackTab local={local} />}
              {aba === 'Insights' && local && <InsightsTab local={local} />}
              {aba === 'Comparativo' && <ComparativoTab projeto={analise.projeto} />}
            </>
          )}
          {analise && usuariosSelecionados && <UsuariosTab />}
        </main>
      </div>
    </AppShell>
  )
}

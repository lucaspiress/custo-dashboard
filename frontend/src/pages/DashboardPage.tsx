import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { baixarBlob } from '../lib/format'
import { COR } from '../lib/theme'
import type { AnaliseUpload } from '../lib/types'
import VisaoGeralTab from '../components/tabs/VisaoGeralTab'
import CustosTab from '../components/tabs/CustosTab'
import PaybackTab from '../components/tabs/PaybackTab'
import InsightsTab from '../components/tabs/InsightsTab'
import ComparativoTab from '../components/tabs/ComparativoTab'
import UsuariosTab from '../components/tabs/UsuariosTab'
import { DashboardCarregando } from '../components/ProjetoLoading'

const ABAS_PADRAO = ['Visão Geral', 'Custos', 'Payback', 'Insights', 'Comparativo']

const ICONE_PDF = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></svg>)
const ICONE_XLSX = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /></svg>)
const ICONE_PLANILHA = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /></svg>)
const ICONE_VOLTAR = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>)
const ICONE_SAIR = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>)

const ICONES_ABAS: Record<string, ReactNode> = {
  'Visão Geral': (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  Custos: (<><circle cx="12" cy="12" r="9" /><path d="M12 6v12" /><path d="M15.5 9.5c0-1.2-1.6-2-3.5-2s-3.5.8-3.5 2 1.6 2 3.5 2 3.5.8 3.5 2-1.6 2-3.5 2-3.5-.8-3.5-2" /></>),
  Payback: (<><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></>),
  Insights: (<><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.8.7 1.3 1.6 1.5 2.5h5c.2-.9.7-1.8 1.5-2.5A6 6 0 0 0 12 3z" /></>),
  Comparativo: (<><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20V7" /></>),
  Usuários: (<><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
}

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>()
  const projetoId = Number(id)
  const { usuario, logout } = useAuth()
  const [analise, setAnalise] = useState<AnaliseUpload | null>(null)
  const [localNome, setLocalNome] = useState<string | null>(null)
  const [aba, setAba] = useState('Visão Geral')
  const [categoriasFiltro, setCategoriasFiltro] = useState<string[]>([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  const abas = usuario?.papel === 'admin' ? [...ABAS_PADRAO, 'Usuários'] : ABAS_PADRAO

  const local = analise?.locais.find((l) => l.nome === localNome) ?? analise?.locais[0] ?? null

  const categorias = useMemo(
    () => (local ? Array.from(new Set(local.itens.map((i) => i.categoria))).sort() : []),
    [local]
  )

  useEffect(() => {
    setCarregando(true)
    setErro('')
    api
      .get<AnaliseUpload>(`/api/projetos/${projetoId}`)
      .then((dados) => {
        setAnalise(dados)
        setLocalNome(dados.locais[0]?.nome ?? null)
        setCategoriasFiltro([])
        setAba('Visão Geral')
      })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar projeto.'))
      .finally(() => setCarregando(false))
  }, [projetoId])

  function alternarCategoria(categoria: string) {
    setCategoriasFiltro((atual) =>
      atual.includes(categoria) ? atual.filter((c) => c !== categoria) : [...atual, categoria]
    )
  }

  async function baixarPdf() {
    try {
      const blob = await api.postBlob(`/api/projetos/${projetoId}/relatorio`, {})
      baixarBlob(blob, `Dashboard_Financeiro_${analise?.filename ?? 'Projeto'}.pdf`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar o PDF.')
    }
  }

  async function baixarPlanilha() {
    try {
      const blob = await api.blob(`/api/projetos/${projetoId}/planilha.xlsx`)
      baixarBlob(blob, `Planilha_${analise?.filename ?? 'Projeto'}.xlsx`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao exportar planilha.')
    }
  }

  if (carregando) {
    return <DashboardCarregando />
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="min-h-[64px] shrink-0 border-b border-[#1a2138] flex items-center justify-between gap-3 px-4 sm:px-5 py-3 z-10"
        style={{ background: '#111e34' }}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <Link
            to="/"
            className="rounded-lg p-2 text-[#93a5c8] hover:text-white hover:bg-[#16243c] transition-colors"
            title="Voltar aos projetos"
          >
            {ICONE_VOLTAR}
          </Link>
          <img src="/logo-sistema.png" alt="Rota Group" className="h-[32px] w-auto object-contain shrink-0" />
          <span className="w-px h-6 bg-[#2a3a56] shrink-0" />
          <span className="titulo-display text-[16px] font-semibold text-white tracking-wide truncate">
            {analise?.filename ?? 'Custo Dashboard'}
          </span>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {analise && (
            <>
              <button
                onClick={() => void baixarPdf()}
                aria-label="Relatório PDF"
                className="h-9 rounded-lg px-3.5 text-[13px] font-medium bg-[#16243c] border border-[#2a3a56] text-[#b9c7e4] hover:text-white hover:border-[#10a0a0] transition-colors inline-flex items-center gap-2"
              >
                {ICONE_PDF}
                <span className="hidden sm:inline">Relatório PDF</span>
              </button>
              <button
                onClick={() => void baixarPlanilha()}
                aria-label="Exportar planilha"
                className="h-9 rounded-lg px-3.5 text-[13px] font-medium bg-[#16243c] border border-[#2a3a56] text-[#b9c7e4] hover:text-white hover:border-[#10a0a0] transition-colors inline-flex items-center gap-2"
              >
                {ICONE_XLSX}
                <span className="hidden sm:inline">Exportar planilha</span>
              </button>
              <Link
                to={`/projetos/${projetoId}/planilha`}
                aria-label="Editar dados"
                className="h-9 rounded-lg px-3.5 text-[13px] font-medium bg-[#16243c] border border-[#2a3a56] text-[#b9c7e4] hover:text-white hover:border-[#10a0a0] transition-colors inline-flex items-center gap-2"
              >
                {ICONE_PLANILHA}
                <span className="hidden sm:inline">Editar dados</span>
              </Link>
              <span className="w-px h-6 bg-[#2a3a56] shrink-0" />
            </>
          )}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0"
            style={{ background: 'rgba(16, 160, 160, 0.15)', color: '#10a0a0' }}
          >
            {usuario?.nome?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <span className="hidden lg:block text-[12.5px] text-[#b9c7e4]">{usuario?.nome}</span>
          <button
            onClick={() => void logout()}
            title="Sair"
            className="rounded-lg p-2 text-[#93a5c8] hover:text-white hover:bg-[#16243c] transition-colors"
          >
            {ICONE_SAIR}
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        <aside className="w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-[#1a2138] flex flex-col overflow-y-auto" style={{ background: COR.sidebar }}>
          <nav className="p-3 flex md:flex-col gap-1 overflow-x-auto">
            {abas.map((nome) => (
              <button
                key={nome}
                onClick={() => setAba(nome)}
                  className={`flex shrink-0 items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium border-l-2 transition-colors whitespace-nowrap ${
                  aba === nome
                    ? 'bg-[rgba(16,160,160,0.12)] text-white border-[#10a0a0]'
                    : 'border-transparent text-[#8fa3c7] hover:bg-superficie hover:text-white'
                }`}
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
            <div className="p-4 flex flex-col gap-4 border-t border-[#1a2138]">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8fa3c7] mb-2">
                  Local
                </div>
                <select
                  value={localNome ?? ''}
                  onChange={(e) => setLocalNome(e.target.value)}
                  className="w-full rounded-lg px-2 py-1.5 text-sm border border-borda outline-none bg-superficie text-tinta"
                >
                  {analise.locais.map((l) => (
                    <option key={l.nome} value={l.nome}>{l.nome}</option>
                  ))}
                </select>
              </div>

              {categorias.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8fa3c7] mb-2">
                    Categorias
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => setCategoriasFiltro([])}
                      className={`text-left text-[12.5px] px-2.5 py-1.5 rounded-md border transition-colors ${
                        categoriasFiltro.length === 0
                          ? 'border-[#10a0a0] text-white bg-[rgba(16,160,160,0.12)]'
                          : 'border-transparent text-[#8fa3c7] hover:bg-superficie hover:text-white'
                      }`}
                    >
                      Todas
                    </button>
                    {categorias.map((c) => (
                      <button
                        key={c}
                        onClick={() => alternarCategoria(c)}
                        className={`text-left text-[12.5px] px-2.5 py-1.5 rounded-md border transition-colors ${
                          categoriasFiltro.includes(c)
                            ? 'border-[#10a0a0] text-white bg-[rgba(16,160,160,0.12)]'
                            : 'border-transparent text-[#8fa3c7] hover:bg-superficie hover:text-white'
                        }`}
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
          {analise && analise.filename && (
            <div className="px-6 pt-4 text-[12.5px] text-mutado">
              Projeto: <span className="text-[#10a0a0] font-semibold">{analise.filename}</span>
            </div>
          )}

          <div className="p-4 sm:p-6">
            {erro && <div className="text-sm text-alerta mb-4">{erro}</div>}

            {analise && analise.locais.length === 0 && (
              <div className="rounded-xl border border-borda bg-superficie p-7 text-center">
                <div className="text-[15px] font-semibold text-tinta mb-1.5">Nenhum local cadastrado</div>
                <div className="text-[13px] text-mutado leading-relaxed mb-4">
                  Preencha os dados na tela de planilha (ou importe uma planilha do template) para ver
                  os gráficos e a análise do projeto.
                </div>
                <Link
                  to={`/projetos/${projetoId}/planilha`}
                  className="h-9 rounded-lg px-4 text-[13px] font-semibold text-white inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
                  style={{ background: '#0c7d74' }}
                >
                  {ICONE_PLANILHA}
                  Abrir planilha de dados
                </Link>
              </div>
            )}

            {analise && analise.locais.length > 0 && (
              <>
                {analise.avisos.map((aviso, indice) => (
                  <div key={indice} className="text-sm text-destaque bg-[rgba(224,123,26,0.10)] border border-[rgba(224,123,26,0.35)] rounded-lg px-3 py-2 mb-3">
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
                {aba === 'Usuários' && usuario?.papel === 'admin' && <UsuariosTab />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

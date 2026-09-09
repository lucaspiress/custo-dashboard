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
import SimuladorTab from '../components/tabs/SimuladorTab'
import DreSensibilidadeTab from '../components/tabs/DreSensibilidadeTab'
import AnalyticsAvancadoTab from '../components/tabs/AnalyticsAvancadoTab'
import ModoApresentacao from '../components/ModoApresentacao'
import UsuariosTab from '../components/tabs/UsuariosTab'
import { DashboardCarregando } from '../components/ProjetoLoading'
import AppShell from '../components/AppShell'
import Botao from '../components/ui/Botao'

const ABAS_PADRAO = ['Visão Geral', 'Custos', 'Payback', 'Simulador', 'DRE & Sensibilidade', 'Analytics Avançado', 'Insights', 'Comparativo']


const ICONE_PDF = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></svg>)
const ICONE_XLSX = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /></svg>)
const ICONE_PLANILHA = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /></svg>)
const ICONE_DASHBOARD = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>)

const ICONES_ABAS: Record<string, ReactNode> = {
  'Visão Geral': (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  Custos: (<><circle cx="12" cy="12" r="9" /><path d="M12 6v12" /><path d="M15.5 9.5c0-1.2-1.6-2-3.5-2s-3.5.8-3.5 2 1.6 2 3.5 2 3.5.8 3.5 2-1.6 2-3.5 2-3.5-.8-3.5-2" /></>),
  Payback: (<><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></>),
  Simulador: (<><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></>),
  'DRE & Sensibilidade': (<><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>),
  'Analytics Avançado': (<><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>),
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
  // The route component supplies the tab associated with the canonical URL.
  // Deriving it during render avoids showing the previous tab during navigation.
  const aba = abaInicial
  const [categoriasFiltro, setCategoriasFiltro] = useState<string[]>([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [projetoRenderizadoId, setProjetoRenderizadoId] = useState<number | null>(null)
  const [apresentacaoAtiva, setApresentacaoAtiva] = useState(false)
  const [tentativa, setTentativa] = useState(0)

  const [sidebarRecolhida, setSidebarRecolhida] = useState(false)

  const geracaoRotaRef = useRef(0)
  const geracaoDaRenderizacao = geracaoRotaRef.current

  const abas = usuario?.papel === 'admin' ? [...ABAS_PADRAO, 'Usuários'] : ABAS_PADRAO
  const usuariosSelecionados = aba === 'Usuários' && usuario?.papel === 'admin'

  const local = analise?.locais.find((l) => l.nome === localNome) ?? analise?.locais[0] ?? null

  const categorias = useMemo(
    () => (local ? Array.from(new Set(local.itens.map((i) => i.categoria))).sort() : []),
    [local]
  )

  const gruposAbas = useMemo(() => {
    const financas = ['Visão Geral', 'Custos', 'Payback', 'DRE & Sensibilidade'].filter((a) => abas.includes(a))
    const inteligencia = ['Simulador', 'Analytics Avançado', 'Insights', 'Comparativo'].filter((a) => abas.includes(a))
    const gestao = abas.includes('Usuários') ? ['Usuários'] : []
    return [
      { id: 'financas', titulo: 'Finanças & Custos', itens: financas },
      { id: 'inteligencia', titulo: 'Inteligência & IA', itens: inteligencia },
      ...(gestao.length ? [{ id: 'gestao', titulo: 'Gestão', itens: gestao }] : []),
    ]
  }, [abas])

  const contagemCategorias = useMemo(() => {
    const counts: Record<string, number> = {}
    local?.itens.forEach((i) => {
      counts[i.categoria] = (counts[i.categoria] || 0) + 1
    })
    return counts
  }, [local])

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
  }, [projetoId, tentativa])

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
    return <DashboardCarregando projetoId={id} area={abaInicial} />
  }

  const nomeProjeto = analise?.filename ?? `Projeto #${projetoId}`
  const estadoDados = erro
    ? 'Erro ao carregar dados'
    : !analise || analise.locais.length === 0
      ? 'Sem dados'
      : analise.avisos.length > 0 ? 'Dados parciais' : 'Dados válidos'
  const rotasAbas: Record<string, string> = {
    'Visão Geral': construirRotaProjeto(ROTAS_CANONICAS.projetoVisaoGeral, projetoId) ?? rotas.dados,
    Custos: construirRotaProjeto(ROTAS_CANONICAS.projetoCustos, projetoId) ?? rotas.dados,
    Payback: construirRotaProjeto(ROTAS_CANONICAS.projetoPayback, projetoId) ?? rotas.dados,
    Simulador: construirRotaProjeto(ROTAS_CANONICAS.projetoSimulador, projetoId) ?? rotas.dados,
    'DRE & Sensibilidade': construirRotaProjeto(ROTAS_CANONICAS.projetoDreSensibilidade, projetoId) ?? rotas.dados,
    'Analytics Avançado': construirRotaProjeto(ROTAS_CANONICAS.projetoAnalyticsAvancado, projetoId) ?? rotas.dados,
    Insights: construirRotaProjeto(ROTAS_CANONICAS.projetoInsights, projetoId) ?? rotas.dados,
    Comparativo: construirRotaProjeto(ROTAS_CANONICAS.projetoComparativo, projetoId) ?? rotas.dados,
    Usuários: construirRotaProjeto(ROTAS_CANONICAS.projetoUsuarios, projetoId) ?? rotas.dados,
  }

  return (
    <AppShell
      titulo={nomeProjeto}
      sub={`Projeto #${projetoId} · ${estadoDados} · Período: não disponível neste projeto${analise?.avisos.length ? ` · ${analise.avisos.length} aviso(s)` : ''}`}
      acoes={
        analise && (
          <>
            <Botao variante="secundario" onClick={() => setApresentacaoAtiva(true)} aria-label="Modo Apresentação">
              <span className="hidden sm:inline">📺 Modo Apresentação</span>
            </Botao>
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
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Painel de Navegação Lateral - Arquitetura Double-Bezel (High-End Visual Design) */}
        <aside
          className={`shrink-0 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] self-start ${
            sidebarRecolhida ? 'w-full lg:w-[72px]' : 'w-full lg:w-72'
          } rounded-2xl p-1.5 border border-[#1e2746]/80 bg-[#0c111c]/90 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl`}
        >
          <div className="rounded-[calc(1rem-2px)] p-3 border border-[#1f2740]/40 bg-[#121622]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
            {/* Header do Menu com Toggle de Recolher */}
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#1f2740]/70">
              {!sidebarRecolhida && (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-[#18d6ec] shadow-[0_0_8px_#18d6ec]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8fa3c7] truncate">
                    Painel do Projeto
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setSidebarRecolhida((v) => !v)}
                title={sidebarRecolhida ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                aria-label={sidebarRecolhida ? 'Expandir menu' : 'Recolher menu'}
                className="p-1.5 rounded-lg border border-[#1f2740] bg-[#1a2238]/60 text-[#8fa3c7] hover:text-[#f5f7fc] hover:border-[#2e59f6]/60 transition-all active:scale-95 ml-auto"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${sidebarRecolhida ? 'rotate-180' : ''}`}
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            </div>

            {/* Lista de Abas Agrupadas */}
            <nav className="flex lg:flex-col gap-3 overflow-x-auto" aria-label="Áreas da análise">
              {gruposAbas.map((grupo) => (
                <div key={grupo.id} className="space-y-1">
                  {!sidebarRecolhida && (
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8fa3c7]/60 px-2 py-1 select-none">
                      {grupo.titulo}
                    </div>
                  )}
                  {grupo.itens.map((nome) => {
                    const ativo = aba === nome
                    return (
                      <Link
                        key={nome}
                        to={rotasAbas[nome] ?? rotas.dados}
                        title={sidebarRecolhida ? nome : undefined}
                        className={`group relative flex shrink-0 items-center ${
                          sidebarRecolhida ? 'justify-center px-2' : 'justify-between px-3'
                        } py-2 rounded-xl text-[13px] font-medium transition-all duration-200 whitespace-nowrap active:scale-[0.98] ${
                          ativo
                            ? 'bg-gradient-to-r from-[#2e59f6]/25 via-[#2e59f6]/10 to-transparent border border-[#2e59f6]/60 text-[#f5f7fc] shadow-[0_0_16px_rgba(46,89,246,0.22)]'
                            : 'border border-transparent text-[#8fa3c7] hover:bg-[#1a2238]/70 hover:text-[#f5f7fc] hover:border-[#1f2740]/80'
                        }`}
                        aria-current={ativo ? 'page' : undefined}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`shrink-0 transition-colors ${
                              ativo ? 'text-[#18d6ec]' : 'text-[#8fa3c7] group-hover:text-[#f5f7fc]'
                            }`}
                          >
                            {ICONES_ABAS[nome]}
                          </svg>
                          {!sidebarRecolhida && (
                            <span className="truncate">{nome}</span>
                          )}
                        </div>
                        {!sidebarRecolhida && (
                          <div className="flex items-center gap-1.5">
                            {nome === 'Analytics Avançado' && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#18d6ec] shadow-[0_0_6px_#18d6ec]" />
                            )}
                            {nome === 'Insights' && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#a855f7] shadow-[0_0_6px_#a855f7]" />
                            )}
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              ))}
            </nav>

            {/* Filtros de Local e Categorias */}
            {analise && analise.locais.length > 0 && !sidebarRecolhida && (
              <div className="mt-5 pt-4 border-t border-[#1f2740]/80 space-y-4">
                {/* Seletor de Local */}
                <div>
                  <label
                    htmlFor="filtro-local"
                    className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa3c7] mb-2"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Local da Análise
                  </label>
                  <div className="relative">
                    <select
                      id="filtro-local"
                      value={localNome ?? ''}
                      onChange={(e) => setLocalNome(e.target.value)}
                      className="w-full rounded-xl px-3 py-2 pr-8 text-xs font-medium border border-[#1f2740] bg-[#1a2238]/90 text-[#f5f7fc] hover:border-[#2e59f6]/50 focus:border-[#18d6ec] outline-none transition-all appearance-none cursor-pointer shadow-inner"
                    >
                      {analise.locais.map((l) => (
                        <option key={l.nome} value={l.nome} className="bg-[#121622] text-[#f5f7fc]">
                          {l.nome}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[#8fa3c7]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Filtro de Categorias como Chips */}
                {categorias.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div
                        id="filtro-categorias-label"
                        className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa3c7]"
                      >
                        Filtrar Categorias
                      </div>
                      {categoriasFiltro.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setCategoriasFiltro([])}
                          className="text-[10px] text-[#18d6ec] hover:underline"
                        >
                          Limpar ({categoriasFiltro.length})
                        </button>
                      )}
                    </div>
                    <div
                      className="flex flex-wrap gap-1.5"
                      role="group"
                      aria-labelledby="filtro-categorias-label"
                    >
                      <button
                        type="button"
                        onClick={() => setCategoriasFiltro([])}
                        aria-pressed={categoriasFiltro.length === 0}
                        className={`text-left text-[11px] px-2.5 py-1.5 rounded-lg border transition-all duration-150 active:scale-95 ${
                          categoriasFiltro.length === 0
                            ? 'border-[#2e59f6]/60 bg-[#2e59f6]/20 text-[#f5f7fc] shadow-[0_0_10px_rgba(46,89,246,0.2)] font-semibold'
                            : 'border-[#1f2740]/80 bg-[#1a2238]/50 text-[#8fa3c7] hover:border-[#1f2740] hover:text-[#f5f7fc]'
                        }`}
                      >
                        Todas · {local?.itens.length ?? 0}
                      </button>
                      {categorias.map((c) => {
                        const selecionada = categoriasFiltro.includes(c)
                        const qtd = contagemCategorias[c] ?? 0
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => alternarCategoria(c)}
                            aria-pressed={selecionada}
                            className={`text-left text-[11px] px-2.5 py-1.5 rounded-lg border transition-all duration-150 active:scale-95 ${
                              selecionada
                                ? 'border-[#18d6ec]/60 bg-[#18d6ec]/15 text-[#18d6ec] shadow-[0_0_10px_rgba(24,214,236,0.15)] font-semibold'
                                : 'border-[#1f2740]/80 bg-[#1a2238]/50 text-[#8fa3c7] hover:border-[#1f2740] hover:text-[#f5f7fc]'
                            }`}
                          >
                            {c} <span className="opacity-60 text-[10px]">({qtd})</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {erro && <div role="alert" aria-live="assertive" className="text-sm mb-4 rounded-lg border px-3 py-3 flex flex-wrap items-center justify-between gap-3" style={{ color: 'var(--cor-alerta)', borderColor: 'rgba(239,68,68,.35)', background: 'rgba(239,68,68,.08)' }}>
            <span>{erro}</span>
            <button type="button" onClick={() => setTentativa((valor) => valor + 1)} className="min-h-11 rounded-lg border px-3 py-2 font-semibold" style={{ borderColor: 'var(--cor-alerta)', color: 'var(--cor-tinta)' }}>Tentar novamente</button>
          </div>}
          {analise && <div className="mb-4 rounded-lg border px-3 py-2 text-sm" role="status" aria-live="polite" style={{ color: analise.avisos.length ? 'var(--cor-destaque)' : 'var(--cor-ciano)', borderColor: analise.avisos.length ? 'rgba(224,123,26,.35)' : 'rgba(24,214,236,.25)', background: analise.avisos.length ? 'rgba(224,123,26,.08)' : 'rgba(24,214,236,.06)' }}>
            {analise.locais.length === 0 ? 'Projeto vazio: preencha os dados antes de considerar a análise válida.' : analise.avisos.length ? 'Dados parciais: revise os avisos abaixo antes de concluir a análise.' : 'Dados válidos para este projeto.'}
          </div>}

          {analise && analise.locais.length === 0 && !usuariosSelecionados && (
            <div role="status" className="rounded-2xl border p-7 text-center" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
              <div className="text-[15px] font-semibold mb-1.5" style={{ color: 'var(--cor-tinta)' }}>Sem dados: nenhum local cadastrado</div>
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
              {aba === 'Simulador' && <SimuladorTab analise={analise} />}
              {aba === 'DRE & Sensibilidade' && <DreSensibilidadeTab analise={analise} />}
              {aba === 'Analytics Avançado' && <AnalyticsAvancadoTab analise={analise} />}
              {aba === 'Insights' && local && <InsightsTab local={local} />}
              {aba === 'Comparativo' && <ComparativoTab projeto={analise.projeto} />}
            </>
          )}
          {analise && usuariosSelecionados && <UsuariosTab />}
        </div>
      </div>
      {apresentacaoAtiva && analise && (
        <ModoApresentacao analise={analise} onFechar={() => setApresentacaoAtiva(false)} />
      )}
    </AppShell>

  )
}

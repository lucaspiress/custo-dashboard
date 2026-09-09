import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import ProjetoContextBar from './ProjetoContextBar'
import { api } from '../lib/api'

interface Props {
  titulo?: string
  sub?: string
  saudacao?: boolean
  acoes?: ReactNode
  busca?: boolean
  buscaValor?: string
  onBusca?: (v: string) => void
  buscaPlaceholder?: string
  onAntesDeNavegar?: () => Promise<boolean>
  children: ReactNode
}

function saudacao(): string {
  const hora = new Date().getHours()
  if (hora >= 5 && hora < 12) return 'Bom dia'
  if (hora >= 12 && hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

const ICONES_PORTFOLIO: Record<string, ReactNode> = {
  Projetos: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Compartilhados: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  ),
  Relatórios: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
}

const ICONES_MENU_PROJETO: Record<string, ReactNode> = {
  'Visão geral': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  Custos: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 6v12" /><path d="M15.5 9.5c0-1.2-1.6-2-3.5-2s-3.5.8-3.5 2 1.6 2 3.5 2 3.5.8 3.5 2-1.6 2-3.5 2-3.5-.8-3.5-2" />
    </svg>
  ),
  Payback: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" />
    </svg>
  ),
  Simulador: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  'DRE & Sensibilidade': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  'Analytics Avançado': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  Insights: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.8.7 1.3 1.6 1.5 2.5h5c.2-.9.7-1.8 1.5-2.5A6 6 0 0 0 12 3z" />
    </svg>
  ),
  Comparativo: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20V7" />
    </svg>
  ),
  Dados: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  ),
  Datasets: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  Dashboards: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
    </svg>
  ),
  Usuários: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
}

export default function AppShell({ titulo, sub, saudacao: comSaudacao, acoes, busca, buscaValor = '', onBusca, buscaPlaceholder = 'Buscar…', onAntesDeNavegar, children }: Props) {
  const { usuario, logout } = useAuth()
  const { pathname } = useLocation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)
  const focoAnterior = useRef<HTMLElement | null>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const [projetoNome, setProjetoNome] = useState<{ id: string | undefined; nome: string | null }>({ id: undefined, nome: null })
  const [projetoMeta, setProjetoMeta] = useState<{ id: string; cliente: string | null; criado_em: string; atualizado_em?: string | null } | null>(null)
  const receberNomeProjeto = useCallback((nome: string | null) => setProjetoNome({ id, nome }), [id])
  const fecharMenu = useCallback(() => {
    setMenuAberto(false)
    window.setTimeout(() => focoAnterior.current?.focus(), 0)
  }, [])
  const abrirMenu = useCallback(() => {
    if (!menuAberto && typeof document !== 'undefined') focoAnterior.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setMenuAberto(true)
  }, [menuAberto])
  useEffect(() => {
    if (!menuAberto) return
    drawerRef.current?.querySelector<HTMLElement>('a, button')?.focus()
    const escapar = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { fecharMenu(); return }
      if (event.key !== 'Tab' || !drawerRef.current) return
      const focaveis = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((item) => !item.hasAttribute('disabled'))
      if (!focaveis.length) return
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      if (event.shiftKey && document.activeElement === primeiro) { event.preventDefault(); ultimo.focus() }
      else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primeiro.focus() }
    }
    document.addEventListener('keydown', escapar)
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', escapar); document.body.style.overflow = overflowAnterior }
  }, [fecharMenu, menuAberto])
  useEffect(() => {
    let ativo = true
    setProjetoMeta(null)
    if (!id) return () => { ativo = false }
    api.get<Array<{ id: number; cliente: string | null; criado_em: string; atualizado_em?: string | null }>>('/api/projetos')
      .then((projetos) => {
        const projeto = projetos.find((item) => String(item.id) === id)
        if (ativo && projeto) setProjetoMeta({ ...projeto, id })
      })
      .catch(() => undefined)
    return () => { ativo = false }
  }, [id])
  const navegar = useCallback((event: MouseEvent<HTMLAnchorElement>, destino: string) => {
    if (!onAntesDeNavegar || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    void onAntesDeNavegar()
      .then((podeNavegar) => { if (podeNavegar) { fecharMenu(); navigate(destino) } })
      .catch(() => undefined)
  }, [fecharMenu, navigate, onAntesDeNavegar])

  async function sair() {
    if (onAntesDeNavegar && !(await onAntesDeNavegar().catch(() => false))) return
    await logout()
  }

  const contextual = Boolean(id) && pathname.startsWith('/projetos/')
  const area = pathname.includes('/custos') ? 'Custos' : pathname.includes('/payback') ? 'Payback' : pathname.includes('/simulador') ? 'Simulador' : pathname.includes('/dre-sensibilidade') ? 'DRE & Sensibilidade' : pathname.includes('/analytics-avancado') ? 'Analytics Avançado' : pathname.includes('/insights') ? 'Insights' : pathname.includes('/comparativo') ? 'Comparativo' : pathname.includes('/dados') ? 'Dados' : pathname.includes('/datasets') ? 'Datasets' : pathname.includes('/dashboards') ? 'Dashboards' : pathname.includes('/usuarios') ? 'Usuários' : pathname.includes('/relatorios') ? 'Relatórios' : pathname.includes('/compartilhados') ? 'Compartilhados' : contextual ? 'Visão geral' : 'Projetos'
  const base = id ? `/projetos/${id}` : '/projetos'
  const projetoLinks: string[][] = [['Visão geral', `${base}/visao-geral`], ['Custos', `${base}/custos`], ['Payback', `${base}/payback`], ['Simulador', `${base}/simulador`], ['DRE & Sensibilidade', `${base}/dre-sensibilidade`], ['Analytics Avançado', `${base}/analytics-avancado`], ['Insights', `${base}/insights`], ['Comparativo', `${base}/comparativo`], ['Dados', `${base}/dados`], ['Datasets', `${base}/datasets`], ['Dashboards', `${base}/dashboards`], ...(usuario?.papel === 'admin' ? [['Usuários', `${base}/usuarios`]] : [])]
  const portfolioLinks = [['Projetos', '/projetos'], ['Compartilhados', '/compartilhados'], ['Relatórios', '/relatorios']]

  return <div className="app-surface min-h-screen bg-[#121622] font-['IBM_Plex_Sans'] text-[#f5f7fc]">
    <div className="flex min-h-screen">
      <button type="button" onClick={abrirMenu} className="fixed left-4 top-4 z-30 rounded-md border border-[#1f2740] bg-[#0c111c] p-2 md:hidden" aria-label="Abrir navegação" aria-expanded={menuAberto} aria-controls="navegacao-principal">☰</button>
      {menuAberto && <button type="button" aria-label="Fechar navegação" onClick={fecharMenu} className="fixed inset-0 z-30 bg-[#0c111c]/70 md:hidden" />}
      <aside ref={drawerRef} id="navegacao-principal" data-mobile-drawer className={`${menuAberto ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-72 max-w-[calc(100vw-2.5rem)] flex-col justify-between overflow-y-auto border-r border-[#1a233d]/80 bg-[#080d19]/95 p-4 shadow-[4px_0_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-transform md:static md:translate-x-0`} aria-label="Navegação principal" aria-modal={menuAberto || undefined} role={menuAberto ? 'dialog' : undefined}>
        <div className="flex flex-col flex-1">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#1f2740]/80">
            <Link to="/projetos" onClick={(event) => { navegar(event, '/projetos'); if (!event.defaultPrevented) fecharMenu() }} className="flex items-center gap-3 group">
              <div className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-[#2e59f6]/30 via-[#18d6ec]/20 to-[#2e59f6]/10 border border-[#2e59f6]/40 p-1.5 shadow-[0_0_14px_rgba(46,89,246,0.3)] group-hover:border-[#18d6ec] transition-all">
                <img src="/logo-sistema.png" alt="Rota Group" className="h-full w-auto object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-['Space_Grotesk'] text-sm font-bold text-[#f5f7fc] tracking-tight group-hover:text-[#18d6ec] transition-colors">
                  Custo Dashboard
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8fa3c7]">
                  Plataforma Financeira
                </span>
              </div>
            </Link>
            <button type="button" onClick={fecharMenu} className="rounded-lg p-1.5 text-[#8fa3c7] hover:text-[#f5f7fc] hover:bg-[#1a2238] md:hidden transition-colors" aria-label="Fechar navegação">✕</button>
          </div>

          <nav className="flex-1 space-y-6" aria-label="Navegação do sistema">
            <div>
              <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8fa3c7]/60 select-none">
                Portfólio Global
              </div>
              <div className="space-y-1">
                {portfolioLinks.map(([label, to]) => {
                  const ativo = area === label
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={(event) => {
                        navegar(event, to)
                        if (!event.defaultPrevented) fecharMenu()
                      }}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 active:scale-[0.98] ${
                        ativo
                          ? 'bg-gradient-to-r from-[#2e59f6]/25 to-[#18d6ec]/10 border border-[#2e59f6]/60 text-[#f5f7fc] shadow-[0_0_14px_rgba(46,89,246,0.22)]'
                          : 'border border-transparent text-[#8fa3c7] hover:bg-[#141b2f] hover:text-[#f5f7fc] hover:border-[#1f2740]'
                      }`}
                    >
                      <span className={`shrink-0 transition-colors ${ativo ? 'text-[#18d6ec]' : 'text-[#8fa3c7] group-hover:text-[#f5f7fc]'}`}>
                        {ICONES_PORTFOLIO[label]}
                      </span>
                      <span className="truncate">{label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

            {contextual && (
              <div>
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8fa3c7]/60 select-none">
                    Projeto Atual #{id}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#18d6ec] shadow-[0_0_6px_#18d6ec]" />
                </div>
                <div className="space-y-1">
                  {projetoLinks.map(([label, to]) => {
                    const ativo = area === label
                    return (
                      <Link
                        key={to}
                        to={to}
                        onClick={(event) => {
                          navegar(event, to)
                          if (!event.defaultPrevented) fecharMenu()
                        }}
                        className={`group flex items-center justify-between px-3 py-1.5 rounded-xl text-[12.5px] font-medium transition-all duration-150 active:scale-[0.98] ${
                          ativo
                            ? 'bg-gradient-to-r from-[#2e59f6]/25 to-[#18d6ec]/10 border border-[#2e59f6]/60 text-[#f5f7fc] shadow-[0_0_14px_rgba(46,89,246,0.22)] font-semibold'
                            : 'border border-transparent text-[#8fa3c7] hover:bg-[#141b2f] hover:text-[#f5f7fc] hover:border-[#1f2740]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`shrink-0 transition-colors ${ativo ? 'text-[#18d6ec]' : 'text-[#8fa3c7] group-hover:text-[#f5f7fc]'}`}>
                            {ICONES_MENU_PROJETO[label]}
                          </span>
                          <span className="truncate">{label}</span>
                        </div>
                        {label === 'Analytics Avançado' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#18d6ec]/20 text-[#18d6ec] border border-[#18d6ec]/40">
                            NOVO
                          </span>
                        )}
                        {label === 'Insights' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#a855f7]/20 text-[#c084fc] border border-[#a855f7]/40">
                            IA
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </nav>
        </div>

        <div className="pt-4 mt-4 border-t border-[#1f2740]/80">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#121829]/70 border border-[#1f2740]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#2e59f6]/30 to-[#18d6ec]/20 border border-[#2e59f6]/40 text-xs font-bold text-[#18d6ec]">
                {usuario?.nome?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-[#f5f7fc] leading-tight">
                  {usuario?.nome ?? 'Usuário'}
                </div>
                <div className="text-[10px] text-[#8fa3c7] capitalize">
                  {usuario?.papel ?? 'operador'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void sair()}
              title="Encerrar sessão"
              aria-label="Sair da conta"
              className="p-1.5 rounded-lg text-[#8fa3c7] hover:text-[#e07b1a] hover:bg-[#222b45] transition-all active:scale-95"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-[#1f2740] bg-[#121622]/95 backdrop-blur-sm"><div className="flex min-h-16 h-auto flex-wrap items-center justify-between gap-3 px-5 py-2 pl-16 md:px-8">
          <div className="min-w-0"><div className="hidden text-xs text-[#8fa3c7] sm:block"><Link to="/projetos" onClick={(event) => navegar(event, '/projetos')} className="hover:text-[#f5f7fc]">Projetos</Link> <span aria-hidden="true">/</span> {contextual && <><span>Projeto {id}</span> <span aria-hidden="true">/</span> </>}<strong className="text-[#f5f7fc]">{area}</strong></div><h1 className="font-['Space_Grotesk'] text-lg font-semibold sm:hidden">{contextual ? `${projetoNome.id === id && projetoNome.nome ? projetoNome.nome : `Projeto #${id}`} · ${area}` : area}</h1></div>
          {busca && <div className="hidden max-w-sm flex-1 md:flex"><label className="sr-only" htmlFor="busca-global">Buscar</label><input id="busca-global" value={buscaValor} onChange={(e) => onBusca?.(e.target.value)} placeholder={buscaPlaceholder} className="w-full rounded-md border border-[#1f2740] bg-[#222b45] px-3 py-2 text-sm text-[#f5f7fc] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#18d6ec]" /> </div>}
          <div className="flex shrink-0 items-center gap-2">{acoes}<button type="button" title="Em breve" aria-label="Notificações (em breve)" className="hidden rounded-md p-2 text-[#8fa3c7] opacity-40 cursor-default sm:block">♧</button><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2e59f6]/20 text-sm font-semibold text-[#f5f7fc]">{usuario?.nome?.[0]?.toUpperCase() ?? 'U'}</span><span className="hidden text-xs text-[#8fa3c7] lg:block">{usuario?.nome}</span><button type="button" onClick={() => void sair()} title="Sair" aria-label="Sair da conta" className="rounded-md p-2 text-[#8fa3c7] hover:text-[#f5f7fc]">↪</button></div>
        </div></header>
        <main aria-label="Conteúdo principal" className="mx-auto w-full max-w-[1360px] px-4 py-6 md:px-8">
          {contextual && projetoMeta && projetoMeta.id === id && <div className="mb-3 text-xs text-[#8fa3c7]" aria-label="Metadados do projeto">Cliente: {projetoMeta.cliente ?? 'não informado'} · Criado em: {new Date(projetoMeta.criado_em).toLocaleDateString('pt-BR')} · Atualizado em: {projetoMeta.atualizado_em ? new Date(projetoMeta.atualizado_em).toLocaleDateString('pt-BR') : 'não informado'}</div>}
          {contextual && id && <ProjetoContextBar key={id} projetoId={id} onNomeCarregado={receberNomeProjeto} onAntesDeNavegar={onAntesDeNavegar} />}
          {comSaudacao && usuario && <div className="mb-7"><h2 className="font-['Space_Grotesk'] text-2xl font-bold">{saudacao()}, {usuario.nome}!</h2><p className="mt-1 text-sm text-[#8fa3c7]">Aqui está o que está acontecendo nos seus projetos.</p></div>}
          {titulo && <div className="mb-6"><h2 className="font-['Space_Grotesk'] text-[22px] font-bold">{titulo}</h2>{sub && <p className="mt-1 text-sm text-[#8fa3c7]">{sub}</p>}</div>}
          {children}
        </main>
      </div>
    </div>
  </div>
}

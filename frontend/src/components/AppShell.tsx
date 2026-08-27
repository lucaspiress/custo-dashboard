import { useCallback, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import ProjetoContextBar from './ProjetoContextBar'

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

export default function AppShell({ titulo, sub, saudacao: comSaudacao, acoes, busca, buscaValor = '', onBusca, buscaPlaceholder = 'Buscar…', onAntesDeNavegar, children }: Props) {
  const { usuario, logout } = useAuth()
  const { pathname } = useLocation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)
  const [projetoNome, setProjetoNome] = useState<{ id: string | undefined; nome: string | null }>({ id: undefined, nome: null })
  const receberNomeProjeto = useCallback((nome: string | null) => setProjetoNome({ id, nome }), [id])
  const navegar = useCallback((event: MouseEvent<HTMLAnchorElement>, destino: string) => {
    if (!onAntesDeNavegar || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    void onAntesDeNavegar()
      .then((podeNavegar) => { if (podeNavegar) { setMenuAberto(false); navigate(destino) } })
      .catch(() => undefined)
  }, [navigate, onAntesDeNavegar])

  async function sair() {
    if (onAntesDeNavegar && !(await onAntesDeNavegar().catch(() => false))) return
    await logout()
  }

  const contextual = Boolean(id) && pathname.startsWith('/projetos/')
  const area = pathname.includes('/custos') ? 'Custos' : pathname.includes('/payback') ? 'Payback' : pathname.includes('/insights') ? 'Insights' : pathname.includes('/comparativo') ? 'Comparativo' : pathname.includes('/dados') ? 'Dados' : pathname.includes('/datasets') ? 'Datasets' : pathname.includes('/dashboards') ? 'Dashboards' : pathname.includes('/usuarios') ? 'Usuários' : pathname.includes('/relatorios') ? 'Relatórios' : pathname.includes('/compartilhados') ? 'Compartilhados' : contextual ? 'Visão geral' : 'Projetos'
  const base = id ? `/projetos/${id}` : '/projetos'
  const projetoLinks: string[][] = [['Visão geral', `${base}/visao-geral`], ['Custos', `${base}/custos`], ['Payback', `${base}/payback`], ['Insights', `${base}/insights`], ['Comparativo', `${base}/comparativo`], ['Dados', `${base}/dados`], ['Datasets', `${base}/datasets`], ['Dashboards', `${base}/dashboards`], ...(usuario?.papel === 'admin' ? [['Usuários', `${base}/usuarios`]] : [])]
  const portfolioLinks = [['Projetos', '/projetos'], ['Compartilhados', '/compartilhados'], ['Relatórios', '/relatorios']]

  return <div className="min-h-screen bg-[#121622] font-['IBM_Plex_Sans'] text-[#f5f7fc]">
    <div className="flex min-h-screen">
      <button type="button" onClick={() => setMenuAberto(true)} className="fixed left-4 top-4 z-30 rounded-md border border-[#1f2740] bg-[#0c111c] p-2 md:hidden" aria-label="Abrir navegação">☰</button>
      {menuAberto && <button type="button" aria-label="Fechar navegação" onClick={() => setMenuAberto(false)} className="fixed inset-0 z-30 bg-[#0c111c]/70 md:hidden" />}
      <aside className={`${menuAberto ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 w-64 border-r border-[#1f2740] bg-[#0c111c] p-5 transition-transform md:static md:translate-x-0`} aria-label="Navegação principal">
        <Link to="/projetos" onClick={(event) => { navegar(event, '/projetos'); if (!event.defaultPrevented) setMenuAberto(false) }} className="flex items-center gap-3 border-b border-[#1f2740] pb-5"><img src="/logo-sistema.png" alt="Rota Group" className="h-8 w-auto" /><span className="font-['Space_Grotesk'] text-sm font-semibold">Custo Dashboard</span></Link>
        <div className="mt-7 text-[10px] font-semibold uppercase tracking-[.18em] text-[#8fa3c7]">Portfólio</div>
        <nav className="mt-2 space-y-1">{portfolioLinks.map(([label, to]) => <Link key={to} to={to} onClick={(event) => { navegar(event, to); if (!event.defaultPrevented) setMenuAberto(false) }} className={`block rounded-md ring-1 ring-inset px-3 py-2.5 text-sm ${area === label ? 'ring-[#2e59f6] bg-[#2e59f6]/15 text-[#f5f7fc]' : 'ring-transparent text-[#8fa3c7] hover:bg-[#222b45] hover:text-[#f5f7fc]'}`}>{label}</Link>)}</nav>
        {contextual && <><div className="mt-8 text-[10px] font-semibold uppercase tracking-[.18em] text-[#8fa3c7]">Projeto atual</div><nav className="mt-2 space-y-1">{projetoLinks.map(([label, to]) => <Link key={to} to={to} onClick={(event) => { navegar(event, to); if (!event.defaultPrevented) setMenuAberto(false) }} className={`block rounded-md ring-1 ring-inset px-3 py-2.5 text-sm ${area === label ? 'ring-[#2e59f6] bg-[#2e59f6]/15 text-[#f5f7fc]' : 'ring-transparent text-[#8fa3c7] hover:bg-[#222b45] hover:text-[#f5f7fc]'}`}>{label}</Link>)}</nav></>}
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-[#1f2740] bg-[#121622]/95 backdrop-blur-sm"><div className="flex h-16 items-center justify-between gap-4 px-5 md:px-8">
          <div className="min-w-0"><div className="hidden text-xs text-[#8fa3c7] sm:block"><Link to="/projetos" onClick={(event) => navegar(event, '/projetos')} className="hover:text-[#f5f7fc]">Projetos</Link> <span aria-hidden="true">/</span> {contextual && <><span>Projeto {id}</span> <span aria-hidden="true">/</span> </>}<strong className="text-[#f5f7fc]">{area}</strong></div><h1 className="font-['Space_Grotesk'] text-lg font-semibold sm:hidden">{contextual ? `${projetoNome.id === id && projetoNome.nome ? projetoNome.nome : `Projeto #${id}`} · ${area}` : area}</h1></div>
          {busca && <div className="hidden max-w-sm flex-1 md:flex"><label className="sr-only" htmlFor="busca-global">Buscar</label><input id="busca-global" value={buscaValor} onChange={(e) => onBusca?.(e.target.value)} placeholder={buscaPlaceholder} className="w-full rounded-md border border-[#1f2740] bg-[#222b45] px-3 py-2 text-sm text-[#f5f7fc] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#18d6ec]" /> </div>}
          <div className="flex shrink-0 items-center gap-2">{acoes}<button type="button" title="Notificações" aria-label="Notificações" className="hidden rounded-md p-2 text-[#8fa3c7] sm:block">♧</button><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2e59f6]/20 text-sm font-semibold text-[#f5f7fc]">{usuario?.nome?.[0]?.toUpperCase() ?? 'U'}</span><span className="hidden text-xs text-[#8fa3c7] lg:block">{usuario?.nome}</span><button type="button" onClick={() => void sair()} title="Sair" aria-label="Sair da conta" className="rounded-md p-2 text-[#8fa3c7] hover:text-[#f5f7fc]">↪</button></div>
        </div></header>
        <main className="mx-auto w-full max-w-[1360px] px-4 py-6 md:px-8">
          {contextual && id && <ProjetoContextBar key={id} projetoId={id} onNomeCarregado={receberNomeProjeto} onAntesDeNavegar={onAntesDeNavegar} />}
          {comSaudacao && usuario && <div className="mb-7"><h2 className="font-['Space_Grotesk'] text-2xl font-bold">{saudacao()}, {usuario.nome}!</h2><p className="mt-1 text-sm text-[#8fa3c7]">Aqui está o que está acontecendo nos seus projetos.</p></div>}
          {titulo && <div className="mb-6"><h2 className="font-['Space_Grotesk'] text-[22px] font-bold">{titulo}</h2>{sub && <p className="mt-1 text-sm text-[#8fa3c7]">{sub}</p>}</div>}
          {children}
        </main>
      </div>
    </div>
  </div>
}

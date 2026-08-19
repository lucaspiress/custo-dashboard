import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const ICONE_SAIR = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const ICONE_BUSCA = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.5" y2="16.5" />
  </svg>
)

const ICONE_SINO = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
)

interface Props {
  titulo?: string
  sub?: string
  saudacao?: boolean
  acoes?: ReactNode
  busca?: boolean
  buscaValor?: string
  onBusca?: (v: string) => void
  buscaPlaceholder?: string
  children: ReactNode
}

function saudacao(): string {
  const hora = new Date().getHours()
  if (hora >= 5 && hora < 12) return 'Bom dia'
  if (hora >= 12 && hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function AppShell({
  titulo,
  sub,
  saudacao: comSaudacao,
  acoes,
  busca,
  buscaValor = '',
  onBusca,
  buscaPlaceholder = 'Buscar…',
  children,
}: Props) {
  const { usuario, logout } = useAuth()
  const { pathname } = useLocation()
  const naRaiz = pathname === '/'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--cor-fundo)' }}>
      <header
        className="shrink-0 z-20 border-b"
        style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}
      >
        <div className="flex items-center justify-between gap-4 px-5 h-[64px]">
          <div className="flex items-center gap-3.5 min-w-0">
            {!naRaiz && (
              <Link
                to="/"
                className="rounded-lg p-2 shrink-0 transition-colors"
                style={{ color: 'var(--cor-mutado)' }}
                title="Voltar aos projetos"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </Link>
            )}
            <img src="/logo-sistema.png" alt="Rota Group" className="h-[32px] w-auto object-contain shrink-0" />
            <span className="w-px h-6 shrink-0" style={{ background: 'var(--cor-borda)' }} />
            <span className="titulo-display text-[16px] font-semibold tracking-wide truncate" style={{ color: 'var(--cor-tinta)' }}>
              Custo Dashboard
            </span>
          </div>

          {busca && (
            <div className="hidden md:flex flex-1 max-w-sm justify-center">
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2 w-full border transition-colors"
                style={{
                  background: 'var(--cor-elevado)',
                  borderColor: 'var(--cor-borda)',
                  color: 'var(--cor-mutado)',
                }}
              >
                {ICONE_BUSCA}
                <input
                  type="text"
                  value={buscaValor}
                  onChange={(e) => onBusca?.(e.target.value)}
                  placeholder={buscaPlaceholder}
                  className="bg-transparent border-none outline-none text-[13px] w-full min-w-0"
                  style={{ color: 'var(--cor-tinta)' }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5 shrink-0">
            {acoes}
            <Link
              to="/compartilhados"
              className="hidden md:inline-flex h-8 px-2.5 items-center text-[12.5px] font-medium transition-colors"
              style={{ color: 'var(--cor-mutado)' }}
            >
              Compartilhados
            </Link>
            <Link
              to="/relatorios"
              className="hidden md:inline-flex h-8 px-2.5 items-center text-[12.5px] font-medium transition-colors"
              style={{ color: 'var(--cor-mutado)' }}
            >
              Relatórios
            </Link>
            <span className="hidden sm:block w-px h-6" style={{ background: 'var(--cor-borda)' }} />
            <button
              type="button"
              className="rounded-lg p-2 transition-colors"
              style={{ color: 'var(--cor-mutado)' }}
              title="Notificações"
            >
              {ICONE_SINO}
            </button>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0"
              style={{ background: 'rgba(46, 89, 246, 0.18)', color: 'var(--cor-primaria)' }}
            >
              {usuario?.nome?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span className="hidden lg:block text-[12.5px]" style={{ color: 'var(--cor-mutado)' }}>
              {usuario?.nome}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              title="Sair"
              className="rounded-lg p-2 transition-colors"
              style={{ color: 'var(--cor-mutado)' }}
            >
              {ICONE_SAIR}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1280px] mx-auto px-5 py-6">
        {comSaudacao && usuario && (
          <div className="mb-7">
            <h2 className="titulo-display text-[26px] font-bold leading-tight" style={{ color: 'var(--cor-tinta)' }}>
              {saudacao()}, {usuario.nome}!
            </h2>
            <p className="text-[14px] mt-1" style={{ color: 'var(--cor-mutado)' }}>
              Aqui está o que está acontecendo nos seus projetos.
            </p>
          </div>
        )}
        {titulo && (
          <div className="mb-6">
            <h1 className="titulo-display text-[22px] font-bold" style={{ color: 'var(--cor-tinta)' }}>
              {titulo}
            </h1>
            {sub && (
              <p className="text-[13px] mt-1" style={{ color: 'var(--cor-mutado)' }}>
                {sub}
              </p>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}

import { lazy, Suspense, useEffect, useState, type ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import LoginPage from './pages/LoginPage'
import ProjetosPage from './pages/ProjetosPage'
import DashboardPage from './pages/DashboardPage'
import PlanilhaPage from './pages/PlanilhaPage'
import { ALIASES_ROTAS, obterDestinoAlias, parseProjetoId, ROTA_FALLBACK, ROTAS_CANONICAS } from './lib/routes'

const DatasetsPage = lazy(() => import('./pages/DatasetsPage'))
const DashboardBuilderPage = lazy(() => import('./pages/DashboardBuilderPage'))
const CompartilhadosPage = lazy(() => import('./pages/CompartilhadosPage'))
const RelatoriosPage = lazy(() => import('./pages/RelatoriosPage'))
const PublicoPage = lazy(() => import('./pages/PublicoPage'))

function RedirecionarLegado({ alias }: { alias: keyof typeof ALIASES_ROTAS }) {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={obterDestinoAlias(alias, id) ?? ROTA_FALLBACK} replace />
}

function RotaProjeto({ children, adminOnly = false }: { children: ReactElement; adminOnly?: boolean }) {
  const { id } = useParams<{ id: string }>()
  const { usuario } = useAuth()

  if (parseProjetoId(id) === null || (adminOnly && usuario?.papel !== 'admin')) {
    return <Navigate to={ROTA_FALLBACK} replace />
  }

  return children
}

function SucessoRedirect() {
  const { usuario } = useAuth()
  const [pronto, setPronto] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setPronto(true), 800)
    return () => clearTimeout(id)
  }, [])
  if (pronto) return <Navigate to="/" replace />
  return (
    <div className="success-state">
      <div className="success-ring">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4.5 10.5l3.5 3.5 7-8" stroke="#10a0a0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="success-title">Acesso liberado</h1>
      <p className="success-sub">Bem-vindo de volta, {usuario?.username ?? 'operador'}. Direcionando ao painel…</p>
    </div>
  )
}

function Rotas() {
  const { usuario, carregando } = useAuth()
  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-mutado text-sm">
        Carregando…
      </div>
    )
  }
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-mutado text-sm">Carregando…</div>
      }
    >
      <Routes>
        <Route path="/login" element={usuario ? <SucessoRedirect /> : <LoginPage />} />
        <Route path="/" element={usuario ? <Navigate to={obterDestinoAlias('/') ?? ROTA_FALLBACK} replace /> : <Navigate to="/login" replace />} />
        <Route path={ROTAS_CANONICAS.projetos} element={usuario ? <ProjetosPage /> : <Navigate to="/login" replace />} />
        <Route path="/projetos/:id" element={usuario ? <RotaProjeto><RedirecionarLegado alias="/projetos/:id" /></RotaProjeto> : <Navigate to="/login" replace />} />
        <Route path="/projetos/:id/dashboard" element={usuario ? <RotaProjeto><RedirecionarLegado alias="/projetos/:id/dashboard" /></RotaProjeto> : <Navigate to="/login" replace />} />
        <Route path="/projetos/:id/planilha" element={usuario ? <RotaProjeto><RedirecionarLegado alias="/projetos/:id/planilha" /></RotaProjeto> : <Navigate to="/login" replace />} />
        <Route path={ROTAS_CANONICAS.projetoVisaoGeral} element={usuario ? <RotaProjeto><DashboardPage abaInicial="Visão Geral" /></RotaProjeto> : <Navigate to="/login" replace />} />
        <Route path={ROTAS_CANONICAS.projetoCustos} element={usuario ? <RotaProjeto><DashboardPage abaInicial="Custos" /></RotaProjeto> : <Navigate to="/login" replace />} />
        <Route path={ROTAS_CANONICAS.projetoPayback} element={usuario ? <RotaProjeto><DashboardPage abaInicial="Payback" /></RotaProjeto> : <Navigate to="/login" replace />} />
        <Route path={ROTAS_CANONICAS.projetoInsights} element={usuario ? <RotaProjeto><DashboardPage abaInicial="Insights" /></RotaProjeto> : <Navigate to="/login" replace />} />
        <Route path={ROTAS_CANONICAS.projetoComparativo} element={usuario ? <RotaProjeto><DashboardPage abaInicial="Comparativo" /></RotaProjeto> : <Navigate to="/login" replace />} />
        <Route path={ROTAS_CANONICAS.projetoDados} element={usuario ? <RotaProjeto><PlanilhaPage /></RotaProjeto> : <Navigate to="/login" replace />} />
        <Route path={ROTAS_CANONICAS.projetoDatasets} element={usuario ? <RotaProjeto><DatasetsPage /></RotaProjeto> : <Navigate to="/login" replace />} />
        <Route path={ROTAS_CANONICAS.projetoDataset} element={usuario ? <RotaProjeto><DatasetsPage /></RotaProjeto> : <Navigate to="/login" replace />} />
        <Route path={ROTAS_CANONICAS.projetoDashboards} element={usuario ? <RotaProjeto><DashboardBuilderPage /></RotaProjeto> : <Navigate to="/login" replace />} />
        <Route path={ROTAS_CANONICAS.projetoDashboard} element={usuario ? <RotaProjeto><DashboardBuilderPage /></RotaProjeto> : <Navigate to="/login" replace />} />
        <Route path={ROTAS_CANONICAS.projetoUsuarios} element={usuario ? <RotaProjeto adminOnly><DashboardPage abaInicial="Usuários" /></RotaProjeto> : <Navigate to="/login" replace />} />
        <Route path={ROTAS_CANONICAS.compartilhados} element={usuario ? <CompartilhadosPage /> : <Navigate to="/login" replace />} />
        <Route path={ROTAS_CANONICAS.relatorios} element={usuario ? <RelatoriosPage /> : <Navigate to="/login" replace />} />
        <Route path={ROTAS_CANONICAS.publico} element={<PublicoPage />} />
        <Route path="*" element={<Navigate to={ROTA_FALLBACK} replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Rotas />
      </AuthProvider>
    </BrowserRouter>
  )
}

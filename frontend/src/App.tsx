import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import LoginPage from './pages/LoginPage'
import ProjetosPage from './pages/ProjetosPage'
import DashboardPage from './pages/DashboardPage'
import PlanilhaPage from './pages/PlanilhaPage'

const DatasetsPage = lazy(() => import('./pages/DatasetsPage'))
const DashboardBuilderPage = lazy(() => import('./pages/DashboardBuilderPage'))
const CompartilhadosPage = lazy(() => import('./pages/CompartilhadosPage'))
const RelatoriosPage = lazy(() => import('./pages/RelatoriosPage'))
const PublicoPage = lazy(() => import('./pages/PublicoPage'))

function RedirecionarParaDashboard() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/projetos/${id}/dashboard`} replace />
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
        <Route path="/" element={usuario ? <ProjetosPage /> : <Navigate to="/login" replace />} />
        <Route path="/projetos/:id" element={usuario ? <RedirecionarParaDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/projetos/:id/dashboard" element={usuario ? <DashboardPage /> : <Navigate to="/login" replace />} />
        <Route path="/projetos/:id/planilha" element={usuario ? <PlanilhaPage /> : <Navigate to="/login" replace />} />
        <Route path="/projetos/:id/datasets" element={usuario ? <DatasetsPage /> : <Navigate to="/login" replace />} />
        <Route path="/projetos/:id/datasets/:did" element={usuario ? <DatasetsPage /> : <Navigate to="/login" replace />} />
        <Route path="/projetos/:id/dashboards" element={usuario ? <DashboardBuilderPage /> : <Navigate to="/login" replace />} />
        <Route path="/projetos/:id/dashboards/:dbid" element={usuario ? <DashboardBuilderPage /> : <Navigate to="/login" replace />} />
        <Route path="/compartilhados" element={usuario ? <CompartilhadosPage /> : <Navigate to="/login" replace />} />
        <Route path="/relatorios" element={usuario ? <RelatoriosPage /> : <Navigate to="/login" replace />} />
        <Route path="/p/:token" element={<PublicoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
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

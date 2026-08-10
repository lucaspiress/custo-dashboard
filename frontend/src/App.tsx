import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import LoginPage from './pages/LoginPage'
import ProjetosPage from './pages/ProjetosPage'
import DashboardPage from './pages/DashboardPage'
import PlanilhaPage from './pages/PlanilhaPage'

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
    <Routes>
      <Route path="/login" element={usuario ? <SucessoRedirect /> : <LoginPage />} />
      <Route path="/" element={usuario ? <ProjetosPage /> : <Navigate to="/login" replace />} />
      <Route path="/projetos/:id" element={usuario ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="/projetos/:id/planilha" element={usuario ? <PlanilhaPage /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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

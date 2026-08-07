import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import type { Usuario } from './types'

interface AuthContexto {
  usuario: Usuario | null
  carregando: boolean
  login: (username: string, senha: string) => Promise<void>
  logout: () => Promise<void>
}

const Contexto = createContext<AuthContexto | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    api
      .get<Usuario>('/api/auth/me')
      .then(setUsuario)
      .catch(() => setUsuario(null))
      .finally(() => setCarregando(false))
  }, [])

  const login = useCallback(async (username: string, senha: string) => {
    const u = await api.post<Usuario>('/api/auth/login', { username, senha })
    setUsuario(u)
  }, [])

  const logout = useCallback(async () => {
    await api.post<void>('/api/auth/logout')
    setUsuario(null)
  }, [])

  return (
    <Contexto.Provider value={{ usuario, carregando, login, logout }}>
      {children}
    </Contexto.Provider>
  )
}

export function useAuth(): AuthContexto {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}

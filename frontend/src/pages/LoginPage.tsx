import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { COR } from '../lib/theme'

const MARCA_SVG = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20V7" />
  </svg>
)

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      await login(username, senha)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Usuário ou senha inválidos.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center pt-[12vh] px-4">
      <div
        className="w-full max-w-[420px] rounded-2xl p-7 text-center"
        style={{ background: '#fff', border: '1px solid #dbeafe' }}
      >
        <div className="flex justify-center mb-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: COR.primaria }}
          >
            {MARCA_SVG}
          </div>
        </div>
        <div className="text-[22px] font-bold text-[#172033]">Custo Dashboard</div>
        <div className="text-[13px] text-mutado mt-1.5 mb-6">
          Acesso restrito a usuários autorizados
        </div>
        <form onSubmit={enviar} className="flex flex-col gap-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Usuário"
            autoComplete="username"
            className="rounded-lg px-4 py-2.5 text-sm border border-borda outline-none focus:border-primaria"
          />
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Senha"
            autoComplete="current-password"
            className="rounded-lg px-4 py-2.5 text-sm border border-borda outline-none focus:border-primaria"
          />
          {erro && <div className="text-sm text-alerta">{erro}</div>}
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg py-2.5 text-sm font-medium text-white bg-primaria hover:bg-[#1E3A8A] disabled:opacity-60"
          >
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

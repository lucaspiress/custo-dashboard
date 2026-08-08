import { useEffect, useState, type FormEvent } from 'react'
import type { Usuario } from '../../lib/types'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'

const MAX_ADMINS = 3

export default function UsuariosTab() {
  const { usuario } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [nome, setNome] = useState('')
  const [username, setUsername] = useState('')
  const [senha, setSenha] = useState('')
  const [papel, setPapel] = useState('usuario')
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  function carregar() {
    api
      .get<Usuario[]>('/api/users')
      .then(setUsuarios)
      .catch(() => setUsuarios([]))
  }

  useEffect(carregar, [])

  const admins = usuarios.filter((u) => u.papel === 'admin').length

  async function criar(e: FormEvent) {
    e.preventDefault()
    setMensagem(null)
    try {
      await api.post('/api/users', { nome, username, senha, papel })
      setNome('')
      setUsername('')
      setSenha('')
      setPapel('usuario')
      carregar()
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err instanceof Error ? err.message : 'Erro ao criar usuário.' })
    }
  }

  async function alternarAtivo(u: Usuario) {
    setMensagem(null)
    try {
      await api.patch(`/api/users/${u.id}`, { ativo: !u.ativo })
      carregar()
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err instanceof Error ? err.message : 'Erro ao atualizar.' })
    }
  }

  async function redefinirSenha(u: Usuario, novaSenha: string) {
    setMensagem(null)
    try {
      await api.post(`/api/users/${u.id}/reset-password`, { senha: novaSenha })
      setMensagem({ tipo: 'ok', texto: `Senha de ${u.nome} redefinida.` })
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err instanceof Error ? err.message : 'Erro ao redefinir senha.' })
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="text-[15px] font-semibold text-tinta my-1.5 mb-2.5">Administração de usuários</div>
      <div className="text-sm text-mutado mb-3">
        Administradores cadastrados: {admins}/{MAX_ADMINS}
      </div>

      {mensagem && (
        <div className={`text-sm mb-3 ${mensagem.tipo === 'ok' ? 'text-sucesso' : 'text-alerta'}`}>
          {mensagem.texto}
        </div>
      )}

      <form onSubmit={criar} className="rounded-xl border border-borda bg-superficie p-4 mb-4 grid grid-cols-2 gap-3">
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome"
          className="rounded-lg px-3 py-2 text-sm border border-borda outline-none focus:border-primaria"
        />
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Usuário"
          className="rounded-lg px-3 py-2 text-sm border border-borda outline-none focus:border-primaria"
        />
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha (mín. 8 caracteres)"
          className="rounded-lg px-3 py-2 text-sm border border-borda outline-none focus:border-primaria"
        />
        <div className="flex gap-3">
          <select
            value={papel}
            onChange={(e) => setPapel(e.target.value)}
            className="rounded-lg px-2 py-2 text-sm border border-borda outline-none"
          >
            <option value="usuario">Usuário</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="botao-marca rounded-lg px-4 py-2 text-sm font-medium">
            Criar usuário
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-borda bg-superficie overflow-hidden">
        {usuarios.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-borda last:border-0">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-tinta truncate">{u.nome}</div>
              <div className="text-xs text-mutado">
                {u.username} · {u.papel.toUpperCase()} · {u.ativo ? 'Ativo' : 'Desativado'}
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const input = e.currentTarget.elements.namedItem('novaSenha') as HTMLInputElement
                void redefinirSenha(u, input.value)
                input.value = ''
              }}
              className="flex gap-2"
            >
              <input
                type="password"
                name="novaSenha"
                placeholder="Nova senha"
                className="rounded-lg px-2 py-1.5 text-xs border border-borda outline-none focus:border-primaria w-36"
              />
              <button type="submit" className="text-xs text-mutado hover:text-primaria">
                Redefinir
              </button>
            </form>
            {usuario && u.id !== usuario.id && (
              <button
                onClick={() => void alternarAtivo(u)}
                className={`text-xs px-3 py-1.5 rounded-lg border ${
                  u.ativo
                    ? 'border-borda text-mutado hover:text-alerta hover:border-alerta'
                    : 'bg-sucesso border-sucesso text-white hover:bg-[#15803D]'
                }`}
              >
                {u.ativo ? 'Desativar' : 'Ativar'}
              </button>
            )}
          </div>
        ))}
        {usuarios.length === 0 && (
          <div className="px-4 py-6 text-sm text-mutado">Nenhum usuário cadastrado.</div>
        )}
      </div>
    </div>
  )
}

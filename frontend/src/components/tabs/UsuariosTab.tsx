import { useEffect, useState, type FormEvent } from 'react'
import type { Usuario } from '../../lib/types'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import Botao from '../ui/Botao'
import Badge from '../ui/Badge'

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
      <div className="text-[15px] font-semibold my-1.5 mb-2.5" style={{ color: 'var(--cor-tinta)' }}>Administração de usuários</div>
      <div className="text-sm mb-3" style={{ color: 'var(--cor-mutado)' }}>
        Administradores cadastrados: {admins}/{MAX_ADMINS}
      </div>

      {mensagem && (
        <div className={`text-sm mb-3 ${mensagem.tipo === 'ok' ? 'text-sucesso' : 'text-alerta'}`}>
          {mensagem.texto}
        </div>
      )}

      <form onSubmit={criar} className="rounded-2xl border p-4 mb-4 grid grid-cols-2 gap-3"
        style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome"
          className="rounded-lg px-3 py-2 text-sm border outline-none"
          style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)', color: 'var(--cor-tinta)' }}
        />
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Usuário"
          className="rounded-lg px-3 py-2 text-sm border outline-none"
          style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)', color: 'var(--cor-tinta)' }}
        />
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha (mín. 8 caracteres)"
          className="rounded-lg px-3 py-2 text-sm border outline-none"
          style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)', color: 'var(--cor-tinta)' }}
        />
        <div className="flex gap-3">
          <select
            value={papel}
            onChange={(e) => setPapel(e.target.value)}
            className="rounded-lg px-2 py-2 text-sm border outline-none"
            style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)', color: 'var(--cor-tinta)' }}
          >
            <option value="usuario">Usuário</option>
            <option value="admin">Admin</option>
          </select>
          <Botao type="submit">Criar usuário</Botao>
        </div>
      </form>

      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
        {usuarios.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0"
            style={{ borderColor: 'var(--cor-borda)' }}>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--cor-tinta)' }}>{u.nome}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--cor-mutado)' }}>
                {u.username} · <Badge cor={u.papel === 'admin' ? '#2e59f6' : '#18d6ec'} rotulo={u.papel === 'admin' ? 'Admin' : 'Usuário'} /> · {u.ativo ? 'Ativo' : 'Desativado'}
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
                className="rounded-lg px-2 py-1.5 text-xs border outline-none w-36"
                style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)', color: 'var(--cor-tinta)' }}
              />
              <button type="submit" className="text-xs transition-colors" style={{ color: 'var(--cor-mutado)' }}>
                Redefinir
              </button>
            </form>
            {usuario && u.id !== usuario.id && (
              <button
                onClick={() => void alternarAtivo(u)}
                className={`text-xs px-3 py-1.5 rounded-lg border ${
                  u.ativo
                    ? ''
                    : 'bg-sucesso border-sucesso text-white'
                }`}
                style={u.ativo ? { borderColor: 'var(--cor-borda)', color: 'var(--cor-mutado)' } : undefined}
              >
                {u.ativo ? 'Desativar' : 'Ativar'}
              </button>
            )}
          </div>
        ))}
        {usuarios.length === 0 && (
          <div className="px-4 py-6 text-sm" style={{ color: 'var(--cor-mutado)' }}>Nenhum usuário cadastrado.</div>
        )}
      </div>
    </div>
  )
}

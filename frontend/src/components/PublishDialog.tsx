import { useEffect, useState } from 'react'
import { criarPublicacao, listarPublicacoes, revogarPublicacao } from '../lib/api'
import type { Publicacao } from '../lib/types'
import Modal from './ui/Modal'
import Botao from './ui/Botao'

interface Props {
  dbid: number
  publicacaoAtual: Publicacao | null
  onPublicacao: (p: Publicacao | null) => void
  aoFechar: () => void
}

export default function PublishDialog({ dbid, publicacaoAtual, onPublicacao, aoFechar }: Props) {
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([])
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [link, setLink] = useState('')

  useEffect(() => {
    let ativo = true
    listarPublicacoes(dbid)
      .then((lista) => {
        if (ativo) setPublicacoes(lista)
      })
      .catch(() => {
        if (ativo) setPublicacoes([])
      })
    return () => {
      ativo = false
    }
  }, [dbid])

  async function gerar() {
    setGerando(true)
    setErro('')
    try {
      const res = await criarPublicacao(dbid)
      const url = `${window.location.origin}${res.url_publica}`
      setLink(url)
      setCopiado(false)
      const lista = await listarPublicacoes(dbid)
      setPublicacoes(lista)
      // a lista vem ordenada por id desc; a mais recente é a recém-criada
      onPublicacao(lista[0] ?? null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao publicar.')
    } finally {
      setGerando(false)
    }
  }

  async function revogar(pid: number) {
    setErro('')
    try {
      await revogarPublicacao(pid)
      const lista = await listarPublicacoes(dbid)
      setPublicacoes(lista)
      if (publicacaoAtual?.id === pid) onPublicacao(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao revogar.')
    }
  }

  function copiar() {
    if (!link) return
    void navigator.clipboard?.writeText(link)
    setCopiado(true)
  }

  const inputStyle = {
    borderColor: 'var(--cor-borda)',
    background: 'var(--cor-elevado)',
    color: 'var(--cor-tinta)',
  }

  return (
    <Modal titulo="Publicar dashboard" onFechar={aoFechar}>
      <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--cor-mutado)' }}>
        Gere um link público para este dashboard. Qualquer pessoa com o link poderá visualizá-lo sem login.
      </p>

      {erro && <div className="text-sm mb-3" style={{ color: 'var(--cor-alerta)' }}>{erro}</div>}

      {link ? (
        <div className="mb-4">
          <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Link público</label>
          <div className="flex items-center gap-2">
            <input readOnly value={link} className="flex-1 rounded-lg px-3 py-2 text-[12.5px] border outline-none" style={inputStyle} />
            <Botao variante="secundario" onClick={copiar}>{copiado ? 'Copiado!' : 'Copiar'}</Botao>
          </div>
        </div>
      ) : (
        <Botao onClick={() => void gerar()} disabled={gerando} className="mb-4">
          {gerando ? 'Gerando…' : 'Gerar link público'}
        </Botao>
      )}

      {publicacoes.length > 0 && (
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--cor-mutado)' }}>
            Publicações existentes
          </div>
          <div className="flex flex-col gap-2">
            {publicacoes.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)' }}>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium truncate" style={{ color: 'var(--cor-tinta)' }}>#{p.id}</div>
                  <div className="text-[11.5px]" style={{ color: p.revogado_em ? 'var(--cor-alerta)' : 'var(--cor-sucesso)' }}>
                    {p.revogado_em ? 'Revogada' : 'Ativa'}
                  </div>
                </div>
                {!p.revogado_em && (
                  <button
                    onClick={() => void revogar(p.id)}
                    className="h-8 px-2.5 rounded-lg text-[12px] font-medium transition-colors"
                    style={{ color: 'var(--cor-alerta)' }}
                  >
                    Revogar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-5">
        <Botao variante="fantasma" onClick={aoFechar}>Fechar</Botao>
      </div>
    </Modal>
  )
}

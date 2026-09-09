import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { parseProjetoId } from '../lib/routes'

interface Props {
  projetoId: string | number
  onNomeCarregado?: (nome: string | null) => void
  onAntesDeNavegar?: () => Promise<boolean>
}

export default function ProjetoContextBar({ projetoId, onNomeCarregado, onAntesDeNavegar }: Props) {
  const id = parseProjetoId(projetoId)
  const navigate = useNavigate()
  const [filename, setFilename] = useState<string | null>(null)
  const [falha, setFalha] = useState(false)
  const navegar = useCallback((event: MouseEvent<HTMLAnchorElement>, destino: string) => {
    if (!onAntesDeNavegar || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    void onAntesDeNavegar()
      .then((podeNavegar) => { if (podeNavegar) navigate(destino) })
      .catch(() => undefined)
  }, [navigate, onAntesDeNavegar])

  useEffect(() => {
    let ativo = true
    setFilename(null)
    onNomeCarregado?.(null)
    setFalha(false)
    if (id === null) { setFalha(true); return () => { ativo = false } }
    api.get<{ filename: string | null }>(`/api/projetos/${id}`)
      .then((dados) => { if (ativo) { setFilename(dados.filename); onNomeCarregado?.(dados.filename) } })
      .catch(() => { if (ativo) { setFilename(null); onNomeCarregado?.(null); setFalha(true) } })
    return () => { ativo = false }
  }, [id, onNomeCarregado])

  return (
    <aside
      aria-label="Contexto do projeto"
      className="mb-6 rounded-2xl border border-[#1e2746]/80 bg-[#080d19]/80 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl"
    >
      <div className="rounded-xl border border-[#1f2740]/50 bg-[#121622]/95 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              falha ? 'bg-[#e07b1a] shadow-[0_0_10px_#e07b1a]' : 'bg-[#18d6ec] shadow-[0_0_12px_#18d6ec] animate-pulse'
            }`}
          />
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa3c7]">
              Projeto ativo · #{id ?? '—'}
            </div>
            <div className="truncate font-['Space_Grotesk'] text-[15px] font-semibold text-[#f5f7fc]">
              {filename ?? (falha ? 'Não foi possível carregar o projeto' : 'Carregando projeto…')}
            </div>
            {falha && <div className="mt-1 text-xs text-[#e07b1a]">Volte à lista para escolher um projeto autorizado.</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/projetos"
            onClick={(event) => navegar(event, '/projetos')}
            aria-label="Selecionar outro projeto"
            className="rounded-lg border border-[#1f2740] bg-[#1a2238]/60 px-3 py-1.5 text-xs font-semibold text-[#8fa3c7] hover:border-[#2e59f6]/60 hover:text-[#f5f7fc] transition-all active:scale-95"
          >
            Trocar projeto
          </Link>
          <Link
            to="/projetos"
            onClick={(event) => navegar(event, '/projetos')}
            className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#18d6ec] hover:text-[#f5f7fc] transition-colors"
          >
            Todos os projetos
          </Link>
        </div>
      </div>
    </aside>
  )
}

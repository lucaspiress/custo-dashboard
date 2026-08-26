import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { parseProjetoId } from '../lib/routes'

export default function ProjetoContextBar({ projetoId }: { projetoId: string | number }) {
  const id = parseProjetoId(projetoId)
  const [nome, setNome] = useState('Carregando projeto…')
  const [cliente, setCliente] = useState<string | null>(null)
  useEffect(() => {
    let ativo = true
    if (id === null) { setNome('Projeto indisponível'); return () => { ativo = false } }
    setNome('Carregando projeto…')
    api.get<{ projeto?: { nome?: string; cliente?: string | null }; nome?: string }>(`/api/projetos/${id}`)
      .then((dados) => { if (ativo) { setNome(dados.projeto?.nome ?? dados.nome ?? `Projeto #${id}`); setCliente(dados.projeto?.cliente ?? null) } })
      .catch(() => { if (ativo) setNome(`Projeto #${id}`) })
    return () => { ativo = false }
  }, [id])
  return <aside aria-label="Contexto do projeto" className="mb-6 rounded-xl border border-[#1f2740] bg-[#181f32] px-4 py-3 shadow-[0_8px_24px_rgba(5,10,25,0.16)]"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#18d6ec] shadow-[0_0_12px_rgba(24,214,236,0.7)]" /><div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa3c7]">Projeto ativo</div><div className="truncate font-['Space_Grotesk'] text-[15px] font-semibold text-[#f5f7fc]">{nome}</div></div>{cliente && <span className="hidden truncate border-l border-[#1f2740] pl-3 text-xs text-[#8fa3c7] sm:inline">{cliente}</span>}</div><div className="flex items-center gap-2"><Link to="/projetos" aria-label="Selecionar outro projeto" className="min-h-11 rounded-md border border-[#1f2740] px-3 py-2 text-xs font-medium text-[#8fa3c7] hover:border-[#2e59f6] hover:text-[#f5f7fc]">Trocar projeto</Link><Link to="/projetos" className="min-h-11 rounded-md px-2 py-2 text-xs font-medium text-[#18d6ec] hover:text-[#f5f7fc]">Todos os projetos</Link></div></div></aside>
}

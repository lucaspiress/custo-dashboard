import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarCompartilhados } from '../lib/api'
import type { Dashboard } from '../lib/types'
import AppShell from '../components/AppShell'
import { fmtData } from '../lib/format'

export default function CompartilhadosPage() {
  const navigate = useNavigate()
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro('')
    listarCompartilhados()
      .then((lista) => {
        if (ativo) setDashboards(lista)
      })
      .catch((e) => {
        if (ativo) setErro(e instanceof Error ? e.message : 'Erro ao carregar dashboards compartilhados.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [])

  return (
    <AppShell titulo="Dashboards compartilhados">
      {erro && <div className="text-sm mb-4" style={{ color: 'var(--cor-alerta)' }}>{erro}</div>}

      {carregando && <div className="text-[13px]" style={{ color: 'var(--cor-mutado)' }}>Carregando…</div>}

      {!carregando && dashboards.length === 0 && (
        <div className="rounded-2xl border p-10 text-center" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
          <div className="text-[15px] font-semibold mb-1.5" style={{ color: 'var(--cor-tinta)' }}>Nenhum dashboard interno</div>
          <div className="text-[13px]" style={{ color: 'var(--cor-mutado)' }}>
            Dashboards marcados como “Interno” aparecem aqui para todos os usuários logados.
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dashboards.map((d) => (
          <button
            key={d.id}
            onClick={() => navigate(`/projetos/${d.projeto_id}/dashboards/${d.id}`)}
            className="rounded-2xl border p-5 text-left transition-colors"
            style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[15px] font-semibold truncate" style={{ color: 'var(--cor-tinta)' }}>{d.nome}</span>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--cor-sucesso)' }}>
                Interno
              </span>
            </div>
            <div className="text-[12.5px]" style={{ color: 'var(--cor-mutado)' }}>
              {d.widgets?.length ?? 0} widget(s) · atualizado {fmtData(d.atualizado_em)}
            </div>
          </button>
        ))}
      </div>
    </AppShell>
  )
}

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import type { WidgetConfig, WidgetType } from '../lib/types'
import { renderWidget } from '../components/widgets/renderWidget'

interface PublicoWidget {
  id: number
  type: WidgetType
  config_json: WidgetConfig
  data: any
}

interface PublicoDashboard {
  nome: string
  widgets: PublicoWidget[]
}

export default function PublicoPage() {
  const { token } = useParams<{ token: string }>()
  const [dashboard, setDashboard] = useState<PublicoDashboard | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro('')
    api
      .get<PublicoDashboard>(`/p/${token}`)
      .then((d) => {
        if (ativo) setDashboard(d)
      })
      .catch((e) => {
        if (ativo) setErro(e instanceof Error ? e.message : 'Link inválido ou revogado.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [token])

  return (
    <div className="min-h-screen" style={{ background: 'var(--cor-fundo)', color: 'var(--cor-tinta)' }}>
      <div
        className="border-b px-5 py-3 flex items-center justify-between"
        style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}
      >
        <span className="text-[13px]" style={{ color: 'var(--cor-mutado)' }}>
          Você está visualizando um dashboard público via link.
        </span>
        <button
          onClick={() => window.print()}
          className="h-8 px-3 rounded-lg text-[12.5px] font-medium transition-colors"
          style={{ background: 'var(--cor-elevado)', color: 'var(--cor-tinta)', border: '1px solid var(--cor-borda)' }}
        >
          Imprimir
        </button>
      </div>

      <main className="max-w-[1280px] mx-auto px-5 py-6">
        {carregando && <div className="text-[13px]" style={{ color: 'var(--cor-mutado)' }}>Carregando…</div>}

        {erro && (
          <div className="rounded-2xl border p-10 text-center" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
            <div className="text-[15px] font-semibold mb-1.5" style={{ color: 'var(--cor-tinta)' }}>Dashboard indisponível</div>
            <div className="text-[13px]" style={{ color: 'var(--cor-mutado)' }}>{erro}</div>
          </div>
        )}

        {dashboard && (
          <>
            <h1 className="titulo-display text-[22px] font-bold mb-5" style={{ color: 'var(--cor-tinta)' }}>
              {dashboard.nome}
            </h1>
            {dashboard.widgets.length === 0 ? (
              <div className="rounded-2xl border p-10 text-center" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
                <div className="text-[14px]" style={{ color: 'var(--cor-mutado)' }}>Este dashboard não possui widgets.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {dashboard.widgets.map((w) => (
                  <div key={w.id} className="rounded-2xl border p-3" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
                    <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--cor-mutado)' }}>
                      {w.type}
                    </div>
                    <div style={{ height: '220px' }}>
                      {renderWidget({ id: w.id, dashboard_id: 0, type: w.type, dataset_id: '', config_json: w.config_json, position_json: { x: 0, y: 0, w: 4, h: 3 }, ordem: 0 }, w.data)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

import type { WidgetConfig } from '../../lib/types'
import { fmtNum } from './chartUtils'

interface Props {
  data: any
  config?: WidgetConfig
  titulo?: string
}

export default function KpiCard({ data, config, titulo }: Props) {
  const valor = data?.value ?? data?.valor ?? 0
  const variacao = data?.variacao ?? data?.variation
  const temVariacao = variacao !== undefined && variacao !== null && !Number.isNaN(Number(variacao))
  const positivo = Number(variacao) >= 0

  return (
    <div className="flex flex-col justify-center h-full px-2">
      <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--cor-mutado)' }}>
        {titulo ?? config?.field ?? 'KPI'}
      </div>
      <div className="text-[30px] font-bold tabular-nums leading-tight" style={{ color: 'var(--cor-tinta)' }}>
        {fmtNum(valor)}
      </div>
      {temVariacao && (
        <div
          className="inline-flex items-center gap-1 mt-1 text-[12px] font-semibold"
          style={{ color: positivo ? 'var(--cor-sucesso)' : 'var(--cor-alerta)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {positivo ? <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /> : <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />}
            {positivo ? <polyline points="17 6 23 6 23 12" /> : <polyline points="17 18 23 18 23 12" />}
          </svg>
          {fmtNum(variacao)}%
        </div>
      )}
    </div>
  )
}

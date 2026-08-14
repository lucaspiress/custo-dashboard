import type { CSSProperties } from 'react'
import { COR } from '../lib/theme'

interface Props {
  rotulo: string
  valor: string
  sub?: string
  cor?: string
  atraso?: number
  badge?: string
  badgePositivo?: boolean
}

export default function KpiCard({ rotulo, valor, sub, cor = COR.primaria, atraso = 0, badge, badgePositivo = true }: Props) {
  const estilo = {
    '--kpi-cor': cor,
    animationDelay: `${atraso}ms`,
  } as CSSProperties
  return (
    <div className="kpi-card" style={estilo}>
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[11px] font-semibold tracking-wider uppercase"
          style={{ color: 'var(--cor-mutado)' }}
        >
          {rotulo}
        </span>
        {badge && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold tabular-nums"
            style={{
              background: `${cor}1a`,
              color: badgePositivo ? cor : 'var(--cor-alerta)',
              border: `1px solid ${badgePositivo ? `${cor}40` : 'var(--cor-alerta)'}`,
            }}
          >
            {badgePositivo ? '▲' : '▼'} {badge}
          </span>
        )}
      </div>
      <div className="kpi-value">{valor}</div>
      {sub && <div className="text-xs mt-[3px]" style={{ color: 'var(--cor-mutado)' }}>{sub}</div>}
    </div>
  )
}

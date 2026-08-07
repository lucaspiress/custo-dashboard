import type { CSSProperties } from 'react'

interface Props {
  rotulo: string
  valor: string
  sub?: string
  cor?: string
  atraso?: number
}

export default function KpiCard({ rotulo, valor, sub, cor = '#1E40AF', atraso = 0 }: Props) {
  const estilo = { '--kpi-cor': cor, animationDelay: `${atraso}ms` } as CSSProperties
  return (
    <div className="kpi-card" style={estilo}>
      <div className="flex items-center mb-1">
        <span className="w-2 h-2 rounded-full mr-2" style={{ background: cor }} />
        <span className="text-[11.5px] font-medium tracking-wide uppercase text-mutado">{rotulo}</span>
      </div>
      <div className="kpi-value">{valor}</div>
      {sub && <div className="text-xs text-mutado mt-[3px]">{sub}</div>}
    </div>
  )
}

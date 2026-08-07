import type { CSSProperties } from 'react'
import { SEVERIDADE } from '../lib/theme'

interface Props {
  severidade: 'ok' | 'atencao' | 'alerta' | 'dica'
  texto: string
  atraso?: number
}

export default function InsightCard({ severidade, texto, atraso = 0 }: Props) {
  const s = SEVERIDADE[severidade] ?? SEVERIDADE.ok
  const estilo = {
    '--insight-cor': s.cor,
    '--insight-fundo': s.fundo,
    '--insight-borda': s.borda,
    animationDelay: `${atraso}ms`,
  } as CSSProperties
  return (
    <div className="insight-card flex items-start gap-2" style={estilo}>
      <span className="insight-pill shrink-0">{s.rotulo}</span>
      <span className="text-[13.5px] text-tinta leading-snug">{texto}</span>
    </div>
  )
}

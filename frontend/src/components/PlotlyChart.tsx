import { lazy, Suspense, useMemo } from 'react'

const Plot = lazy(() => import('react-plotly.js'))

interface Props {
  figJson: string
}

interface Fig {
  data?: unknown[]
  layout?: { height?: number }
  config?: Record<string, unknown>
}

export default function PlotlyChart({ figJson }: Props) {
  const fig = useMemo<Fig | null>(() => {
    try {
      return JSON.parse(figJson) as Fig
    } catch {
      return null
    }
  }, [figJson])

  if (!fig) return null
  return (
    <div className="grafico-caixa">
      <Suspense fallback={<div className="h-[360px] flex items-center justify-center text-sm text-mutado">Carregando gráfico…</div>}>
        <Plot
          data={fig.data ?? []}
          layout={fig.layout ?? {}}
          config={{ responsive: true, ...fig.config }}
          useResizeHandler
          style={{ width: '100%', height: (fig.layout?.height ?? 440) as number }}
        />
      </Suspense>
    </div>
  )
}

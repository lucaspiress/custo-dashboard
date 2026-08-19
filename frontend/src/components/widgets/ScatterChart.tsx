import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { WidgetConfig } from '../../lib/types'
import { criarOnEvents, normalizarSeries } from './chartUtils'

interface Props {
  data: any
  config?: WidgetConfig
  onDrillClick?: (campo: string, valor: any) => void
}

const EIXO_LABEL = { color: '#8fa3c7' }
const EIXO_LINHA = { lineStyle: { color: '#1f2740' } }
const SPLIT = { lineStyle: { color: '#1f2740' } }

export default function ScatterChart({ data, config, onDrillClick }: Props) {
  const { x, series } = normalizarSeries(data)
  const onEvents = useMemo(() => criarOnEvents(onDrillClick, config?.x), [onDrillClick, config?.x])
  const pontos = x.map((v, i) => [v, series[0]?.data?.[i] ?? 0])
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    xAxis: { type: 'value', axisLabel: EIXO_LABEL, axisLine: EIXO_LINHA, splitLine: SPLIT },
    yAxis: { type: 'value', axisLabel: EIXO_LABEL, splitLine: SPLIT },
    series: [
      {
        name: 'Valor',
        type: 'scatter',
        data: pontos,
        symbolSize: 10,
        itemStyle: { color: '#2e59f6', opacity: 0.8 },
      },
    ],
  }
  return <ReactECharts option={option} onEvents={onEvents} theme="dark" notMerge style={{ height: '100%', width: '100%' }} />
}

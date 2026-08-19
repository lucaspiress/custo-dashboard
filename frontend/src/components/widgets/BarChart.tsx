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

export default function BarChart({ data, config, onDrillClick }: Props) {
  const { x, series } = normalizarSeries(data)
  const onEvents = useMemo(() => criarOnEvents(onDrillClick, config?.x), [onDrillClick, config?.x])
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: series.length > 1 ? { textStyle: { color: '#8fa3c7' }, top: 0 } : undefined,
    grid: { left: 8, right: 16, top: series.length > 1 ? 32 : 16, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: x, axisLabel: EIXO_LABEL, axisLine: EIXO_LINHA },
    yAxis: { type: 'value', axisLabel: EIXO_LABEL, splitLine: SPLIT },
    series: series.map((s, i) => ({
      name: s.name,
      type: 'bar',
      data: s.data,
      itemStyle: { color: i === 0 ? '#2e59f6' : '#18d6ec' },
      barMaxWidth: 40,
    })),
  }
  return <ReactECharts option={option} onEvents={onEvents} theme="dark" notMerge style={{ height: '100%', width: '100%' }} />
}

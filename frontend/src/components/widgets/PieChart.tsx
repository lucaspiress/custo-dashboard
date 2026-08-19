import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { WidgetConfig } from '../../lib/types'
import { criarOnEvents, normalizarSeries } from './chartUtils'

interface Props {
  data: any
  config?: WidgetConfig
  onDrillClick?: (campo: string, valor: any) => void
}

const CORES = ['#2e59f6', '#18d6ec', '#10b981', '#e07b1a', '#6649df', '#f43f5e', '#3b82f6', '#94a3b8']

export default function PieChart({ data, config, onDrillClick }: Props) {
  const { x, series } = normalizarSeries(data)
  const onEvents = useMemo(() => criarOnEvents(onDrillClick, config?.x), [onDrillClick, config?.x])
  // pizza usa x como rótulos e a primeira série como valores
  const valores = series[0]?.data ?? []
  const dados = x.map((label, i) => ({ name: String(label), value: valores[i] ?? 0 }))
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    legend: { textStyle: { color: '#8fa3c7' }, bottom: 0 },
    series: [
      {
        name: 'Valor',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#181f32', borderWidth: 2 },
        label: { color: '#f5f7fc' },
        data: dados,
        color: CORES,
      },
    ],
  }
  return <ReactECharts option={option} onEvents={onEvents} theme="dark" notMerge style={{ height: '100%', width: '100%' }} />
}

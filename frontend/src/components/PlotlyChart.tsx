import { lazy, Suspense, useMemo } from 'react'

const Plot = lazy(() => import('react-plotly.js'))

interface Props { figJson: string }
type Axis = { title?: string | { text?: string }; overlaying?: string; side?: string }
type Trace = { x?: unknown[]; y?: unknown[]; z?: unknown[]; labels?: unknown[]; values?: unknown[]; text?: unknown[]; name?: string; type?: string; orientation?: 'h' | 'v'; xaxis?: string; yaxis?: string }
type Fig = { data?: unknown[]; layout?: Record<string, unknown>; config?: Record<string, unknown> }
type Row = { serie: string; categoria: string; valor: string; eixo: string; rotulo: string }

const texto = (value: unknown) => typeof value === 'string' ? value : (value && typeof value === 'object' && 'text' in value ? String((value as { text?: unknown }).text ?? '') : '')
const lista = (value: unknown): unknown[] => Array.isArray(value) ? value : []

export default function PlotlyChart({ figJson }: Props) {
  const fig = useMemo<Fig | null>(() => { try { return JSON.parse(figJson) as Fig } catch { return null } }, [figJson])
  if (!fig) return <div role="alert" className="rounded-xl border p-4 text-sm text-alerta">Não foi possível exibir este gráfico.</div>

  const rawLayout = (fig.layout ?? {}) as Record<string, unknown>
  const layout = useMemo<Record<string, unknown>>(() => ({
    ...rawLayout,
    template: 'plotly_dark',
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
  }), [rawLayout])
  const titulo = texto(layout.title)
  const axes = Object.entries(layout).filter(([key, value]) => /^xaxis\d*$|^yaxis\d*$/.test(key) && value && typeof value === 'object') as Array<[string, Axis]>
  const unidades = axes.map(([, axis]) => texto(axis.title)).filter(Boolean)
  const unidade = Array.from(new Set(unidades)).join(' / ')
  const anotacoes = lista(layout.annotations).map((item) => item && typeof item === 'object' ? texto((item as { text?: unknown }).text) : '').filter(Boolean)
  const referencias = lista(layout.shapes).map((item) => {
    if (!item || typeof item !== 'object') return ''
    const shape = item as { label?: { text?: unknown }; name?: unknown; type?: unknown; x0?: unknown; x1?: unknown; y0?: unknown; y1?: unknown }
    const label = texto(shape.label?.text) || texto(shape.name) || texto(shape.type)
    const coordenadas = [shape.x0, shape.x1, shape.y0, shape.y1].filter((value) => value !== undefined).map(String).join('–')
    return coordenadas ? `${label} (${coordenadas})` : label
  }).filter(Boolean)
  const series = (fig.data ?? []).filter((item): item is Trace => Boolean(item && typeof item === 'object'))
  const axisTitle = (kind: 'x' | 'y', id?: string) => {
    const key = `${kind}axis${id && id !== kind ? id.replace(kind, '') : ''}`
    const axis = layout[key]
    return axis && typeof axis === 'object' ? texto((axis as Axis).title) || kind.toUpperCase() : kind.toUpperCase()
  }
  const rows: Row[] = series.flatMap((serie) => {
    const horizontal = serie.orientation === 'h'
    const valores = lista(serie.values ?? (horizontal ? serie.x : serie.y) ?? serie.z)
    const categorias = lista(serie.labels ?? (horizontal ? serie.y : serie.x))
    const xLabel = axisTitle('x', serie.xaxis)
    const yLabel = axisTitle('y', serie.yaxis)
    return valores.map((valor, index) => ({
      serie: serie.name ?? 'Série', categoria: String(categorias[index] ?? index + 1), valor: String(valor),
      eixo: horizontal ? `${xLabel} / ${yLabel}` : `${xLabel} / ${yLabel}`,
      rotulo: String(serie.text?.[index] ?? ''),
    }))
  })
  const contexto = [...anotacoes, ...referencias]
  const nomesSeries = series.map((serie) => serie.name ?? 'Série')
  const resumo = rows.length > 0
    ? `${rows.length} ponto(s) de dados${titulo ? ` em ${titulo}` : ''}${unidade ? `, unidade: ${unidade}` : ''}. Séries: ${Array.from(new Set(nomesSeries)).join(', ')}. ${contexto.length ? `Referências: ${contexto.join('; ')}. ` : ''}Consulte a tabela equivalente abaixo.`
    : 'Não há dados disponíveis para este gráfico.'
  return <section className="grafico-caixa" aria-label={titulo || 'Gráfico'}>
    {titulo && <h3 className="sr-only">{titulo}</h3>}
    <p className="sr-only">{resumo}</p>
    <Suspense fallback={<div className="h-[360px] flex items-center justify-center text-sm text-mutado">Carregando gráfico…</div>}>
      <Plot data={fig.data ?? []} layout={layout} config={{ responsive: true, ...fig.config }} useResizeHandler style={{ width: '100%', height: Number(layout.height ?? 440) }} />
    </Suspense>
    <details className="border-t px-3 py-2 text-sm text-mutado">
      <summary className="cursor-pointer min-h-11 flex items-center">Ver dados do gráfico</summary>
      {contexto.length > 0 && <p className="py-2">{contexto.join(' · ')}</p>}
      {rows.length > 0 ? <div className="overflow-x-auto"><table className="w-full text-left"><caption className="sr-only">Dados de {titulo || 'gráfico'}</caption><thead><tr><th scope="col" className="px-2 py-1">Série</th><th scope="col" className="px-2 py-1">Categoria / rótulo</th><th scope="col" className="px-2 py-1">Eixos</th><th scope="col" className="px-2 py-1">Valor{unidade ? ` (${unidade})` : ''}</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.serie}-${row.categoria}-${index}`}><td className="px-2 py-1">{row.serie}</td><td className="px-2 py-1">{row.categoria}{row.rotulo ? ` · ${row.rotulo}` : ''}</td><td className="px-2 py-1">{row.eixo}</td><td className="px-2 py-1 font-mono">{row.valor}</td></tr>)}</tbody></table></div> : <p className="py-2">Não há dados disponíveis para este gráfico.</p>}
    </details>
  </section>
}

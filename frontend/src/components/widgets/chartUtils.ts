export interface Serie {
  name: string
  data: any[]
}

export interface ChartData {
  x: any[]
  series: Serie[]
}

/** Normaliza o output do agregador em {x, series} para os gráficos ECharts. */
export function normalizarSeries(data: any): ChartData {
  const x = Array.isArray(data?.x) ? data.x : []
  if (Array.isArray(data?.series) && data.series.length > 0) {
    return {
      x,
      series: data.series.map((s: any) => ({
        name: s?.name ?? 'Série',
        data: Array.isArray(s?.data) ? s.data : [],
      })),
    }
  }
  const y = Array.isArray(data?.y) ? data.y : []
  return { x, series: [{ name: 'Valor', data: y }] }
}

/** Formata número para exibição (pt-BR), tolerando strings/undefined. */
export function fmtNum(valor: any): string {
  const n = Number(valor)
  if (valor === null || valor === undefined || valor === '' || Number.isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

/** Cria o handler de click do ECharts para drill-down. Extrai o valor do eixo X do `params`. */
export function criarOnEvents(
  onDrillClick?: (campo: string, valor: any) => void,
  campo?: string,
): Record<string, (params: any) => void> {
  return {
    click: (params: any) => {
      if (!onDrillClick || !campo) return
      const valor = params?.name ?? params?.value?.[0]
      if (valor !== undefined && valor !== null) onDrillClick(campo, valor)
    },
  }
}

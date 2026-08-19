import type { Widget } from '../../lib/types'
import { AreaChart, BarChart, KpiCard, LineChart, PieChart, PivotWidget, ScatterChart, TableWidget } from './index'

/** Renderiza um widget pelo tipo, reutilizado pelo builder e pela página pública. */
export function renderWidget(
  widget: Widget,
  data: any,
  onDrillClick?: (campo: string, valor: any) => void,
) {
  switch (widget.type) {
    case 'bar':
      return <BarChart data={data} config={widget.config_json} onDrillClick={onDrillClick} />
    case 'line':
      return <LineChart data={data} config={widget.config_json} onDrillClick={onDrillClick} />
    case 'area':
      return <AreaChart data={data} config={widget.config_json} onDrillClick={onDrillClick} />
    case 'pie':
      return <PieChart data={data} config={widget.config_json} onDrillClick={onDrillClick} />
    case 'scatter':
      return <ScatterChart data={data} config={widget.config_json} onDrillClick={onDrillClick} />
    case 'kpi':
      return <KpiCard data={data} config={widget.config_json} titulo={widget.config_json.field ?? 'KPI'} />
    case 'table':
      return <TableWidget data={data} config={widget.config_json} />
    case 'pivot':
      return <PivotWidget data={data} config={widget.config_json} />
    default:
      return <div className="text-[12.5px]" style={{ color: 'var(--cor-mutado)' }}>Widget não suportado</div>
  }
}

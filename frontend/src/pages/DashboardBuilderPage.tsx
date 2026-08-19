import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  adicionarSlicer,
  adicionarWidget,
  atualizarDashboard,
  atualizarWidget,
  criarDashboard,
  deletarDashboard,
  deletarSlicer,
  deletarWidget,
  executarQuery,
  listarCamposCalculados,
  listarDashboards,
  listarDatasets,
  obterDashboard,
} from '../lib/api'
import type {
  Aggregation,
  CampoCalculado,
  Dashboard,
  Dataset,
  Slicer,
  Widget,
  WidgetConfig,
  WidgetType,
} from '../lib/types'
import AppShell from '../components/AppShell'
import Botao from '../components/ui/Botao'
import Modal from '../components/ui/Modal'
import SlicerBar from '../components/SlicerBar'
import {
  AreaChart,
  BarChart,
  KpiCard,
  LineChart,
  PieChart,
  PivotWidget,
  ScatterChart,
  TableWidget,
} from '../components/widgets'

const ICONE_PLANILHA = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /></svg>
)
const ICONE_DASHBOARD = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
)
const ICONE_DATASETS = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
)
const ICONE_MAIS = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)
const ICONE_LIXO = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
)

const TIPOS_WIDGET: { value: WidgetType; label: string }[] = [
  { value: 'bar', label: 'Barras' },
  { value: 'line', label: 'Linha' },
  { value: 'area', label: 'Área' },
  { value: 'pie', label: 'Pizza' },
  { value: 'scatter', label: 'Dispersão' },
  { value: 'kpi', label: 'KPI' },
  { value: 'table', label: 'Tabela' },
  { value: 'pivot', label: 'Pivot' },
]

const AGGREGATIONS: { value: Aggregation; label: string }[] = [
  { value: 'sum', label: 'Soma' },
  { value: 'avg', label: 'Média' },
  { value: 'count', label: 'Contagem' },
  { value: 'min', label: 'Mínimo' },
  { value: 'max', label: 'Máximo' },
]

function renderWidget(
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

function ModalNovoDashboard({
  aoSalvar,
  aoCancelar,
}: {
  aoSalvar: (nome: string) => void
  aoCancelar: () => void
}) {
  const [nome, setNome] = useState('')
  return (
    <Modal titulo="Novo dashboard" onFechar={aoCancelar}>
      <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Nome do dashboard</label>
      <input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void aoSalvar(nome.trim())}
        placeholder="Ex.: Visão Comercial"
        className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
        style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)', color: 'var(--cor-tinta)' }}
      />
      <div className="flex justify-end gap-2 mt-5">
        <Botao variante="fantasma" onClick={aoCancelar}>Cancelar</Botao>
        <Botao onClick={() => void aoSalvar(nome.trim())} disabled={!nome.trim()}>Criar</Botao>
      </div>
    </Modal>
  )
}

function ModalNovoWidget({
  datasets,
  aoSalvar,
  aoCancelar,
}: {
  datasets: Dataset[]
  aoSalvar: (type: WidgetType, dataset_id: string, config: WidgetConfig) => void
  aoCancelar: () => void
}) {
  const [type, setType] = useState<WidgetType>('bar')
  const [dataset_id, setDatasetId] = useState(datasets[0]?.id ?? '')
  const [x, setX] = useState('')
  const [y, setY] = useState('')
  const [field, setField] = useState('')
  const [colunas, setColunas] = useState('')
  const [linhas, setLinhas] = useState('')
  const [colunasPivot, setColunasPivot] = useState('')
  const [metrica, setMetrica] = useState('')
  const [aggregation, setAggregation] = useState<Aggregation>('sum')

  function salvar() {
    const config: WidgetConfig = { aggregation }
    if (type === 'bar' || type === 'line' || type === 'area' || type === 'pie' || type === 'scatter') {
      config.x = x.trim() || undefined
      config.y = y.split(',').map((s) => s.trim()).filter(Boolean)
    } else if (type === 'kpi') {
      config.field = field.trim() || undefined
    } else if (type === 'table') {
      config.colunas = colunas.split(',').map((s) => s.trim()).filter(Boolean)
    } else if (type === 'pivot') {
      config.linhas = linhas.split(',').map((s) => s.trim()).filter(Boolean)
      config.colunas_pivot = colunasPivot.split(',').map((s) => s.trim()).filter(Boolean)
      config.metrica = metrica.trim() || undefined
    }
    aoSalvar(type, dataset_id, config)
  }

  const inputStyle = {
    borderColor: 'var(--cor-borda)',
    background: 'var(--cor-elevado)',
    color: 'var(--cor-tinta)',
  }

  return (
    <Modal titulo="Novo widget" onFechar={aoCancelar}>
      <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Tipo</label>
      <select value={type} onChange={(e) => setType(e.target.value as WidgetType)} className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle}>
        {TIPOS_WIDGET.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Dataset</label>
      <select value={dataset_id} onChange={(e) => setDatasetId(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle}>
        {datasets.map((d) => (
          <option key={d.id} value={d.id}>{d.nome}</option>
        ))}
      </select>

      {(type === 'bar' || type === 'line' || type === 'area' || type === 'pie' || type === 'scatter') && (
        <>
          <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Eixo X (campo)</label>
          <input value={x} onChange={(e) => setX(e.target.value)} placeholder="Ex.: categoria" className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle} />
          <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Eixo Y (campos, vírgula)</label>
          <input value={y} onChange={(e) => setY(e.target.value)} placeholder="Ex.: valor, custo" className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle} />
        </>
      )}
      {type === 'kpi' && (
        <>
          <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Campo</label>
          <input value={field} onChange={(e) => setField(e.target.value)} placeholder="Ex.: valor" className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle} />
        </>
      )}
      {type === 'table' && (
        <>
          <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Colunas (vírgula)</label>
          <input value={colunas} onChange={(e) => setColunas(e.target.value)} placeholder="Ex.: nome, valor" className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle} />
        </>
      )}
      {type === 'pivot' && (
        <>
          <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Linhas (vírgula)</label>
          <input value={linhas} onChange={(e) => setLinhas(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle} />
          <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Colunas (vírgula)</label>
          <input value={colunasPivot} onChange={(e) => setColunasPivot(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle} />
          <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Métrica</label>
          <input value={metrica} onChange={(e) => setMetrica(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle} />
        </>
      )}
      {(type === 'bar' || type === 'line' || type === 'area' || type === 'pie' || type === 'kpi' || type === 'pivot') && (
        <>
          <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Agregação</label>
          <select value={aggregation} onChange={(e) => setAggregation(e.target.value as Aggregation)} className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle}>
            {AGGREGATIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </>
      )}
      <div className="flex justify-end gap-2 mt-5">
        <Botao variante="fantasma" onClick={aoCancelar}>Cancelar</Botao>
        <Botao onClick={() => void salvar()}>Adicionar</Botao>
      </div>
    </Modal>
  )
}

function ModalNovoSlicer({
  datasets,
  aoSalvar,
  aoCancelar,
}: {
  datasets: Dataset[]
  aoSalvar: (dataset_id: string, field: string, tipo: Slicer['tipo']) => void
  aoCancelar: () => void
}) {
  const [dataset_id, setDatasetId] = useState(datasets[0]?.id ?? '')
  const [field, setField] = useState('')
  const [tipo, setTipo] = useState<Slicer['tipo']>('lista')

  const inputStyle = {
    borderColor: 'var(--cor-borda)',
    background: 'var(--cor-elevado)',
    color: 'var(--cor-tinta)',
  }

  return (
    <Modal titulo="Novo filtro (slicer)" onFechar={aoCancelar}>
      <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Dataset</label>
      <select value={dataset_id} onChange={(e) => setDatasetId(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle}>
        {datasets.map((d) => (
          <option key={d.id} value={d.id}>{d.nome}</option>
        ))}
      </select>
      <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Campo</label>
      <input value={field} onChange={(e) => setField(e.target.value)} placeholder="Ex.: categoria" className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle} />
      <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Tipo</label>
      <select value={tipo} onChange={(e) => setTipo(e.target.value as Slicer['tipo'])} className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle}>
        <option value="lista">Lista</option>
        <option value="intervalo">Intervalo</option>
        <option value="data">Data</option>
      </select>
      <div className="flex justify-end gap-2 mt-5">
        <Botao variante="fantasma" onClick={aoCancelar}>Cancelar</Botao>
        <Botao onClick={() => void aoSalvar(dataset_id, field.trim(), tipo)} disabled={!field.trim()}>Adicionar</Botao>
      </div>
    </Modal>
  )
}

function PainelConfigWidget({
  widget,
  datasets,
  onDataset,
  onConfig,
  onFechar,
  onRemover,
  colunasDisponiveis,
}: {
  widget: Widget
  datasets: Dataset[]
  onDataset: (wid: number, dataset_id: string) => void
  onConfig: (wid: number, patch: Partial<WidgetConfig>) => void
  onFechar: () => void
  onRemover: (wid: number) => void
  colunasDisponiveis: string[]
}) {
  const cfg = widget.config_json
  const inputStyle = {
    borderColor: 'var(--cor-borda)',
    background: 'var(--cor-elevado)',
    color: 'var(--cor-tinta)',
  }
  const labelStyle = { color: 'var(--cor-mutado)' } as const

  return (
    <aside className="w-72 shrink-0 rounded-2xl border p-4 self-start" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
      <datalist id="colunas-widget">
        {colunasDisponiveis.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-semibold uppercase" style={{ color: 'var(--cor-tinta)' }}>{widget.type}</span>
        <button onClick={onFechar} className="text-[16px]" style={{ color: 'var(--cor-mutado)' }}>×</button>
      </div>
      <label className="block text-[12px] mb-1.5" style={labelStyle}>Dataset</label>
      <select value={widget.dataset_id} onChange={(e) => onDataset(widget.id, e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle}>
        {datasets.map((d) => (
          <option key={d.id} value={d.id}>{d.nome}</option>
        ))}
      </select>

      {(widget.type === 'bar' || widget.type === 'line' || widget.type === 'area' || widget.type === 'pie' || widget.type === 'scatter') && (
        <>
          <label className="block text-[12px] mb-1.5" style={labelStyle}>Eixo X</label>
          <input list="colunas-widget" value={cfg.x ?? ''} onChange={(e) => onConfig(widget.id, { x: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle} />
          <label className="block text-[12px] mb-1.5" style={labelStyle}>Eixo Y (vírgula)</label>
          <input list="colunas-widget" value={(cfg.y ?? []).join(', ')} onChange={(e) => onConfig(widget.id, { y: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle} />
        </>
      )}
      {widget.type === 'kpi' && (
        <>
          <label className="block text-[12px] mb-1.5" style={labelStyle}>Campo</label>
          <input list="colunas-widget" value={cfg.field ?? ''} onChange={(e) => onConfig(widget.id, { field: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle} />
        </>
      )}
      {widget.type === 'table' && (
        <>
          <label className="block text-[12px] mb-1.5" style={labelStyle}>Colunas (vírgula)</label>
          <input value={(cfg.colunas ?? []).join(', ')} onChange={(e) => onConfig(widget.id, { colunas: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle} />
        </>
      )}
      {widget.type === 'pivot' && (
        <>
          <label className="block text-[12px] mb-1.5" style={labelStyle}>Linhas (vírgula)</label>
          <input value={(cfg.linhas ?? []).join(', ')} onChange={(e) => onConfig(widget.id, { linhas: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle} />
          <label className="block text-[12px] mb-1.5" style={labelStyle}>Colunas (vírgula)</label>
          <input value={(cfg.colunas_pivot ?? []).join(', ')} onChange={(e) => onConfig(widget.id, { colunas_pivot: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle} />
          <label className="block text-[12px] mb-1.5" style={labelStyle}>Métrica</label>
          <input value={cfg.metrica ?? ''} onChange={(e) => onConfig(widget.id, { metrica: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle} />
        </>
      )}
      {(widget.type === 'bar' || widget.type === 'line' || widget.type === 'area' || widget.type === 'pie' || widget.type === 'kpi' || widget.type === 'pivot') && (
        <>
          <label className="block text-[12px] mb-1.5" style={labelStyle}>Agregação</label>
          <select value={cfg.aggregation ?? 'sum'} onChange={(e) => onConfig(widget.id, { aggregation: e.target.value as Aggregation })} className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3" style={inputStyle}>
            {AGGREGATIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </>
      )}
      <button
        onClick={() => onRemover(widget.id)}
        className="h-9 w-full rounded-lg text-[13px] font-medium inline-flex items-center justify-center gap-2 transition-colors"
        style={{ color: 'var(--cor-alerta)', border: '1px solid var(--cor-borda)' }}
      >
        {ICONE_LIXO}
        Remover widget
      </button>
    </aside>
  )
}

export default function DashboardBuilderPage() {
  const { id, dbid } = useParams<{ id: string; dbid?: string }>()
  const navigate = useNavigate()
  const projetoId = Number(id)

  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [modo, setModo] = useState<'editar' | 'visualizar'>('visualizar')
  const [widgetSelecionado, setWidgetSelecionado] = useState<Widget | null>(null)
  const [dadosWidgets, setDadosWidgets] = useState<Record<number, any>>({})
  const [opcoesSlicers, setOpcoesSlicers] = useState<Record<number, any[]>>({})
  const [valoresSlicers, setValoresSlicers] = useState<Record<number, any>>({})
  const [modificados, setModificados] = useState<Set<number>>(new Set())
  const [carregando, setCarregando] = useState(true)
  const [carregandoDados, setCarregandoDados] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [modalNovoDashboard, setModalNovoDashboard] = useState(false)
  const [modalNovoWidget, setModalNovoWidget] = useState(false)
  const [modalNovoSlicer, setModalNovoSlicer] = useState(false)
  const [dragId, setDragId] = useState<number | null>(null)
  const [nomeEditando, setNomeEditando] = useState<string | null>(null)
  const [drillFilter, setDrillFilter] = useState<{
    widgetOrigemId: number
    campo: string
    valor: any
  } | null>(null)
  const [camposCalculados, setCamposCalculados] = useState<Record<string, CampoCalculado[]>>({})

  const dashboardRef = useRef(dashboard)
  dashboardRef.current = dashboard

  const widgets = useMemo(() => dashboard?.widgets ?? [], [dashboard])
  const slicers = useMemo(() => dashboard?.slicers ?? [], [dashboard])

  function colunasDoDataset(datasetId: string): string[] {
    const ds = datasets.find((d) => d.id === datasetId)
    const cols = ds ? Object.keys(ds.schema_json ?? {}) : []
    const campos = camposCalculados[datasetId] ?? []
    return [...new Set([...cols, ...campos.map((c) => c.nome)])]
  }

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro('')
    Promise.all([listarDashboards(projetoId), listarDatasets(projetoId)])
      .then(([dbs, dss]) => {
        if (!ativo) return
        setDashboards(dbs)
        setDatasets(dss)
      })
      .catch((e) => {
        if (ativo) setErro(e instanceof Error ? e.message : 'Erro ao carregar dashboards.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [projetoId])

  useEffect(() => {
    setDashboard(null)
    setDadosWidgets({})
    setValoresSlicers({})
    setOpcoesSlicers({})
    setWidgetSelecionado(null)
    setModificados(new Set())
    setDrillFilter(null)
    setCamposCalculados({})
    if (!dbid) return
    let ativo = true
    setCarregando(true)
    setErro('')
    obterDashboard(projetoId, Number(dbid))
      .then((d) => {
        if (!ativo) return
        setDashboard(d)
        const vals: Record<number, any> = {}
        for (const s of d.slicers ?? []) vals[s.id] = s.tipo === 'lista' ? [] : ['', '']
        setValoresSlicers(vals)
        // busca campos calculados dos datasets numéricos usados pelos widgets
        const dids = new Set<string>()
        for (const w of d.widgets ?? []) {
          if (/^\d+$/.test(w.dataset_id)) dids.add(w.dataset_id)
        }
        Promise.all(
          [...dids].map(async (did) => {
            try {
              return { did, campos: await listarCamposCalculados(Number(did)) }
            } catch {
              return { did, campos: [] }
            }
          })
        ).then((res) => {
          if (!ativo) return
          const mapa: Record<string, CampoCalculado[]> = {}
          for (const r of res) mapa[r.did] = r.campos
          setCamposCalculados(mapa)
        })
      })
      .catch((e) => {
        if (ativo) setErro(e instanceof Error ? e.message : 'Erro ao carregar dashboard.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [projetoId, dbid])

  async function rodarQuery(widgetIds?: number[]) {
    const d = dashboardRef.current
    if (!d) return
    setCarregandoDados(true)
    setErro('')
    try {
      const ids = widgetIds ?? d.widgets?.map((w) => w.id)
      const drill_filters = drillFilter
        ? { [String(drillFilter.widgetOrigemId)]: { [drillFilter.campo]: drillFilter.valor } }
        : undefined
      const res = await executarQuery(d.id, ids, valoresSlicers, drill_filters)
      const dados: Record<number, any> = {}
      for (const w of res.widgets) dados[w.widget_id] = w.data
      setDadosWidgets(dados)
      const opcoes: Record<number, any[]> = {}
      for (const s of res.slicers) opcoes[s.slicer_id] = s.options
      setOpcoesSlicers(opcoes)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao executar query.')
    } finally {
      setCarregandoDados(false)
    }
  }

  useEffect(() => {
    if (dashboard) void rodarQuery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard?.id, valoresSlicers, drillFilter])

  function atualizarWidgetLocal(wid: number, changes: Partial<Widget>) {
    setDashboard((d) =>
      d ? { ...d, widgets: d.widgets?.map((w) => (w.id === wid ? { ...w, ...changes } : w)) } : d
    )
    setModificados((s) => new Set(s).add(wid))
  }

  function atualizarConfig(wid: number, patch: Partial<WidgetConfig>) {
    setDashboard((d) =>
      d
        ? {
            ...d,
            widgets: d.widgets?.map((w) =>
              w.id === wid ? { ...w, config_json: { ...w.config_json, ...patch } } : w
            ),
          }
        : d
    )
    setModificados((s) => new Set(s).add(wid))
  }

  function trocarWidgets(a: number, b: number) {
    setDashboard((d) => {
      if (!d?.widgets) return d
      const lista = [...d.widgets]
      const ia = lista.findIndex((w) => w.id === a)
      const ib = lista.findIndex((w) => w.id === b)
      if (ia < 0 || ib < 0) return d
      ;[lista[ia], lista[ib]] = [lista[ib], lista[ia]]
      return { ...d, widgets: lista.map((w, i) => ({ ...w, ordem: i })) }
    })
    setModificados((s) => {
      const n = new Set(s)
      n.add(a)
      n.add(b)
      return n
    })
  }

  async function salvar() {
    const d = dashboardRef.current
    if (!d) return
    setSalvando(true)
    setErro('')
    try {
      for (const wid of modificados) {
        const w = d.widgets?.find((x) => x.id === wid)
        if (!w) continue
        await atualizarWidget(d.id, wid, {
          type: w.type,
          dataset_id: w.dataset_id,
          config_json: w.config_json,
          position_json: w.position_json,
          ordem: w.ordem,
        })
      }
      setModificados(new Set())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar alterações.')
    } finally {
      setSalvando(false)
    }
  }

  async function criarNovoDashboard(nome: string) {
    setModalNovoDashboard(false)
    setErro('')
    try {
      const criado = await criarDashboard(projetoId, nome)
      setDashboards((atual) => [...atual, criado])
      navigate(`/projetos/${projetoId}/dashboards/${criado.id}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar dashboard.')
    }
  }

  async function criarNovoWidget(type: WidgetType, dataset_id: string, config: WidgetConfig) {
    const d = dashboardRef.current
    if (!d) return
    setModalNovoWidget(false)
    setErro('')
    try {
      const w = await adicionarWidget(d.id, type, dataset_id, config, { x: 0, y: 0, w: 4, h: 3 })
      const novoWidgets = [...(dashboardRef.current?.widgets ?? []), w]
      setDashboard((cur) => (cur ? { ...cur, widgets: novoWidgets } : cur))
      await rodarQuery(novoWidgets.map((x) => x.id))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao adicionar widget.')
    }
  }

  async function removerWidget(wid: number) {
    const d = dashboardRef.current
    if (!d) return
    setWidgetSelecionado(null)
    setErro('')
    try {
      await deletarWidget(d.id, wid)
      const novoWidgets = (dashboardRef.current?.widgets ?? []).filter((w) => w.id !== wid)
      setDashboard((cur) => (cur ? { ...cur, widgets: novoWidgets } : cur))
      await rodarQuery(novoWidgets.map((x) => x.id))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao remover widget.')
    }
  }

  async function criarNovoSlicer(dataset_id: string, field: string, tipo: Slicer['tipo']) {
    const d = dashboardRef.current
    if (!d) return
    setModalNovoSlicer(false)
    setErro('')
    try {
      const s = await adicionarSlicer(d.id, dataset_id, field, tipo)
      setDashboard((cur) => (cur ? { ...cur, slicers: [...(cur.slicers ?? []), s] } : cur))
      setValoresSlicers((v) => ({ ...v, [s.id]: tipo === 'lista' ? [] : ['', ''] }))
      void rodarQuery()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao adicionar filtro.')
    }
  }

  async function removerSlicer(sid: number) {
    const d = dashboardRef.current
    if (!d) return
    setErro('')
    try {
      await deletarSlicer(d.id, sid)
      setDashboard((cur) => (cur ? { ...cur, slicers: cur.slicers?.filter((s) => s.id !== sid) } : cur))
      setValoresSlicers((v) => {
        const n = { ...v }
        delete n[sid]
        return n
      })
      void rodarQuery()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao remover filtro.')
    }
  }

  async function salvarNomeDashboard() {
    const d = dashboardRef.current
    if (!d) return
    const novo = (nomeEditando ?? d.nome).trim()
    setNomeEditando(null)
    if (!novo || novo === d.nome) return
    try {
      const atualizado = await atualizarDashboard(projetoId, d.id, { nome: novo })
      setDashboard((cur) => (cur ? { ...cur, nome: atualizado.nome } : cur))
      setDashboards((atual) => atual.map((x) => (x.id === atualizado.id ? { ...x, nome: atualizado.nome } : x)))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao renomear dashboard.')
    }
  }

  async function alternarInterno() {
    const d = dashboardRef.current
    if (!d) return
    try {
      const atualizado = await atualizarDashboard(projetoId, d.id, { eh_interno: !d.eh_interno })
      setDashboard((cur) => (cur ? { ...cur, eh_interno: atualizado.eh_interno } : cur))
      setDashboards((atual) => atual.map((x) => (x.id === atualizado.id ? { ...x, eh_interno: atualizado.eh_interno } : x)))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao atualizar dashboard.')
    }
  }

  async function excluirDashboard() {
    const d = dashboardRef.current
    if (!d) return
    setErro('')
    try {
      await deletarDashboard(projetoId, d.id)
      setDashboards((atual) => atual.filter((x) => x.id !== d.id))
      navigate(`/projetos/${projetoId}/dashboards`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir dashboard.')
    }
  }

  return (
    <AppShell
      titulo="Dashboards"
      acoes={
        <div
          className="inline-flex rounded-lg p-0.5 border"
          style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)' }}
          role="tablist"
          aria-label="Visualização do projeto"
        >
          <Link to={`/projetos/${projetoId}/planilha`} role="tab" aria-selected="false" className="h-8 px-3 rounded-md text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors hover:text-tinta" style={{ color: 'var(--cor-mutado)' }}>
            {ICONE_PLANILHA}
            Planilha
          </Link>
          <Link to={`/projetos/${projetoId}/dashboard`} role="tab" aria-selected="false" className="h-8 px-3 rounded-md text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors hover:text-tinta" style={{ color: 'var(--cor-mutado)' }}>
            {ICONE_DASHBOARD}
            Dashboard
          </Link>
          <Link to={`/projetos/${projetoId}/datasets`} role="tab" aria-selected="false" className="h-8 px-3 rounded-md text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors hover:text-tinta" style={{ color: 'var(--cor-mutado)' }}>
            {ICONE_DATASETS}
            Datasets
          </Link>
          <Link to={`/projetos/${projetoId}/dashboards`} role="tab" aria-selected="true" className="h-8 px-3 rounded-md text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors" style={{ background: 'var(--cor-superficie)', color: 'var(--cor-tinta)', border: '1px solid var(--cor-borda)' }}>
            {ICONE_DASHBOARD}
            Dashboards
          </Link>
        </div>
      }
    >
      <div className="flex flex-col lg:flex-row gap-5">
        <aside className="w-full lg:w-64 shrink-0 rounded-2xl border p-3 self-start" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--cor-mutado)' }}>Dashboards</span>
            <button onClick={() => setModalNovoDashboard(true)} title="Novo dashboard" className="h-7 w-7 rounded-lg inline-flex items-center justify-center transition-colors" style={{ background: 'var(--cor-elevado)', color: 'var(--cor-tinta)', border: '1px solid var(--cor-borda)' }}>
              {ICONE_MAIS}
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {carregando && <div className="text-[12.5px] px-1 py-2" style={{ color: 'var(--cor-mutado)' }}>Carregando…</div>}
            {!carregando && dashboards.length === 0 && (
              <div className="text-[12.5px] px-1 py-2" style={{ color: 'var(--cor-mutado)' }}>Nenhum dashboard. Clique em “+” para criar.</div>
            )}
            {dashboards.map((d) => {
              const selecionado = d.id === Number(dbid)
              return (
                <button
                  key={d.id}
                  onClick={() => navigate(`/projetos/${projetoId}/dashboards/${d.id}`)}
                  className="text-left rounded-lg px-3 py-2.5 transition-colors"
                  style={selecionado ? { background: 'rgba(46, 89, 246, 0.14)', border: '1px solid rgba(46, 89, 246, 0.4)' } : { background: 'transparent', border: '1px solid transparent' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium truncate" style={{ color: 'var(--cor-tinta)' }}>{d.nome}</span>
                    {d.eh_interno && (
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--cor-sucesso)' }}>Interno</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {!dashboard ? (
            <div className="rounded-2xl border p-10 text-center" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
              <div className="text-[15px] font-semibold mb-1.5" style={{ color: 'var(--cor-tinta)' }}>Selecione um dashboard</div>
              <div className="text-[13px]" style={{ color: 'var(--cor-mutado)' }}>Escolha um dashboard na lista ao lado ou crie um novo.</div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <input
                  value={nomeEditando ?? dashboard.nome}
                  onChange={(e) => setNomeEditando(e.target.value)}
                  onBlur={() => void salvarNomeDashboard()}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  className="rounded-lg px-3 py-2 text-[15px] font-semibold border outline-none min-w-0 flex-1 sm:flex-none"
                  style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)', color: 'var(--cor-tinta)' }}
                />
                <Botao variante="secundario" onClick={() => setModo((m) => (m === 'editar' ? 'visualizar' : 'editar'))}>
                  {modo === 'editar' ? 'Visualizar' : 'Editar'}
                </Botao>
                {modo === 'editar' && (
                  <>
                    <Botao variante="secundario" onClick={() => setModalNovoWidget(true)}>
                      {ICONE_MAIS}
                      Widget
                    </Botao>
                    <Botao variante="secundario" onClick={() => setModalNovoSlicer(true)}>
                      {ICONE_MAIS}
                      Filtro
                    </Botao>
                    <Botao onClick={() => void salvar()} disabled={salvando || modificados.size === 0}>
                      {salvando ? 'Salvando…' : 'Salvar'}
                    </Botao>
                  </>
                )}
                <Botao variante="secundario" onClick={() => setErro('Compartilhamento disponível na v4.3.')}>
                  Compartilhar
                </Botao>
                <button
                  onClick={() => void alternarInterno()}
                  title="Dashboard interno (visível para todos os usuários)"
                  className="h-9 px-3 rounded-lg text-[12.5px] font-medium transition-colors"
                  style={{ background: dashboard.eh_interno ? 'rgba(16,185,129,0.15)' : 'var(--cor-elevado)', color: dashboard.eh_interno ? 'var(--cor-sucesso)' : 'var(--cor-mutado)', border: '1px solid var(--cor-borda)' }}
                >
                  {dashboard.eh_interno ? 'Interno' : 'Privado'}
                </button>
                <button onClick={() => void excluirDashboard()} title="Excluir dashboard" className="h-9 w-9 rounded-lg inline-flex items-center justify-center transition-colors" style={{ color: 'var(--cor-mutado)' }}>
                  {ICONE_LIXO}
                </button>
              </div>

              {erro && <div className="text-sm mb-3" style={{ color: 'var(--cor-alerta)' }}>{erro}</div>}

              <SlicerBar
                slicers={slicers}
                opcoes={opcoesSlicers}
                valores={valoresSlicers}
                onChange={(sid, values) => setValoresSlicers((v) => ({ ...v, [sid]: values }))}
              />

              {drillFilter && (
                <div
                  className="flex items-center gap-3 mb-3 rounded-lg px-3 py-2"
                  style={{ background: 'rgba(46, 89, 246, 0.12)', border: '1px solid rgba(46, 89, 246, 0.4)' }}
                >
                  <span className="text-[12.5px]" style={{ color: 'var(--cor-tinta)' }}>
                    Filtrado por: <b>{drillFilter.campo} = {String(drillFilter.valor)}</b>
                    <span className="opacity-70"> (Widget {drillFilter.widgetOrigemId})</span>
                  </span>
                  <button
                    onClick={() => setDrillFilter(null)}
                    className="text-[12px] font-semibold transition-colors"
                    style={{ color: 'var(--cor-primaria)' }}
                  >
                    Limpar
                  </button>
                </div>
              )}

              {modo === 'editar' && slicers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {slicers.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px]" style={{ background: 'var(--cor-elevado)', color: 'var(--cor-tinta)', border: '1px solid var(--cor-borda)' }}>
                      {s.field}
                      <button onClick={() => void removerSlicer(s.id)} title="Remover filtro" style={{ color: 'var(--cor-mutado)' }}>×</button>
                    </span>
                  ))}
                </div>
              )}

              {carregandoDados && <div className="text-[12.5px] mb-3" style={{ color: 'var(--cor-mutado)' }}>Atualizando dados…</div>}

              {widgets.length === 0 ? (
                <div className="rounded-2xl border p-10 text-center" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
                  <div className="text-[14px] font-semibold mb-1" style={{ color: 'var(--cor-tinta)' }}>Nenhum widget</div>
                  <div className="text-[13px] mb-4" style={{ color: 'var(--cor-mutado)' }}>
                    {modo === 'editar' ? 'Clique em “+ Widget” para adicionar um gráfico, KPI, tabela ou pivot.' : 'Entre no modo edição para adicionar widgets.'}
                  </div>
                  {modo === 'editar' && <Botao onClick={() => setModalNovoWidget(true)}>{ICONE_MAIS} Adicionar widget</Botao>}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {widgets.map((w) => (
                    <div
                      key={w.id}
                      draggable={modo === 'editar'}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(w.id))
                        setDragId(w.id)
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        if (dragId && dragId !== w.id) trocarWidgets(dragId, w.id)
                        setDragId(null)
                      }}
                      onClick={() => modo === 'editar' && setWidgetSelecionado(w)}
                      className="rounded-2xl border p-3 transition-colors"
                      style={{
                        background: 'var(--cor-superficie)',
                        borderColor: widgetSelecionado?.id === w.id ? 'rgba(46, 89, 246, 0.6)' : 'var(--cor-borda)',
                        cursor: modo === 'editar' ? 'grab' : 'default',
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--cor-mutado)' }}>{w.type}</span>
                        {modo === 'editar' && (
                          <button onClick={(e) => { e.stopPropagation(); void removerWidget(w.id) }} title="Remover widget" style={{ color: 'var(--cor-mutado)' }}>×</button>
                        )}
                      </div>
                      <div style={{ height: '220px' }}>
                        {renderWidget(w, dadosWidgets[w.id], (campo, valor) =>
                          setDrillFilter({ widgetOrigemId: w.id, campo, valor })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {modo === 'editar' && widgetSelecionado && (
          <PainelConfigWidget
            widget={widgetSelecionado}
            datasets={datasets}
            onDataset={(wid, dataset_id) => atualizarWidgetLocal(wid, { dataset_id })}
            onConfig={atualizarConfig}
            onFechar={() => setWidgetSelecionado(null)}
            onRemover={(wid) => void removerWidget(wid)}
            colunasDisponiveis={colunasDoDataset(widgetSelecionado.dataset_id)}
          />
        )}
      </div>

      {modalNovoDashboard && (
        <ModalNovoDashboard aoSalvar={(nome) => void criarNovoDashboard(nome)} aoCancelar={() => setModalNovoDashboard(false)} />
      )}
      {modalNovoWidget && (
        <ModalNovoWidget datasets={datasets} aoSalvar={(t, d, c) => void criarNovoWidget(t, d, c)} aoCancelar={() => setModalNovoWidget(false)} />
      )}
      {modalNovoSlicer && (
        <ModalNovoSlicer datasets={datasets} aoSalvar={(d, f, t) => void criarNovoSlicer(d, f, t)} aoCancelar={() => setModalNovoSlicer(false)} />
      )}
    </AppShell>
  )
}

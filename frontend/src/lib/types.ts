export interface Usuario {
  id: number
  username: string
  nome: string
  papel: 'admin' | 'usuario' | 'cliente'
  ativo: boolean
}

export interface ResumoLocal {
  local: string
  valor_mensal: number
  taxa_instalacao: number
  impostos: number
  saldo_apos_impostos: number
  custo_manutencao: number
  mensal_terceirizada: number
  chip_mensal: number
  custos_softwares: number
  saldo_mensal: number
  mao_de_obra: number
  equipamento: number
  investimento: number
  tempo_retorno: number | null
  meses_retorno: number | null
  margem: number | null
  receita_anual: number
  data_inst: string | null
  num_itens: number
}

export interface Item {
  id?: number
  cod: string
  material: string
  qtd: number
  valor_unit: number
  valor_total: number
  categoria: string
}

export interface Insight {
  severidade: 'ok' | 'atencao' | 'alerta' | 'dica'
  texto: string
}

export interface Local {
  id?: number
  nome: string
  resumo: ResumoLocal
  itens: Item[]
  insights: Insight[]
  graficos: Record<string, string>
  fluxo: Record<string, FluxoCaixa>
}

export interface AnaliseUpload {
  filename: string | null
  avisos: string[]
  locais: Local[]
  projeto: ProjetoSummary
}

export interface ProjetoSummary {
  locais: ResumoLocal[]
  totais: {
    receita_mensal: number
    receita_anual: number
    saldo_mensal: number
    investimento: number
    equipamento: number
    mao_de_obra: number
    num_locais: number
    num_itens: number
  }
  graficos: Record<string, string>
}

export interface ProjetoResumo {
  id: number
  nome: string
  cliente: string | null
  cliente_usuario_id: number | null
  criado_em: string
  num_locais: number
  num_itens: number
  totais: {
    receita_mensal: number
    saldo_mensal: number
    investimento: number
  }
}

export interface LocalLinha {
  id: number
  nome: string
  valor_mensal: number
  taxa_instalacao: number
  custo_manutencao: number
  mensal_terceirizada: number
  chip_mensal: number
  custos_softwares: number
  mao_de_obra: number
  data_inst: string | null
}

export interface ItemLinha {
  id: number
  categoria: string
  cod: string
  material: string
  qtd: number
  valor_unit: number
  valor_total: number
}

export interface PontoFluxo {
  mes: number
  receita: number
  impostos: number
  custos_fixos: number
  saldo: number
  acumulado: number
  payback: boolean
}

export interface FluxoCaixa {
  local: string
  meses: number
  payback_mes: number | null
  pontos: PontoFluxo[]
  grafico: string
}

export type DatasetFonte = 'livre' | 'locais' | 'itens'

export interface Dataset {
  id: string // string para suportar "locais-{pid}" / "itens-{pid}"
  projeto_id: number
  nome: string
  schema_json: Record<string, string> // coluna → tipo ("text" | "number" | "date")
  fonte: DatasetFonte
  criado_em: string | null
  atualizado_em: string | null
  row_count?: number // opcional, só quando listar
}

export interface DatasetRow {
  row_index: number
  data_json: Record<string, any>
}

export interface DatasetListResponse {
  datasets: Dataset[]
}

export type WidgetType = 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'kpi' | 'table' | 'pivot'
export type Aggregation = 'sum' | 'avg' | 'count' | 'min' | 'max'
export type SlicerTipo = 'lista' | 'intervalo' | 'data'

export interface WidgetConfig {
  x?: string // campo eixo X
  y?: string[] // campos eixo Y (1+)
  aggregation?: Aggregation
  groupBy?: string[]
  field?: string // para KPI
  colunas?: string[] // para table
  linhas?: string[] // para pivot (linhas)
  colunas_pivot?: string[] // para pivot (colunas)
  metrica?: string // para pivot
  comparacao?: 'anterior' | 'media' // para KPI
  filters?: Record<string, any>
}

export interface Widget {
  id: number
  dashboard_id: number
  type: WidgetType
  dataset_id: string // aceita "123" ou "locais-1"/"itens-1"
  config_json: WidgetConfig
  position_json: { x: number; y: number; w: number; h: number }
  ordem: number
}

export interface Slicer {
  id: number
  dashboard_id: number
  dataset_id: string
  field: string
  values_json: string[]
  tipo: SlicerTipo
}

export interface Dashboard {
  id: number
  projeto_id: number
  nome: string
  layout_json: Record<string, any>
  eh_interno: boolean
  criado_em: string
  atualizado_em: string
  widgets?: Widget[]
  slicers?: Slicer[]
}

export interface DashboardListResponse {
  dashboards: Dashboard[]
}

export interface CampoCalculado {
  id: number
  dataset_id: number
  nome: string
  formula: string
  dependencias_json: string[]
  ordem: number
}

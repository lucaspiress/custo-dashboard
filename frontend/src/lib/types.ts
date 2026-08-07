export interface Usuario {
  id: number
  username: string
  nome: string
  papel: 'admin' | 'usuario'
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
  nome: string
  resumo: ResumoLocal
  itens: Item[]
  insights: Insight[]
  graficos: Record<string, string>
}

export interface AnaliseUpload {
  upload_id: number
  filename: string | null
  uploaded_at: string | null
  avisos: string[]
  locais: Local[]
}

export interface Upload {
  id: number
  filename: string
  uploaded_at: string
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

export interface DiferencaItem {
  cod: string
  material: string
  categoria: string
  tipo: 'adicionado' | 'removido' | 'preco' | 'quantidade'
  qtd_antes: number | null
  qtd_depois: number | null
  valor_unit_antes: number | null
  valor_unit_depois: number | null
  variacao: number | null
}

export interface KpiComparacao {
  rotulo: string
  antes: number | null
  depois: number | null
  delta: number | null
  delta_pct: number | null
}

export interface ComparacaoVersoes {
  upload_base: number
  upload_comparado: number
  local: string
  kpis: KpiComparacao[]
  itens: DiferencaItem[]
  grafico: string
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

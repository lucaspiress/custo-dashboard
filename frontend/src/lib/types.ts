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

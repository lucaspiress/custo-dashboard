import type { AnaliseUpload } from './types'

export interface LinhaDRE {
  descricao: string
  valorMensal: number
  valorAnual: number
  percentualReceita: number
  destaque?: boolean
}

export interface DREData {
  receitaBrutaMensal: number
  receitaBrutaAnual: number
  impostosMensal: number
  impostosAnual: number
  receitaLiquidaMensal: number
  receitaLiquidaAnual: number
  custosOperacionaisMensal: number
  custosOperacionaisAnual: number
  margemContribuicaoMensal: number
  margemContribuicaoAnual: number
  linhas: LinhaDRE[]
}

export function calcularDRE(analise: AnaliseUpload): DREData {
  const t = analise.projeto.totais
  const receitaBrutaMensal = t.receita_mensal
  const receitaBrutaAnual = t.receita_anual
  const impostosMensal = receitaBrutaMensal * 0.165
  const impostosAnual = receitaBrutaAnual * 0.165

  const receitaLiquidaMensal = receitaBrutaMensal - impostosMensal
  const receitaLiquidaAnual = receitaBrutaAnual - impostosAnual

  let custosOperacionaisMensal = 0
  for (const l of analise.projeto.locais) {
    custosOperacionaisMensal += (l.custo_manutencao + l.mensal_terceirizada + l.chip_mensal + l.custos_softwares)
  }
  const custosOperacionaisAnual = custosOperacionaisMensal * 12

  const margemContribuicaoMensal = receitaLiquidaMensal - custosOperacionaisMensal
  const margemContribuicaoAnual = receitaLiquidaAnual - custosOperacionaisAnual

  const base = receitaBrutaMensal || 1

  const linhas: LinhaDRE[] = [
    {
      descricao: '(=) Receita Bruta Total',
      valorMensal: receitaBrutaMensal,
      valorAnual: receitaBrutaAnual,
      percentualReceita: 100,
      destaque: true,
    },
    {
      descricao: '(-) Impostos Estimados (16,5%)',
      valorMensal: impostosMensal,
      valorAnual: impostosAnual,
      percentualReceita: (impostosMensal / base) * 100,
    },
    {
      descricao: '(=) Receita Líquida Operacional',
      valorMensal: receitaLiquidaMensal,
      valorAnual: receitaLiquidaAnual,
      percentualReceita: (receitaLiquidaMensal / base) * 100,
      destaque: true,
    },
    {
      descricao: '(-) Custos Operacionais Diretos',
      valorMensal: custosOperacionaisMensal,
      valorAnual: custosOperacionaisAnual,
      percentualReceita: (custosOperacionaisMensal / base) * 100,
    },
    {
      descricao: '(=) Margem de Contribuição Gerencial',
      valorMensal: margemContribuicaoMensal,
      valorAnual: margemContribuicaoAnual,
      percentualReceita: (margemContribuicaoMensal / base) * 100,
      destaque: true,
    },
  ]

  return {
    receitaBrutaMensal,
    receitaBrutaAnual,
    impostosMensal,
    impostosAnual,
    receitaLiquidaMensal,
    receitaLiquidaAnual,
    custosOperacionaisMensal,
    custosOperacionaisAnual,
    margemContribuicaoMensal,
    margemContribuicaoAnual,
    linhas,
  }
}

export interface PontoSensibilidade {
  varMensalPct: number
  varInstalacaoPct: number
  paybackMeses: number | null
}

export function gerarMatrizSensibilidade(analise: AnaliseUpload): PontoSensibilidade[][] {
  const variacoesMensal = [-10, -5, 0, 5, 10]
  const variacoesInstalacao = [-10, -5, 0, 5, 10]
  const matriz: PontoSensibilidade[][] = []

  const t = analise.projeto.totais
  const receitaBase = t.receita_mensal
  const invBase = t.investimento

  for (const vm of variacoesMensal) {
    const linha: PontoSensibilidade[] = []
    for (const vi of variacoesInstalacao) {
      const rec = receitaBase * (1 + vm / 100)
      const inv = invBase * (1 + vi / 100)
      const saldo = rec - rec * 0.165 - (t.receita_mensal - t.saldo_mensal - receitaBase * 0.165)
      let payback: number | null = null
      if (saldo > 0 && inv > 0) {
        payback = Math.ceil(inv / saldo)
      }
      linha.push({ varMensalPct: vm, varInstalacaoPct: vi, paybackMeses: payback })
    }
    matriz.push(linha)
  }

  return matriz
}

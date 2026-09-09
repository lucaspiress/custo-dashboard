import type { ResumoLocal } from './types'


export interface ResultadoSimulacao {
  nome: string
  variacaoMensalPct: number
  variacaoInstalacaoPct: number
  investimentoTotal: number
  receitaMensalTotal: number
  saldoMensalTotal: number
  paybackMesesEstimado: number | null
  curvaAcumulada: { mes: number; acumulado: number }[]
}

export function simularCenario(
  resumos: ResumoLocal[],
  nome: string,
  variacaoMensalPct: number,
  variacaoInstalacaoPct: number
): ResultadoSimulacao {
  const fctMensal = 1 + variacaoMensalPct / 100
  const fctInstalacao = 1 + variacaoInstalacaoPct / 100

  let investimentoTotal = 0
  let receitaMensalTotal = 0
  let saldoMensalTotal = 0
  let taxaInstalacaoTotal = 0

  for (const r of resumos) {
    const receitaMensal = r.valor_mensal * fctMensal
    const taxaInstalacao = r.taxa_instalacao * fctInstalacao
    const investimento = r.investimento * fctInstalacao
    const custosFixos = r.custo_manutencao + r.mensal_terceirizada + r.chip_mensal + r.custos_softwares
    const impostos = receitaMensal * 0.165
    const saldoMensal = receitaMensal - impostos - custosFixos

    investimentoTotal += investimento
    receitaMensalTotal += receitaMensal
    saldoMensalTotal += saldoMensal
    taxaInstalacaoTotal += taxaInstalacao
  }

  const investimentoLiquido = investimentoTotal - taxaInstalacaoTotal
  let paybackMesesEstimado: number | null = null
  if (saldoMensalTotal > 0 && investimentoLiquido > 0) {
    paybackMesesEstimado = Math.ceil(investimentoLiquido / saldoMensalTotal)
  }

  const curvaAcumulada: { mes: number; acumulado: number }[] = [
    { mes: 0, acumulado: -investimentoLiquido }
  ]

  let acumulado = -investimentoLiquido
  for (let mes = 1; mes <= 36; mes++) {
    acumulado += saldoMensalTotal
    curvaAcumulada.push({ mes, acumulado })
  }

  return {
    nome,
    variacaoMensalPct,
    variacaoInstalacaoPct,
    investimentoTotal,
    receitaMensalTotal,
    saldoMensalTotal,
    paybackMesesEstimado,
    curvaAcumulada,
  }
}

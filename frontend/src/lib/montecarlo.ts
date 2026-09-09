import type { ResumoLocal } from './types'

export interface ItemHistograma {
  faixa: string
  count: number
  pct: number
}

export interface ResultadoMonteCarlo {
  iteracoes: number
  probabilidadePayback24m: number
  probabilidadePayback36m: number
  paybackMedio: number | null
  paybackP10: number | null
  paybackP50: number | null
  paybackP90: number | null
  scoreSaude: number
  classificacaoSaude: 'Excelente' | 'Boa' | 'Moderada' | 'Crítica'
  histograma: ItemHistograma[]
  paybacksSimulados: (number | null)[]
}

function randomNormal(mean = 0, stdDev = 1): number {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  return mean + num * stdDev
}

export function simularMonteCarlo(resumos: ResumoLocal[], iteracoes = 1000): ResultadoMonteCarlo {
  if (!resumos || resumos.length === 0) {
    return {
      iteracoes: 0,
      probabilidadePayback24m: 0,
      probabilidadePayback36m: 0,
      paybackMedio: null,
      paybackP10: null,
      paybackP50: null,
      paybackP90: null,
      scoreSaude: 0,
      classificacaoSaude: 'Crítica',
      histograma: [
        { faixa: '1-6m', count: 0, pct: 0 },
        { faixa: '7-12m', count: 0, pct: 0 },
        { faixa: '13-18m', count: 0, pct: 0 },
        { faixa: '19-24m', count: 0, pct: 0 },
        { faixa: '25-30m', count: 0, pct: 0 },
        { faixa: '31-36m', count: 0, pct: 0 },
        { faixa: '>36m / Inviável', count: 0, pct: 0 },
      ],
      paybacksSimulados: [],
    }
  }

  const paybacksSimulados: (number | null)[] = []

  const faixasMap: Record<string, number> = {
    '1-6m': 0,
    '7-12m': 0,
    '13-18m': 0,
    '19-24m': 0,
    '25-30m': 0,
    '31-36m': 0,
    '>36m / Inviável': 0,
  }

  for (let i = 0; i < iteracoes; i++) {
    const varReceita = Math.max(0.70, Math.min(1.30, 1 + randomNormal(0.02, 0.09)))
    const varCustos = Math.max(0.80, Math.min(1.25, 1 + randomNormal(0.01, 0.06)))
    const varInstalacao = Math.max(0.80, Math.min(1.25, 1 + randomNormal(0, 0.05)))
    const inadimplencia = Math.max(0, Math.min(0.10, Math.random() * 0.05))

    let receitaTotalSimulada = 0
    let taxaInstalacaoTotalSimulada = 0
    let investimentoTotalSimulado = 0
    let custosFixosTotalSimulado = 0

    for (const r of resumos) {
      const rec = r.valor_mensal * varReceita * (1 - inadimplencia)
      const inst = r.taxa_instalacao * varInstalacao
      const inv = r.investimento * varInstalacao
      const custosFixos = (r.custo_manutencao + r.mensal_terceirizada + r.chip_mensal + r.custos_softwares) * varCustos

      receitaTotalSimulada += rec
      taxaInstalacaoTotalSimulada += inst
      investimentoTotalSimulado += inv
      custosFixosTotalSimulado += custosFixos
    }

    const impostosSimulados = receitaTotalSimulada * 0.165
    const saldoMensalSimulado = receitaTotalSimulada - impostosSimulados - custosFixosTotalSimulado
    const investimentoLiquidoSimulado = investimentoTotalSimulado - taxaInstalacaoTotalSimulada

    let pb: number | null = null
    if (saldoMensalSimulado > 0 && investimentoLiquidoSimulado > 0) {
      pb = Math.ceil(investimentoLiquidoSimulado / saldoMensalSimulado)
    }

    paybacksSimulados.push(pb)

    if (pb === null || pb > 36) {
      faixasMap['>36m / Inviável']++
    } else if (pb <= 6) {
      faixasMap['1-6m']++
    } else if (pb <= 12) {
      faixasMap['7-12m']++
    } else if (pb <= 18) {
      faixasMap['13-18m']++
    } else if (pb <= 24) {
      faixasMap['19-24m']++
    } else if (pb <= 30) {
      faixasMap['25-30m']++
    } else {
      faixasMap['31-36m']++
    }
  }

  const histograma: ItemHistograma[] = Object.entries(faixasMap).map(([faixa, count]) => ({
    faixa,
    count,
    pct: Math.round((count / iteracoes) * 100 * 10) / 10,
  }))

  const validos = paybacksSimulados.filter((p): p is number => p !== null && p <= 36).sort((a, b) => a - b)

  const prob24 = Math.round((paybacksSimulados.filter((p) => p !== null && p <= 24).length / iteracoes) * 1000) / 10
  const prob36 = Math.round((paybacksSimulados.filter((p) => p !== null && p <= 36).length / iteracoes) * 1000) / 10

  let paybackMedio: number | null = null
  let paybackP10: number | null = null
  let paybackP50: number | null = null
  let paybackP90: number | null = null

  if (validos.length > 0) {
    const soma = validos.reduce((acc, v) => acc + v, 0)
    paybackMedio = Math.round((soma / validos.length) * 10) / 10
    paybackP10 = validos[Math.floor(validos.length * 0.10)]
    paybackP50 = validos[Math.floor(validos.length * 0.50)]
    paybackP90 = validos[Math.floor(validos.length * 0.90)]
  }

  const margemMedia = resumos.reduce((acc, r) => acc + (r.margem ?? 0), 0) / (resumos.length || 1)
  const scoreBase = prob24 * 0.40 + prob36 * 0.40 + Math.min(20, Math.max(0, margemMedia * 100 * 0.20))
  const scoreSaude = Math.min(100, Math.max(0, Math.round(scoreBase)))

  let classificacaoSaude: 'Excelente' | 'Boa' | 'Moderada' | 'Crítica' = 'Crítica'
  if (scoreSaude >= 80) classificacaoSaude = 'Excelente'
  else if (scoreSaude >= 60) classificacaoSaude = 'Boa'
  else if (scoreSaude >= 40) classificacaoSaude = 'Moderada'

  return {
    iteracoes,
    probabilidadePayback24m: prob24,
    probabilidadePayback36m: prob36,
    paybackMedio,
    paybackP10,
    paybackP50,
    paybackP90,
    scoreSaude,
    classificacaoSaude,
    histograma,
    paybacksSimulados,
  }
}

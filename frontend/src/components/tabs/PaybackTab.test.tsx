import { describe, expect, it, vi } from 'vitest'
import type { FluxoCaixa, Local } from '../../lib/types'
import { PROJETO_RESPONSES } from '../../lib/test-fixtures'

const harness = vi.hoisted(() => ({
  states: [] as unknown[],
  cursor: 0,
}))

vi.mock('react', () => ({
  useState(initialValue: unknown) {
    const index = harness.cursor++
    if (!(index in harness.states)) harness.states[index] = initialValue
    const setState = (next: unknown) => {
      harness.states[index] = typeof next === 'function'
        ? (next as (previous: unknown) => unknown)(harness.states[index])
        : next
    }
    return [harness.states[index], setState]
  },
}))

vi.mock('../PlotlyChart', () => ({ default: 'PlotlyChart' }))

import PaybackTab from './PaybackTab'

type TestElement = { type: unknown; props?: Record<string, unknown> }

function elementosDentro(valor: unknown): TestElement[] {
  if (Array.isArray(valor)) return valor.flatMap(elementosDentro)
  if (!valor || typeof valor !== 'object' || !('type' in valor)) return []
  const elemento = valor as TestElement
  return [elemento, ...elementosDentro(elemento.props?.children)]
}

function textoDentro(valor: unknown): string {
  if (typeof valor === 'string' || typeof valor === 'number') return String(valor)
  if (Array.isArray(valor)) return valor.map(textoDentro).join('')
  if (!valor || typeof valor !== 'object' || !('type' in valor)) return ''
  return textoDentro((valor as TestElement).props?.children)
}

function reiniciarHarness() {
  harness.states = []
  harness.cursor = 0
}

function fluxo(paybackMes: number | null): FluxoCaixa {
  return {
    local: 'Local de teste',
    meses: 12,
    payback_mes: paybackMes,
    grafico: JSON.stringify({ data: [], layout: { title: 'Fluxo' } }),
    pontos: [
      { mes: 1, receita: 1000, impostos: 100, custos_fixos: 200, saldo: 700, acumulado: 700, payback: paybackMes === 1 },
      { mes: 2, receita: 1000, impostos: 100, custos_fixos: 200, saldo: 700, acumulado: 1400, payback: paybackMes !== null && paybackMes <= 2 },
      { mes: 3, receita: 1000, impostos: 100, custos_fixos: 200, saldo: 700, acumulado: 2100, payback: paybackMes !== null && paybackMes <= 3 },
    ],
  }
}

const localBase = PROJETO_RESPONSES[101].locais[0]
if (!localBase) throw new Error('Fixture sem local')

function localComFluxo(fluxos: Record<string, FluxoCaixa>): Local {
  return { ...localBase, fluxo: fluxos }
}

function render(local: Local): TestElement {
  harness.cursor = 0
  return PaybackTab({ local }) as unknown as TestElement
}

function status(arvore: unknown): string {
  const elemento = elementosDentro(arvore).find((candidate) => candidate.props?.role === 'status')
  if (!elemento) throw new Error('Status ausente')
  return textoDentro(elemento)
}

describe('PaybackTab', () => {
  it('explicita quando o horizonte selecionado não está disponível', () => {
    reiniciarHarness()
    const arvoreInicial = render(localComFluxo({ '12': fluxo(null) }))
    const botaoSeisMeses = elementosDentro(arvoreInicial).find((elemento) => textoDentro(elemento) === '6 meses')
    if (!botaoSeisMeses) throw new Error('Botão de 6 meses ausente')

    ;(botaoSeisMeses.props?.onClick as () => void)()
    const arvore = render(localComFluxo({ '12': fluxo(null) }))

    expect(status(arvore)).toBe('Payback indisponível para o horizonte de 6 meses neste projeto.')
  })

  it('distingue fluxo disponível sem payback atingido', () => {
    reiniciarHarness()
    const arvore = render(localComFluxo({ '12': fluxo(null) }))

    expect(status(arvore)).toBe('Payback não atingido no horizonte de 12 meses.')
    expect(elementosDentro(arvore).filter((elemento) => elemento.type === 'span' && textoDentro(elemento) === 'Payback')).toHaveLength(0)
  })

  it('distingue fluxo com payback atingido e marca o mês correspondente', () => {
    reiniciarHarness()
    const arvore = render(localComFluxo({ '12': fluxo(2) }))

    expect(status(arvore)).toBe('Payback atingido no mês 2.')
    expect(elementosDentro(arvore).filter((elemento) => elemento.type === 'span' && textoDentro(elemento) === 'Payback')).toHaveLength(1)
  })
})

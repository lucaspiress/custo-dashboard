import { describe, expect, it, vi } from 'vitest'
import type { Local } from '../../lib/types'
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
  useMemo(factory: () => unknown) {
    return factory()
  },
}))

vi.mock('../PlotlyChart', () => ({ default: 'PlotlyChart' }))

import CustosTab from './CustosTab'

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

function normalizarEspacosLocale(valor: string): string {
  return valor.replace(/\s+/gu, ' ')
}

function reiniciarHarness() {
  harness.states = []
  harness.cursor = 0
}

function render(local: Local, categorias: string[] = []) {
  harness.cursor = 0
  return CustosTab({ local, categorias, onCategorias: vi.fn() }) as unknown as TestElement
}

describe('CustosTab', () => {
  it('mostra os gráficos de composição e a fonte detalhada de itens', () => {
    reiniciarHarness()
    const local = PROJETO_RESPONSES[101].locais[0]
    if (!local) throw new Error('Fixture sem local')
    const arvore = render(local)
    const graficos = elementosDentro(arvore).filter((elemento) => elemento.type === 'PlotlyChart')
    const item = local.itens[0]

    expect(graficos.map((grafico) => grafico.props?.figJson)).toEqual([
      local.graficos.composicao,
      local.graficos.categorias,
      local.graficos.pareto,
    ])
    expect(textoDentro(arvore)).toContain('Itens de equipamento')
    expect(textoDentro(arvore)).toContain(item.cod)
    expect(textoDentro(arvore)).toContain(item.material)
    expect(normalizarEspacosLocale(textoDentro(arvore))).toContain('R$ 501,00')
    expect(textoDentro(arvore)).toContain('1 de 1 itens')
  })

  it('representa uma fonte sem itens quando o filtro não encontra correspondência', () => {
    reiniciarHarness()
    const local = PROJETO_RESPONSES[101].locais[0]
    if (!local) throw new Error('Fixture sem local')
    const arvore = render(local, ['categoria-inexistente'])
    const status = elementosDentro(arvore).find((elemento) => elemento.props?.role === 'status')

    expect(status).toBeDefined()
    expect(textoDentro(status)).toBe('Nenhum item encontrado com os filtros atuais. Remova um filtro ou ajuste a busca.')
  })
})

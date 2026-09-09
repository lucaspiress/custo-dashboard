import { describe, expect, it, vi } from 'vitest'
import type { Local } from '../../lib/types'
import { PROJETO_RESPONSES } from '../../lib/test-fixtures'

vi.mock('../InsightCard', () => ({ default: 'InsightCard' }))

import InsightsTab from './InsightsTab'

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

describe('InsightsTab', () => {
  it('renderiza os insights da fixture preservando severidade e texto', () => {
    const local = PROJETO_RESPONSES[101].locais[0]
    if (!local) throw new Error('Fixture sem local')
    const arvore = InsightsTab({ local }) as unknown as TestElement
    const cards = elementosDentro(arvore).filter((elemento) => elemento.type === 'InsightCard')

    expect(textoDentro(arvore)).toContain('Pontos de atenção')
    expect(cards).toHaveLength(local.insights.length)
    expect(cards[0]?.props).toMatchObject({
      severidade: 'ok',
      texto: 'SC001-P01-LOCAL: dados de teste isolados do projeto SC001-P01.',
    })
  })

  it('comunica a indisponibilidade quando a análise não tem evidência', () => {
    const local = PROJETO_RESPONSES[101].locais[0]
    if (!local) throw new Error('Fixture sem local')
    const parcial: Local = { ...local, insights: [] }
    const arvore = InsightsTab({ local: parcial }) as unknown as TestElement
    const status = elementosDentro(arvore).find((elemento) => elemento.props?.role === 'status')

    expect(status).toBeDefined()
    expect(textoDentro(status)).toBe('Não há evidência suficiente para gerar insights para este local.')
    expect(elementosDentro(arvore).filter((elemento) => elemento.type === 'InsightCard')).toHaveLength(0)
  })
})

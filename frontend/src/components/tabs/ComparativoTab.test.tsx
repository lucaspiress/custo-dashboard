import { describe, expect, it, vi } from 'vitest'
import type { ProjetoSummary } from '../../lib/types'
import { PROJETO_RESPONSES } from '../../lib/test-fixtures'

vi.mock('../KpiCard', () => ({ default: 'KpiCard' }))
vi.mock('../PlotlyChart', () => ({ default: 'PlotlyChart' }))

import ComparativoTab from './ComparativoTab'

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

function normalizarEspacosLocale(valor: unknown): string {
  return String(valor).replace(/\s+/gu, ' ')
}

describe('ComparativoTab', () => {
  it('apresenta KPIs executivos consolidados, gráficos e ranking por local', () => {
    const projeto = PROJETO_RESPONSES[101].projeto
    const arvore = ComparativoTab({ projeto }) as unknown as TestElement
    const kpis = elementosDentro(arvore).filter((elemento) => elemento.type === 'KpiCard')
    const graficos = elementosDentro(arvore).filter((elemento) => elemento.type === 'PlotlyChart')

    expect(kpis).toHaveLength(8)
    expect(kpis.find((kpi) => kpi.props?.rotulo === 'Locais')?.props?.valor).toBe('1')
    expect(normalizarEspacosLocale(kpis.find((kpi) => kpi.props?.rotulo === 'Investimento')?.props?.valor)).toBe('R$ 1.511,00')
    expect(kpis.find((kpi) => kpi.props?.rotulo === 'Retorno médio')?.props?.valor).toBe('0,2')
    expect(graficos.map((grafico) => grafico.props?.figJson)).toEqual([
      projeto.graficos.investimento,
      projeto.graficos.saldo,
      projeto.graficos.retorno,
      projeto.graficos.dispersao,
    ])
    expect(textoDentro(arvore)).toContain('não há orçamento registrado neste projeto')
    expect(textoDentro(arvore)).toContain('SC001-P01-LOCAL')
  })

  it('exibe retorno médio indisponível quando nenhum local tem payback', () => {
    const projeto = PROJETO_RESPONSES[101].projeto
    const semRetorno: ProjetoSummary = {
      ...projeto,
      locais: projeto.locais.map((local) => ({ ...local, tempo_retorno: null })),
    }
    const arvore = ComparativoTab({ projeto: semRetorno }) as unknown as TestElement

    expect(elementosDentro(arvore).find((elemento) => elemento.type === 'KpiCard' && elemento.props?.rotulo === 'Retorno médio')?.props?.valor).toBe('—')
  })
})

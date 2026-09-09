import { describe, expect, it, vi } from 'vitest'
import type { AnaliseUpload, Local } from '../../lib/types'
import { PROJETO_RESPONSES } from '../../lib/test-fixtures'

vi.mock('react-router-dom', () => ({
  Link: 'Link',
  useParams: () => ({ id: '101' }),
}))

vi.mock('../KpiCard', () => ({ default: 'KpiCard' }))
vi.mock('../PlotlyChart', () => ({ default: 'PlotlyChart' }))
vi.mock('../InsightCard', () => ({ default: 'InsightCard' }))

import VisaoGeralTab from './VisaoGeralTab'

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

function render(analise: AnaliseUpload = PROJETO_RESPONSES[101], local: Local = analise.locais[0]!) {
  return VisaoGeralTab({ analise, local }) as unknown as TestElement
}

describe('VisaoGeralTab', () => {
  it('apresenta os oito KPIs executivos e o resumo financeiro do local', () => {
    const analise = PROJETO_RESPONSES[101]
    const local = analise.locais[0]
    if (!local) throw new Error('Fixture sem local')
    const arvore = render(analise, local)
    const kpis = elementosDentro(arvore).filter((elemento) => elemento.type === 'KpiCard')

    expect(kpis).toHaveLength(8)
    expect(kpis.map((kpi) => kpi.props?.rotulo)).toEqual([
      'Receita mensal', 'Saldo mensal', 'Investimento', 'Tempo de retorno',
      'Receita anual', 'Impostos (15%)', 'Equipamento', 'Instalação',
    ])
    expect(normalizarEspacosLocale(kpis[0]?.props?.valor)).toBe('R$ 11.000,00')
    expect(normalizarEspacosLocale(kpis[2]?.props?.valor)).toBe('R$ 1.511,00')
    expect(kpis[3]?.props?.valor).toBe('0,2')

    const tabela = elementosDentro(arvore).find((elemento) => elemento.type === 'table')
    expect(tabela).toBeDefined()
    expect(textoDentro(tabela)).toContain('SC001-P01-LOCAL')
    expect(normalizarEspacosLocale(textoDentro(tabela))).toContain('R$ 11.000,00')
    expect(textoDentro(tabela)).toContain('0,2')
  })

  it('encaminha gráficos, insights e links para os detalhes da análise', () => {
    const analise = PROJETO_RESPONSES[101]
    const local = analise.locais[0]
    if (!local) throw new Error('Fixture sem local')
    const arvore = render(analise, local)
    const graficos = elementosDentro(arvore).filter((elemento) => elemento.type === 'PlotlyChart')
    const links = elementosDentro(arvore).filter((elemento) => elemento.type === 'Link')
    const insight = elementosDentro(arvore).find((elemento) => elemento.type === 'InsightCard')

    expect(graficos.map((grafico) => grafico.props?.figJson)).toEqual([
      local.graficos.composicao,
      analise.projeto.graficos.saldo,
    ])
    expect(links.map((link) => link.props?.to)).toContain('/projetos/101/custos')
    expect(links.map((link) => link.props?.to)).toContain('/projetos/101/insights')
    expect(insight?.props).toMatchObject(local.insights[0])
  })

  it('expõe valores indisponíveis sem inventar gráficos ou insights', () => {
    const base = PROJETO_RESPONSES[101]
    const local = base.locais[0]
    if (!local) throw new Error('Fixture sem local')
    const indisponivel: Local = {
      ...local,
      insights: [],
      graficos: {},
      resumo: { ...local.resumo, tempo_retorno: null, meses_retorno: null, margem: null, data_inst: null },
    }
    const analise = { ...base, locais: [indisponivel], projeto: { ...base.projeto, graficos: {} } }
    const arvore = render(analise, indisponivel)
    const kpiRetorno = elementosDentro(arvore).find((elemento) => elemento.type === 'KpiCard' && elemento.props?.rotulo === 'Tempo de retorno')

    expect(kpiRetorno?.props?.valor).toBe('—')
    expect(elementosDentro(arvore).filter((elemento) => elemento.type === 'PlotlyChart')).toHaveLength(0)
    expect(textoDentro(arvore)).toContain('Não há evidência suficiente para gerar insights para este local.')
  })
})

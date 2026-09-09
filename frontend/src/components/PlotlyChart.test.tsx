import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return { ...actual, useMemo: (factory: () => unknown) => factory() }
})

import PlotlyChart from './PlotlyChart'

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

function elementoComAtributo(arvore: unknown, tipo: string, atributo: string, valor: string): TestElement {
  const encontrado = elementosDentro(arvore).find((elemento) => elemento.type === tipo && elemento.props?.[atributo] === valor)
  if (!encontrado) throw new Error(`Elemento ${tipo}[${atributo}=${valor}] ausente`)
  return encontrado
}

describe('PlotlyChart', () => {
  it('expõe labels e valores de gráficos de pizza no fallback acessível', () => {
    const arvore = PlotlyChart({
      figJson: JSON.stringify({
        data: [{ type: 'pie', name: 'Investimento', labels: ['Equipamento', 'Mão de obra'], values: [100, 50] }],
        layout: { title: { text: 'Composição do investimento' }, annotations: [{ text: 'Total' }] },
      }),
    })

    const secao = elementoComAtributo(arvore, 'section', 'aria-label', 'Composição do investimento')
    const tabela = elementosDentro(arvore).find((elemento) => elemento.type === 'table')

    expect(textoDentro(secao)).toContain('2 ponto(s) de dados em Composição do investimento')
    expect(textoDentro(secao)).toContain('Equipamento')
    expect(textoDentro(secao)).toContain('Mão de obra')
    expect(textoDentro(secao)).toContain('100')
    expect(textoDentro(secao)).toContain('Total')
    expect(tabela).toBeDefined()
    expect(textoDentro(tabela)).toContain('Dados de Composição do investimento')
  })

  it('converte categorias e unidades de barras horizontais em descrição e tabela', () => {
    const arvore = PlotlyChart({
      figJson: JSON.stringify({
        data: [{ type: 'bar', orientation: 'h', name: 'Custos', y: ['Equipe', 'Infraestrutura'], x: [3200, 1800] }],
        layout: { title: 'Custos por categoria', xaxis: { title: 'R$' }, yaxis: { title: { text: 'Categoria' } } },
      }),
    })

    const secao = elementoComAtributo(arvore, 'section', 'aria-label', 'Custos por categoria')
    const texto = textoDentro(secao)

    expect(texto).toContain('2 ponto(s) de dados em Custos por categoria, unidade: R$ / Categoria')
    expect(texto).toContain('Equipe')
    expect(texto).toContain('Infraestrutura')
    expect(texto).toContain('3200')
    expect(texto).toContain('1800')
    expect(texto).toContain('Valor (R$ / Categoria)')
  })

  it('mostra alerta para JSON inválido sem tentar montar o gráfico', () => {
    const arvore = PlotlyChart({ figJson: '{ inválido' }) as unknown as ReactElement

    const alerta = elementoComAtributo(arvore, 'div', 'role', 'alert')

    expect(textoDentro(alerta)).toBe('Não foi possível exibir este gráfico.')
    expect(elementosDentro(arvore).find((elemento) => elemento.type === 'table')).toBeUndefined()
  })
})

import { describe, expect, it } from 'vitest'
import { geracaoDashboardAtiva, obterRotasDashboard } from './DashboardPage'

describe('DashboardPage', () => {
  it('produz links canônicos para as áreas do projeto', () => {
    expect(obterRotasDashboard(42)).toEqual({
      dados: '/projetos/42/dados',
      datasets: '/projetos/42/datasets',
      dashboards: '/projetos/42/dashboards',
    })
  })

  it('descarta resultados e falhas de uma geração antiga', () => {
    expect(geracaoDashboardAtiva(false, 1, 2)).toBe(false)
    expect(geracaoDashboardAtiva(true, 2, 2)).toBe(false)
    expect(geracaoDashboardAtiva(false, 2, 2)).toBe(true)
  })
})

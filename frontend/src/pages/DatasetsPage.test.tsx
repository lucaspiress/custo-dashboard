import { describe, expect, it, vi } from 'vitest'
import { mesclarLinhaPendente, navegarDepoisDoFlush } from './DatasetsPage'

describe('DatasetsPage', () => {
  it('preserva alterações anteriores da mesma linha no mesmo tick', () => {
    const linha = { row_index: 0, data_json: { quantidade: 1, custo: 10 } }
    const depoisDaPrimeiraAlteracao = mesclarLinhaPendente(linha, undefined, 'quantidade', 2)
    const depoisDaSegundaAlteracao = mesclarLinhaPendente(linha, depoisDaPrimeiraAlteracao, 'custo', 20)

    expect(depoisDaSegundaAlteracao).toEqual({ quantidade: 2, custo: 20 })
  })

  it('só navega depois que o flush termina com sucesso', async () => {
    let concluir!: (salvou: boolean) => void
    const flush = vi.fn(() => new Promise<boolean>((resolve) => {
      concluir = resolve
    }))
    const navegar = vi.fn()
    const navegacao = navegarDepoisDoFlush(flush, navegar, '/projetos/1/dados')

    expect(navegar).not.toHaveBeenCalled()
    concluir(true)

    await expect(navegacao).resolves.toBe(true)
    expect(navegar).toHaveBeenCalledWith('/projetos/1/dados')
  })

  it('não navega quando o flush falha', async () => {
    const navegar = vi.fn()

    await expect(
      navegarDepoisDoFlush(() => Promise.resolve(false), navegar, '/projetos/1/dados'),
    ).resolves.toBe(false)

    expect(navegar).not.toHaveBeenCalled()
  })
})

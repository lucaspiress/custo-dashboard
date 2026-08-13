import { afterEach, describe, expect, it, vi } from 'vitest'
import { criarAutosave } from './autosave'

afterEach(() => {
  vi.useRealTimers()
})

describe('criarAutosave', () => {
  it('persiste alterações de células diferentes sem descartar a primeira', async () => {
    vi.useFakeTimers()
    const salvar = vi.fn().mockResolvedValue(undefined)
    const autosave = criarAutosave(salvar)

    autosave.agendar('local:1:valor_mensal', 'primeiro')
    autosave.agendar('local:2:valor_mensal', 'segundo')
    await vi.advanceTimersByTimeAsync(399)

    expect(salvar).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)

    expect(salvar).toHaveBeenCalledTimes(2)
    expect(salvar).toHaveBeenCalledWith('primeiro')
    expect(salvar).toHaveBeenCalledWith('segundo')
  })

  it('mantém o último valor pendente para nova tentativa após uma falha', async () => {
    vi.useFakeTimers()
    const salvar = vi.fn().mockRejectedValueOnce(new Error('Rede indisponível')).mockResolvedValueOnce(undefined)
    const autosave = criarAutosave(salvar)

    autosave.agendar('item:4:qtd', 42)
    await vi.advanceTimersByTimeAsync(400)
    await vi.runAllTimersAsync()

    expect(autosave.erroAtual()).toBe('Rede indisponível')

    await autosave.tentarNovamente()

    expect(salvar).toHaveBeenCalledTimes(2)
    expect(salvar).toHaveBeenLastCalledWith(42)
    expect(autosave.erroAtual()).toBeNull()
  })
})

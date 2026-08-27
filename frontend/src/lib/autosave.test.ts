import { afterEach, describe, expect, it, vi } from 'vitest'
import { criarAutosave } from './autosave'

afterEach(() => {
  vi.useRealTimers()
})

describe('criarAutosave', () => {
  it('persiste alterações de células diferentes sem descartar a primeira', async () => {
    vi.useFakeTimers()
    const salvar = vi.fn().mockResolvedValue(undefined)
    const estados: string[] = []
    const autosave = criarAutosave(salvar, (estado) => estados.push(estado))

    autosave.agendar('local:1:valor_mensal', 'primeiro')
    autosave.agendar('local:2:valor_mensal', 'segundo')
    await vi.advanceTimersByTimeAsync(399)

    expect(salvar).not.toHaveBeenCalled()
    expect(estados[estados.length - 1]).toBe('pendente')

    await vi.advanceTimersByTimeAsync(1)

    expect(salvar).toHaveBeenCalledTimes(2)
    expect(salvar).toHaveBeenCalledWith('primeiro')
    expect(salvar).toHaveBeenCalledWith('segundo')
    expect(estados[estados.length - 1]).toBe('salvo')
  })

  it('informa quando o salvamento está em andamento', async () => {
    vi.useFakeTimers()
    let concluir: (() => void) | undefined
    const salvar = vi.fn(() => new Promise<void>((resolve) => {
      concluir = resolve
    }))
    const estados: string[] = []
    const autosave = criarAutosave(salvar, (estado) => estados.push(estado))

    autosave.agendar('local:1:valor_mensal', 100)
    expect(estados[estados.length - 1]).toBe('pendente')

    await vi.advanceTimersByTimeAsync(400)

    expect(salvar).toHaveBeenCalledWith(100)
    expect(estados[estados.length - 1]).toBe('salvando')

    concluir?.()
    await vi.advanceTimersByTimeAsync(0)

    expect(estados[estados.length - 1]).toBe('salvo')
  })

  it('serializa e mantém apenas o último valor da mesma célula', async () => {
    vi.useFakeTimers()
    let concluirPrimeiro: (() => void) | undefined
    const salvar = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => {
        concluirPrimeiro = resolve
      }))
      .mockResolvedValue(undefined)
    const autosave = criarAutosave(salvar)

    autosave.agendar('local:1:nome', 'primeiro')
    await vi.advanceTimersByTimeAsync(400)

    autosave.agendar('local:1:nome', 'segundo')
    await vi.advanceTimersByTimeAsync(400)

    expect(salvar).toHaveBeenCalledTimes(1)
    expect(salvar).toHaveBeenLastCalledWith('primeiro')

    concluirPrimeiro?.()
    await vi.advanceTimersByTimeAsync(0)

    expect(salvar).toHaveBeenCalledTimes(2)
    expect(salvar).toHaveBeenLastCalledWith('segundo')
  })

  it('faz flush da fila de debounce antes de liberar a navegação', async () => {
    vi.useFakeTimers()
    const salvar = vi.fn().mockResolvedValue(undefined)
    const autosave = criarAutosave(salvar)

    autosave.agendar('local:1:nome', 'alterado')

    await expect(autosave.flush()).resolves.toBe(true)
    expect(salvar).toHaveBeenCalledTimes(1)
    expect(salvar).toHaveBeenCalledWith('alterado')
  })

  it('não libera a navegação quando o flush não consegue salvar', async () => {
    vi.useFakeTimers()
    const autosave = criarAutosave(vi.fn().mockRejectedValue(new Error('Rede indisponível')))

    autosave.agendar('local:1:nome', 'alterado')

    await expect(autosave.flush()).resolves.toBe(false)
    expect(autosave.erroAtual()).toBe('Rede indisponível')
  })

  it('mantém o último valor pendente para nova tentativa após uma falha', async () => {
    vi.useFakeTimers()
    const salvar = vi.fn().mockRejectedValueOnce(new Error('Rede indisponível')).mockResolvedValueOnce(undefined)
    const estados: string[] = []
    const autosave = criarAutosave(salvar, (estado) => estados.push(estado))

    autosave.agendar('item:4:qtd', 42)
    await vi.advanceTimersByTimeAsync(400)
    await vi.runAllTimersAsync()

    expect(autosave.erroAtual()).toBe('Rede indisponível')
    expect(estados[estados.length - 1]).toBe('erro')

    await autosave.tentarNovamente()

    expect(salvar).toHaveBeenCalledTimes(2)
    expect(salvar).toHaveBeenLastCalledWith(42)
    expect(autosave.erroAtual()).toBeNull()
    expect(estados[estados.length - 1]).toBe('salvo')
  })
})

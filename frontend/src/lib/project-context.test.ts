import { describe, expect, it, vi } from 'vitest'
import { PROJETO_RESPONSES } from './test-fixtures'
import { criarContextoProjeto, parseProjetoId } from './project-context'
import type { AnaliseUpload } from './types'

type PendingRequest = {
  signal: AbortSignal
  resolve: (resposta: AnaliseUpload) => void
  reject: (erro: unknown) => void
}

function criarCarregadorPendente() {
  const pendentes = new Map<number, PendingRequest>()
  const buscar = vi.fn((projetoId: number, signal: AbortSignal) => (
    new Promise<AnaliseUpload>((resolve, reject) => {
      pendentes.set(projetoId, { signal, resolve, reject })
    })
  ))

  return { buscar, pendentes }
}

describe('parseProjetoId', () => {
  it.each([
    ['101', 101],
    [' 202 ', 202],
    ['', null],
    ['0', null],
    ['-1', null],
    ['1.5', null],
    ['1e2', null],
    ['projeto-a', null],
    [undefined, null],
  ])('converte somente IDs inteiros positivos: %s → %s', (valor, esperado) => {
    expect(parseProjetoId(valor)).toBe(esperado)
  })
})

describe('criarContextoProjeto', () => {
  it('limpa uma resposta anterior imediatamente ao trocar de projeto', async () => {
    const { buscar, pendentes } = criarCarregadorPendente()
    const contexto = criarContextoProjeto<AnaliseUpload>(buscar)

    const primeiroCarregamento = contexto.carregar('101')
    pendentes.get(101)!.resolve(PROJETO_RESPONSES[101])
    await primeiroCarregamento
    expect(contexto.estado()).toMatchObject({
      projetoId: 101,
      status: 'pronto',
      dados: PROJETO_RESPONSES[101],
      erro: null,
    })

    const segundoCarregamento = contexto.carregar('202')
    expect(contexto.estado()).toEqual({
      projetoId: 202,
      status: 'carregando',
      dados: null,
      erro: null,
    })

    pendentes.get(202)!.resolve(PROJETO_RESPONSES[202])
    await segundoCarregamento
  })

  it('trata ID inválido sem consultar a API nem expor dados anteriores', async () => {
    const { buscar, pendentes } = criarCarregadorPendente()
    const contexto = criarContextoProjeto<AnaliseUpload>(buscar)

    const carregamento = contexto.carregar('101')
    pendentes.get(101)!.resolve(PROJETO_RESPONSES[101])
    await carregamento

    await contexto.carregar('nao-numerico').catch(() => undefined)

    expect(buscar).toHaveBeenCalledTimes(1)
    expect(contexto.estado()).toMatchObject({
      projetoId: null,
      dados: null,
      status: 'erro',
    })
    expect(contexto.estado().erro).toMatch(/id.*inválido/i)
  })

  it('cancela a requisição anterior e ignora sua resposta obsoleta', async () => {
    const { buscar, pendentes } = criarCarregadorPendente()
    const contexto = criarContextoProjeto<AnaliseUpload>(buscar)

    const primeira = contexto.carregar('101')
    const segunda = contexto.carregar('202')

    expect(pendentes.get(101)!.signal.aborted).toBe(true)
    expect(contexto.estado()).toEqual({
      projetoId: 202,
      status: 'carregando',
      dados: null,
      erro: null,
    })

    pendentes.get(202)!.resolve(PROJETO_RESPONSES[202])
    await segunda
    pendentes.get(101)!.resolve(PROJETO_RESPONSES[101])
    await primeira.catch(() => undefined)

    expect(contexto.estado()).toMatchObject({
      projetoId: 202,
      status: 'pronto',
      dados: PROJETO_RESPONSES[202],
      erro: null,
    })
    expect(buscar).toHaveBeenCalledTimes(2)
  })

  it('ignora a rejeição de uma requisição obsoleta', async () => {
    const { buscar, pendentes } = criarCarregadorPendente()
    const contexto = criarContextoProjeto<AnaliseUpload>(buscar)

    const primeira = contexto.carregar('101')
    const segunda = contexto.carregar('202')

    pendentes.get(101)?.reject(new Error('resposta antiga'))
    await primeira.catch(() => undefined)
    expect(contexto.estado().status).toBe('carregando')
    expect(contexto.estado().dados).toBeNull()

    // This response belongs to the current generation, so it may complete the load.
    pendentes.get(202)!.resolve(PROJETO_RESPONSES[202])
    await segunda
    expect(contexto.estado()).toMatchObject({
      projetoId: 202,
      status: 'pronto',
      dados: PROJETO_RESPONSES[202],
      erro: null,
    })
  })

  it('transiciona uma falha da requisição atual para erro sem manter dados antigos', async () => {
    const { buscar, pendentes } = criarCarregadorPendente()
    const contexto = criarContextoProjeto<AnaliseUpload>(buscar)

    const carregamento = contexto.carregar('101')
    expect(contexto.estado()).toEqual({
      projetoId: 101,
      status: 'carregando',
      dados: null,
      erro: null,
    })

    pendentes.get(101)!.reject(new Error('Projeto não encontrado.'))
    await carregamento.catch(() => undefined)

    expect(contexto.estado()).toEqual({
      projetoId: 101,
      status: 'erro',
      dados: null,
      erro: 'Projeto não encontrado.',
    })
  })

  it('cancela explicitamente, limpa o estado imediatamente e ignora respostas tardias', async () => {
    const { buscar, pendentes } = criarCarregadorPendente()
    const contexto = criarContextoProjeto<AnaliseUpload>(buscar)

    const carregamentoResolvidoTarde = contexto.carregar('101')
    contexto.cancelar()

    expect(pendentes.get(101)!.signal.aborted).toBe(true)
    expect(contexto.estado()).toEqual({
      projetoId: null,
      status: 'inicial',
      dados: null,
      erro: null,
    })

    pendentes.get(101)!.resolve(PROJETO_RESPONSES[101])
    await carregamentoResolvidoTarde
    expect(contexto.estado()).toEqual({
      projetoId: null,
      status: 'inicial',
      dados: null,
      erro: null,
    })

    const carregamentoRejeitadoTarde = contexto.carregar('202')
    contexto.cancelar()

    expect(pendentes.get(202)!.signal.aborted).toBe(true)
    expect(contexto.estado()).toEqual({
      projetoId: null,
      status: 'inicial',
      dados: null,
      erro: null,
    })

    pendentes.get(202)!.reject(new Error('resposta antiga'))
    await carregamentoRejeitadoTarde
    expect(contexto.estado()).toEqual({
      projetoId: null,
      status: 'inicial',
      dados: null,
      erro: null,
    })
  })
})

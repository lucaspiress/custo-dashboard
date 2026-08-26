import { parseProjetoId } from './routes'

export { parseProjetoId } from './routes'

export type EstadoProjetoStatus = 'inicial' | 'carregando' | 'pronto' | 'erro'

export interface EstadoProjeto<T> {
  projetoId: number | null
  status: EstadoProjetoStatus
  dados: T | null
  erro: string | null
}

export type BuscarProjeto<T> = (
  projetoId: number,
  signal: AbortSignal,
) => Promise<T>

export interface ContextoProjeto<T> {
  carregar: (valor: unknown) => Promise<T | undefined>
  estado: () => EstadoProjeto<T>
  cancelar: () => void
}

function mensagemErro(erro: unknown): string {
  if (erro instanceof Error && erro.message.trim()) return erro.message
  if (typeof erro === 'string' && erro.trim()) return erro
  return 'Não foi possível carregar o projeto.'
}

export function criarContextoProjeto<T>(buscar: BuscarProjeto<T>): ContextoProjeto<T> {
  let atual: EstadoProjeto<T> = {
    projetoId: null,
    status: 'inicial',
    dados: null,
    erro: null,
  }
  let geracao = 0
  let controleAtual: AbortController | null = null

  function cancelarAtual() {
    controleAtual?.abort()
    controleAtual = null
  }

  function carregar(valor: unknown): Promise<T | undefined> {
    cancelarAtual()
    const minhaGeracao = ++geracao
    const projetoId = parseProjetoId(valor)

    if (projetoId === null) {
      atual = {
        projetoId: null,
        status: 'erro',
        dados: null,
        erro: 'ID do projeto inválido.',
      }
      return Promise.reject(new Error(atual.erro ?? 'ID do projeto inválido.'))
    }

    const controle = new AbortController()
    controleAtual = controle
    // A troca de rota deve remover os dados anteriores antes da consulta começar.
    atual = {
      projetoId,
      status: 'carregando',
      dados: null,
      erro: null,
    }

    let requisicao: Promise<T>
    try {
      requisicao = buscar(projetoId, controle.signal)
    } catch (erro) {
      if (minhaGeracao === geracao) {
        controleAtual = null
        atual = {
          projetoId,
          status: 'erro',
          dados: null,
          erro: mensagemErro(erro),
        }
      }
      return Promise.reject(erro)
    }

    return requisicao.then(
      (dados) => {
        if (minhaGeracao !== geracao) return undefined

        controleAtual = null
        atual = {
          projetoId,
          status: 'pronto',
          dados,
          erro: null,
        }
        return dados
      },
      (erro: unknown) => {
        if (minhaGeracao !== geracao) return undefined

        controleAtual = null
        atual = {
          projetoId,
          status: 'erro',
          dados: null,
          erro: mensagemErro(erro),
        }
        throw erro
      },
    )
  }

  return {
    carregar,
    estado: () => atual,
    cancelar() {
      cancelarAtual()
      geracao += 1
      atual = {
        projetoId: null,
        status: 'inicial',
        dados: null,
        erro: null,
      }
    },
  }
}

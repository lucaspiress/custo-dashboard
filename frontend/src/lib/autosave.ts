export type EstadoAutosave = 'salvo' | 'pendente' | 'salvando' | 'erro'

export interface Autosave<T> {
  agendar: (chave: string, valor: T) => void
  tentarNovamente: () => Promise<void>
  erroAtual: () => string | null
  cancelar: () => void
}

interface Alteracao<T> {
  valor: T
  versao: number
}

export function criarAutosave<T>(
  salvar: (valor: T) => Promise<void>,
  aoAlterarEstado?: (estado: EstadoAutosave) => void,
): Autosave<T> {
  const temporizadores = new Map<string, ReturnType<typeof setTimeout>>()
  const alteracoes = new Map<string, Alteracao<T>>()
  const erros = new Map<string, string>()
  let proximaVersao = 0
  let salvamentosEmAndamento = 0

  function atualizarEstado() {
    if (erros.size > 0) {
      aoAlterarEstado?.('erro')
    } else if (temporizadores.size > 0) {
      aoAlterarEstado?.('pendente')
    } else if (salvamentosEmAndamento > 0) {
      aoAlterarEstado?.('salvando')
    } else {
      aoAlterarEstado?.('salvo')
    }
  }

  async function persistir(chave: string) {
    const alteracao = alteracoes.get(chave)
    if (!alteracao) return

    salvamentosEmAndamento += 1
    atualizarEstado()
    try {
      await salvar(alteracao.valor)
      if (alteracoes.get(chave)?.versao === alteracao.versao) {
        alteracoes.delete(chave)
        erros.delete(chave)
      }
    } catch (causa) {
      if (alteracoes.get(chave)?.versao === alteracao.versao) {
        erros.set(chave, causa instanceof Error ? causa.message : 'Não foi possível salvar a alteração.')
      }
    } finally {
      salvamentosEmAndamento -= 1
      atualizarEstado()
    }
  }

  return {
    agendar(chave, valor) {
      alteracoes.set(chave, { valor, versao: proximaVersao++ })
      erros.delete(chave)
      const temporizadorAnterior = temporizadores.get(chave)
      if (temporizadorAnterior) clearTimeout(temporizadorAnterior)
      temporizadores.set(chave, setTimeout(() => {
        temporizadores.delete(chave)
        void persistir(chave)
      }, 400))
      atualizarEstado()
    },
    async tentarNovamente() {
      const chavesComErro = [...erros.keys()]
      erros.clear()
      await Promise.all(chavesComErro.map(persistir))
    },
    erroAtual: () => erros.values().next().value ?? null,
    cancelar() {
      temporizadores.forEach(clearTimeout)
      temporizadores.clear()
    },
  }
}

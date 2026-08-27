export type EstadoAutosave = 'salvo' | 'pendente' | 'salvando' | 'erro'

export interface Autosave<T> {
  agendar: (chave: string, valor: T) => void
  flush: () => Promise<boolean>
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
  const persistencias = new Set<Promise<void>>()
  const persistenciasPorChave = new Map<string, Promise<void>>()
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

  function iniciarPersistencia(chave: string) {
    if (persistenciasPorChave.has(chave)) return

    const persistencia = persistir(chave)
    persistenciasPorChave.set(chave, persistencia)
    persistencias.add(persistencia)
    void persistencia.then(() => {
      persistencias.delete(persistencia)
      if (persistenciasPorChave.get(chave) !== persistencia) return
      persistenciasPorChave.delete(chave)

      if (!temporizadores.has(chave) && alteracoes.has(chave) && !erros.has(chave)) {
        iniciarPersistencia(chave)
      }
    })
  }

  return {
    agendar(chave, valor) {
      alteracoes.set(chave, { valor, versao: proximaVersao++ })
      erros.delete(chave)
      const temporizadorAnterior = temporizadores.get(chave)
      if (temporizadorAnterior) clearTimeout(temporizadorAnterior)
      temporizadores.set(chave, setTimeout(() => {
        temporizadores.delete(chave)
        iniciarPersistencia(chave)
      }, 400))
      atualizarEstado()
    },
    async flush() {
      // Drain both the debounce queue and requests already in flight. If a
      // value changes while its previous request is in flight, the loop sends
      // the newer version before allowing navigation to continue.
      do {
        for (const chave of [...temporizadores.keys()]) {
          const temporizador = temporizadores.get(chave)
          if (temporizador === undefined) continue
          clearTimeout(temporizador)
          temporizadores.delete(chave)
          iniciarPersistencia(chave)
        }
        await Promise.all([...persistencias])
      } while ((temporizadores.size > 0 || persistencias.size > 0 || alteracoes.size > 0) && erros.size === 0)

      return erros.size === 0 && temporizadores.size === 0 && persistencias.size === 0 && alteracoes.size === 0
    },
    async tentarNovamente() {
      const chavesComErro = [...erros.keys()]
      erros.clear()
      chavesComErro.forEach(iniciarPersistencia)
      await Promise.all([...persistencias])
    },
    erroAtual: () => erros.values().next().value ?? null,
    cancelar() {
      temporizadores.forEach(clearTimeout)
      temporizadores.clear()
    },
  }
}

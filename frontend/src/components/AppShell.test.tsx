import { describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({
  id: undefined as string | undefined,
  pathname: '/projetos' as string,
  usuario: { nome: 'Usuária de teste', papel: 'usuario' as const },
  states: [] as unknown[],
  stateCursor: 0,
  effects: [] as Array<{ dependencies?: readonly unknown[]; cleanup?: () => void }>,
  effectCursor: 0,
  refs: [] as Array<{ current: unknown }>,
  refCursor: 0,
  respostas: [] as Array<Promise<unknown[]>>,
}))

vi.mock('react', () => ({
  useRef<T>(initialValue: T) {
    const index = harness.refCursor++
    if (!(index in harness.refs)) harness.refs[index] = { current: initialValue }
    return harness.refs[index] as { current: T }
  },
  useCallback(callback: (...args: never[]) => unknown) {
    return callback
  },
  useState(initialValue: unknown) {
    const index = harness.stateCursor++
    if (!(index in harness.states)) harness.states[index] = initialValue
    const setState = (next: unknown) => {
      harness.states[index] = typeof next === 'function'
        ? (next as (previous: unknown) => unknown)(harness.states[index])
        : next
    }
    return [harness.states[index], setState]
  },
  useEffect(effect: () => void | (() => void), dependencies?: readonly unknown[]) {
    const index = harness.effectCursor++
    const previous = harness.effects[index]
    const changed = previous === undefined
      || dependencies === undefined
      || previous.dependencies === undefined
      || previous.dependencies.length !== dependencies.length
      || dependencies.some((value, dependencyIndex) => !Object.is(value, previous.dependencies?.[dependencyIndex]))
    if (!changed) return
    previous?.cleanup?.()
    const cleanup = effect()
    harness.effects[index] = { dependencies, cleanup: typeof cleanup === 'function' ? cleanup : undefined }
  },
}))

vi.mock('react-router-dom', () => ({
  Link: 'Link',
  useLocation: () => ({ pathname: harness.pathname }),
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: harness.id }),
}))

vi.mock('../lib/auth', () => ({
  useAuth: () => ({ usuario: harness.usuario, logout: vi.fn(async () => undefined) }),
}))

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(() => harness.respostas.shift() ?? Promise.resolve([])),
  },
}))

vi.mock('./ProjetoContextBar', () => ({ default: 'ProjetoContextBar' }))

import AppShell from './AppShell'

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

function reiniciarHarness() {
  harness.id = undefined
  harness.pathname = '/projetos'
  harness.states = []
  harness.stateCursor = 0
  harness.effects = []
  harness.effectCursor = 0
  harness.refs = []
  harness.refCursor = 0
  harness.respostas = []
}

function renderShell(): TestElement {
  harness.stateCursor = 0
  harness.effectCursor = 0
  harness.refCursor = 0
  return AppShell({ children: 'Conteúdo de teste' }) as unknown as TestElement
}

function comResolucao<T>() {
  let resolver!: (value: T) => void
  const promise = new Promise<T>((resolve) => { resolver = resolve })
  return { promise, resolver }
}

describe('AppShell', () => {
  it('expõe landmarks nomeados para navegação e conteúdo principal', () => {
    reiniciarHarness()
    const arvore = renderShell()
    const elementos = elementosDentro(arvore)

    expect(elementos.filter((elemento) => elemento.type === 'aside' && elemento.props?.['aria-label'] === 'Navegação principal')).toHaveLength(1)
    expect(elementos.filter((elemento) => elemento.type === 'main' && elemento.props?.['aria-label'] === 'Conteúdo principal')).toHaveLength(1)
    expect(elementos.filter((elemento) => elemento.type === 'header')).toHaveLength(1)
    expect(elementos.filter((elemento) => elemento.type === 'nav')).toHaveLength(1)
  })

  it('isola metadados do projeto quando uma resposta antiga chega após a troca de ID', async () => {
    reiniciarHarness()
    const projeto101 = comResolucao<unknown[]>()
    const projeto202 = comResolucao<unknown[]>()
    harness.respostas = [projeto101.promise, projeto202.promise]

    harness.id = '101'
    harness.pathname = '/projetos/101/payback'
    renderShell()
    harness.id = '202'
    harness.pathname = '/projetos/202/payback'
    renderShell()

    projeto101.resolver([{ id: 101, cliente: 'Cliente antigo', criado_em: '2026-01-01T00:00:00Z' }])
    projeto202.resolver([{ id: 202, cliente: 'Cliente atual', criado_em: '2026-02-02T00:00:00Z', atualizado_em: '2026-03-03T00:00:00Z' }])
    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    const arvore = renderShell()
    const metadata = elementosDentro(arvore).find((elemento) => elemento.props?.['aria-label'] === 'Metadados do projeto')
    if (!metadata) throw new Error('Metadados do projeto ausentes')

    expect(textoDentro(metadata)).toContain('Cliente: Cliente atual')
    expect(textoDentro(metadata)).not.toContain('Cliente antigo')
  })
})

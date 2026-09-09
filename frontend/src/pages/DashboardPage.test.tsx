import { describe, expect, it, vi } from 'vitest'
import type { AnaliseUpload } from '../lib/types'
import { PROJETO_RESPONSES } from '../lib/test-fixtures'
import { ROTAS_CANONICAS } from '../lib/routes'

const harness = vi.hoisted(() => ({
  states: [] as unknown[],
  stateCursor: 0,
  effects: [] as Array<readonly unknown[] | undefined>,
  effectCursor: 0,
  refs: [] as Array<{ current: unknown }>,
  refCursor: 0,
  params: { id: '101' },
  usuario: { papel: 'usuario' },
  response: Promise.resolve(null) as unknown as Promise<AnaliseUpload>,
  paths: [] as string[],
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    useState: function useState<T>(initialValue: T) {
      const index = harness.stateCursor++
      if (!(index in harness.states)) harness.states[index] = initialValue
      const setState = (next: T | ((previous: T) => T)) => {
        const previous = harness.states[index] as T
        harness.states[index] = typeof next === 'function'
          ? (next as (previous: T) => T)(previous)
          : next
      }
      return [harness.states[index] as T, setState] as const
    },
    useEffect: (effect: () => void | Promise<unknown>, dependencies?: readonly unknown[]) => {
      const index = harness.effectCursor++
      const previous = harness.effects[index]
      const changed = previous === undefined
        || dependencies === undefined
        || previous.length !== dependencies.length
        || dependencies.some((value, dependencyIndex) => !Object.is(value, previous[dependencyIndex]))
      if (changed) {
        harness.effects[index] = dependencies
        void effect()
      }
    },
    useMemo: function useMemo<T>(factory: () => T) { return factory() },
    useRef: function useRef<T>(initialValue: T) {
      const index = harness.refCursor++
      if (!(index in harness.refs)) harness.refs[index] = { current: initialValue }
      return harness.refs[index] as { current: T }
    },
  }
})

vi.mock('react-router-dom', () => ({
  Link: 'Link',
  useParams: () => harness.params,
}))

vi.mock('../lib/auth', () => ({
  useAuth: () => ({ usuario: harness.usuario }),
}))

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn((path: string) => {
      harness.paths.push(path)
      return harness.response
    }),
    blob: vi.fn(),
    postBlob: vi.fn(),
  },
}))

vi.mock('../components/AppShell', () => ({ default: 'AppShell' }))
vi.mock('../components/ui/Botao', () => ({ default: 'Botao' }))
vi.mock('../components/ProjetoLoading', () => ({ DashboardCarregando: 'DashboardCarregando' }))

import DashboardPage, { geracaoDashboardAtiva, obterRotasDashboard } from './DashboardPage'

type TestElement = { type: unknown; props?: Record<string, unknown> }

const abasCanonicas = [
  { rota: ROTAS_CANONICAS.projetoVisaoGeral, aba: 'Visão Geral', visao: 'VisaoGeralTab' },
  { rota: ROTAS_CANONICAS.projetoCustos, aba: 'Custos', visao: 'CustosTab' },
  { rota: ROTAS_CANONICAS.projetoPayback, aba: 'Payback', visao: 'PaybackTab' },
  { rota: ROTAS_CANONICAS.projetoAnalyticsAvancado, aba: 'Analytics Avançado', visao: 'AnalyticsAvancadoTab' },
  { rota: ROTAS_CANONICAS.projetoInsights, aba: 'Insights', visao: 'InsightsTab' },
  { rota: ROTAS_CANONICAS.projetoComparativo, aba: 'Comparativo', visao: 'ComparativoTab' },
] as const

function elementosDentro(valor: unknown): TestElement[] {
  if (Array.isArray(valor)) return valor.flatMap(elementosDentro)
  if (!valor || typeof valor !== 'object' || !('type' in valor)) return []
  const elemento = valor as TestElement
  return [elemento, ...elementosDentro(elemento.props?.children)]
}

function visoesDentro(arvore: unknown, visao: string): TestElement[] {
  return elementosDentro(arvore).filter((elemento) => elemento.type === visao || (typeof elemento.type === 'function' && elemento.type.name === visao))
}

function elementosDoTipo(arvore: unknown, tipo: string): TestElement[] {
  return elementosDentro(arvore).filter((elemento) => elemento.type === tipo)
}

function textoDentro(valor: unknown): string {
  if (typeof valor === 'string' || typeof valor === 'number') return String(valor)
  if (Array.isArray(valor)) return valor.map(textoDentro).join('')
  if (!valor || typeof valor !== 'object' || !('type' in valor)) return ''
  return textoDentro((valor as TestElement).props?.children)
}

function reiniciarHarness() {
  harness.states = []
  harness.stateCursor = 0
  harness.effects = []
  harness.effectCursor = 0
  harness.refs = []
  harness.refCursor = 0
  harness.paths = []
  harness.params.id = '101'
}

async function carregarDashboard(abaInicial: string, resposta: Promise<AnaliseUpload>): Promise<unknown> {
  reiniciarHarness()
  harness.response = resposta
  const carregando = DashboardPage({ abaInicial })
  expect(visoesDentro(carregando, 'DashboardCarregando')).toHaveLength(1)

  await new Promise<void>((resolve) => setTimeout(resolve, 0))

  harness.stateCursor = 0
  harness.effectCursor = 0
  harness.refCursor = 0
  return DashboardPage({ abaInicial })
}

function diferida<T>() {
  let resolver!: (valor: T) => void
  let rejeitar!: (erro: unknown) => void
  const promise = new Promise<T>((resolve, reject) => {
    resolver = resolve
    rejeitar = reject
  })
  return { promise, resolver, rejeitar }
}

async function aguardarResposta() {
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

function reiniciarCursores() {
  harness.stateCursor = 0
  harness.effectCursor = 0
  harness.refCursor = 0
}

function analiseVazia(): AnaliseUpload {
  const base = PROJETO_RESPONSES[101]
  return {
    ...base,
    locais: [],
    projeto: {
      ...base.projeto,
      locais: [],
      totais: { ...base.projeto.totais, num_locais: 0, num_itens: 0 },
    },
  }
}

function analiseParcial(): AnaliseUpload {
  const base = PROJETO_RESPONSES[101]
  const local = base.locais[0]
  if (!local) throw new Error('Fixture sem local')
  return {
    ...base,
    avisos: ['Análise parcial: fluxo de caixa indisponível.'],
    locais: [{
      ...local,
      insights: [],
      graficos: {},
      fluxo: {},
      resumo: { ...local.resumo, margem: null, tempo_retorno: null, meses_retorno: null },
    }],
    projeto: { ...base.projeto, graficos: {} },
  }
}

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

  it('navega pelas abas usando links das rotas canônicas', async () => {
    const arvore = await carregarDashboard('Visão Geral', Promise.resolve(PROJETO_RESPONSES[101]))
    const linksDeAbas = elementosDoTipo(arvore, 'Link').filter((link) =>
      abasCanonicas.some(({ aba }) => textoDentro(link) === aba),
    )

    expect(linksDeAbas).toHaveLength(abasCanonicas.length)
    for (const { rota, aba } of abasCanonicas) {
      const link = linksDeAbas.find((item) => textoDentro(item) === aba)
      expect(link?.props?.to).toBe(rota.replace(':id', '101'))
    }
  })

  it('exibe o nome do projeto, e não um nome de arquivo com extensão', async () => {
    const nomeProjeto = 'Projeto Norte — Operação 2026'
    const resposta = { ...PROJETO_RESPONSES[101], filename: nomeProjeto }
    const arvore = await carregarDashboard('Visão Geral', Promise.resolve(resposta))
    const shell = elementosDoTipo(arvore, 'AppShell')[0]

    expect(shell?.props?.titulo).toBe(nomeProjeto)
    expect(shell?.props?.titulo).not.toContain('.xlsx')
  })

  it.each(abasCanonicas)('seleciona a visão explícita da rota $rota com análise válida', async ({ rota, aba, visao }) => {
    const arvore = await carregarDashboard(aba, Promise.resolve(PROJETO_RESPONSES[101]))

    expect(rota.replace(':id', '101')).toMatch(/^\/projetos\/101\/(visao-geral|custos|payback|analytics-avancado|insights|comparativo)$/)
    expect(harness.paths).toEqual(['/api/projetos/101'])
    expect(textoDentro(arvore)).toContain('Dados válidos para este projeto.')
    expect(visoesDentro(arvore, visao)).toHaveLength(1)
  })

  it.each(abasCanonicas)('mantém a rota $rota em estado vazio sem montar visão analítica', async ({ aba, visao }) => {
    const arvore = await carregarDashboard(aba, Promise.resolve(analiseVazia()))

    expect(textoDentro(arvore)).toContain('Sem dados: nenhum local cadastrado')
    expect(visoesDentro(arvore, visao)).toHaveLength(0)
  })

  it.each(abasCanonicas)('seleciona $visao para análise parcial sem fabricar dados ausentes', async ({ aba, visao }) => {
    const arvore = await carregarDashboard(aba, Promise.resolve(analiseParcial()))

    expect(textoDentro(arvore)).toContain('Análise parcial: fluxo de caixa indisponível.')
    expect(visoesDentro(arvore, visao)).toHaveLength(1)
  })

  it.each(abasCanonicas)('mantém a rota $rota acionável quando a análise está indisponível', async ({ aba, visao }) => {
    const arvore = await carregarDashboard(aba, Promise.reject(new Error('Projeto indisponível')))

    expect(textoDentro(arvore)).toContain('Projeto indisponível')
    expect(textoDentro(arvore)).not.toContain('Nenhum local cadastrado')
    expect(visoesDentro(arvore, visao)).toHaveLength(0)
  })

  it('permite tentar novamente após uma falha transitória', async () => {
    reiniciarHarness()
    const primeiraResposta = diferida<AnaliseUpload>()
    harness.response = primeiraResposta.promise
    const inicial = DashboardPage({ abaInicial: 'Visão Geral' })
    expect(visoesDentro(inicial, 'DashboardCarregando')).toHaveLength(1)

    primeiraResposta.rejeitar(new Error('Falha temporária'))
    await aguardarResposta()
    reiniciarCursores()
    const comErro = DashboardPage({ abaInicial: 'Visão Geral' })
    expect(textoDentro(comErro)).toContain('Falha temporária')

    const segundaResposta = diferida<AnaliseUpload>()
    harness.response = segundaResposta.promise
    const tentarNovamente = elementosDoTipo(comErro, 'button').find((botao) => textoDentro(botao) === 'Tentar novamente')
    expect(tentarNovamente).toBeDefined()
    const aoTentarNovamente = tentarNovamente?.props?.onClick
    if (typeof aoTentarNovamente !== 'function') throw new Error('Botão de retry sem interação')
    aoTentarNovamente()

    reiniciarCursores()
    DashboardPage({ abaInicial: 'Visão Geral' })
    expect(harness.paths).toEqual(['/api/projetos/101', '/api/projetos/101'])

    segundaResposta.resolver(PROJETO_RESPONSES[101])
    await aguardarResposta()
    reiniciarCursores()
    const recuperado = DashboardPage({ abaInicial: 'Visão Geral' })
    expect(textoDentro(recuperado)).toContain('Dados válidos para este projeto.')
    expect(textoDentro(recuperado)).not.toContain('Falha temporária')
  })

  it('ignora resposta de projeto anterior depois da troca de rota', async () => {
    reiniciarHarness()
    const respostaAntiga = diferida<AnaliseUpload>()
    harness.response = respostaAntiga.promise
    DashboardPage({ abaInicial: 'Visão Geral' })

    const respostaAtual = diferida<AnaliseUpload>()
    harness.params.id = '202'
    harness.response = respostaAtual.promise
    reiniciarCursores()
    const carregandoAtual = DashboardPage({ abaInicial: 'Visão Geral' })
    expect(visoesDentro(carregandoAtual, 'DashboardCarregando')).toHaveLength(1)
    expect(harness.paths).toEqual(['/api/projetos/101', '/api/projetos/202'])

    respostaAntiga.resolver(PROJETO_RESPONSES[101])
    await aguardarResposta()
    reiniciarCursores()
    const depoisDaRespostaAntiga = DashboardPage({ abaInicial: 'Visão Geral' })
    expect(visoesDentro(depoisDaRespostaAntiga, 'DashboardCarregando')).toHaveLength(1)

    respostaAtual.resolver(PROJETO_RESPONSES[202])
    await aguardarResposta()
    reiniciarCursores()
    const arvore = DashboardPage({ abaInicial: 'Visão Geral' })
    expect(textoDentro(arvore)).toContain('SC001-P02-LOCAL')
    expect(textoDentro(arvore)).not.toContain('SC001-P01-LOCAL')
    expect(harness.paths).toEqual(['/api/projetos/101', '/api/projetos/202'])
  })
})

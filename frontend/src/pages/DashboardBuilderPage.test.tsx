import { describe, expect, it, vi } from 'vitest'
import type { Dashboard, Dataset } from '../lib/types'

const harness = vi.hoisted(() => ({
  states: [] as unknown[],
  stateCursor: 0,
  refs: [] as Array<{ current: unknown }>,
  refCursor: 0,
  effects: [] as Array<{ dependencies?: readonly unknown[]; cleanup?: () => void }>,
  effectCursor: 0,
  params: { id: '101', dbid: '7' },
  navigate: vi.fn(),
  listarDashboards: vi.fn(),
  listarDatasets: vi.fn(),
  obterDashboard: vi.fn(),
  executarQuery: vi.fn(),
  listarCamposCalculados: vi.fn(),
  criarDashboard: vi.fn(),
  atualizarDashboard: vi.fn(),
  deletarDashboard: vi.fn(),
  adicionarWidget: vi.fn(),
  atualizarWidget: vi.fn(),
  deletarWidget: vi.fn(),
  adicionarSlicer: vi.fn(),
  deletarSlicer: vi.fn(),
  renderWidget: vi.fn((widget: { id: number }, data: unknown, onDrillClick?: (campo: string, valor: unknown) => void) => ({
    type: 'WidgetPreview',
    props: { widget, data, onDrillClick },
  })),
}))

vi.mock('react', () => ({
  useState<T>(initialValue: T) {
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
  useRef<T>(initialValue: T) {
    const index = harness.refCursor++
    if (!(index in harness.refs)) harness.refs[index] = { current: initialValue }
    return harness.refs[index] as { current: T }
  },
  useMemo<T>(factory: () => T) {
    return factory()
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
  useNavigate: () => harness.navigate,
  useParams: () => harness.params,
}))

vi.mock('../lib/api', () => ({
  listarDashboards: harness.listarDashboards,
  listarDatasets: harness.listarDatasets,
  obterDashboard: harness.obterDashboard,
  executarQuery: harness.executarQuery,
  listarCamposCalculados: harness.listarCamposCalculados,
  criarDashboard: harness.criarDashboard,
  atualizarDashboard: harness.atualizarDashboard,
  deletarDashboard: harness.deletarDashboard,
  adicionarWidget: harness.adicionarWidget,
  atualizarWidget: harness.atualizarWidget,
  deletarWidget: harness.deletarWidget,
  adicionarSlicer: harness.adicionarSlicer,
  deletarSlicer: harness.deletarSlicer,
}))

vi.mock('../components/AppShell', () => ({ default: 'AppShell' }))
vi.mock('../components/ui/Botao', () => ({ default: 'Botao' }))
vi.mock('../components/ui/Modal', () => ({ default: 'Modal' }))
vi.mock('../components/SlicerBar', () => ({ default: 'SlicerBar' }))
vi.mock('../components/PublishDialog', () => ({ default: 'PublishDialog' }))
vi.mock('../components/ScheduleDialog', () => ({ default: 'ScheduleDialog' }))
vi.mock('../components/widgets/renderWidget', () => ({ renderWidget: harness.renderWidget }))

import DashboardBuilderPage, { construirRotaDashboard } from './DashboardBuilderPage'

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
  harness.states = []
  harness.stateCursor = 0
  harness.refs = []
  harness.refCursor = 0
  harness.effects = []
  harness.effectCursor = 0
  harness.navigate.mockReset()
  harness.params.id = '101'
  harness.params.dbid = '7'
  for (const mock of [
    harness.listarDashboards,
    harness.listarDatasets,
    harness.obterDashboard,
    harness.executarQuery,
    harness.listarCamposCalculados,
  ]) mock.mockReset()
  harness.renderWidget.mockClear()
}

function renderPage(): TestElement {
  harness.stateCursor = 0
  harness.refCursor = 0
  harness.effectCursor = 0
  return DashboardBuilderPage({ readOnly: false }) as unknown as TestElement
}

async function aguardarPromessas() {
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const dashboard: Dashboard = {
  id: 7,
  projeto_id: 101,
  nome: 'Dashboard executivo',
  layout_json: {},
  eh_interno: false,
  criado_em: '2026-01-01T00:00:00Z',
  atualizado_em: '2026-01-01T00:00:00Z',
  widgets: [{
    id: 11,
    dashboard_id: 7,
    type: 'bar',
    dataset_id: '1',
    config_json: { x: 'categoria', y: ['valor'], aggregation: 'sum' },
    position_json: { x: 0, y: 0, w: 4, h: 3 },
    ordem: 0,
  }],
  slicers: [{
    id: 13,
    dashboard_id: 7,
    dataset_id: '1',
    field: 'categoria',
    values_json: [],
    tipo: 'lista',
  }],
}

const dataset: Dataset = {
  id: '1',
  projeto_id: 101,
  nome: 'Itens do projeto',
  schema_json: { categoria: 'text', valor: 'number' },
  fonte: 'livre',
  criado_em: null,
  atualizado_em: null,
}

describe('DashboardBuilderPage', () => {
  it('mantém o builder e suas entradas de widget, filtro, drill-down e publicação no projeto', async () => {
    reiniciarHarness()
    harness.listarDashboards.mockResolvedValue([dashboard])
    harness.listarDatasets.mockResolvedValue([dataset])
    harness.obterDashboard.mockResolvedValue(dashboard)
    harness.executarQuery.mockResolvedValue({
      widgets: [{ widget_id: 11, type: 'bar', data: { labels: ['Norte'], values: [100] } }],
      slicers: [{ slicer_id: 13, field: 'categoria', tipo: 'lista', options: ['Norte'] }],
    })
    harness.listarCamposCalculados.mockResolvedValue([])

    expect(construirRotaDashboard(101, 7)).toBe('/projetos/101/dashboards/7')
    expect(construirRotaDashboard(202)).toBe('/projetos/202/dashboards')

    expect(textoDentro(renderPage())).toContain('Carregando dashboard')
    await aguardarPromessas()
    const arvore = renderPage()

    expect(harness.listarDashboards).toHaveBeenCalledWith(101)
    expect(harness.listarDatasets).toHaveBeenCalledWith(101)
    expect(harness.obterDashboard).toHaveBeenCalledWith(101, 7)
    expect(textoDentro(arvore)).toContain('Dashboard executivo')
    expect(elementosDentro(arvore).filter((elemento) => elemento.type === 'WidgetPreview')).toHaveLength(1)
    expect(elementosDentro(arvore).find((elemento) => elemento.type === 'SlicerBar')?.props?.slicers).toEqual(dashboard.slicers)
    expect(elementosDentro(arvore).filter((elemento) => elemento.type === 'Botao').map(textoDentro)).toEqual(expect.arrayContaining(['Editar', 'Publicar', 'Agendar']))

    const preview = elementosDentro(arvore).find((elemento) => elemento.type === 'WidgetPreview')
    const drill = preview?.props?.onDrillClick
    expect(drill).toEqual(expect.any(Function))
    ;(drill as (campo: string, valor: string) => void)('categoria', 'Norte')
    const comDrill = renderPage()
    expect(textoDentro(comDrill)).toContain('Filtrado por: categoria = Norte')

    const editar = elementosDentro(comDrill).find((elemento) => elemento.type === 'Botao' && textoDentro(elemento) === 'Editar')
    if (!editar) throw new Error('Entrada de edição ausente')
    ;(editar.props?.onClick as () => void)()
    const modoEdicao = renderPage()
    expect(elementosDentro(modoEdicao).filter((elemento) => elemento.type === 'Botao').map(textoDentro)).toEqual(expect.arrayContaining(['Visualizar', 'Widget', 'Filtro', 'Salvar']))

    const publicar = elementosDentro(modoEdicao).find((elemento) => elemento.type === 'Botao' && textoDentro(elemento) === 'Publicar')
    if (!publicar) throw new Error('Entrada de publicação ausente')
    ;(publicar.props?.onClick as () => void)()
    const comPublicacao = renderPage()
    expect(elementosDentro(comPublicacao).some((elemento) => elemento.type === 'PublishDialog')).toBe(true)

    const agendar = elementosDentro(comPublicacao).find((elemento) => elemento.type === 'Botao' && textoDentro(elemento) === 'Agendar')
    if (!agendar) throw new Error('Entrada de agendamento ausente')
    ;(agendar.props?.onClick as () => void)()
    expect(elementosDentro(renderPage()).some((elemento) => elemento.type === 'ScheduleDialog')).toBe(true)
  })
})

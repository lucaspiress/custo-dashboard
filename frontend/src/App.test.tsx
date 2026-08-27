import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  ALIASES_ROTAS,
  obterDestinoAlias,
  ROTA_FALLBACK,
  ROTAS_CANONICAS,
} from './lib/routes'

const harnessState = vi.hoisted(() => ({
  usuario: null as { username: string; papel: string } | null,
  carregando: false,
  params: { id: '17' },
}))

// App is inspected as a route tree so this harness can run with Vitest's default
// Node environment; it does not mount pages or execute their API effects.
vi.mock('react-router-dom', () => ({
  BrowserRouter: 'BrowserRouter',
  Navigate: 'Navigate',
  Route: 'Route',
  Routes: 'Routes',
  useParams: () => harnessState.params,
}))

vi.mock('./lib/auth', () => ({
  AuthProvider: 'AuthProvider',
  useAuth: () => ({ usuario: harnessState.usuario, carregando: harnessState.carregando }),
}))

vi.mock('./pages/LoginPage', () => ({ default: 'LoginPage' }))
vi.mock('./pages/ProjetosPage', () => ({ default: 'ProjetosPage' }))
vi.mock('./pages/DashboardPage', () => ({ default: 'DashboardPage' }))
vi.mock('./pages/PlanilhaPage', () => ({ default: 'PlanilhaPage' }))
vi.mock('./pages/DatasetsPage', () => ({ default: 'DatasetsPage' }))
vi.mock('./pages/DashboardBuilderPage', () => ({ default: 'DashboardBuilderPage' }))
vi.mock('./pages/CompartilhadosPage', () => ({ default: 'CompartilhadosPage' }))
vi.mock('./pages/RelatoriosPage', () => ({ default: 'RelatoriosPage' }))
vi.mock('./pages/PublicoPage', () => ({ default: 'PublicoPage' }))

import App from './App'

type RouteElement = ReactElement<{ path?: string; element?: ReactElement }>

interface RouteInventoryEntry {
  path: string
  authenticated: string
  unauthenticated: string
  api: readonly string[]
}

/**
 * Route inventory observed in App.tsx. Keep this tied to the existing page/API
 * contracts; API entries are documentation for the page inventory only. API
 * compatibility is intentionally verified by dedicated contract tests, not by
 * this harness.
 */
const currentRouteInventory: readonly RouteInventoryEntry[] = [
  { path: '/login', authenticated: 'SucessoRedirect', unauthenticated: 'LoginPage', api: ['POST /api/auth/login', 'POST /api/auth/logout', 'GET /api/auth/me'] },
  { path: '/', authenticated: 'Navigate', unauthenticated: 'Navigate', api: [] },
  { path: '/projetos', authenticated: 'ProjetosPage', unauthenticated: 'Navigate', api: ['GET /api/projetos', 'POST /api/projetos', 'POST /api/projetos/importar'] },
  { path: '/projetos/:id', authenticated: 'RotaProjeto', unauthenticated: 'Navigate', api: ['GET /api/projetos/:id'] },
  { path: '/projetos/:id/dashboard', authenticated: 'RotaProjeto', unauthenticated: 'Navigate', api: ['GET /api/projetos/:id', 'POST /api/projetos/:id/relatorio', 'GET /api/projetos/:id/planilha.xlsx'] },
  { path: '/projetos/:id/planilha', authenticated: 'RotaProjeto', unauthenticated: 'Navigate', api: ['GET /api/projetos/:id', 'PATCH /api/projetos/:id/locais/:local_id', 'PATCH /api/projetos/itens/:item_id'] },
  { path: '/projetos/:id/visao-geral', authenticated: 'RotaProjeto', unauthenticated: 'Navigate', api: ['GET /api/projetos/:id'] },
  { path: '/projetos/:id/custos', authenticated: 'RotaProjeto', unauthenticated: 'Navigate', api: ['GET /api/projetos/:id'] },
  { path: '/projetos/:id/payback', authenticated: 'RotaProjeto', unauthenticated: 'Navigate', api: ['GET /api/projetos/:id'] },
  { path: '/projetos/:id/insights', authenticated: 'RotaProjeto', unauthenticated: 'Navigate', api: ['GET /api/projetos/:id'] },
  { path: '/projetos/:id/comparativo', authenticated: 'RotaProjeto', unauthenticated: 'Navigate', api: ['GET /api/projetos/:id'] },
  { path: '/projetos/:id/dados', authenticated: 'RotaProjeto', unauthenticated: 'Navigate', api: ['GET /api/projetos/:id', 'PATCH /api/projetos/:id/locais/:local_id', 'PATCH /api/projetos/itens/:item_id'] },
  { path: '/projetos/:id/datasets', authenticated: 'RotaProjeto', unauthenticated: 'Navigate', api: ['GET/POST /api/projetos/:id/datasets', 'GET/POST /api/datasets/:did/rows'] },
  { path: '/projetos/:id/datasets/:did', authenticated: 'RotaProjeto', unauthenticated: 'Navigate', api: ['GET/PATCH/DELETE /api/projetos/:id/datasets/:did', 'GET/POST /api/datasets/:did/rows'] },
  { path: '/projetos/:id/dashboards', authenticated: 'RotaProjeto', unauthenticated: 'Navigate', api: ['GET/POST /api/projetos/:id/dashboards', 'POST /api/dashboards/:dbid/widgets', 'POST /api/dashboards/:dbid/publicar'] },
  { path: '/projetos/:id/dashboards/:dbid', authenticated: 'RotaProjeto', unauthenticated: 'Navigate', api: ['GET/PATCH /api/projetos/:id/dashboards/:dbid', 'POST /api/dashboards/:dbid/query'] },
  { path: '/projetos/:id/usuarios', authenticated: 'RotaProjeto', unauthenticated: 'Navigate', api: ['GET/POST/PATCH /api/users'] },
  { path: '/compartilhados', authenticated: 'lazy', unauthenticated: 'Navigate', api: ['GET /api/dashboards/compartilhados'] },
  { path: '/relatorios', authenticated: 'lazy', unauthenticated: 'Navigate', api: ['GET /api/relatorios', 'GET /api/relatorios/:rid/download'] },
  { path: '/p/:token', authenticated: 'lazy', unauthenticated: 'lazy', api: ['GET /p/:token'] },
  { path: '*', authenticated: 'Navigate', unauthenticated: 'Navigate', api: [] },
]

function propsOf(element: ReactElement): Record<string, unknown> {
  return element.props as Record<string, unknown>
}

function childOf(element: ReactElement): ReactElement {
  return propsOf(element).children as ReactElement
}

function childrenOf(value: unknown): RouteElement[] {
  return (Array.isArray(value) ? value : [value]) as RouteElement[]
}

function elementName(element: ReactElement): string {
  const type = element.type
  if (typeof type === 'string') return type
  if (typeof type === 'function') return type.name
  return 'lazy'
}

type HarnessUsuario = { username: string; papel: string }

function routeElementsFor(usuario: HarnessUsuario | null): RouteElement[] {
  harnessState.usuario = usuario
  const appTree = App() as unknown as ReactElement
  const authTree = childOf(appTree)
  const rotasTree = childOf(authTree)
  const suspenseTree = (rotasTree.type as () => ReactElement)()
  const routesTree = childOf(suspenseTree)
  return childrenOf(propsOf(routesTree).children)
}

function routeElements(authenticated: boolean): RouteElement[] {
  return routeElementsFor(authenticated ? { username: 'teste', papel: 'admin' } : null)
}

function routeFor(routes: readonly RouteElement[], path: string): RouteElement {
  const route = routes.find((candidate) => propsOf(candidate).path === path)
  if (!route) throw new Error(`Rota ausente no baseline: ${path}`)
  return route
}

function destinationOf(route: RouteElement): ReactElement {
  return propsOf(route).element as ReactElement
}

function renderComponent(element: ReactElement): ReactElement {
  return (element.type as (props: Record<string, unknown>) => ReactElement)(propsOf(element))
}

function pageDestinationOf(route: RouteElement): ReactElement {
  const destination = destinationOf(route)
  return elementName(destination) === 'RotaProjeto' ? propsOf(destination).children as ReactElement : destination
}

describe('baseline de rotas pós-login', () => {
  it('documenta o inventário atual de rotas e páginas sem executar efeitos de página', () => {
    const routes = routeElements(true)

    expect(routes.map((route) => propsOf(route).path)).toEqual(
      currentRouteInventory.map((entry) => entry.path),
    )
    expect(routes.map((route) => elementName(destinationOf(route)))).toEqual(
      currentRouteInventory.map((entry) => entry.authenticated),
    )
  })

  it('protege as rotas autenticadas e deixa a publicação pública fora do guard', () => {
    const routes = routeElements(false)

    for (const entry of currentRouteInventory) {
      const destination = destinationOf(routeFor(routes, entry.path))
      expect(elementName(destination)).toBe(entry.unauthenticated)

      if (entry.unauthenticated === 'Navigate') {
        expect(propsOf(destination).to).toBe(entry.path === '*' ? ROTA_FALLBACK : '/login')
      }
    }
  })

  it('preserva o ID do projeto nos redirects legados existentes', () => {
    const routes = routeElements(true)
    const aliases = ['/projetos/:id'] as const

    for (const id of ['101', '202']) {
      harnessState.params.id = id
      for (const alias of aliases) {
        const redirectComponent = renderComponent(destinationOf(routeFor(routes, alias)))
        const redirect = renderComponent(redirectComponent)
        expect(elementName(redirect)).toBe('Navigate')
        expect(propsOf(redirect).to).toBe(obterDestinoAlias(alias, id))
        expect(propsOf(redirect).replace).toBe(true)
      }
    }
  })

  it('mantém o fallback desconhecido seguro para a entrada existente', () => {
    for (const authenticated of [false, true]) {
      const fallback = destinationOf(routeFor(routeElements(authenticated), '*'))
      expect(elementName(fallback)).toBe('Navigate')
      expect(propsOf(fallback).to).toBe(ROTA_FALLBACK)
    }
  })

  it('expõe toda a navegação canônica autenticada por área de projeto', () => {
    const routes = routeElements(true)
    const canonicalDestinations: readonly [string, string, string?][] = [
      [ROTAS_CANONICAS.projetos, 'ProjetosPage'],
      [ROTAS_CANONICAS.projetoVisaoGeral, 'DashboardPage', 'Visão Geral'],
      [ROTAS_CANONICAS.projetoCustos, 'DashboardPage', 'Custos'],
      [ROTAS_CANONICAS.projetoPayback, 'DashboardPage', 'Payback'],
      [ROTAS_CANONICAS.projetoInsights, 'DashboardPage', 'Insights'],
      [ROTAS_CANONICAS.projetoComparativo, 'DashboardPage', 'Comparativo'],
      [ROTAS_CANONICAS.projetoDados, 'PlanilhaPage'],
      [ROTAS_CANONICAS.projetoDatasets, 'lazy'],
      [ROTAS_CANONICAS.projetoDataset, 'lazy'],
      [ROTAS_CANONICAS.projetoDashboards, 'lazy'],
      [ROTAS_CANONICAS.projetoDashboard, 'lazy'],
      [ROTAS_CANONICAS.projetoUsuarios, 'DashboardPage', 'Usuários'],
      [ROTAS_CANONICAS.relatorios, 'lazy'],
      [ROTAS_CANONICAS.compartilhados, 'lazy'],
    ]

    for (const [path, destinationName, tab] of canonicalDestinations) {
      const destination = pageDestinationOf(routeFor(routes, path))
      expect(elementName(destination)).toBe(destinationName)
      if (destinationName === 'DashboardPage') {
        expect(propsOf(destination).abaInicial).toBe(tab)
      }
    }

    const publicRoute = routeFor(routes, ROTAS_CANONICAS.publico)
    expect(elementName(destinationOf(publicRoute))).toBe('lazy')
  })

  it('protege as rotas canônicas autenticadas e mantém a publicação pública', () => {
    const routes = routeElements(false)
    const authenticatedPaths = Object.values(ROTAS_CANONICAS).filter(
      (path) => path !== ROTAS_CANONICAS.publico,
    )

    for (const path of authenticatedPaths) {
      const destination = destinationOf(routeFor(routes, path))
      expect(elementName(destination)).toBe('Navigate')
      expect(propsOf(destination).to).toBe('/login')
    }

    expect(elementName(destinationOf(routeFor(routes, ROTAS_CANONICAS.publico)))).toBe('lazy')
  })

  it('redireciona aliases legados para os destinos canônicos e preserva o ID', () => {
    const routes = routeElements(true)
    const projectId = '202'

    const rootRedirect = destinationOf(routeFor(routes, '/'))
    expect(elementName(rootRedirect)).toBe('Navigate')
    expect(propsOf(rootRedirect).to).toBe(obterDestinoAlias('/'))
    expect(propsOf(rootRedirect).replace).toBe(true)

    const legacyAliases = Object.keys(ALIASES_ROTAS).filter(
      (path): path is keyof typeof ALIASES_ROTAS => path !== '/',
    )
    for (const alias of legacyAliases) {
      harnessState.params.id = projectId
      const legacyDestination = renderComponent(destinationOf(routeFor(routes, alias)))
      const redirect = renderComponent(legacyDestination)

      expect(elementName(redirect)).toBe('Navigate')
      expect(propsOf(redirect).to).toBe(obterDestinoAlias(alias, projectId))
      expect(propsOf(redirect).replace).toBe(true)
    }
  })

  it('expõe o destino de Usuários para o administrador mesmo em projeto vazio', () => {
    // A project with no locais still resolves to the same DashboardPage route;
    // the page decides whether to show the empty analytical state or UsuariosTab.
    const usersDestination = pageDestinationOf(
      routeFor(routeElements(true), ROTAS_CANONICAS.projetoUsuarios),
    )

    expect(elementName(usersDestination)).toBe('DashboardPage')
    expect(propsOf(usersDestination).abaInicial).toBe('Usuários')
  })

  it('redireciona IDs de projeto inválidos antes de montar páginas com escopo', () => {
    const projectRoutes = [
      '/projetos/:id',
      '/projetos/:id/dashboard',
      '/projetos/:id/planilha',
      ROTAS_CANONICAS.projetoVisaoGeral,
      ROTAS_CANONICAS.projetoCustos,
      ROTAS_CANONICAS.projetoPayback,
      ROTAS_CANONICAS.projetoInsights,
      ROTAS_CANONICAS.projetoComparativo,
      ROTAS_CANONICAS.projetoDados,
      ROTAS_CANONICAS.projetoDatasets,
      ROTAS_CANONICAS.projetoDataset,
      ROTAS_CANONICAS.projetoDashboards,
      ROTAS_CANONICAS.projetoDashboard,
      ROTAS_CANONICAS.projetoUsuarios,
    ]

    for (const id of ['0', '-1', '1.5', '1e2', 'nao-numerico']) {
      harnessState.params.id = id
      const routes = routeElements(true)
      for (const path of projectRoutes) {
        const guarded = destinationOf(routeFor(routes, path))
        const fallback = renderComponent(guarded)

        expect(elementName(fallback)).toBe('Navigate')
        expect(propsOf(fallback).to).toBe(ROTA_FALLBACK)
      }
    }
  })

  it('nega a rota de Usuários para não administradores', () => {
    harnessState.params.id = '17'
    const usersRoute = routeFor(
      routeElementsFor({ username: 'cliente', papel: 'usuario' }),
      ROTAS_CANONICAS.projetoUsuarios,
    )
    const fallback = renderComponent(destinationOf(usersRoute))

    expect(elementName(fallback)).toBe('Navigate')
    expect(propsOf(fallback).to).toBe(ROTA_FALLBACK)
  })

  it('usa o fallback canônico para rotas desconhecidas autenticadas', () => {
    const fallback = destinationOf(routeFor(routeElements(true), '*'))

    expect(elementName(fallback)).toBe('Navigate')
    expect(propsOf(fallback).to).toBe(ROTA_FALLBACK)
    expect(propsOf(fallback).replace).toBe(true)
  })
})

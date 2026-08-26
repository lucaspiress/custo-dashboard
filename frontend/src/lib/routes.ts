/**
 * Route definitions shared by the authenticated shell and its pages.
 *
 * This module deliberately contains no router or React code.  Route patterns
 * are kept here so that navigation, redirects and route-derived context use
 * the same canonical addresses.
 */

export const ROTAS_CANONICAS = {
  projetos: '/projetos',
  projetoVisaoGeral: '/projetos/:id/visao-geral',
  projetoCustos: '/projetos/:id/custos',
  projetoPayback: '/projetos/:id/payback',
  projetoInsights: '/projetos/:id/insights',
  projetoComparativo: '/projetos/:id/comparativo',
  projetoDados: '/projetos/:id/dados',
  projetoDatasets: '/projetos/:id/datasets',
  projetoDataset: '/projetos/:id/datasets/:did',
  projetoDashboards: '/projetos/:id/dashboards',
  projetoDashboard: '/projetos/:id/dashboards/:dbid',
  projetoUsuarios: '/projetos/:id/usuarios',
  relatorios: '/relatorios',
  compartilhados: '/compartilhados',
  publico: '/p/:token',
} as const

export type RotaCanonica = (typeof ROTAS_CANONICAS)[keyof typeof ROTAS_CANONICAS]

export type AutenticacaoRota = 'authenticated' | 'public'

export type MetadadosRota = {
  auth: AutenticacaoRota
  projectScoped: boolean
  adminOnly?: boolean
  requiredContext: readonly string[]
}

const METADADOS_PORTFOLIO = {
  auth: 'authenticated',
  projectScoped: false,
  requiredContext: [],
} as const

/** Metadata is keyed by the route pattern, not by a concrete URL. */
export const METADADOS_ROTAS = {
  [ROTAS_CANONICAS.projetos]: METADADOS_PORTFOLIO,
  [ROTAS_CANONICAS.projetoVisaoGeral]: {
    auth: 'authenticated',
    projectScoped: true,
    requiredContext: ['id'],
  },
  [ROTAS_CANONICAS.projetoCustos]: {
    auth: 'authenticated',
    projectScoped: true,
    requiredContext: ['id'],
  },
  [ROTAS_CANONICAS.projetoPayback]: {
    auth: 'authenticated',
    projectScoped: true,
    requiredContext: ['id'],
  },
  [ROTAS_CANONICAS.projetoInsights]: {
    auth: 'authenticated',
    projectScoped: true,
    requiredContext: ['id'],
  },
  [ROTAS_CANONICAS.projetoComparativo]: {
    auth: 'authenticated',
    projectScoped: true,
    requiredContext: ['id'],
  },
  [ROTAS_CANONICAS.projetoDados]: {
    auth: 'authenticated',
    projectScoped: true,
    requiredContext: ['id'],
  },
  [ROTAS_CANONICAS.projetoDatasets]: {
    auth: 'authenticated',
    projectScoped: true,
    requiredContext: ['id'],
  },
  [ROTAS_CANONICAS.projetoDataset]: {
    auth: 'authenticated',
    projectScoped: true,
    requiredContext: ['id', 'did'],
  },
  [ROTAS_CANONICAS.projetoDashboards]: {
    auth: 'authenticated',
    projectScoped: true,
    requiredContext: ['id'],
  },
  [ROTAS_CANONICAS.projetoDashboard]: {
    auth: 'authenticated',
    projectScoped: true,
    requiredContext: ['id', 'dbid'],
  },
  [ROTAS_CANONICAS.projetoUsuarios]: {
    auth: 'authenticated',
    projectScoped: true,
    adminOnly: true,
    requiredContext: ['id'],
  },
  [ROTAS_CANONICAS.relatorios]: {
    auth: 'authenticated',
    projectScoped: false,
    requiredContext: [],
  },
  [ROTAS_CANONICAS.compartilhados]: {
    auth: 'authenticated',
    projectScoped: false,
    requiredContext: [],
  },
  [ROTAS_CANONICAS.publico]: {
    auth: 'public',
    projectScoped: false,
    requiredContext: ['token'],
  },
} as const satisfies Record<RotaCanonica, MetadadosRota>

/** Client-side aliases for addresses that existed before the redesign. */
export const ALIASES_ROTAS = {
  '/': ROTAS_CANONICAS.projetos,
  '/projetos/:id': ROTAS_CANONICAS.projetoVisaoGeral,
  '/projetos/:id/dashboard': ROTAS_CANONICAS.projetoVisaoGeral,
  '/projetos/:id/planilha': ROTAS_CANONICAS.projetoDados,
} as const

export type RotaAlias = keyof typeof ALIASES_ROTAS

/** Unknown authenticated routes must never retain a previous project context. */
export const ROTA_FALLBACK = ROTAS_CANONICAS.projetos

export const METADADO_FALLBACK = {
  auth: 'authenticated',
  projectScoped: false,
  requiredContext: [],
  redirectTo: ROTA_FALLBACK,
} as const

export type ProjetoId = string | number

const ROTAS_PROJETO = new Set<RotaCanonica>(
  Object.entries(METADADOS_ROTAS)
    .filter(([, metadata]) => metadata.projectScoped)
    .map(([path]) => path as RotaCanonica),
)

/**
 * Converts a route parameter to the positive integer ID used by project APIs.
 * Exponential notation, decimals, zero and negative values are not IDs.
 */
export function parseProjetoId(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null
  }

  if (typeof value !== 'string') return null

  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) return null

  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function idDeSegmento(segment: string | undefined): number | null {
  if (segment === undefined || segment.trim() !== segment || !/^\d+$/.test(segment)) return null
  return parseProjetoId(segment)
}

function segmentosDeCaminho(path: string): string[] | null {
  if (!path.startsWith('/') || path.includes('?') || path.includes('#')) return null
  if (path === '/') return []

  const segments = path.slice(1).split('/')
  return segments.every((segment) => segment.length > 0) ? segments : null
}

/** Builds an exact canonical project route after validating its numeric ID. */
export function construirRotaProjeto(routePattern: string, projectId: unknown): string | null {
  const id = parseProjetoId(projectId)
  if (id === null || !ROTAS_PROJETO.has(routePattern as RotaCanonica)) return null

  return routePattern.replace(':id', String(id))
}

/**
 * Resolves a legacy alias using either a route pattern plus an ID or a concrete
 * legacy URL (for example `/projetos/42/dashboard`).
 */
export function obterDestinoAlias(aliasOrPath: string, projectId?: ProjetoId): string | null {
  const destination = ALIASES_ROTAS[aliasOrPath as RotaAlias]
  if (destination !== undefined) {
    return destination.includes(':id')
      ? construirRotaProjeto(destination, projectId)
      : destination
  }

  const segments = segmentosDeCaminho(aliasOrPath)
  if (segments === null || segments[0] !== 'projetos') return null
  if (segments.length !== 2 && segments.length !== 3) return null
  if (segments.length === 3 && !['dashboard', 'planilha'].includes(segments[2])) return null

  const id = idDeSegmento(segments[1])
  if (id === null) return null

  if (segments[2] === 'planilha') {
    return construirRotaProjeto(ROTAS_CANONICAS.projetoDados, id)
  }
  return construirRotaProjeto(ROTAS_CANONICAS.projetoVisaoGeral, id)
}

/** Returns canonical metadata for an exact route pattern or concrete URL. */
export function obterMetadadosRota(path: string): MetadadosRota | null {
  const direct = METADADOS_ROTAS[path as RotaCanonica]
  if (direct !== undefined) return direct

  const segments = segmentosDeCaminho(path)
  if (segments === null) return null

  if (segments[0] === 'p' && segments.length === 2) {
    return METADADOS_ROTAS[ROTAS_CANONICAS.publico]
  }

  if (segments[0] !== 'projetos' || idDeSegmento(segments[1]) === null) return null

  if (segments.length === 2) {
    return METADADOS_ROTAS[ROTAS_CANONICAS.projetoVisaoGeral]
  }

  if (segments.length !== 3 && segments.length !== 4) return null

  if (segments[2] === 'datasets' && segments.length === 4) {
    return METADADOS_ROTAS[ROTAS_CANONICAS.projetoDataset]
  }
  if (segments[2] === 'dashboards' && segments.length === 4) {
    return METADADOS_ROTAS[ROTAS_CANONICAS.projetoDashboard]
  }

  const canonicalArea = `/projetos/:id/${segments[2]}` as RotaCanonica
  if (segments.length === 4) return null

  return METADADOS_ROTAS[canonicalArea] ?? null
}

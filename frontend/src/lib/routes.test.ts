import { describe, expect, it } from 'vitest'
import {
  ALIASES_ROTAS,
  construirRotaProjeto,
  METADADO_FALLBACK,
  METADADOS_ROTAS,
  obterDestinoAlias,
  obterMetadadosRota,
  parseProjetoId,
  ROTA_FALLBACK,
  ROTAS_CANONICAS,
} from './routes'

const expectedCanonicalRoutes = {
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

const expectedAliases = {
  '/': '/projetos',
  '/projetos/:id': '/projetos/:id/visao-geral',
  '/projetos/:id/dashboard': '/projetos/:id/visao-geral',
  '/projetos/:id/planilha': '/projetos/:id/dados',
} as const

type RouteMetadata = {
  auth: 'authenticated' | 'public'
  projectScoped: boolean
  adminOnly?: boolean
  requiredContext: readonly string[]
}

describe('contrato puro de rotas canônicas', () => {
  it('expõe todas as rotas canônicas, incluindo as oito áreas do projeto e Usuários', () => {
    expect(ROTAS_CANONICAS).toEqual(expectedCanonicalRoutes)
  })

  it('descreve autenticação e contexto exigido para cada rota', () => {
    const metadata = METADADOS_ROTAS as Record<string, RouteMetadata>

    expect(Object.keys(metadata).sort()).toEqual(Object.values(expectedCanonicalRoutes).sort())

    expect(metadata[expectedCanonicalRoutes.projetos]).toMatchObject({
      auth: 'authenticated',
      projectScoped: false,
      requiredContext: [],
    })
    expect(metadata[expectedCanonicalRoutes.relatorios]).toMatchObject({
      auth: 'authenticated',
      projectScoped: false,
      requiredContext: [],
    })
    expect(metadata[expectedCanonicalRoutes.compartilhados]).toMatchObject({
      auth: 'authenticated',
      projectScoped: false,
      requiredContext: [],
    })
    expect(metadata[expectedCanonicalRoutes.publico]).toMatchObject({
      auth: 'public',
      projectScoped: false,
      requiredContext: ['token'],
    })

    const projectRoutes = Object.entries(expectedCanonicalRoutes).filter(
      ([key]) =>
        key.startsWith('projeto') &&
        !['projetos', 'projetoDataset', 'projetoDashboard'].includes(key),
    )
    for (const [, path] of projectRoutes) {
      expect(metadata[path]).toMatchObject({
        auth: 'authenticated',
        projectScoped: true,
        requiredContext: ['id'],
      })
    }

    expect(metadata[expectedCanonicalRoutes.projetoDataset].requiredContext).toEqual(['id', 'did'])
    expect(metadata[expectedCanonicalRoutes.projetoDashboard].requiredContext).toEqual(['id', 'dbid'])
    expect(metadata[expectedCanonicalRoutes.projetoUsuarios]).toMatchObject({
      auth: 'authenticated',
      projectScoped: true,
      adminOnly: true,
      requiredContext: ['id'],
    })
  })

  it('mapeia os aliases legados para os destinos canônicos e mantém o identificador', () => {
    expect(ALIASES_ROTAS).toEqual(expectedAliases)
    expect(ROTA_FALLBACK).toBe(expectedCanonicalRoutes.projetos)

    for (const alias of ['/projetos/:id', '/projetos/:id/dashboard'] as const) {
      const destino = ALIASES_ROTAS[alias].replace(':id', '42')
      expect(destino).toMatch(/^\/projetos\/42\/visao-geral$/)
    }
    expect(ALIASES_ROTAS['/projetos/:id/planilha'].replace(':id', '42')).toBe('/projetos/42/dados')
  })
})

describe('helpers puros de resolução e navegação', () => {
  it('converte somente IDs de projeto inteiros positivos e seguros', () => {
    expect(parseProjetoId('42')).toBe(42)
    expect(parseProjetoId(7)).toBe(7)

    for (const invalidId of ['', '0', '-1', '1.5', '1e2', 'abc', 0, -1, 1.5, Infinity]) {
      expect(parseProjetoId(invalidId)).toBeNull()
    }
  })

  it('constrói apenas padrões canônicos de projeto com IDs válidos', () => {
    expect(construirRotaProjeto(ROTAS_CANONICAS.projetoDados, '42')).toBe('/projetos/42/dados')
    expect(construirRotaProjeto(ROTAS_CANONICAS.projetoDataset, 42)).toBe(
      '/projetos/42/datasets/:did',
    )
    expect(construirRotaProjeto('/projetos/:id/dados/extra', 42)).toBeNull()
    expect(construirRotaProjeto(ROTAS_CANONICAS.projetoDados, '1e2')).toBeNull()
  })

  it('redireciona aliases exatos e rejeita caminhos legados malformados', () => {
    expect(obterDestinoAlias('/')).toBe('/projetos')
    expect(obterDestinoAlias('/projetos/:id/dashboard', 42)).toBe('/projetos/42/visao-geral')
    expect(obterDestinoAlias('/projetos/42')).toBe('/projetos/42/visao-geral')
    expect(obterDestinoAlias('/projetos/42/planilha')).toBe('/projetos/42/dados')

    for (const invalidPath of [
      '/projetos/0',
      '/projetos/abc/dashboard',
      '/projetos/42/dashboard/extra',
      '/projetos/42//planilha',
      '/projetos/42/planilha/',
    ]) {
      expect(obterDestinoAlias(invalidPath)).toBeNull()
    }
  })

  it('resolve URLs concretas canônicas, inclusive publicação pública', () => {
    expect(obterMetadadosRota('/projetos/42/visao-geral')).toMatchObject({
      auth: 'authenticated',
      projectScoped: true,
      requiredContext: ['id'],
    })
    expect(obterMetadadosRota('/projetos/42/datasets/dataset-1')).toMatchObject({
      requiredContext: ['id', 'did'],
    })
    expect(obterMetadadosRota('/p/public-token')).toMatchObject({
      auth: 'public',
      projectScoped: false,
      requiredContext: ['token'],
    })
  })

  it('rejeita IDs inválidos e segmentos aninhados ou vazios', () => {
    for (const invalidPath of [
      '/projetos/0/dados',
      '/projetos/1.5/dados',
      '/projetos/1e2/dados',
      '/projetos/abc/dados',
      '/projetos/42/datasets/did/extra',
      '/projetos/42/dashboards/dbid/extra',
      '/projetos/42//dados',
      '/p/token/extra',
      '/p/',
    ]) {
      expect(obterMetadadosRota(invalidPath)).toBeNull()
    }
  })

  it('expõe metadados seguros para o fallback autenticado', () => {
    expect(METADADO_FALLBACK).toMatchObject({
      auth: 'authenticated',
      projectScoped: false,
      requiredContext: [],
      redirectTo: ROTA_FALLBACK,
    })
  })
})

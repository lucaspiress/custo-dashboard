import type {
  Agendamento,
  CampoCalculado,
  Dashboard,
  DashboardListResponse,
  Dataset,
  DatasetListResponse,
  DatasetRow,
  Publicacao,
  Relatorio,
  Slicer,
  SlicerTipo,
  Widget,
  WidgetConfig,
  WidgetType,
} from './types'

const BASE = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: options.body instanceof FormData
      ? options.headers
      : { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!resposta.ok) {
    let detalhe = `Erro ${resposta.status}`
    try {
      const corpo = await resposta.json()
      if (corpo && typeof corpo.detail === 'string') detalhe = corpo.detail
    } catch {
      // corpo não-JSON
    }
    throw new ApiError(resposta.status, detalhe)
  }
  if (resposta.status === 204) return undefined as T
  return (await resposta.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  postForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: 'POST', body: form }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  blob: async (path: string): Promise<Blob> => {
    const resposta = await fetch(`${BASE}${path}`, { credentials: 'include' })
    if (!resposta.ok) throw new ApiError(resposta.status, `Erro ${resposta.status}`)
    return resposta.blob()
  },
  postBlob: async (path: string, body: unknown): Promise<Blob> => {
    const resposta = await fetch(`${BASE}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!resposta.ok) {
      let detalhe = `Erro ${resposta.status}`
      try {
        const corpo = await resposta.json()
        if (corpo && typeof corpo.detail === 'string') detalhe = corpo.detail
      } catch {
        // corpo não-JSON
      }
      throw new ApiError(resposta.status, detalhe)
    }
    return resposta.blob()
  },
}

// ---------------------------------------------------------------- datasets

/** Lista datasets do projeto (inclui os virtuais locais-{pid} / itens-{pid}). */
export async function listarDatasets(projetoId: number): Promise<Dataset[]> {
  const dados = await api.get<Dataset[] | DatasetListResponse>(`/api/projetos/${projetoId}/datasets`)
  return Array.isArray(dados) ? dados : dados.datasets
}

/** Cria um dataset livre. `schema` é um mapa coluna → tipo ("text" | "number" | "date"). */
export async function criarDataset(
  projetoId: number,
  nome: string,
  schema: Record<string, string>,
): Promise<Dataset> {
  return api.post<Dataset>(`/api/projetos/${projetoId}/datasets`, { nome, schema_json: schema })
}

/** Lista as linhas de um dataset (suporta IDs virtuais). */
export async function listarLinhas(did: string): Promise<DatasetRow[]> {
  const dados = await api.get<DatasetRow[] | { rows: DatasetRow[] }>(`/api/datasets/${did}/rows`)
  return Array.isArray(dados) ? dados : dados.rows
}

/** Adiciona/atualiza linhas em batch (upsert por row_index). Retorna quantas foram gravadas. */
export async function adicionarLinhas(did: string, rows: DatasetRow[]): Promise<number> {
  const resposta = await api.post<{ adicionadas: number }>(`/api/datasets/${did}/rows`, { rows })
  return resposta.adicionadas
}

/** Importa um arquivo .csv/.xlsx (máx 10MB) para o dataset. */
export async function importarDataset(
  did: string,
  file: File,
): Promise<{ colunas: string[]; linhas_adicionadas: number; tipos: unknown }> {
  const form = new FormData()
  form.append('arquivo', file)
  return api.postForm(`/api/datasets/${did}/importar`, form)
}

/** Exporta o dataset como CSV (Blob). */
export function exportarDatasetCSV(did: string): Promise<Blob> {
  return api.blob(`/api/datasets/${did}/export.csv`)
}

/** Exporta o dataset como XLSX (Blob). */
export function exportarDatasetXLSX(did: string): Promise<Blob> {
  return api.blob(`/api/datasets/${did}/export.xlsx`)
}

/** Renomeia um dataset livre. */
export async function renomearDataset(projetoId: number, did: string, nome: string): Promise<Dataset> {
  return api.patch<Dataset>(`/api/projetos/${projetoId}/datasets/${did}`, { nome })
}

/** Remove um dataset livre (cascata nas linhas). */
export async function deletarDataset(projetoId: number, did: string): Promise<void> {
  return api.delete(`/api/projetos/${projetoId}/datasets/${did}`)
}

// ------------------------------------------------------------- dashboards

/** Lista os dashboards de um projeto (limite 20). */
export async function listarDashboards(projetoId: number): Promise<Dashboard[]> {
  const dados = await api.get<Dashboard[] | DashboardListResponse>(`/api/projetos/${projetoId}/dashboards`)
  return Array.isArray(dados) ? dados : dados.dashboards
}

/** Cria um dashboard. Se for o 1º do projeto, o backend popula com widgets locais/itens. */
export async function criarDashboard(
  projetoId: number,
  nome: string,
  eh_interno = false,
): Promise<Dashboard> {
  return api.post<Dashboard>(`/api/projetos/${projetoId}/dashboards`, { nome, eh_interno })
}

/** Obtém um dashboard completo (com widgets + slicers). */
export async function obterDashboard(projetoId: number, dbid: number): Promise<Dashboard> {
  return api.get<Dashboard>(`/api/projetos/${projetoId}/dashboards/${dbid}`)
}

/** Atualiza nome/layout/eh_interno de um dashboard. */
export async function atualizarDashboard(
  projetoId: number,
  dbid: number,
  dados: { nome?: string; eh_interno?: boolean; layout_json?: Record<string, any> },
): Promise<Dashboard> {
  return api.patch<Dashboard>(`/api/projetos/${projetoId}/dashboards/${dbid}`, dados)
}

/** Remove um dashboard (cascata widgets + slicers). */
export async function deletarDashboard(projetoId: number, dbid: number): Promise<void> {
  return api.delete(`/api/projetos/${projetoId}/dashboards/${dbid}`)
}

/** Adiciona um widget a um dashboard. */
export async function adicionarWidget(
  dbid: number,
  type: WidgetType,
  dataset_id: string,
  config_json: WidgetConfig,
  position_json: { x: number; y: number; w: number; h: number },
): Promise<Widget> {
  return api.post<Widget>(`/api/dashboards/${dbid}/widgets`, {
    type,
    dataset_id,
    config_json,
    position_json,
  })
}

/** Atualiza um widget. */
export async function atualizarWidget(
  dbid: number,
  wid: number,
  dados: Partial<Pick<Widget, 'type' | 'dataset_id' | 'config_json' | 'position_json' | 'ordem'>>,
): Promise<Widget> {
  return api.patch<Widget>(`/api/dashboards/${dbid}/widgets/${wid}`, dados)
}

/** Remove um widget. */
export async function deletarWidget(dbid: number, wid: number): Promise<void> {
  return api.delete(`/api/dashboards/${dbid}/widgets/${wid}`)
}

/** Adiciona um slicer a um dashboard. */
export async function adicionarSlicer(
  dbid: number,
  dataset_id: string,
  field: string,
  tipo: SlicerTipo,
): Promise<Slicer> {
  return api.post<Slicer>(`/api/dashboards/${dbid}/slicers`, { dataset_id, field, tipo })
}

/** Remove um slicer. */
export async function deletarSlicer(dbid: number, sid: number): Promise<void> {
  return api.delete(`/api/dashboards/${dbid}/slicers/${sid}`)
}

export interface QueryWidgetResult {
  widget_id: number
  type: WidgetType
  data: any
}

export interface QuerySlicerResult {
  slicer_id: number
  field: string
  tipo: SlicerTipo
  options: any[]
}

export interface QueryResult {
  widgets: QueryWidgetResult[]
  slicers: QuerySlicerResult[]
}

/** Executa a query agregada de um dashboard. `slicer_values` é um mapa slicer_id → valores.
 *  `drill_filters` é um mapa widget_origem_id → {campo: valor} aplicado aos demais widgets. */
export async function executarQuery(
  dbid: number,
  widget_ids?: number[],
  slicer_values?: Record<number, any>,
  drill_filters?: Record<string, Record<string, any>>,
): Promise<QueryResult> {
  return api.post<QueryResult>(`/api/dashboards/${dbid}/query`, {
    widget_ids,
    slicer_values,
    drill_filters,
  })
}

// ------------------------------------------------------- campos calculados

/** Lista os campos calculados de um dataset (apenas datasets numéricos). */
export async function listarCamposCalculados(did: number): Promise<CampoCalculado[]> {
  const dados = await api.get<CampoCalculado[] | { campos: CampoCalculado[] }>(
    `/api/datasets/${did}/campos-calculados`
  )
  return Array.isArray(dados) ? dados : dados.campos
}

/** Cria um campo calculado. `formula` é validada pelo parser no backend. */
export async function criarCampoCalculado(did: number, nome: string, formula: string): Promise<CampoCalculado> {
  return api.post<CampoCalculado>(`/api/datasets/${did}/campos-calculados`, { nome, formula })
}

/** Atualiza nome/formula/ordem de um campo calculado. */
export async function atualizarCampoCalculado(
  did: number,
  cid: number,
  dados: { nome?: string; formula?: string; ordem?: number },
): Promise<CampoCalculado> {
  return api.patch<CampoCalculado>(`/api/datasets/${did}/campos-calculados/${cid}`, dados)
}

/** Remove um campo calculado. */
export async function deletarCampoCalculado(did: number, cid: number): Promise<void> {
  return api.delete(`/api/datasets/${did}/campos-calculados/${cid}`)
}

// ------------------------------------------------------------- publicações

/** Publica um dashboard, gerando um link público `/p/{token}`. */
export async function criarPublicacao(dbid: number): Promise<{ token: string; url_publica: string }> {
  return api.post<{ token: string; url_publica: string }>(`/api/dashboards/${dbid}/publicar`, {})
}

/** Revoga uma publicação (o link deixa de funcionar). */
export async function revogarPublicacao(pid: number): Promise<void> {
  return api.delete(`/api/publicacoes/${pid}`)
}

/** Obtém uma publicação pelo id. */
export async function obterPublicacao(pid: number): Promise<Publicacao> {
  return api.get<Publicacao>(`/api/publicacoes/${pid}`)
}

/** Lista as publicações de um dashboard. */
export async function listarPublicacoes(dbid: number): Promise<Publicacao[]> {
  const dados = await api.get<Publicacao[] | { publicacoes: Publicacao[] }>(
    `/api/dashboards/${dbid}/publicacoes`
  )
  return Array.isArray(dados) ? dados : dados.publicacoes
}

// ------------------------------------------------------------ compartilhados

/** Lista dashboards internos (eh_interno=true) visíveis a todos os usuários logados. */
export async function listarCompartilhados(): Promise<Dashboard[]> {
  const dados = await api.get<Dashboard[] | DashboardListResponse>(`/api/dashboards/compartilhados`)
  return Array.isArray(dados) ? dados : dados.dashboards
}

// ------------------------------------------------------------ agendamentos

/** Lista os agendamentos do usuário. */
export async function listarAgendamentos(): Promise<Agendamento[]> {
  const dados = await api.get<Agendamento[] | { agendamentos: Agendamento[] }>(`/api/agendamentos`)
  return Array.isArray(dados) ? dados : dados.agendamentos
}

/** Cria um agendamento de relatório para uma publicação. */
export async function criarAgendamento(
  publicacao_id: number,
  periodicidade: Agendamento['periodicidade'],
): Promise<Agendamento> {
  return api.post<Agendamento>(`/api/agendamentos`, { publicacao_id, periodicidade })
}

/** Atualiza ativo/periodicidade de um agendamento. */
export async function atualizarAgendamento(
  aid: number,
  dados: { ativo?: boolean; periodicidade?: Agendamento['periodicidade'] },
): Promise<Agendamento> {
  return api.patch<Agendamento>(`/api/agendamentos/${aid}`, dados)
}

/** Remove um agendamento. */
export async function deletarAgendamento(aid: number): Promise<void> {
  return api.delete(`/api/agendamentos/${aid}`)
}

// -------------------------------------------------------------- relatórios

/** Lista os relatórios gerados. */
export async function listarRelatorios(): Promise<Relatorio[]> {
  const dados = await api.get<Relatorio[] | { relatorios: Relatorio[] }>(`/api/relatorios`)
  return Array.isArray(dados) ? dados : dados.relatorios
}

/** Baixa o PDF de um relatório (proxy do R2 pelo backend). */
export function baixarRelatorio(rid: number): Promise<Blob> {
  return api.blob(`/api/relatorios/${rid}/download`)
}

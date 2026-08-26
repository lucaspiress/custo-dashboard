# Data Model — Redesign pós-login

**Feature:** `001-redesign-custo-dashboard`  
**Schema decision:** no database migration, table change or new persisted entity.

The model below describes the existing persisted entities and the derived payloads that the redesigned UI must present. `Projeto` is the boundary for every project-scoped read and action.

## Persisted entities

### Usuário

Source: `usuarios` and `/api/auth/*`, `/api/users/*`.

| Field | Type | Rules |
|---|---|---|
| `id` | integer | Identity key. |
| `username` | string | Required, unique, normalized by login. |
| `nome` | string | Required. |
| `papel` | `admin` \| `usuario` \| `cliente` | Determines existing capabilities. |
| `ativo` | boolean | Inactive users cannot authenticate. |

Authorization remains unchanged: admins and users can access existing projects; clients can access only projects whose `cliente_usuario_id` matches their user ID. A missing or unauthorized project is returned as not found by the existing dependency to avoid disclosure.

### Projeto

Source: `projetos` and `ProjetoResumo`.

| Field | Type | Rules |
|---|---|---|
| `id` | integer | Required route context (`:id`). |
| `nome` | string | Required for create and rename. |
| `cliente` | string or null | Optional display metadata. |
| `cliente_usuario_id` | integer or null | Existing optional client association; no new ACL semantics. |
| `criado_em` | timestamp | Server-generated. |

The list response also derives `num_locais`, `num_itens` and portfolio totals. Those values are summaries, not cross-project comparison data.

### Local

Source: `locais`, project payload `Local` and `LocalLinha`.

| Field group | Fields |
|---|---|
| Identity | `id`, `projeto_id`, `nome` |
| Financial inputs | `valor_mensal`, `taxa_instalacao`, `custo_manutencao`, `mensal_terceirizada`, `chip_mensal`, `custos_softwares`, `mao_de_obra` |
| Date | `data_inst` (nullable date) |
| Children | `itens[]` |

Required names and numeric/date parsing follow the existing project router, store and spreadsheet loader. Derived fields such as saldo, investimento, margem, revenue and return are calculated by the existing backend analysis and are not independently persisted by the redesign.

### Registro de custo / Item

Source: `itens`, `Item` and `ItemLinha`.

| Field | Type | Rules |
|---|---|---|
| `id` | integer | Identity key. |
| `local_id` | integer | Required foreign key to a `Local`; therefore indirectly to one `Projeto`. |
| `categoria` | string | Existing grouping/filter field. |
| `cod` | string or null | Existing optional code. |
| `material` | string | Required for creation. |
| `qtd` | numeric | Existing quantity precision/validation. |
| `valor_unit` | numeric | Existing currency precision/validation. |
| `valor_total` | numeric | Derived/persisted by the existing store behavior; do not recalculate in a second source. |

### Dataset and DatasetRow

Source: `datasets`, `dataset_rows` and `Dataset`/`DatasetRow` types.

`Dataset` belongs to exactly one project and has `id`, `projeto_id`, `nome`, `schema_json`, `fonte` (`livre`, `locais` or `itens`), `criado_em` and `atualizado_em`. `DatasetRow` contains `row_index` and `data_json`; `(dataset_id, row_index)` is unique. Virtual `locais-{pid}` and `itens-{pid}` datasets are read-only sources, while free datasets support the existing import/export and row operations.

Schema validation, 10 MB dataset import limit, virtual-dataset restrictions and calculated-field restrictions remain those of the current routers. No column-management or paste enhancement from the backlog is added.

### Dashboard, Widget and Slicer

`Dashboard` belongs to one `Projeto` and contains `id`, `projeto_id`, `nome`, `layout_json`, `eh_interno`, `criado_em`, `atualizado_em`, optional `widgets[]` and optional `slicers[]`.

- `Widget`: `id`, `dashboard_id`, `type`, `dataset_id`, `config_json`, `position_json`, `ordem`. Existing types are `bar`, `line`, `pie`, `area`, `scatter`, `kpi`, `table` and `pivot`.
- `Slicer`: `id`, `dashboard_id`, `dataset_id`, `field`, `values_json`, `tipo` (`lista`, `intervalo` or `data`).
- `CampoCalculado`: belongs to a free numeric dataset and has `id`, `dataset_id`, `nome`, `formula`, `dependencias_json`, `ordem`; formulas are validated by the existing parser.

Dashboard queries are always authorized through the dashboard's project. Slicers and widgets affect only that dashboard/project data.

### Publicação, Agendamento, Relatório and AuditLog

- `Publicacao`: `id`, `dashboard_id`, `token`, `revogado_em`, `criado_em`, `criado_por`. Public links expose only the already authorized published content.
- `Agendamento`: `id`, `publicacao_id`, `periodicidade`, `proxima_execucao`, `ativo`, `criado_em`, `criado_por`.
- `Relatorio`: `id`, optional `agendamento_id`, `publicacao_id`, `gerado_em`, `storage_key`, `tamanho_bytes`, `status` (`gerado` or `falha`).
- `AuditLog`: `id`, `evento`, optional `usuario_id`, `alvo_id`, `alvo_tipo`, `criado_em`, `metadata_json`.

These records retain current publication/report state semantics. Manual Cloudflare R2 and Cron configuration is not part of this feature.

## Derived, non-persisted analysis model

The existing `GET /api/projetos/{id}` returns `AnaliseUpload`: `filename`, `avisos`, `locais[]` and `projeto`. `ResumoLocal`, project totals, `Insight`, serialized chart figures and `FluxoCaixa` are derived from valid source rows by the backend. `FluxoCaixa` exposes the supported 6/12/24/36 month horizons and payback points.

An `Indicador` in the UI is therefore a presentation of an existing derived value with its project ID, recorte, unit and availability state. It is not a new database entity. The UI exposes only dimensions and bases present in the current analytical payload. A filter has a component-level scope: its affected tables/charts/indicators are declared visibly, and precomputed dashboard values are not assumed to recalculate. There is no global filter or server-side filtered-analysis model in this redesign. The current payload/schema has no budget-versus-realized base to support a positive comparison branch, so missing period, budget or realized data produces an explicit unavailable state.

## Import integrity boundary

Row-level import integrity is not an entity or state machine of this redesign. The current import operation and its existing response/messages are preserved, but this feature does not promise per-row accepted/rejected/duplicate accounting or protection against invalid numerics being silently normalized. Those guarantees require the separate prerequisite feature documented in `research.md` and `spec.md`; they must not be added to this feature's acceptance evidence or implementation tasks.

## Relationships and isolation invariants

```text
Usuário ──< Projeto ──< Local ──< Item
                 ├──< Dataset ──< DatasetRow
                 │             └──< CampoCalculado (free datasets)
                 └──< Dashboard ──< Widget / Slicer
                                  └──< Publicacao ──< Agendamento ──< Relatorio
```

1. Every project-scoped route resolves one `projeto_id` from `:id`.
2. Every project-scoped API request is checked by the existing authorization dependency or an equivalent dashboard/dataset ownership check.
3. Switching `:id` clears project-derived UI state before loading the new payload; obsolete responses cannot overwrite the new project.
4. `null`, zero, negative values allowed by existing rules and unavailable values remain distinct.
5. A failed edit/import/report/publication does not become a confirmed persisted success.
6. A filter cannot imply a broader effect than its declared component scope; unavailable dimensions/bases remain unavailable.
7. Server-side filtered analysis and any new analytical source are future/prerequisite work, not part of this model.

## State transitions used by the UI

| Flow | States | Transition rule |
|---|---|---|
| Project data load | `carregando → pronto`, `carregando → erro`, `vazio` | Clear old project content on ID change; render empty guidance when valid project has no source rows. |
| Autosave | `salvo → pendente → salvando → salvo` or `erro` | Only successful API response reaches `salvo`; retry remains explicit after error. |
| Import operation | `enviando → resposta atual` or `erro` | Preserve the current import contract and operation-level message. Per-row accepted/rejected/duplicate and invalid-numeric guarantees are N/A until the separate prerequisite feature. |
| Delivery | `solicitado → processando → gerado` or `falha/sem acesso` | Link/download is presented as valid only after the existing success response. |
| Authorization/session | `autenticado`, `sessão expirada`, `sem acesso`, `não encontrado` | Preserve safe context and direct the user to the existing login, allowed project or recovery action without data leakage. |

# Contract: Compatibilidade da API

**Status:** existing contract freeze for `001-redesign-custo-dashboard`  
**Base:** `/api` on the same origin; the frontend sends cookies with `credentials: include`.

The redesign may reorganize pages and route names, but it must call the following existing API surface without changing paths, verbs, request fields, response shapes, status semantics or media types. Project context is supplied by the canonical route `:id`; it is not persisted or added to payloads.

Filtering compatibility is also bounded to the current payload: the frontend may filter a component over dimensions already present in that response, but must not claim a global filtered analysis or require precomputed KPIs/charts to recalculate. Server-side filtered analysis and new period/budget bases are future/prerequisite work, not API changes in this feature.

## Authentication and health

| Method/path | Request | Response/compatibility |
|---|---|---|
| `POST /api/auth/login` | `{ username, senha }` | User payload; sets existing httpOnly session cookie. Keep current 400/401 messages and behavior. |
| `POST /api/auth/logout` | none | `{ ok: true }`; clears existing cookie. |
| `GET /api/auth/me` | cookie | Current user payload; unauthenticated returns 401. |
| `GET /api/health` | none | Existing health object including `ok`, `modo` and `versao`. |

`LoginPage.tsx` and these authentication contracts are protected. No token, cookie, auth provider or login payload change is part of the redesign.

## Administrative users

| Method/path | Existing contract |
|---|---|
| `GET /api/users` | Admin-only list of users with `id`, `username`, `nome`, `papel` and `ativo`. |
| `POST /api/users` | Admin-only create body `{ nome, username, senha, papel }`; existing password, role and maximum-admin validation remains. |
| `PATCH /api/users/{user_id}` | Admin-only update of the existing `ativo` flag; returns user. |
| `POST /api/users/{user_id}/reset-password` | Admin-only password reset body `{ senha }`; returns `{ ok: true }`. |

## Projects, costs and exports

| Method/path | Existing contract |
|---|---|
| `GET /api/projetos` | Authenticated list of `ProjetoResumo[]`, scoped for client users by existing behavior. |
| `POST /api/projetos` | Admin body `{ nome, cliente?, cliente_usuario_id? }`; returns created project. |
| `PATCH /api/projetos/{projeto_id}` | Admin rename/metadata body; returns project. |
| `DELETE /api/projetos/{projeto_id}` | Admin delete; 204 on success. |
| `GET /api/projetos/{projeto_id}` | Authorized analysis payload `AnaliseUpload`: filename, avisos, locais with items/insights/charts/flow and project totals/charts. |
| `POST /api/projetos/importar` | Multipart `.xlsx` in existing template; returns `{ id, nome, avisos }` or existing validation error. |
| `POST /api/projetos/{projeto_id}/locais` | Admin create local; returns local. |
| `PATCH /api/projetos/{projeto_id}/locais/{local_id}` | Admin update supported local fields; returns local. |
| `DELETE /api/projetos/{projeto_id}/locais/{local_id}` | Admin delete; 204. |
| `POST /api/projetos/locais/{local_id}/itens` | Admin create item; returns item. |
| `PATCH /api/projetos/itens/{item_id}` | Admin update supported item fields; returns item. |
| `DELETE /api/projetos/itens/{item_id}` | Admin delete; 204. |
| `GET /api/projetos/{projeto_id}/planilha.xlsx` | Authorized XLSX blob with existing content disposition. |
| `POST /api/projetos/{projeto_id}/relatorio` | Authorized PDF blob with existing content disposition; project without locals returns existing 400. |

The route redesign must not translate a project ID from one project into another endpoint ID. The backend remains authoritative for authorization and calculations.

The import endpoint contract is operation-level only. It does not become a row-level integrity contract through this redesign: accepted/rejected/duplicate accounting and invalid-numeric handling are explicitly deferred to the separate prerequisite feature. The frontend must preserve the current response and must not claim those guarantees.

## Datasets and calculated fields

| Method/path | Existing contract |
|---|---|
| `GET/POST /api/projetos/{projeto_id}/datasets` | List or create a dataset; create body `{ nome, schema_json }`. |
| `GET/PATCH/DELETE /api/projetos/{projeto_id}/datasets/{did}` | Read/update/delete a project dataset; virtual datasets reject unsupported mutation. |
| `GET/POST /api/datasets/{did}/rows` | List or upsert rows; POST body `{ rows }`, response includes `adicionadas`. Supports existing virtual read-only rules. |
| `POST /api/datasets/{did}/importar` | Multipart CSV/XLSX, current 10 MB limit; returns columns, added count and inferred types. |
| `GET /api/datasets/{did}/export.csv` | CSV blob. |
| `GET /api/datasets/{did}/export.xlsx` | XLSX blob. |
| `GET/POST /api/datasets/{did}/campos-calculados` | List/create calculated fields; existing formula validation applies. |
| `PATCH/DELETE /api/datasets/{did}/campos-calculados/{cid}` | Update/delete calculated field; 204 on delete. |

## Dashboards, widgets, slicers and sharing

| Method/path | Existing contract |
|---|---|
| `GET/POST /api/projetos/{projeto_id}/dashboards` | List/create project dashboard; create body includes `nome`, optional `layout_json`, `eh_interno`. |
| `GET/PATCH/DELETE /api/projetos/{projeto_id}/dashboards/{dbid}` | Read/update/delete dashboard; response retains widgets/slicers where currently returned. |
| `POST /api/dashboards/{dbid}/widgets` | Create widget with `type`, `dataset_id`, `config_json`, `position_json`. |
| `PATCH/DELETE /api/dashboards/{dbid}/widgets/{wid}` | Update/delete widget; 204 on delete. |
| `POST /api/dashboards/{dbid}/slicers` | Create slicer with `dataset_id`, `field`, `tipo` and existing optional values. |
| `DELETE /api/dashboards/{dbid}/slicers/{sid}` | Delete slicer; 204. |
| `POST /api/dashboards/{dbid}/query` | Query body may contain `widget_ids`, `slicer_values`, `drill_filters`; returns widget data and slicer options. |
| `POST /api/dashboards/{dbid}/publicar` | Creates existing publication response `{ token, url_publica }`. |
| `GET /api/publicacoes/{pid}` | Authorized publication metadata; token is not returned in plain metadata. |
| `DELETE /api/publicacoes/{pid}` | Revoke publication; 204. |
| `GET /api/dashboards/compartilhados` | List visible internal dashboards. |

Every dashboard/widget/slicer operation must resolve back to its project before displaying or mutating data. No new sharing visibility or project ACL is introduced.

## Scheduling, reports and audit

| Method/path | Existing contract |
|---|---|
| `GET/POST /api/agendamentos` | List current user's schedules or create with `{ publicacao_id, periodicidade }`. |
| `PATCH/DELETE /api/agendamentos/{aid}` | Update active/periodicity or delete; existing owner checks remain. |
| `GET /api/relatorios` | List existing report records and statuses. |
| `GET /api/relatorios/{rid}/download` | Authorized PDF blob; records existing download audit. |
| `GET /api/audit-log` | Existing authenticated audit listing, with optional `evento`, `limit` and `offset`. |
| `POST /api/cron/relatorios` | Existing server operation protected by `CRON_SECRET`; no new setup or UI contract in this feature. |

Cloudflare R2 credentials, bucket setup, `CRON_SECRET` and Vercel Cron scheduling are operational prerequisites recorded in `docs/STATUS.md`, not changes to this compatibility contract.

## Error, security and media rules

1. Keep existing HTTP statuses: 401 for missing/invalid session, 403 for admin-only denial, 404 for missing or inaccessible project/resource, 400 for validation, 405 for virtual-dataset mutation and 413 for oversized dataset import.
2. Display `detail` messages in PT-BR when already provided; do not expose stack traces, storage keys, tokens, internal IDs beyond the existing safe route/resource identifier or another project's data.
3. Keep `Content-Type`, `Content-Disposition` and binary download handling for PDF, XLSX and CSV.
4. Do not add frontend-only totals that compete with backend analysis. Existing `analysis.py`, `charts.py`, `serialize.py` and store behavior remain authoritative.
5. A canonical route change is not an API version change. Existing API URLs under `/api/projetos`, `/api/datasets`, `/api/dashboards`, `/api/publicacoes`, `/api/agendamentos` and `/api/relatorios` remain unchanged.

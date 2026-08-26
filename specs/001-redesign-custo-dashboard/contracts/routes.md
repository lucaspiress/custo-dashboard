# Contract: Rotas pós-login e redirects

**Status:** contrato de planejamento para `001-redesign-custo-dashboard`  
**Router:** `frontend/src/App.tsx`  
**Context rule:** every project-scoped route derives its project from numeric `:id`.

## Canonical routes

| Route | Auth | Meaning | Required context |
|---|---|---|---|
| `/projetos` | authenticated | Project portfolio/list and create/import entry point | none |
| `/projetos/:id/visao-geral` | authenticated | Executive project dashboard | project `id` |
| `/projetos/:id/custos` | authenticated | Cost composition, filters and detail | project `id` |
| `/projetos/:id/payback` | authenticated | Existing payback/flow horizons | project `id` |
| `/projetos/:id/insights` | authenticated | Existing rule-based insights | project `id` |
| `/projetos/:id/comparativo` | authenticated | Existing within-project/local comparison only | project `id` |
| `/projetos/:id/dados` | authenticated | ROTA project spreadsheet and cost capture | project `id` |
| `/projetos/:id/datasets` | authenticated | Project datasets library | project `id` |
| `/projetos/:id/datasets/:did` | authenticated | Selected dataset/rows | project `id`, dataset `did` |
| `/projetos/:id/dashboards` | authenticated | Dashboard library/configuration | project `id` |
| `/projetos/:id/dashboards/:dbid` | authenticated | Selected dashboard/widgets/query | project `id`, dashboard `dbid` |
| `/projetos/:id/usuarios` | authenticated admin destination | Existing admin Users capability | project `id`; admin role |
| `/relatorios` | authenticated | Global report history | none; each record identifies its project |
| `/compartilhados` | authenticated | Internally shared dashboards | none; each record identifies its project |
| `/p/:token` | public publication | Existing published dashboard | publication token |

The exact visual shell is governed by `design.md`; this contract governs addressability and context, not styling.

## Redirects and fallback

| Legacy path | Redirect target | Behavior |
|---|---|---|
| `/` | `/projetos` | Authenticated users land in the project portfolio; unauthenticated users follow the existing login guard. |
| `/projetos/:id` | `/projetos/:id/visao-geral` | Preserve the project ID and replace history. |
| `/projetos/:id/dashboard` | `/projetos/:id/visao-geral` | Preserve legacy dashboard deep links. |
| `/projetos/:id/planilha` | `/projetos/:id/dados` | Preserve legacy spreadsheet deep links. |
| unknown authenticated path | `/projetos` | Do not expose a previous project's data. |

Redirects are client-side route aliases; they do not require API aliases or schema records. Public `/p/:token` remains separate from authenticated project routes.

## Resolution and navigation invariants

1. Parse `:id` as a project identifier and load `/api/projetos/{id}` before showing project-derived content.
2. The project name/ID and current area remain visible on every project-scoped route, including loading, empty, error and delivery states.
3. Changing `:id` clears project data, filters, selected local/dataset/dashboard and pending view state before the new request can render.
4. Responses for an old `:id` must be ignored or cancelled and cannot repopulate the current route.
5. A project that is missing or not authorized is handled as the existing safe not-found response; no old project content is shown.
6. Breadcrumbs and shell links navigate to canonical routes. The project selector is a context operation, not an analysis filter; analysis filters are component-scoped and visibly identify their affected components.
7. `/projetos/:id/comparativo` may compare supported locals/recortes within the project only; it must not introduce cross-project comparison.
8. `/projetos/:id/usuarios` is an explicit accessible destination for the existing admin Users capability; non-admin users follow the existing denial/visibility behavior. This adds no new permission model or API contract.

## Route-to-existing capability map

| Canonical area | Existing capability preserved |
|---|---|
| Projetos | list, create, rename, delete, `.xlsx` import |
| Dados | inline local/item edits, paste/import behavior, autosave, derived totals, `.xlsx` export |
| Visão geral/Custos/Payback/Insights/Comparativo | existing `GET /api/projetos/{id}` analysis payload and existing tabs/calculations |
| Datasets | free/virtual dataset list, rows, import/export, calculated fields |
| Dashboards | dashboards, widgets, slicers, queries, drill-down and publication entry points |
| Usuários | existing admin user list and management capability, exposed only to the existing admin role |
| Relatórios/Compartilhados | existing report history, internal dashboards and authorized delivery states |

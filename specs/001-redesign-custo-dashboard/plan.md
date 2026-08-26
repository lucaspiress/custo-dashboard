# Implementation Plan: Redesign do ambiente pós-login do Custo Dashboard

**Branch**: `001-redesign-custo-dashboard` | **Date**: 2026-08-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-redesign-custo-dashboard/spec.md`, with visual/UX direction from `design.md`.

**Workflow**: Spec Kit plan workflow. Phase 0 research and Phase 1 design artifacts are included in the sibling artifacts; `tasks.md` is intentionally not created by this command.

## Summary

The feature reorganizes the authenticated experience around a project-scoped journey: `Projetos → projeto → dados ou visão geral → análise → dashboard/entrega`. The implementation will make the project ID in `:id` the sole route-derived context, move post-login areas to canonical, addressable routes, and retain redirects for legacy deep links. Existing React pages, FastAPI endpoints, calculations, authorization, persisted data and delivery capabilities are reused; the login, API contracts and persisted schema remain unchanged. The pending spreadsheet enhancement in `PlanilhaPage.tsx` is deliberately excluded.

## Technical Context

**Language/Version**: TypeScript 6.0 / React 19.2 in the Vite SPA; Python 3.x with FastAPI in the existing backend (the repository does not declare a new language runtime for this feature).

**Primary Dependencies**: Vite 8, React Router 7, Tailwind CSS 4, Vitest 4, existing AG Grid 36, ECharts 6 and Plotly 3 frontend integrations; FastAPI, existing analysis/serialization modules, reportlab, boto3 and slowapi on the backend. No dependency is added by the plan.

**Storage**: Existing Neon PostgreSQL in production and SQLite in local development. The current tables and boot-time schema creation remain authoritative; no migration or persisted selected-project state is introduced.

**Testing**: Retain frontend Vitest and the existing backend pytest suite. Plan a future Playwright Chromium E2E gate against a locally running FastAPI backend and Vite frontend; document it in `quickstart.md` but do not install Playwright in this workflow.

**Target Platform**: Modern browser SPA served by Vercel, with the existing FastAPI serverless API; acceptance viewports are 1440×900, 1024×768 and 375×812, plus keyboard and screen-reader operation.

**Project Type**: Web application: React/Vite frontend plus FastAPI HTTP API.

**Performance Goals**: Filter-dependent components settle within 2 seconds after data is available (SC-005); the main operator flow is completable within 5 minutes by at least 90% of test operators (SC-002). No new backend throughput target is required.

**Constraints**: `LoginPage.tsx` is immutable. Do not change authentication, API request/response contracts, persisted schema, calculation rules or visibility semantics. Do not add pandas, a parallel calculation source, a cross-project comparison, new permissions or backlog capabilities. Preserve current import behavior but do not claim row-level import-integrity guarantees; accepted/rejected/duplicate accounting and invalid-numeric handling are a separate prerequisite feature. Use only dimensions and bases present in the current analytical payload; filters are component-scoped, unavailable period/budget remains explicit, and precomputed KPIs/charts need not update unless currently supported. Global/server-side filtered analysis is a future prerequisite/backlog note, not an implementation task. Manual Cloudflare R2 and Vercel Cron configuration from v4.3 is out of scope. Keep UI PT-BR, avoid secret material, and preserve existing formats and media types.

**Scale/Scope**: All authenticated post-login areas in the current inventory: projects, project data/planilha, datasets, dashboards/widgets, Visão Geral, Custos, Payback, Insights, Comparativo, admin users, reports, shared dashboards, publication and scheduling entry points. Acceptance covers at least 10 projects and explicitly checks project isolation; public `/p/:token` and login remain outside the redesign surface.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 gate: PASS

| Principle | Plan assessment |
|---|---|
| I. Login Imutável | `frontend/src/pages/LoginPage.tsx` is excluded and must remain byte-for-byte unchanged. No new auth dependency is planned. |
| II. Integridade e Rastreabilidade de Custos | Route ID, project metadata, recorte, source data and delivery state remain visible. Existing calculations and serialized payloads are reused; absent values are not converted to zero. |
| III. Contratos e Dados Existentes Primeiro | The design consumes the existing `/api` surface and tables documented in `contracts/api-compatibility.md`; no API or schema change is proposed. |
| IV. UX Profissional, Responsiva, Acessível e PT-BR | The canonical route contract covers persistent project context, PT-BR states, responsive areas and keyboard/screen-reader requirements from `spec.md` and `design.md`. |
| V. Qualidade Verificável e Mudanças Pequenas | Existing Vitest/pytest are retained, route and API contracts are explicit, and a future Playwright Chromium gate is planned without being installed now. |
| VI. Simplicidade, Segurança e Privacidade | Context is derived from `:id`, not duplicated in global storage; existing authorization and safe 404 behavior are preserved. R2/Cron manual setup is excluded rather than expanded. |

No gate violation requires a complexity exception.

## Project Structure

### Documentation (this feature)

```text
specs/001-redesign-custo-dashboard/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── routes.md
│   └── api-compatibility.md
└── tasks.md                 # Phase 2 output; not created by this command
```

### Source Code (repository root)

```text
backend/
├── main.py
├── routers/
│   ├── auth.py
│   ├── projetos.py
│   ├── datasets.py
│   ├── dashboards.py
│   ├── publicacoes.py
│   ├── agendamentos.py
│   └── relatorios.py
├── analysis.py / insights.py / charts.py / serialize.py
├── projetos_store.py / datasets_store.py / dashboards_store.py
├── schema.sql
└── tests/

frontend/
├── src/App.tsx
├── src/pages/
│   ├── ProjetosPage.tsx
│   ├── DashboardPage.tsx
│   ├── PlanilhaPage.tsx
│   ├── DatasetsPage.tsx
│   ├── DashboardBuilderPage.tsx
│   ├── CompartilhadosPage.tsx
│   └── RelatoriosPage.tsx
├── src/components/
├── src/lib/api.ts / auth.tsx / types.ts
└── src/**/*.test.ts

api/index.py
```

**Structure Decision**: Keep the existing two-part web application. `frontend/src/App.tsx` owns the canonical route map and redirects, page modules consume route-derived `:id`, and `frontend/src/lib/api.ts` remains the single HTTP client. Backend routers and stores remain the source of API and persistence behavior. This plan changes documentation only; implementation tasks will target these existing locations without touching the login, backend contracts or schema.

## Implementation sequencing for the task phase

1. Establish the canonical route map and legacy redirects from `contracts/routes.md`; ensure every project page obtains context from `:id` and clears stale project state while loading.
2. Recompose the authenticated shell/navigation so projects, project areas, datasets, dashboards and global deliveries retain visible destinations and permissions.
3. Preserve existing project data editing/import/autosave behavior and existing analytical payloads, including operation-level empty, partial, loading, validation and error states. Scope filters to visibly identified affected components and do not require precomputed KPI/chart recalculation. Do not implement row-level import integrity (separate prerequisite), the reverted pending `PlanilhaPage.tsx` enhancement, server-side filtered analysis or future analytical data sources.
4. Expose existing delivery actions with project/recorte confirmation and preserve API media types, authentication, authorization and persisted records, including an explicit accessible admin Users destination.
5. Validate the deterministic SC-001 ten-project isolation matrix plus SC-002/SC-004/SC-005 evidence protocols, then run Vitest and the existing backend tests; later add the documented Playwright Chromium gate with FastAPI running locally, without installing it during this plan workflow.

The complete compatibility inventory is in `contracts/api-compatibility.md`; entity and state rules are in `data-model.md`.

## Phase 1 post-design constitution re-check: PASS

| Principle | Re-check after research and design |
|---|---|
| I. Login Imutável | Route and shell work stop at the authenticated boundary; `LoginPage.tsx` is named as a protected file in the route and quickstart contracts. |
| II. Integridade e Rastreabilidade de Custos | The data model distinguishes persisted source rows from derived analysis and delivery records. Project ID, unavailable data, stale loads, component filter scope and source/recorte metadata are explicit. |
| III. Contratos e Dados Existentes Primeiro | `api-compatibility.md` freezes the current API surface and explicitly rejects endpoint/schema changes. Existing v4.3 capabilities remain documented without requiring manual R2/Cron setup. |
| IV. UX Profissional, Responsiva, Acessível e PT-BR | Canonical routes and validation scenarios cover PT-BR states, project context, responsive viewports, keyboard access and textual chart alternatives. |
| V. Qualidade Verificável e Mudanças Pequenas | The plan has independently testable route, ten-project isolation, preservation and delivery scenarios, explicit SC-001/SC-002/SC-004/SC-005 evidence protocols, retains Vitest/pytest, and defers but defines the Playwright gate. |
| VI. Simplicidade, Segurança e Privacidade | One route-derived context avoids duplicate state; current role checks and safe not-found responses are retained; no secrets or new storage are introduced. |

The post-design gate passes with no justified violations.

## Complexity Tracking

> No constitution violations.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | N/A | The design uses the existing frontend/backend projects, API client, stores and schema. |

# Phase 0 Research — Redesign pós-login

**Feature:** `001-redesign-custo-dashboard`  
**Branch:** `001-redesign-custo-dashboard`  
**Evidence used:** `spec.md`, `design.md`, `constitution.md`, `AGENTS.md`, `CLAUDE.md`, `docs/STATUS.md`, `PROJECT_CONTEXT.md`, current route/API/type files and the existing Vitest/pytest setup.

Phase 0 resolves the implementation unknowns without introducing a new library, endpoint, authentication mechanism or storage model.

## 1. Project baseline and source of truth

**Decision:** Treat the current repository implementation and `docs/STATUS.md` as the operational baseline, with `AGENTS.md`/`CLAUDE.md` as permanent constraints.

**Rationale:** `docs/STATUS.md` records the latest v4.0–v4.3 capabilities (datasets, dashboards, calculated fields, publication, scheduling, R2 and audit), while the root guidance documents still describe the stable architecture and v3-compatible project flow. The current code confirms both: React/Vite routes project pages and FastAPI exposes the v4 API surface.

**Alternatives considered:**

- Treat only the older v3 inventory as current — rejected because it would hide implemented v4 capabilities that the redesign must preserve.
- Infer new behavior from the visual document alone — rejected because `design.md` explicitly requires reuse of current API, persistence, calculations and permissions.

## 2. Project context resolution

**Decision:** The active project is derived from the numeric `:id` route parameter on every project-scoped page. The route is the source of truth; no global selected-project store, query-only context or localStorage fallback is introduced.

**Rationale:** A URL-addressable context prevents stale data when opening deep links, supports browser navigation, and makes project isolation auditable. Existing FastAPI dependencies already validate project access for project-scoped resources, including the client role.

**Alternatives considered:**

- Keep the active project only in React context — rejected because refreshes and deep links could lose or mismatch context.
- Persist the selected project in localStorage — rejected because a stale or unauthorized ID could be shown before validation.
- Add `projeto_id` to every analysis payload — rejected because API compatibility is frozen and the route already supplies the ID.

## 3. Canonical post-login information architecture

**Decision:** Use canonical, addressable routes for the post-login IA: `/projetos`, project areas under `/projetos/:id/{visao-geral,custos,payback,insights,comparativo,dados,datasets,dashboards}`, the explicit admin destination `/projetos/:id/usuarios`, and the existing global `/relatorios` and `/compartilhados` destinations. Keep `/p/:token` as the unauthenticated public publication route. The complete mapping is normative in `contracts/routes.md`.

**Rationale:** The current app has project tabs held in component state and legacy paths `/projetos/:id/dashboard` and `/projetos/:id/planilha`. Canonical URLs make area, project and browser history explicit without changing backend URLs. A redirect layer preserves existing bookmarks and deep links.

**Alternatives considered:**

- Keep all project areas as in-memory tabs — rejected because reload/deep-link context and area location remain ambiguous.
- Create separate top-level routes without `:id` — rejected because it permits accidental project mixing.
- Remove legacy paths — rejected by FR-023 and the explicit deep-link preservation decision.

## 4. API and persisted-data compatibility

**Decision:** Reuse the current `/api` endpoints, request bodies, response shapes, status semantics, cookie authentication and media types. Do not add an endpoint for navigation state, a migration, a budget table, or a second calculation pipeline.

**Rationale:** `frontend/src/lib/api.ts`, the FastAPI routers and `backend/schema.sql` provide an already functioning contract. `contracts/api-compatibility.md` records the compatibility boundary and endpoint inventory.

**Alternatives considered:**

- Add a BFF/navigation API — rejected as duplicate orchestration and a contract change.
- Move calculations to TypeScript — rejected by cost traceability and the constitution; backend analysis remains authoritative.
- Add persisted project preferences or route aliases to the database — rejected because redirects belong to the SPA router and schema is frozen.

## 5. Budget versus realized comparison

**Decision:** Expose filters and comparison only for dimensions and bases already present in the current analytical payload, at component level. The UI states which tables, charts or indicators a filter affects; it makes no global-filter claim and does not require precomputed dashboard KPIs/charts to update. The current project schema and `AnaliseUpload` types do not provide a budget base, and period is not assumed to exist; those states are explicitly unavailable. There is no positive budget-versus-realized branch, new source, zero fallback or schema proposal in this feature.

**Rationale:** FR-012/FR-013 require honest comparison semantics, while FR-022/FR-024 prohibit schema changes. This preserves correctness for the current payload without fabricating a source; a future source is only a non-actionable prerequisite/backlog note.

**Alternatives considered:**

- Treat missing budget as zero — rejected because it misstates variance.
- Add budget columns, a new period source or server-side filtered analysis in this feature — rejected as a persisted-schema/API or analytical-service change and outside the approved scope. Any such evolution is a non-actionable prerequisite/backlog note, not an implementation dependency.

## 6. Spreadsheet scope

**Decision:** Preserve the already supported planilha flows (project-scoped capture, inline edits, paste/import behavior, calculation and autosave states) at their current operation-level contract, but exclude the pending spreadsheet enhancement in `PlanilhaPage.tsx`. The enhancement was deliberately reverted and is not a prerequisite, dependency or deliverable of this feature. This redesign does not add row-level accepted/rejected/duplicate accounting or invalid-numeric protection.

**Rationale:** The requested redesign needs a reliable existing data path, not an incidental spreadsheet sub-project. Excluding the reverted work keeps the change small and honors the explicit scope decision while still satisfying the preservation requirements for supported functionality.

**Alternatives considered:**

- Reintroduce the pending enhancement as part of the redesign — rejected because it was explicitly reverted and excluded.
- Remove the existing planilha — rejected by FR-005 and FR-023.

## 7. Row-level import integrity prerequisite

**Decision:** Treat row-level import integrity as a separate prerequisite feature. It must define and implement accepted/rejected/duplicate reporting, invalid-numeric handling and preservation of valid rows before those guarantees can be claimed by the product. This redesign only preserves the current import behavior and operation-level response.

**Rationale:** The current loader/import contracts do not establish that row-level guarantee, and adding it would require a separate acceptance contract and potentially backend behavior changes. Claiming it here would make SC-004 and the implementation scope unverifiable.

**Alternatives considered:**

- Implement row-level import accounting in this redesign — rejected by the locked scope decision.
- Silently treat invalid numeric input as zero — rejected by cost integrity and traceability principles.

## 8. v4.3 R2/Cron operations

**Decision:** Preserve publication, scheduled reports, report history and their existing UI/API entry points, but do not configure or test manual Cloudflare R2 credentials, `CRON_SECRET`, bucket or Vercel Cron in this feature plan.

**Rationale:** `docs/STATUS.md` identifies those as existing manual production setup items, and the resolved decision makes them out of scope. The application must communicate existing delivery states without creating infrastructure work.

**Alternatives considered:**

- Add R2/Cron setup to implementation tasks — rejected as operational infrastructure outside the feature boundary.
- Remove scheduling/publication UI because setup may be incomplete — rejected by the preservation requirement.

## 9. Testing strategy

**Decision:** Retain Vitest for frontend unit/regression coverage and the existing backend pytest suite. Define a future Playwright Chromium E2E gate that starts FastAPI locally and exercises the Vite app through the project-scoped routes; document, but do not install, Playwright now.

**Rationale:** Vitest is already declared and used in `frontend/package.json`. `docs/STATUS.md` says real E2E coverage is not yet present, so a future browser gate is valuable, but installing a new test stack is not part of Phase 0/1.

**Alternatives considered:**

- Replace Vitest with Playwright — rejected because unit tests and browser E2E serve different purposes.
- Install Playwright during planning — rejected by the explicit “document but do not install” decision.
- Rely only on manual visual checks — rejected by the constitution's quality gate and project-isolation criteria.

## Resolved clarification register

| Topic | Resolution |
|---|---|
| Project context | Route-derived from `:id`; no duplicated persisted selection. |
| Post-login IA | Canonical project-scoped routes with redirects for legacy deep links. |
| Login | `frontend/src/pages/LoginPage.tsx` remains unchanged. |
| Spreadsheet enhancement | Pending `PlanilhaPage.tsx` enhancement was reverted and is excluded. Existing supported spreadsheet behavior remains. |
| API/auth/schema | Existing contracts, authentication and persisted schema stay unchanged. |
| Analytical data | Use only current payload dimensions/bases; missing period or budget is explicit unavailable. Future sources are a non-actionable backlog note. |
| Import integrity | Row-level accepted/rejected/duplicate and invalid-numeric guarantees are a separate prerequisite; this redesign preserves current behavior without claiming them. |
| R2/Cron | Existing manual Cloudflare R2/Vercel Cron configuration is out of scope. |
| Testing | Vitest remains; future Playwright Chromium + local FastAPI gate is documented, not installed. |

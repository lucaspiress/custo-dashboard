# Tasks: Redesign do ambiente pós-login do Custo Dashboard

**Input**: Design documents from `specs/001-redesign-custo-dashboard/`

**Branch**: `001-redesign-custo-dashboard`

**Prerequisites**: `plan.md`, `spec.md`, `design.md`, `research.md`, `data-model.md`, `contracts/` and `quickstart.md`.

**Scope guard**: this current workflow must not alter `frontend/src/pages/LoginPage.tsx`, API/authentication contracts, `backend/schema.sql`, persisted data, package manifests, CI, `.specify` or `.opencode`. The pending `PlanilhaPage.tsx` enhancement is deliberately excluded; existing supported spreadsheet behavior is preserved. Existing v4.3 manual Cloudflare R2/Cron configuration is out of scope. No package-related implementation is in this feature; the future Playwright work is only a non-actionable post-feature note.

**External prerequisite boundary**: a separate feature must define row-level import integrity (accepted/rejected/duplicates and invalid-numeric handling) before those guarantees can be claimed. It is not represented by any task below, is not accepted by SC-004 here, and must not be folded into this redesign's implementation.

**Future analytical-source boundary**: adding period, budget or realized data is a non-actionable backlog note only. This task list uses the dimensions and bases already present in the current payload and contains no API/schema or data-source task.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the implementation baseline and test entry points without changing runtime contracts.

- [ ] T001 [P] Confirm the current route, page and API inventory against the implementation plan in `frontend/src/App.tsx`
- [ ] T002 [P] Create the Vitest harness for route and project-isolation tests in `frontend/src/App.test.tsx`
- [ ] T003 [P] Add deterministic two-project response fixtures for frontend tests in `frontend/src/lib/test-fixtures.ts`
- [ ] T004 [P] Add reusable project-scope fixtures for API regression tests in `backend/tests/fixtures.py`

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement route and context primitives that every user story depends on.

**CRITICAL**: No user-story implementation should begin until this phase is complete.

- [ ] T005 [P] Write failing canonical-route and legacy-redirect assertions for `/projetos`, `/projetos/:id/visao-geral`, `/projetos/:id/dados` and the aliases in `frontend/src/lib/routes.test.ts`
- [ ] T006 Implement the canonical route constants, route metadata and legacy alias mapping from `contracts/routes.md` in `frontend/src/lib/routes.ts`
- [ ] T007 [P] Write failing stale-response, invalid-ID and project-switch state tests in `frontend/src/lib/project-context.test.ts`
- [ ] T008 Implement route-derived project context with request generation/abort protection and safe loading/error transitions in `frontend/src/lib/project-context.ts`
- [ ] T009 [P] Add API compatibility assertions for existing auth, project, dataset, dashboard and delivery paths in `backend/tests/test_contract_compatibility.py`

**Checkpoint**: Route metadata, project context, fixtures and compatibility tests are available; no API or schema change is required.

## Phase 3: User Story 1 — Navegar com contexto de projeto (Priority: P1) — MVP foundation

**Goal**: Make the authenticated information architecture addressable, predictable and visibly project-scoped while preserving legacy deep links.

**Independent Test**: With two authorized projects, authenticate, open `/projetos`, enter each canonical project area, switch IDs, open `/projetos/:id` and the two legacy deep links, and verify the correct project and current area remain unambiguous.

### Tests for User Story 1

- [ ] T010 [P] [US1] Add Vitest assertions for authenticated guards, every canonical project view route including `/projetos/:id/usuarios`, the existing admin Users destination, legacy redirects and unknown-route fallback in `frontend/src/App.test.tsx`

### Implementation for User Story 1

- [ ] T011 [US1] Replace the in-memory-only post-login route map with canonical routes, the explicit admin Users destination and `Navigate` aliases defined in `frontend/src/App.tsx`
- [ ] T012 [US1] Recompose authenticated navigation, breadcrumbs, global destinations, project-area links and the accessible existing Users destination using route metadata in `frontend/src/components/AppShell.tsx`
- [ ] T013 [P] [US1] Implement the persistent project context bar, project selector and “Todos os projetos” navigation using `:id` in `frontend/src/components/ProjetoContextBar.tsx`
- [ ] T014 [US1] Update project cards, create/import entry points and project-area links to target canonical routes in `frontend/src/pages/ProjetosPage.tsx`

**Checkpoint**: User Story 1 is independently navigable and legacy bookmarks resolve without changing any backend endpoint.

## Phase 4: User Story 2 — Gerenciar projetos e seus custos (Priority: P1)

**Goal**: Preserve the supported project, planilha, import, edit, calculation and dataset workflows while making save and validation state explicit.

**Independent Test**: Create a project, add/edit a local and item or import the supported template, observe autosave and current operation-level status outcomes, open the same project’s dashboard, and confirm a second project is unchanged. Do not exercise or reintroduce the reverted spreadsheet enhancement or claim row-level import integrity.

### Tests for User Story 2

- [ ] T015 [P] [US2] Extend autosave tests for `salvo`, `pendente`, `salvando`, retry and failed-save behavior in `frontend/src/lib/autosave.test.ts`
- [ ] T016 [P] [US2] Extend supported `.xlsx` operation-level file validation tests without asserting row-level accepted/rejected/duplicate or invalid-numeric guarantees in `frontend/src/lib/import-file.test.ts`
- [ ] T017 [P] [US2] Add project-to-local-to-item isolation tests for create, update and delete operations in `backend/tests/test_project_scope.py`

### Implementation for User Story 2

- [ ] T018 [US2] Mount the existing spreadsheet experience at canonical `/projetos/:id/dados` while retaining legacy behavior through the route alias in `frontend/src/pages/PlanilhaPage.tsx`
- [ ] T019 [US2] Preserve inline editing, paste/import, calculations, autosave status and current operation-level feedback without implementing row-level import integrity or the reverted pending enhancement in `frontend/src/pages/PlanilhaPage.tsx`
- [ ] T020 [US2] Wire create, rename, delete and supported `.xlsx` import flows to the project landing and canonical data route in `frontend/src/pages/ProjetosPage.tsx`
- [ ] T021 [US2] Preserve project-scoped free/virtual dataset list, rows, import/export and calculated-field entry points in `frontend/src/pages/DatasetsPage.tsx`

**Checkpoint**: User Story 2 is independently usable for a project and produces no new API fields, persistence tables or parallel calculations.

## Phase 5: User Story 3 — Acompanhar visão executiva por projeto (Priority: P1)

**Goal**: Present the existing executive analysis and tabs from canonical project routes with reliable empty, partial and derived-data behavior.

**Independent Test**: Load two projects with known data, open each canonical Visão geral, compare backend-derived totals/insights/flows with references, switch IDs during loading, and verify no indicator or chart from the prior project remains.

### Tests for User Story 3

- [ ] T022 [P] [US3] Add Vitest assertions that `/projetos/:id/visao-geral`, `/projetos/:id/custos`, `/projetos/:id/payback`, `/projetos/:id/insights` and `/projetos/:id/comparativo` each select its explicit existing view behavior, including valid, empty, partial and unavailable analysis in `frontend/src/pages/DashboardPage.test.tsx`

### Implementation for User Story 3

- [ ] T023 [US3] Bind `/projetos/:id/visao-geral` to `VisaoGeralTab`, `/projetos/:id/custos` to `CustosTab`, `/projetos/:id/payback` to `PaybackTab`, `/projetos/:id/insights` to `InsightsTab` and `/projetos/:id/comparativo` to `ComparativoTab`, loading `GET /api/projetos/{id}` through route-derived context in `frontend/src/pages/DashboardPage.tsx`
- [ ] T024 [P] [US3] Adapt the executive KPI, trend, composition, insight and source-detail presentation without changing calculations in `frontend/src/components/tabs/VisaoGeralTab.tsx`
- [ ] T025 [P] [US3] Preserve supported payback horizons and unavailable-return states in `frontend/src/components/tabs/PaybackTab.tsx`
- [ ] T026 [P] [US3] Preserve existing severity, evidence and empty-insight behavior in `frontend/src/components/tabs/InsightsTab.tsx`
- [ ] T027 [P] [US3] Preserve within-project/local comparison semantics, keep unsupported period/budget bases unavailable and prohibit cross-project data in `frontend/src/components/tabs/ComparativoTab.tsx`
- [ ] T028 [US3] Render the existing dashboard library, widgets, slicers, drill-down and publication entry points under the project route in `frontend/src/pages/DashboardBuilderPage.tsx`, while preserving the existing admin Users capability in `frontend/src/components/tabs/UsuariosTab.tsx`

**Checkpoint**: User Story 3 provides a project-only executive view and keeps backend analysis/serialization authoritative.

## Phase 6: User Story 6 — Operar com segurança em qualquer estado (Priority: P1)

**Goal**: Harden every post-login state for stale loads, authorization, PT-BR messaging, keyboard use, assistive technology and required viewports.

**Independent Test**: Traverse the primary flow at 1440×900, 1024×768 and 375×812 using keyboard and a screen reader while provoking loading, empty, validation, temporary error, permission and session-expired states; verify focus, recovery and privacy.

### Tests for User Story 6

- [ ] T029 [P] [US6] Extend stale-project, session-expired, unauthorized and safe-fallback assertions in `frontend/src/App.test.tsx`
- [ ] T030 [P] [US6] Add state-transition tests ensuring old project data is cleared before a new response is accepted in `frontend/src/lib/project-context.test.ts`

### Implementation for User Story 6

- [ ] T031 [US6] Add responsive rail/drawer, focus return and project-title behavior without changing login behavior in `frontend/src/components/AppShell.tsx`
- [ ] T032 [P] [US6] Add visible focus, reduced-motion and responsive overflow rules for post-login controls in `frontend/src/index.css`
- [ ] T033 [P] [US6] Provide accessible title, summary and tabular-data alternatives for Plotly charts in `frontend/src/components/PlotlyChart.tsx`
- [ ] T034 [P] [US6] Provide accessible names, empty states and non-color status cues for configurable widgets in `frontend/src/components/widgets/renderWidget.tsx`
- [ ] T035 [P] [US6] Normalize PT-BR loading, empty, retry and error states without exposing stale project content in `frontend/src/components/ProjetoLoading.tsx`
- [ ] T036 [US6] Associate validation errors, autosave status and dynamic announcements with editable spreadsheet controls in `frontend/src/pages/PlanilhaPage.tsx`

**Checkpoint**: User Story 6 is independently verifiable for accessibility, responsiveness, privacy and state safety; no new permission model is introduced.

## Phase 7: User Story 4 — Analisar custos e variações (Priority: P2)

**Goal**: Make existing cost composition, filtering, comparison and source-detail capabilities consistently reflect the active project and recorte.

**Independent Test**: In one project with categories and any other dimensions actually exposed by the current payload, apply individual and combined filters, verify only the visibly declared affected components update within 2 seconds after data is available, and verify missing period/budget is explicitly unavailable rather than zero.

### Tests for User Story 4

- [ ] T037 [P] [US4] Add component-scope filter, no-result, null-versus-zero and unsupported-period/budget availability tests without a positive budget-versus-realized branch in `frontend/src/components/tabs/CustosTab.test.tsx`

### Implementation for User Story 4

- [ ] T038 [US4] Synchronize canonical-route recorte state, active filter chips and visibly declared affected-component scope in `frontend/src/pages/DashboardPage.tsx`
- [ ] T039 [US4] Preserve category/local/item component filtering, affected-component labels, totals, table source links and explicit empty states in `frontend/src/components/tabs/CustosTab.tsx`
- [ ] T040 [US4] Show explicit unavailable state for budget-versus-realized because no such base exists in the current payload, without adding a positive branch, API field or schema field in `frontend/src/components/tabs/ComparativoTab.tsx`
- [ ] T041 [US4] Add chart empty-state explanations, textual summaries and equivalent data access for filtered views in `frontend/src/components/PlotlyChart.tsx`

**Checkpoint**: User Story 4 is independently analyzable without cross-project comparison, API changes or fabricated budget data.

## Phase 8: User Story 5 — Gerar, compartilhar e publicar entregas existentes (Priority: P2)

**Goal**: Keep existing PDF/XLSX, shared dashboard, publication and scheduling capabilities discoverable globally and within project context, with honest delivery states.

**Independent Test**: From a populated project, generate/download an existing delivery, inspect global reports/shared surfaces, publish or share when authorized, and verify project, available recorte, access and success/failure state before and after the operation.

### Tests for User Story 5

- [ ] T042 [P] [US5] Add Vitest report delivery-state and project-context assertions for success, processing, failure and no-access responses in `frontend/src/pages/RelatoriosPage.test.tsx`
- [ ] T043 [P] [US5] Add separate Vitest publication-state and project-context assertions in `frontend/src/components/PublishDialog.test.tsx`
- [ ] T044 [P] [US5] Add separate Vitest scheduling-state and project-context assertions in `frontend/src/components/ScheduleDialog.test.tsx`
- [ ] T045 [P] [US5] Extend report regression coverage for authorization and source preservation in `backend/tests/test_relatorios.py`
- [ ] T046 [P] [US5] Extend publication regression coverage for authorization and source preservation in `backend/tests/test_publicacoes.py`
- [ ] T047 [P] [US5] Extend scheduling regression coverage for authorization and source preservation in `backend/tests/test_agendamentos.py`

### Implementation for User Story 5

- [ ] T048 [US5] Add project/recorte confirmation and safe PDF/XLSX download states to project actions in `frontend/src/pages/DashboardPage.tsx`
- [ ] T049 [P] [US5] Preserve global report history, status filters, retry and project identification in `frontend/src/pages/RelatoriosPage.tsx`
- [ ] T050 [P] [US5] Preserve internal shared-dashboard listing and project-aware opening behavior in `frontend/src/pages/CompartilhadosPage.tsx`
- [ ] T051 [P] [US5] Show existing publication visibility, project and success/error state before exposing a link in `frontend/src/components/PublishDialog.tsx`
- [ ] T052 [P] [US5] Show existing schedule periodicity, authorization and processing/error state without adding Cron configuration in `frontend/src/components/ScheduleDialog.tsx`

**Checkpoint**: User Story 5 is independently usable with existing delivery APIs; R2 credentials, bucket setup, `CRON_SECRET` and Vercel Cron remain out of scope.

## Phase 9: Polish & Cross-Cutting Verification

**Purpose**: Prove regression boundaries and measurable outcomes after all desired stories are integrated.

- [ ] T053 [P] Verify the frontend continues to use only the frozen endpoint paths and payload handling in `frontend/src/lib/api.ts`
- [ ] T054 [P] Verify no migration, column or persisted-model change was introduced in `backend/schema.sql`
- [ ] T055 [P] Verify the protected login file has no diff and remains outside the redesign in `frontend/src/pages/LoginPage.tsx`
- [ ] T056 [P] Run the retained frontend Vitest suite through the existing script in `frontend/package.json`
- [ ] T057 [P] Run the retained backend pytest suite with local SQLite through `backend/pytest.ini`
- [ ] T058 Run the frontend build and lint checks using the existing scripts in `frontend/package.json`
- [ ] T059 Execute the manual route, responsive, accessibility, SC-002, current-scope SC-004/SC-005 and delivery protocols in `specs/001-redesign-custo-dashboard/quickstart.md`
- [ ] T060 Execute the deterministic ten-project SC-001 isolation matrix, legacy redirects and applicable delivery checks in `specs/001-redesign-custo-dashboard/quickstart.md`

**Non-actionable post-feature note**: A separately approved future initiative may install/configure Playwright Chromium through `frontend/package.json` and `frontend/playwright.config.ts` and add E2E coverage in `frontend/e2e/project-isolation.spec.ts`, with FastAPI running locally. It is not an implementation task for this feature and must not be installed or completed here.

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: T001–T004 can begin immediately and are parallel by file.
- **Foundational (Phase 2)**: T005–T009 depend on the baseline setup and block every story. Write contract tests before their corresponding route/context implementation.
- **P1 stories**: US1, US2, US3 and US6 follow the foundational checkpoint. US2 consumes US1 canonical project entry points; US3 consumes US1 route/context primitives and US2 persisted-cost flow; US6 hardens the shared shell and context after US1–US3 integration.
- **P2 stories**: US4 depends on US3 analysis rendering and US6 state primitives. US5 depends on US1 navigation plus US3 dashboard actions and US6 delivery/error states.
- **External prerequisite**: row-level import integrity is tracked separately and is not an implementation dependency or acceptance branch in this task list; current import behavior is preserved as-is.
- **Polish**: T053–T060 depend on the stories selected for release. Playwright/Chromium is a non-actionable post-feature note and does not block current validation.

### User-story dependency graph

```text
Setup
  ↓
Foundational route/context/API freeze
  ↓
US1 (P1) ───────┐
  ↓             │
US2 (P1) ───────┼──→ US3 (P1) ──→ US4 (P2)
                │        └──────→ US5 (P2)
                └──────────────→ US6 (P1) ──┘
```

US1 is the navigation foundation, but US2, US3 and US6 remain independently testable after the foundational phase when their listed fixtures are supplied. The graph expresses integration order, not a new backend dependency.

### Parallel opportunities

- T001–T004 can run in parallel.
- T005 and T007 can run in parallel; T006 follows T005 and T008 follows T007.
- In US1, T013 can run in parallel with T012 after the route metadata exists.
- In US2, T015–T017 can run in parallel; spreadsheet and dataset implementation can then proceed independently.
- In US3, T024–T027 can run in parallel after T023; T028 can proceed in parallel because it owns the builder page.
- In US6, T032–T035 can run in parallel after the shared context tests; T031 and T036 follow the shell/data integration they modify.
- In US5, T045–T052 can run in parallel after T042–T044 establish delivery expectations.
- T053–T058 are independent regression checks; T059 and T060 are the consolidated manual evidence runs.

## Independent Test Criteria by Story

| Story | Independent proof |
|---|---|
| US1 | Two projects can be opened and switched across every canonical area; legacy project/dashboard/planilha links redirect; project and current area remain visible. |
| US2 | Create/import/edit/paste a supported project dataset; autosave and current operation-level status are truthful; row-level accepted/rejected/duplicate and invalid-numeric guarantees are explicitly N/A and delegated to the prerequisite feature. |
| US3 | Known backend-derived totals, insights, charts and payback values render for one project; empty/partial states are explicit; rapid project switching never leaks prior analysis. |
| US6 | Keyboard/screen-reader traversal and the three required viewports expose focus, labels, alternatives and PT-BR recovery for loading/empty/error/permission/session states. |
| US4 | Filters over current payload dimensions update dependent views for the same project; no-result and missing-period/budget states are explicit; any supported comparison uses the same recorte. |
| US5 | Existing PDF/XLSX/shared/publication/scheduling flows identify project and available recorte and never show a successful link or download before existing success. |

## MVP Scope

The smallest useful product increment is **US1 + US2 + US3 with the minimum safety guarantees from US6**: a user can enter the project portfolio, open a canonical project, capture/import supported costs, reach the backend-derived executive dashboard and switch projects without contamination. US4 and US5 are the next P2 increments; full US6 hardening, regression checks and the future E2E gate remain release gates rather than optional polish.

## Implementation Strategy

1. Complete Setup and Foundational phases; stop if route, context or API compatibility tests fail.
2. Deliver the MVP increment (US1, US2, US3 and essential US6) and run its independent criteria.
3. Add US4 analytical filtering/comparison and US5 delivery/global surfaces incrementally, keeping each checkpoint independently testable.
4. Run T053–T060 before approval. Keep the Playwright/Chromium work as a non-actionable post-feature note; do not install or complete it in this feature.

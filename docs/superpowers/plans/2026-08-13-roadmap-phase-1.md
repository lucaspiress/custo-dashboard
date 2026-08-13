# Roadmap Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the project intake and verify the critical browser workflows.

**Architecture:** Reuse the existing project import endpoint and the existing
Playwright environment. Browser-only interactions remain in the frontend; the
backend stays responsible for template validation and persistence.

**Tech Stack:** React 19, TypeScript, Vite, FastAPI, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-13-roadmap-execution-design.md`

## Global Constraints

- UI copy remains PT-BR.
- Only `.xlsx` files are accepted by the import flow.
- Do not add pandas or credentials.
- Commits, push and deploy require explicit user authorization.

---

### Task 1: Drag-and-drop project import

**Files:**
- Modify: `frontend/src/pages/ProjetosPage.tsx`
- Test: `frontend/src/lib/import-file.test.ts`

**Interfaces:**
- Consumes: `importarArquivo(file: File): Promise<void>` in `ProjetosPage`.
- Produces: `validarArquivoPlanilha(file: File): boolean` for the input and drop zone.

- [x] Write a failing test that accepts `dados.xlsx` and rejects `dados.csv`.
- [x] Implement `validarArquivoPlanilha` with a case-insensitive `.xlsx` suffix check.
- [x] Replace the import control with a keyboard-accessible drop zone that forwards a valid dropped file to `importarArquivo`.
- [x] Run frontend unit tests, lint and production build.

### Task 2: Browser coverage expansion

**Files:**
- Modify: `backend/tests/ui_smoke.py`

**Interfaces:**
- Consumes: local SQLite, Vite and FastAPI servers.
- Produces: an executable smoke flow for import and export paths.

- [x] Create a synthetic template in the test environment.
- [x] Import it through the visible UI.
- [x] Assert the dashboard opens and downloads return non-empty XLSX and PDF blobs.
- [x] Run the smoke flow against local servers.

### Task 3: Loading and responsive audit

**Files:**
- Modify: `frontend/src/pages/ProjetosPage.tsx`
- Modify: `frontend/src/pages/DashboardPage.tsx`
- Modify: `frontend/src/pages/PlanilhaPage.tsx`
- Add: `backend/tests/ui_responsive_audit.py`

- [x] Capture desktop and mobile screenshots of loading states.
- [x] Replace generic loading text with skeletons that retain the page layout.
- [x] Verify tab order and horizontal overflow at 375 px and 768 px.
- [x] Run frontend unit tests, lint and production build.

# Roadmap Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make project exports useful as executive reports while retaining the detailed data already available per local.

**Architecture:** The Excel exporter remains the source of the workbook layout and consumes the existing `insights.gerar_insights(local)` function. The PDF generator keeps its six detailed pages per local; a later task will prepend one consolidated project page computed only from `loader.Local` aggregates.

**Tech Stack:** Python 3.12, openpyxl, ReportLab, FastAPI and pytest.

**Spec:** `PLANO_MELHORIAS.md`

## Global Constraints

- UI and export text remain PT-BR.
- Do not add pandas or credentials.
- Keep detailed per-local PDF pages unchanged when adding the project overview.
- Export tests must open the generated XLSX/PDF rather than merely checking HTTP status.

---

### Task 1: Insights in the exported Excel

**Files:**
- Modify: `backend/planilha_export.py`
- Test: `backend/tests/test_api.py`

**Interfaces:**
- Consumes: `insights.gerar_insights(local: loader.Local) -> list[dict]`.
- Produces: `INSIGHTS` worksheet with `LOCAL`, `SEVERIDADE` and `INSIGHT` columns.

- [x] Add an export test that loads the `.xlsx` and asserts the sheet, headers and a generated insight.
- [x] Confirm the test fails before the new worksheet exists.
- [x] Add `_montar_aba_insights(wb, workbook)` with one row for each generated insight.
- [x] Format header, text wrapping, widths, filter and frozen header row.
- [x] Run the focused export test successfully.

### Task 2: Consolidated PDF overview

**Files:**
- Modify: `backend/report.py`
- Test: `backend/tests/test_api.py`

**Interfaces:**
- Consumes: `gerar_pdf(filename: str, locais: list[loader.Local], uploaded_at: str | None = None) -> bytes`.
- Produces: `_pagina_resumo_projeto(...) -> None`, inserted before the detailed local pages.

- [ ] Add a two-local API test that parses the PDF and verifies the project overview label and both local names.
- [ ] Update the PDF page count so the header/footer total includes the new cover page.
- [ ] Draw project totals for investment, recurring revenue, monthly balance and viable/total locations.
- [ ] Add a compact local comparison table ordered by monthly balance, using the existing formatting helpers.
- [ ] Run the focused PDF test and the complete backend suite.

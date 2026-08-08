# Custo Dashboard

Sistema web que transforma planilhas de custo (.xlsx, template padrão) em dashboards
automatizados com insights por regras, em português. Frontend React na Vercel com
backend Python (FastAPI) como função serverless da Vercel e Neon Postgres.

## Arquitetura

```
frontend/ (Vite + React + TS + Tailwind)  →  /api/* (rewrite no vercel.json)
    →  api/index.py  (função Python da Vercel, carrega main.app)
    →  backend/      (código Python: FastAPI + análise)
    →  Neon Postgres (prod, RLS por usuário) | SQLite (dev)
```

- `main.py` — app FastAPI; `routers/` — auth, users, uploads, files
- `security.py` — JWT HS256 em cookie httpOnly (Secure em produção)
- `store.py` — facade: `db.py` (Postgres/Neon) em prod, `history.py` (SQLite) em dev
- `loader.py` — leitura do template (aba RELATORIO, colunas A–O, abas por local,
  fórmulas para descobrir a aba de equipamento, taxa 15%)
- `analysis.py` — KPIs, resumo_projeto, fluxo_caixa
- `insights.py` — regras em PT-BR (severidade: ok/atencao/alerta/dica)
- `charts.py` — figuras Plotly serializadas com `to_json()`
- `report.py` — PDF financeiro de 6 páginas (reportlab, fallback Helvetica no Linux)
- `powerbi_export.py` — gera .pbix (tabelas Locais/Itens/FluxoCaixa, medidas DAX, página com visuais) via pbix-mcp
- `serialize.py` — payloads das análises; `workbook_from_payload` reconstrói os dados
  para PDF (o banco guarda apenas usuários)
- `planilha_teste.py` — gera planilha sintética para smoke/previews
- `api/index.py` — entrypoint da Vercel (ajusta sys.path e expõe `app`)
- `vercel.json` — função Python (maxDuration 60, excludeFiles) + rewrites `/api/*`
  e fallback SPA para `index.html`

## Setup local

Backend (SQLite, sem banco externo):

```
cd backend
$env:DATABASE_URL=""
..\.venv\Scripts\python -m pip install -r requirements-dev.txt
..\.venv\Scripts\python -m uvicorn main:app --port 8000
```

Frontend:

```
cd frontend
npm install
npm run dev
```

Acessar http://localhost:5173. Login local: `admin` / `admin123456`
(troque a senha inicial via `ADMIN_INITIAL_PASSWORD`).

## Testar

```
cd backend
$env:DATABASE_URL=""
..\.venv\Scripts\python -m pytest -q
```

Smoke test do frontend (com backend e frontend locais rodando):

```
cd backend
..\.venv\Scripts\python -X utf8 smoke_ui.py
```

## Deploy

Push em `main` → deploy automático na Vercel.

Configuração do projeto na Vercel: Framework Preset `Other`; Root Directory vazio;
Build `cd frontend && npm install && npm run build`; Output `frontend/dist`.

Env vars (Production): `DATABASE_URL` (Neon) e `SESSION_SECRET` (32+ caracteres).
Validação: `/api/health` deve responder `{"ok":true,"modo":"postgres"}`.

## Convenções

- UI em PT-BR; moeda `R$ 18.733,68`; sem emojis; sem comentários no código.
- Sem pandas no backend: o bundle da função Python da Vercel tem limite de 225MB
  (medido ~132MB com as dependências atuais). Usar Python puro (listas de dicts).
- Nunca commitar `DATABASE_URL`, `SESSION_SECRET` ou senhas.
- Alterar rotas novas em `backend/routers/`; payloads espelhados em `frontend/src/lib/types.ts`.
- Novos gráficos: gerar no `charts.py` e serializar com `fig.to_json()`.
- Testes novos em `backend/tests/` com fixtures sintéticas (`tests/fixtures.py`).

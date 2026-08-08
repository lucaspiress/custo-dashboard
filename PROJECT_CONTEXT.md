# Custo Dashboard — Contexto do Projeto

## Localização

- Repositório: `C:\Users\assistentesolucoes\Desktop\custo-dashboard`
- GitHub: https://github.com/lucaspiress/custo-dashboard
- Produção (Vercel): frontend React + backend Python na mesma aplicação
- Banco: Neon PostgreSQL (não é Supabase)

## Arquitetura

```
Vercel (uma aplicação)
├── frontend/  SPA Vite + React + TS + Tailwind (build estático em frontend/dist)
└── api/       Função Python (FastAPI) — api/index.py carrega main.app
    └── backend/  código Python do servidor (importado pela função)
        └── Neon Postgres (usuários, uploads, locais, itens)
```

O `vercel.json` na raiz faz o proxy de `/api/*` para a função Python e o fallback
do SPA para `index.html` — tudo no mesmo domínio (cookie de sessão funciona).

## Inventário

### Frontend (`frontend/`)

| Arquivo | Responsabilidade |
|---|---|
| `src/pages/DashboardPage.tsx` | Shell: sidebar (upload, local, categorias, PDF/Excel), abas |
| `src/pages/LoginPage.tsx` | Login fechado (formulário próprio) |
| `src/components/tabs/` | Abas: Visão Geral, Custos (filtros), Payback (fluxo projetado), Insights, Comparativo, Usuários (admin) |
| `src/components/PlotlyChart.tsx` | Renderiza `fig.to_json()` do backend (lazy-load do plotly.js) |
| `src/lib/api.ts` | Cliente HTTP com cookie; `api.postBlob` para PDF/Excel |
| `src/lib/auth.tsx` | Contexto de sessão (me/login/logout) |
| `src/lib/types.ts` | Tipos espelhando os payloads da API |
| `src/lib/theme.ts` / `index.css` | Design system (tokens do antigo theme.py) |
| `vite.config.ts` | Proxy de `/api` para `localhost:8000` em dev |

### Backend (`backend/`)

| Arquivo | Responsabilidade |
|---|---|
| `main.py` | App FastAPI, CORS, lifespan (schema/seed) |
| `routers/auth.py` | login/logout/me (cookie JWT httpOnly) |
| `routers/users.py` | Gestão de usuários (admin, máx. 3 admins) |
| `routers/uploads.py` | `POST /api/uploads`: analisa em memória e devolve payload completo (locais, insights, gráficos, projeto, fluxo 6/12/24/36) |
| `routers/files.py` | PDF (reportlab) e Excel (openpyxl) via POST com payload |
| `security.py` | JWT HS256 + cookie (Secure em produção, SameSite lax) |
| `store.py` | Facade: Postgres (`db.py`) em prod / SQLite (`history.py`) em dev — só usuários |
| `loader.py` | Leitura/validação do template (.xlsx, fórmulas e abas) |
| `analysis.py` | KPIs, resumo_projeto, comparar_locais, fluxo_caixa |
| `insights.py` | Regras de insight em PT-BR (ok/atencao/alerta/dica) |
| `charts.py` | Figuras Plotly (serializadas com `to_json()`) |
| `report.py` | PDF financeiro de 6 páginas |
| `export.py` | Exportação Excel (Resumo, Itens, Comparativo) |
| `db.py` / `history.py` | Persistência Postgres com RLS / SQLite local com usuários |
| `schema.sql` | Schema Neon (RLS por usuário) |
| `seed_admin.py` | Criação de administradores |
| `tests/` | 11 testes pytest (fixtures .xlsx sintéticas) |
| `smoke_ui.py` | Smoke test Playwright do frontend completo |

### Deploy

| Arquivo | Responsabilidade |
|---|---|
| `vercel.json` (raiz) | Função Python (api/index.py), maxDuration 60, excludeFiles, rewrites /api/* e fallback SPA |
| `requirements.txt` (raiz) | Dependências instaladas pela função Python da Vercel (sem pandas!) |
| `backend/requirements.txt` | Runtime do backend (espelho do raiz) |
| `backend/requirements-dev.txt` | pytest + httpx para testes locais |
| `backend/Dockerfile` | Plano B: Render (não usado — Vercel resolveu) |
| `render.yaml` | Plano B: blueprint do Render (não usado) |

## Como rodar localmente

Backend (SQLite, sem banco externo):

```
cd backend
$env:DATABASE_URL=""
..\.venv\Scripts\python -m uvicorn main:app --port 8000
```

Frontend (proxy para o backend):

```
cd frontend
npm run dev
```

Acessar http://localhost:5173 — login local: `admin` / `admin123456`
(ou troque via `ADMIN_INITIAL_PASSWORD` no ambiente).

Testes:

```
cd backend
$env:DATABASE_URL=""
..\.venv\Scripts\python -m pytest -q
```

## Como publicar (deploy)

O push para `main` dispara o deploy automático na Vercel.

Configuração do projeto na Vercel (importante, não mexer):

- Framework Preset: `Other`
- Root Directory: (vazio — raiz do repo)
- Build Command: `cd frontend && npm install && npm run build`
- Output Directory: `frontend/dist`

Variáveis de ambiente:

- `DATABASE_URL` — connection string do Neon (Production obrigatório)
- `SESSION_SECRET` — string com 32+ caracteres (Production obrigatório)

Validação pós-deploy:

- `https://<projeto>.vercel.app/api/health` → `{"ok":true,"modo":"postgres"}`
- Login + upload + abas + PDF/Excel

## Cuidados

- Nunca commitar `DATABASE_URL`, `SESSION_SECRET` ou senhas.
- O bundle da função Python precisa ficar abaixo de 225MB — **não adicionar pandas**;
  usar Python puro (listas de dicts) como hoje.
- `vercel.json` usa `excludeFiles` para manter node_modules/testes fora do bundle.
- Upload de planilhas limitado a 4,5MB na Vercel (planilhas do projeto têm ~60KB).
- Primeira requisição após inatividade demora (cold start da função).
- Backend usa Postgres em produção (RLS por usuário) e SQLite em dev.

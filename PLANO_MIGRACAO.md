# Plano de Migração — Custo Dashboard Web (React + FastAPI + Neon)

Data: 07/08/2026
Status: aprovado para execução

## Objetivo

Substituir o app Streamlit local por uma arquitetura web:

```
frontend/ (Vite + React, hospedado na Vercel)
   └── HTTP ──▶ backend/ (FastAPI Python, hospedado no Render)
                   └── Neon Postgres (banco existente, não é Supabase)
```

- Frontend em **React** (Vite + TypeScript + Tailwind).
- Análise (leitura de planilhas, KPIs, insights, gráficos, PDF, Excel) **100% em Python**,
  reutilizando os módulos atuais (loader, analysis, insights, charts, report).
- Banco **Neon Postgres** (schema e admin já existem). Sem Supabase.
- Deploy: **Vercel** (frontend) + **Render** (backend FastAPI).

## Arquitetura

### Fase 0 — Estrutura do repositório

- Mover código Python para `backend/`: loader, analysis, insights, charts, report,
  config, formatos, theme, history, db, schema.sql, seed_admin, migrar_sqlite,
  test_validate.
- Remover o Streamlit: `app.py`, `.streamlit/`, `abrir-dashboard.bat`,
  `teste_upload_browser.py`, `teste_visual_browser.py`, `migrar_sqlite.py` é mantido
  (script útil), dependências de UI do Streamlit.
- Criar `frontend/`: Vite + React + TS + Tailwind + react-plotly.js + react-router.
- Backend deps: fastapi, uvicorn, psycopg[binary], pandas, openpyxl, plotly,
  reportlab, python-multipart, pydantic-settings, pytest, httpx.
- Dockerfile do backend para o Render.

### Fase 1 — Backend FastAPI

- `auth.py` vira funções puras: `password_hash`, `verify_password` (PBKDF2-HMAC-SHA256,
  310.000 iterações, salt 16 bytes, base64url — compatível com hashes já criados).
- Sessão por cookie httpOnly com JWT; middleware de proteção; CORS com credenciais
  apontando para o domínio do frontend.
- Rotas:
  - auth: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
  - usuários (admin): listar, criar, ativar/desativar, redefinir senha (máx. 3 admins)
  - uploads: `POST /api/uploads` (multipart xlsx → loader → snapshot), listar,
    carregar análise, excluir
  - análise: `GET /api/uploads/{id}/project-summary` (comparativo locais),
    `GET /api/uploads/{id}/compare?vs={upload_id}` (diff de versões),
    `GET /api/uploads/{id}/cashflow?meses=N` (fluxo projetado)
  - arquivos: `GET /api/uploads/{id}/report` (PDF), `GET /api/uploads/{id}/export` (Excel)
- Gráficos Plotly gerados no backend e enviados como JSON (`fig.to_json()`),
  renderizados no React com plotly.js.
- Testes: pytest com TestClient; fixtures .xlsx sintéticas (sem planilhas de negócio).

### Fase 2 — Frontend React

- Design system portado do theme.py para tokens Tailwind (cores, severidade,
  paleta de gráficos, fontes).
- Login fechado (formulário próprio, cookie httpOnly).
- Layout: sidebar com upload, seletor de snapshot, seletor de local, botões
  PDF/Excel; header com marca.
- Abas:
  - Visão Geral (KPIs, resumo do local, tabela de todos os locais)
  - Custos (gráficos + tabela de itens com **filtros**: busca, categoria, ordenação)
  - Payback (curva + **fluxo de caixa projetado** 6/12/24/36 meses)
  - Insights (cards por severidade)
  - Comparativo (KPIs do projeto, ranking, gráficos entre locais)
  - Comparar Versões (diff de dois uploads: KPIs e itens)
  - Histórico (evolução por local)
  - Usuários (admin)

### Fase 3 — Polimento local

- Backend local com uvicorn (SQLite dev via history.py) + frontend com proxy
  para `localhost:8000`.
- Paridade de números entre Streamlit (referência) e a nova stack.
- Conferir PDF gerado vs. modelo financeiro aprovado.
- Teste de isolamento entre dois usuários (Neon de teste).

### Fase 4 — Deploy

- Render: Web Service a partir do Dockerfile; envs `DATABASE_URL` e `SECRET`;
  aplicar schema no Neon e seed do admin.
- Vercel: importar `frontend/` (rootDirectory `frontend/`), env `VITE_API_URL`;
  validar login, upload, PDF e Excel ponta a ponta no domínio `.vercel.app`.

### Fase 5 — Documentação

- Atualizar PROJECT_CONTEXT.md e CLAUDE.md com a nova arquitetura e fluxo de deploy.
- Manter este plano atualizado até a conclusão.

## Regras permanentes de execução

1. Nunca acessar pastas da rede — em especial **soluções** e **licitações**
   (zero acesso, inclusive leitura).
2. Nunca tocar em nada do **ROTACAD** sem pedido explícito do usuário.
3. Trabalho restrito a `Desktop\custo-dashboard` (repo), `Downloads` e `tmp`.
4. Commits apenas quando o usuário pedir.

## Status das fases

- [x] Plano salvo no repo e enviado ao GitHub
- [ ] Fase 0 — Estrutura
- [ ] Fase 1 — Backend FastAPI
- [ ] Fase 2 — Frontend React
- [ ] Fase 3 — Polimento local
- [ ] Fase 4 — Deploy
- [ ] Fase 5 — Documentação

# Custo Dashboard

Sistema web que transforma planilhas de custo (.xlsx, template padrão) em dashboards
automatizados com insights por regras, em português.

**Produção (no ar):** https://custo-dashboard-rotacad.vercel.app
**Repo:** https://github.com/lucaspiress/custo-dashboard (push em `main` = deploy automático na Vercel)

## Documentação de referência (leia antes de mexer)

- `CLAUDE.md` — convenções, arquitetura, comandos e regras do projeto
- `PROJECT_CONTEXT.md` — contexto completo (inventário de arquivos, setup local, deploy)
- `PRD_V3.md` / `SPEC_V3.md` — especificação da v3 (projetos persistidos + planilha editável)
- `PLANO_MIGRACAO.md` — histórico da migração Streamlit → React + FastAPI (concluída)

## Resumo da arquitetura

```
frontend/ (Vite + React + TS + Tailwind)  →  /api/* (rewrite no vercel.json)
    ├─ /            ProjetosPage (lista, novo, importar .xlsx)
    ├─ /projetos/:id            DashboardPage (abas, PDF, export .xlsx)
    └─ /projetos/:id/planilha   PlanilhaPage (edição inline, paste, autosave)
    →  api/index.py  (função Python da Vercel, carrega backend/main.app)
    →  backend/      (FastAPI + análise em Python)
    →  Neon Postgres (prod) | SQLite local (dev)
```

## Regras permanentes (não violar)

1. **Nunca** acessar pastas da rede — em especial **soluções** e **licitações** (zero acesso, inclusive leitura).
2. **Nunca** tocar em nada do **ROTACAD** sem pedido explícito do usuário.
3. Trabalho restrito a `Desktop\custo-dashboard` (repo), `Downloads` e `tmp`.
4. Commits/push apenas quando o usuário pedir.
5. **Sem pandas no backend** (limite de bundle da Vercel é 225MB; medido ~132MB) — usar Python puro (listas de dicts).
6. Nunca commitar `DATABASE_URL`, `SESSION_SECRET` ou senhas.
7. Senhas de usuário criadas direto no banco (INSERT no Neon) quando tiverem menos de 8 caracteres (a API exige 8+).

## Comandos principais

- Rodar backend local: `cd backend; $env:DATABASE_URL=""; ..\.venv\Scripts\python -m uvicorn main:app --port 8000`
- Rodar frontend: `cd frontend; npm run dev` (proxy /api → localhost:8000)
- Testes: `cd backend; $env:DATABASE_URL=""; ..\.venv\Scripts\python -m pytest -q` (18 testes)
- Login local: `admin` / `admin123456`

## Estado atual (v3)

Dados persistidos no banco: tabelas `projetos`, `locais` e `itens` (criadas no boot via
`CREATE TABLE IF NOT EXISTS`, sem migração one-off). Fluxo: tela de projetos → criar vazio
ou importar `.xlsx` (`POST /api/projetos/importar`) → planilha editável com autosave
(PATCH por célula) → dashboard via `GET /api/projetos/{id}` (mesmo shape do payload antigo:
locais + insights + gráficos + projeto + fluxo 6/12/24/36). Export `.xlsx`
(`GET /api/projetos/{id}/planilha.xlsx`) e PDF (`POST /api/projetos/{id}/relatorio`).
Rotas antigas removidas: `/api/uploads*` e Power BI (`pbix-mcp` fora dos requirements).
Usuários admin: `lucaspires` e `giusepe` (Neon); sem RLS — todos os usuários logados veem
todos os projetos. Abas: Visão Geral, Custos, Payback, Insights, Comparativo, Usuários (admin).

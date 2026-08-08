# Custo Dashboard

Sistema web que transforma planilhas de custo (.xlsx, template padrão) em dashboards
automatizados com insights por regras, em português.

**Produção (no ar):** https://custo-dashboard-m13fiwhbx-rotacad.vercel.app
**Repo:** https://github.com/lucaspiress/custo-dashboard (push em `main` = deploy automático na Vercel)

## Documentação de referência (leia antes de mexer)

- `CLAUDE.md` — convenções, arquitetura, comandos e regras do projeto
- `PROJECT_CONTEXT.md` — contexto completo (inventário de arquivos, setup local, deploy)
- `PLANO_MIGRACAO.md` — histórico da migração Streamlit → React + FastAPI (concluída)

## Resumo da arquitetura

```
frontend/ (Vite + React + TS + Tailwind)  →  /api/* (rewrite no vercel.json)
    →  api/index.py  (função Python da Vercel, carrega backend/main.app)
    →  backend/      (FastAPI + análise em Python)
    →  Neon Postgres (prod, RLS) | SQLite local (dev, user_id por usuário)
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
- Testes: `cd backend; $env:DATABASE_URL=""; ..\.venv\Scripts\python -m pytest -q` (11 testes)
- Smoke test UI: `cd backend; ..\.venv\Scripts\python -X utf8 smoke_ui.py` (backend + frontend locais rodando)
- Login local: `admin` / `admin123456`

## Estado atual

Migração completa e publicada. Usuários admin: `lucaspires` e `giusepe` (Neon).
**Banco usado apenas para usuários** — uploads não são persistidos: `POST /api/uploads` analisa
em memória e devolve o payload completo (locais + insights + gráficos + projeto + fluxo de caixa
6/12/24/36); o frontend guarda no estado (some ao atualizar a página). PDF via
`POST /api/uploads/report` e export **Power BI** (.pbix via `pbix-mcp`) via
`POST /api/uploads/powerbi`, ambos com o payload. Abas: Visão Geral, Custos, Payback, Insights,
Comparativo (ranking entre locais), Usuários (admin). Tabelas legadas uploads/locais/itens
foram dropadas no Neon (`backend/migrar_drop_snapshots.py`).

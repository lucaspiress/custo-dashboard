# Retomada de Desenvolvimento — Custo Dashboard

Última atualização: 10/08/2026 (segunda)
Contexto: v3 implementada (projetos persistidos + planilha editável), aguardando push.

## 1. Estado atual

- **URL de produção:** https://custo-dashboard-rotacad.vercel.app
  ⚠️ `custo-dashboard-m13fiwhbx-rotacad.vercel.app` é deploy antigo congelado — não usar.
- Produção ainda roda a **v2** (upload em memória). A **v3 está implementada localmente,
  ainda não commitada** (último commit em `main`: `167eb06`).
- Usuários de produção: `lucaspires` e `giusepe` (Neon). `admin`/`admin123456` só no local (SQLite).

## 2. O que a v3 entrega (pronto, validado localmente)

- **Projetos persistidos** no banco: tabelas `projetos`, `locais`, `itens`
  (`schema.sql`, criadas no boot com `CREATE TABLE IF NOT EXISTS` — Neon idempotente,
  sem migração one-off; nada precisa ser migrado, nada era persistido antes).
- **Tela Projetos** (`ProjetosPage`): lista com totais, novo projeto, importar `.xlsx`,
  renomear, excluir (cascata).
- **Tela Planilha** (`PlanilhaPage`): locais + itens em tabelas aninhadas, edição inline
  com autosave (PATCH por célula), colar TSV do Excel (números BR/EN), colunas calculadas,
  expansão por local, adicionar item/local.
- **Dashboard** (`GET /api/projetos/{id}`): mesmo shape do payload antigo (locais +
  insights + gráficos + projeto + fluxo 6/12/24/36); componentes reutilizados.
- **Export .xlsx** (`GET /api/projetos/{id}/planilha.xlsx`, `planilha_export.py`) e
  **PDF** (`POST /api/projetos/{id}/relatorio`, `report.py` atual).
- **Removidos**: rotas `/api/uploads*`, `routers/uploads.py`, `routers/files.py`,
  export Power BI (`powerbi_export.py`, `pbix-mcp` fora dos requirements,
  `installCommand` do `vercel.json` revertido).

## 3. Validações feitas

- `pytest` 18/18 (CRUD projetos/locais/itens, dashboard payload, import xlsx,
  export xlsx relido com openpyxl, PDF `%PDF`, auth 401).
- `npm run build` OK.
- Smoke UI (Playwright) foi **descartado** — instável nesta máquina (autofill do Chromium
  injetando `<option>` nos inputs e seletores frágeis). Os inputs inline da planilha
  ganharam `autoComplete="off"` como correção real.
- Correção: `charts.py::_grafico_donut` com guarda de divisão por zero (local sem itens
  causava 500 no `GET /api/projetos/{id}`).

## 4. Pendências

### 4.1 Aprovação do usuário → commit/push (bloqueante para deploy)
- Mostrar a v3 rodando local (backend + frontend) e obter OK antes do push.
- Pós-deploy validar: `/api/health` (`versao: 3`), criar projeto via UI, importar xlsx,
  exportar xlsx e PDF.

### 4.2 Detalhes do PDF (a definir com o usuário)
- Usuário aprovou o conjunto do PDF na v2 mas disse que apontaria "alguns detalhes".
  Perguntar quais são.

### 4.3 Tabelas legadas no Neon (baixa prioridade)
- `uploads`/`locais`/`itens` antigas ainda existem no Neon. Quando estabilizar:
  `python backend/migrar_drop_snapshots.py` (com `DATABASE_URL` de produção).
  Não conflita com as tabelas novas (nomes diferentes? verificar o script antes de rodar).

## 5. Comandos úteis

- Backend local: `cd backend; $env:DATABASE_URL=""; ..\.venv\Scripts\python -m uvicorn main:app --port 8000`
- Frontend local: `cd frontend; npm run dev` (login `admin` / `admin123456`)
- Testes: `cd backend; $env:DATABASE_URL=""; ..\.venv\Scripts\python -m pytest -q`

## 6. Arquivos-chave da v3

- `backend/projetos_store.py` — CRUD dual SQLite/Neon (padrão de `db.py`)
- `backend/routers/projetos.py` — todas as rotas de projetos/locais/itens/import/export/PDF
- `backend/planilha_export.py` — geração do `.xlsx` (RELATORIO + aba por local)
- `backend/report.py` — PDF (p1 verde, p4 painel de projeções)
- `backend/schema.sql` / `store.py` — schema v3 (projetos/locais/itens + usuarios)
- `frontend/src/pages/ProjetosPage.tsx` — lista/importação de projetos
- `frontend/src/pages/PlanilhaPage.tsx` — edição inline/paste/autosave
- `frontend/src/pages/DashboardPage.tsx` — dashboard por projeto (breadcrumb, exports)
- `SPEC_V3.md` / `PRD_V3.md` — especificação completa
- `.python-version` — fixa Python 3.12 na Vercel

## 7. Regras permanentes (lembrar)

1. Nunca acessar pastas da rede (soluções/licitações).
2. Não tocar em ROTACAD sem pedido explícito.
3. Trabalho restrito a `Desktop\custo-dashboard`, `Downloads` e tmp.
4. Commits/push só quando o usuário pedir.
5. Sem pandas no backend (limite de bundle 225MB).
6. Nunca commitar `DATABASE_URL`, `SESSION_SECRET` ou senhas.
7. Não editar arquivos `.md` com Get-Content/Set-Content do PowerShell (corrompe UTF-8) —
   usar sempre o editor de arquivos.

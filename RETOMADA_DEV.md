# Retomada de Desenvolvimento — Custo Dashboard

Última atualização: 08/08/2026 (sexta)
Objetivo: retomar o desenvolvimento na segunda-feira com contexto completo.

## 1. Estado atual da produção

- **URL correta do projeto:** https://custo-dashboard-rotacad.vercel.app
  ⚠️ A URL `custo-dashboard-m13fiwhbx-rotacad.vercel.app` (anotada em docs antigos) é um
  **deploy antigo congelado** — nunca atualiza. Não usar como referência.
- `/api/health` responde `{"ok":true,"modo":"postgres","versao":3}` → API no ar.
- Login em produção: usuários **`lucaspires`** e **`giusepe`** (Neon). O `admin`/`admin123456`
  só existe no ambiente local (SQLite).
- Último commit em `main`: `5ae1d2a` — `chore: fixa Python 3.12 na Vercel (.python-version)`.

## 2. Últimas entregas (já em produção, exceto onde indicado)

- **Banco apenas para usuários**: upload não é mais salvo; `POST /api/uploads` analisa em
  memória e devolve o payload completo (locais + insights + gráficos + projeto + fluxo
  6/12/24/36). Tabelas `uploads`/`locais`/`itens` removidas do schema; script one-off
  `backend/migrar_drop_snapshots.py` (Neon) — **ainda não executado em produção**.
  Análise some ao atualizar a página (comportamento acordado).
- **PDF** (`backend/report.py`): página 1 com card "Análise" verde sólido (veredito
  PROJETO VIÁVEL / REVER VIABILIDADE) e cards de resultado 5/10 anos maiores e do mesmo
  tamanho; página 4 com painel verde full-width de projeções e barras do gráfico espalhadas
  até as margens. Usuário aprovou o conjunto, mas **vai apontar "alguns detalhes" na segunda**.
- **Export Power BI** (substitui o Excel): `backend/powerbi_export.py` + rota
  `POST /api/uploads/powerbi` + botão "Exportar Power BI" no topbar.
  ❌ **NÃO FUNCIONA EM PRODUÇÃO** (ver pendência 1).

## 3. Pendências conhecidas

### 3.1 Export Power BI falha em produção (prioridade alta)
- Sintoma: botão "Exportar Power BI" gera erro 500 no ambiente Vercel.
- Fatos levantados:
  - Funciona local (Windows, venv) e em container Linux `python:3.12-slim` com o
    requirements.txt (PBIX gerado e validado).
  - O import de `pbix_mcp.server` no topo do módulo derrubava o app inteiro na Vercel
    (todos os endpoints 500) → corrigido com **import lazy** dentro de
    `gerar_powerbi()` / `_adicionar_visuais()` (`backend/powerbi_export.py`).
  - Com o import lazy, o app funciona, mas a rota `/powerbi` continua falhando.
  - Foi criado `.python-version` = `3.12` para forçar o runtime (commit `5ae1d2a`),
    mas o problema persistiu no teste do usuário.
- Próximos passos (segunda):
  1. Pegar o **traceback real**: Vercel → projeto → aba Functions (ou Deployments →
     deployment → Logs) → filtrar `/api/uploads/powerbi`.
  2. Confirmar a versão do Python no build (log do build mostra "Python 3.x.x").
  3. Reproduzir: `python -c "import pbix_mcp.server"` no ambiente da Vercel (via
     endpoint de debug temporário ou pelo log de erro da função).
  4. Hipóteses a verificar: runtime ainda em 3.13/3.14 (`.python-version` não aplicado),
     falha do `apsw` (SQLite nativa) no microVM da Vercel, ou conflito de versões do
     `mcp`/`anyio`/`starlette` no ambiente de build.
  5. Correções possíveis: pinar `mcp==1.29.0`/`anyio`/`starlette` compatíveis,
     substituir `pbix_mcp.server` por `pbix_mcp.builder` (sem FastMCP/mcp) na geração,
     ou tratar erro com mensagem clara ao usuário.

### 3.2 Detalhes do PDF (a definir com o usuário)
- Usuário disse que "deu tudo certo com exceção de alguns detalhes no pdf".
- Na segunda, pedir ao usuário para apontar os detalhes (ex.: posições, tamanhos, cores).

### 3.3 Tabelas legadas no Neon (baixa prioridade)
- Rodar uma vez após tudo estabilizado:
  `python backend/migrar_drop_snapshots.py` (com `DATABASE_URL` de produção).

## 4. Validações já feitas (antes do push)

- `pytest` 10/10 (inclui teste PDF + Power BI que gera e relê o .pbix).
- `npm run build` OK; smoke UI 8 passos OK; previews em `backend/previews/`.
- Geração .pbix validada em Windows e Linux 3.12 (zip com DataModel, 3 tabelas,
  15 medidas, página "Visão Geral" com 8 visuais).
- PDF validado por renderização + amostragem de pixels (p1 verde, p4 painel full-width).

## 5. Comandos úteis

- Backend local: `cd backend; $env:DATABASE_URL=""; ..\.venv\Scripts\python -m uvicorn main:app --port 8000`
- Frontend local: `cd frontend; npm run dev` (login `admin` / `admin123456`)
- Testes: `cd backend; $env:DATABASE_URL=""; ..\.venv\Scripts\python -m pytest -q`
- Smoke: `cd backend; ..\.venv\Scripts\python -X utf8 smoke_ui.py` (servidores locais rodando)
- Docker (reproduz ambiente Linux da Vercel): imagem `python:3.12-slim` com requirements.txt

## 6. Arquivos-chave

- `backend/powerbi_export.py` — export Power BI (import lazy do pbix-mcp)
- `backend/routers/files.py` — rotas POST /report e /powerbi
- `backend/report.py` — PDF (p1 verde, p4 painel de projeções)
- `backend/routers/uploads.py` — POST /uploads com payload completo em memória
- `backend/store.py` / `db.py` / `history.py` / `schema.sql` — só usuários
- `backend/serialize.py` — workbook_from_payload (reconstrói dados p/ PDF)
- `frontend/src/pages/DashboardPage.tsx` — botão "Exportar Power BI", abas sem
  Comparar Versões/Histórico
- `backend/planilha_teste.py` — planilha sintética p/ smoke/previews
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

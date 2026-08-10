# SPEC — Custo Dashboard v3: Implementação Técnica

Versão 1.0 · 10/08/2026 · Complementa o PRD_V3.md

## 1. Arquitetura

```
frontend/ (React+TS+Tailwind)  →  /api/*  →  api/index.py (carrega backend/main.app)
   ├─ Tela Projetos (lista)
   ├─ Tela Planilha (locais + itens, inline/paste/autosave)
   └─ Dashboard (abas atuais, alimentado por GET /api/projetos/{id})
backend/
   ├─ projetos_store.py   (novo: CRUD dual SQLite/Neon, padrão de db.py)
   ├─ routers/projetos.py (novo: endpoints)
   ├─ planilha_export.py  (novo: .xlsx preenchido)
   └─ (reuso) loader, analysis, insights, charts, serialize, report, formatos
```

Payload do dashboard **mantém o mesmo shape** do `POST /api/uploads` atual (`filename`, `avisos`, `locais`, `projeto`) → componentes do dashboard reutilizados sem mudanças estruturais.

## 2. Modelo de dados (`schema.sql` + espelho SQLite; `CREATE TABLE IF NOT EXISTS` no boot)

```sql
create table if not exists public.projetos (
    id bigint generated always as identity primary key,
    nome text not null,
    cliente text,
    criado_em timestamptz not null default now()
);
create table if not exists public.locais (
    id bigint generated always as identity primary key,
    projeto_id bigint not null references public.projetos(id) on delete cascade,
    nome text not null,
    valor_mensal numeric(14,2) not null default 0,
    taxa_instalacao numeric(14,2) not null default 0,
    custo_manutencao numeric(14,2) not null default 0,
    mensal_terceirizada numeric(14,2) not null default 0,
    chip_mensal numeric(14,2) not null default 0,
    custos_softwares numeric(14,2) not null default 0,
    mao_de_obra numeric(14,2) not null default 0,
    data_inst date
);
create table if not exists public.itens (
    id bigint generated always as identity primary key,
    local_id bigint not null references public.locais(id) on delete cascade,
    categoria text not null,
    cod text,
    material text not null,
    qtd numeric(14,3) not null default 0,
    valor_unit numeric(14,2) not null default 0,
    valor_total numeric(14,2) not null default 0
);
```

- Campos calculados (impostos, saldo, investimento, retorno, margem) **não são armazenados** — derivam de `loader.Local` (props) + `analysis`/`config`.
- Sem RLS: acesso restrito pelo login; todos os usuários veem todos os projetos.
- SQLite local: mesma DDL; `seed_admin_local` mantém admin/admin123456 (dev).

## 3. API

| Método | Rota | Corpo / Params | Retorno |
|---|---|---|---|
| GET | /api/projetos | — | lista com totais e contagens |
| POST | /api/projetos | `{nome, cliente?}` | projeto criado |
| PATCH | /api/projetos/{id} | `{nome?, cliente?}` | projeto |
| DELETE | /api/projetos/{id} | — | 204 (cascata) |
| GET | /api/projetos/{id} | — | payload dashboard (shape do upload atual) |
| POST | /api/projetos/{id}/locais | campos do local | local |
| PATCH | /api/projetos/{id}/locais/{lid} | campos parciais | local |
| DELETE | /api/projetos/{id}/locais/{lid} | — | 204 (cascata itens) |
| POST | /api/locais/{lid}/itens | `{categoria, cod?, material, qtd, valor_unit}` (valor_total = qtd×unit salvo) | item |
| PATCH | /api/itens/{iid} | campos parciais | item |
| DELETE | /api/itens/{iid} | — | 204 |
| POST | /api/projetos/{id}/importar | multipart `.xlsx` | projeto preenchido (payload) |
| GET | /api/projetos/{id}/planilha.xlsx | — | xlsx binário (Content-Disposition attachment) |
| POST | /api/projetos/{id}/relatorio | — | PDF (report.py atual) |

Todas exigem `usuario_atual`. Erros: 400 (validação), 401 (sem sessão), 404 (id inexistente).

- **Import**: cria **projeto novo** (nome = nome do arquivo ou campo extra) e insere locais+itens via `loader.carregar` + conversão para as tabelas. Substituição de dados em projeto existente fica para v4.
- **Export .xlsx**: `planilha_export.py` monta `RELATORIO` (com cabeçalho e 9 colunas) + uma aba por local com seções `MATERIAL <categoria>` + linhas de itens — espelhando `planilha_teste.py`/`montar_planilha_teste`.

## 4. Backend — decisões

- `projetos_store.py`: funções CRUD que ramificam `database_url()` (psycopg/Neon ou sqlite3) — mesmo padrão de `db.py`; reutiliza `config`, `loader`, `analysis`, `serialize`, `report`.
- `GET /api/projetos/{id}`: monta `WorkbookData` do banco → `serialize.workbook_payload` + `fluxo`/`projeto` (mesmo pipeline de `routers/uploads.py`).
- Remoções: `powerbi_export.py` deletado; rota `/api/uploads/powerbi` removida de `routers/files.py`; `pbix-mcp==0.9.79` fora de `requirements.txt` (raiz e backend); `installCommand` do `vercel.json` revertido; `.python-version` mantido.
- Rotas antigas: `/api/uploads` (upload p/ análise em memória) — **removida** (substituída por import). `/api/uploads/report` migra para `/api/projetos/{id}/relatorio`.

## 5. Frontend — decisões

- **Estado**: contexto de "projeto selecionado" (`AppContext`); payload do dashboard buscado no GET do projeto (substitui estado em memória pós-upload).
- **Tela Projetos** (`ProjetosPage`): cards/tabela com resumo; ações Novo / Importar (input file oculto) / Abrir / Renomear / Excluir (confirm dialog).
- **Tela Planilha** (`PlanilhaPage`): duas tabelas aninhadas:
  - Locais: colunas editáveis (9 campos) + colunas calculadas cinza (saldo, investimento, retorno) + ações; Enter cria linha abaixo; Tab navega; Delete em linha vazia remove.
  - Itens (expansível por local): categoria/cod/material/qtd/valor_unit editáveis; valor_total automático.
  - **Paste**: `onPaste` na tabela → parse TSV do clipboard → preenche linhas (valida número BR `1.234,56` e EN `1234.56`).
  - **Máscara**: campo monetário exibe `R$ 1.234,56`; commit parseia ambos formatos.
  - **Autosave**: debounce 400ms → PATCH; estado "saving/error" discreto + toast com retry.
  - Validação inline na célula (borda vermelha + tooltip).
- **Dashboard**: componentes atuais; breadcrumb "← Projetos"; botões Exportar PDF e Exportar planilha (ambos na Planilha e no Dashboard). Remover input de upload e botão Power BI.

## 6. Testes (backend, pytest ~15–18)

1. CRUD projetos (criar/listar/renomear/excluir+cascata)
2. CRUD local (payload recalculado com números SESC TESTE: receita 10000 → impostos 1500 → saldo 8500)
3. CRUD item (valor_total qtd×unit; categoria)
4. GET dashboard do projeto (mesmas asserções do teste de upload atual: insights, gráficos, fluxo 6/12/24/36)
5. Import xlsx → projeto preenchido (fixture `planilha_base`)
6. Export xlsx → relido com openpyxl: colunas, locais, itens e valores
7. PDF do projeto salvo (`%PDF`)
8. Auth: todas as rotas novas → 401 sem sessão; 403/400 conforme regra de admin
9. `test_pdf_e_powerbi` → vira `test_pdf_do_projeto` (sem Power BI)

Front: `npm run build`; `smoke_ui.py` atualizado (login → novo projeto → preencher local+item → dashboard → exportar xlsx e PDF).

## 7. Deploy e migração

- Boot (`main.py` → `db.ensure_schema`) cria as 3 tabelas com `CREATE TABLE IF NOT EXISTS` → Neon idempotente, sem script one-off.
- Nenhuma migração de dados (nada persistido anteriormente). Tabela `usuarios` inalterada.
- Push em `main` → deploy automático; validação pós-deploy: `/api/health`, criar projeto via API, `/api/projetos` OK.

## 8. Ordem de execução (milestones)

- **M1 Backend**: schema + store + routers + import/export/PDF + remoções + testes → pytest verde
- **M2 Frontend**: ProjetosPage + PlanilhaPage (inline/paste/autosave) + Dashboard wiring + remoções → npm run build
- **M3 Integração**: smoke_ui + previews + atualizar AGENTS.md/RETOMADA_DEV.md → **aprovação do usuário** → commit/push

## 9. Riscos técnicos

- Parse de números BR/EN no paste e máscara (mitigado por testes de unidade no backend e helper TS)
- Export .xlsx fiel (teste de releitura no CI local)
- Autosave concorrente em células diferentes (PATCH por recurso/id — sem conflito)

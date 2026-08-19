# Raio-X Arquitetural — custo-dashboard v4

**Data:** 19/08/2026
**Status:** Plano técnico (pendente de aprovação)
**Base:** Spec da entrevista (20 rodadas) + análise do repo v3 em produção

---

## 1. Visão geral da arquitetura-alvo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vite + React + TS + Tailwind)         │
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────┐  │
│  │ ProjetosPage │ │ PlanilhaPage │ │DashboardPage │ │DashboardBuilder│  │
│  │  (existente) │ │ (AG Grid v4) │ │ (existente)  │ │  (novo v4.1)  │  │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └───────┬───────┘  │
│         │                │                │                 │           │
│  ┌──────┴───────┐ ┌──────┴───────┐ ┌──────┴───────┐ ┌───────┴───────┐  │
│  │DatasetsPage  │ │Compartilhados│ │ PublicoPage  │ │ RelatoriosPage│  │
│  │ (novo v4.0)  │ │ (novo v4.3)  │ │ /p/{token}   │ │ (novo v4.3)   │  │
│  └──────────────┘ └──────────────┘ │ (novo v4.3)  │ └───────────────┘  │
│                                     └──────────────┘                    │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ ThemeProvider (claro/escuro/automático) — novo v4.0              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTP (cookie JWT)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    api/index.py  (Vercel serverless function)           │
│                         → backend/main.py (FastAPI)                     │
│                                                                         │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │routers/    │ │routers/    │ │routers/    │ │routers/            │   │
│  │auth.py     │ │projetos.py │ │datasets.py │ │dashboards.py       │   │
│  │(existente) │ │(existente) │ │(novo v4.0) │ │(novo v4.1)         │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────────────┘   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │routers/    │ │routers/    │ │routers/    │ │routers/            │   │
│  │publicacoes │ │agendamentos│ │audit_log.py│ │compartilhados.py   │   │
│  │(novo v4.3) │ │(novo v4.3) │ │(novo v4.3) │ │(novo v4.3)         │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Camada de stores (dual Neon/SQLite)            │   │
│  │  projetos_store (existente) │ datasets_store (novo)              │   │
│  │  dashboards_store (novo)    │ publicacoes_store (novo)           │   │
│  │  agendamentos_store (novo)  │ audit_store (novo)                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Módulos de domínio (novos)                     │   │
│  │  formula_parser.py (v4.2)  │ agregador.py (v4.0)                │   │
│  │  r2_client.py (v4.3)       │ pdf_dashboard.py (v4.3)            │   │
│  │  import_dataset.py (v4.0)  │ export_dataset.py (v4.0)           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Módulos de domínio (existentes — reuso)        │   │
│  │  loader.py │ analysis.py │ insights.py │ charts.py │ serialize.py│   │
│  │  report.py │ planilha_export.py │ config.py │ formatos.py        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
     ┌────────────────┐ ┌──────────────┐ ┌──────────────────┐
     │ Neon Postgres  │ │ SQLite (dev) │ │ Cloudflare R2    │
     │ (prod)         │ │              │ │ (PDFs, v4.3)     │
     │ + 9 tabelas    │ │ + 9 tabelas  │ │ via boto3        │
     │   novas v4     │ │   novas v4   │ │                  │
     └────────────────┘ └──────────────┘ └──────────────────┘
```

---

## 2. Inventário do estado atual (v3)

### 2.1 Backend — o que existe e será reaproveitado

| Arquivo/módulo | Responsabilidade atual | Uso na v4 |
|---|---|---|
| `main.py` | App FastAPI, CORS, lifespan (ensure_schema) | **Estender**: registrar novos routers, adicionar middleware de rate limiting (v4.3) |
| `api/index.py` | Entrypoint Vercel (sys.path + `app`) | **Inalterado** — novos routers são incluídos via `main.py` |
| `routers/auth.py` | login/logout/me (cookie JWT) | **Inalterado** |
| `routers/users.py` | Gestão de usuários (admin, máx 3) | **Inalterado** |
| `routers/projetos.py` | CRUD projetos/locais/itens + import/export/PDF | **Inalterado** — novos endpoints ficam em routers separados |
| `security.py` | JWT HS256 + cookie httpOnly | **Inalterado** |
| `deps.py` | `usuario_atual`, `admin_obrigatorio`, `exigir_projeto` | **Reusar** como dependência em todos os routers novos |
| `store.py` | Facade dual Neon/SQLite para usuários | **Inalterado** (usuários não mudam) |
| `db.py` | Conexão Neon, ensure_schema, migrações aditivas | **Estender**: `_garantir_schema` passa a criar as 9 tabelas novas |
| `history.py` | SQLite local (dev) com seed admin | **Estender**: `_inicializar` passa a criar as 9 tabelas novas em SQLite |
| `projetos_store.py` | CRUD projetos/locais/itens (dual Neon/SQLite) | **Inalterado** — padrão a ser seguido pelos novos stores |
| `loader.py` | Leitura do template .xlsx (aba RELATORIO) | **Reusar** para gerar datasets read-only de locais/itens |
| `analysis.py` | KPIs, resumo_projeto, fluxo_caixa | **Reusar** para widgets do dashboard legado |
| `insights.py` | Regras de insight PT-BR | **Reusar** para widgets do dashboard legado |
| `charts.py` | Figuras Plotly (to_json) | **Reusar** para dashboard legado; novos widgets usam ECharts no frontend |
| `serialize.py` | Payloads das análises; workbook_from_payload | **Reusar** para compatibilidade do dashboard legado |
| `report.py` | PDF financeiro de 6 páginas (reportlab) | **Reusar** para export PDF legado; novo `pdf_dashboard.py` para relatórios de dashboard custom |
| `planilha_export.py` | Gera .xlsx do projeto | **Inalterado** |
| `config.py` | Configurações (taxa 15%, etc.) | **Inalterado** |
| `formatos.py` | Formatação de números PT-BR | **Reusar** |
| `theme.py` | Tokens de tema (backend, para gráficos) | **Avaliar** se precisa de versão clara |
| `tests/conftest.py` | Fixture SQLite temporário + TestClient | **Estender** para cobrir tabelas novas |
| `tests/test_api.py` | 18 testes existentes | **Inalterado** — novos testes em arquivos separados |
| `schema.sql` | DDL Neon (4 tabelas: usuarios, projetos, locais, itens) | **Estender** com 9 tabelas novas (aditivo) |

### 2.2 Frontend — o que existe e será reaproveitado

| Arquivo/módulo | Responsabilidade atual | Uso na v4 |
|---|---|---|
| `App.tsx` | Rotas (BrowserRouter) | **Estender**: novas rotas (datasets, builder, compartilhados, /p/{token}, relatórios) |
| `pages/ProjetosPage.tsx` | Lista de projetos, criar, importar | **Inalterado** |
| `pages/DashboardPage.tsx` | Shell com abas (Visão Geral, Custos, etc.) | **Inalterado** — continua sendo o dashboard legado ROTA |
| `pages/PlanilhaPage.tsx` | Edição inline de locais/itens | **Manter** para o modelo ROTA; datasets livres usam nova página com AG Grid |
| `pages/LoginPage.tsx` | Login | **Inalterado** |
| `components/AppShell.tsx` | Layout (sidebar + header) | **Estender**: adicionar toggle de tema, novos itens de menu |
| `components/PlotlyChart.tsx` | Renderiza Plotly JSON | **Manter** para dashboard legado; novos widgets usam ECharts |
| `components/tabs/*` | 6 abas do dashboard ROTA | **Inalterado** |
| `components/ui/*` | Badge, Botao, Card, Modal | **Reusar** e estender |
| `lib/api.ts` | Cliente HTTP com cookie | **Inalterado** — novos endpoints usam o mesmo cliente |
| `lib/auth.tsx` | Contexto de sessão | **Inalterado** |
| `lib/types.ts` | Tipos espelhando payloads | **Estender** com tipos novos (Dataset, Dashboard, Widget, etc.) |
| `lib/theme.ts` | Tokens de cor (apenas dark) | **Refatorar** para suportar claro + escuro + automático |
| `lib/autosave.ts` | Debounce de autosave | **Reusar** para datasets livres |
| `lib/format.ts` | Formatação de números PT-BR | **Reusar** |
| `lib/import-file.ts` | Import de arquivos | **Estender** para CSV/XLSX de datasets livres |
| `index.css` | CSS variables (apenas dark, `color-scheme: dark`) | **Refatorar** para adicionar variáveis de tema claro + media query `prefers-color-scheme` |

### 2.3 Infraestrutura — o que existe

| Arquivo | Estado atual | Mudança na v4 |
|---|---|---|
| `vercel.json` | Função Python, maxDuration 60, rewrites | **Estender**: adicionar cron job (v4.3), rewrite para `/p/{token}` |
| `requirements.txt` (raiz) | 9 deps (sem pandas, sem boto3, sem slowapi) | **Adicionar**: `boto3`, `slowapi` (v4.3) |
| `frontend/package.json` | react, react-router-dom, plotly.js, react-plotly.js | **Adicionar**: `ag-grid-community`, `ag-grid-react`, `echarts`, `echarts-for-react` |

---

## 3. Novos componentes (backend)

### 3.1 `backend/routers/datasets.py` (v4.0)

**Responsabilidade:** CRUD de datasets livres + import/export de linhas.

**Rotas:**
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/projetos/{id}/datasets` | Lista datasets do projeto (inclui datasets read-only de locais/itens) |
| POST | `/api/projetos/{id}/datasets` | Cria dataset livre (valida limite 100k linhas) |
| GET | `/api/projetos/{id}/datasets/{did}` | Obtém dataset + schema + linhas (paginado se > 1000) |
| PATCH | `/api/projetos/{id}/datasets/{did}` | Atualiza nome/schema (adicionar/remover colunas) |
| DELETE | `/api/projetos/{id}/datasets/{did}` | Remove dataset (cascata em dataset_rows) |
| POST | `/api/datasets/{did}/rows` | Adiciona/atualiza linhas em bulk (upsert por row_index) |
| POST | `/api/datasets/{did}/importar` | Upload CSV/XLSX → parse → insert bulk |
| GET | `/api/datasets/{did}/export.csv` | Exporta como CSV |
| GET | `/api/datasets/{did}/export.xlsx` | Exporta como XLSX (via openpyxl) |

**Dependências:** `deps.usuario_atual`, `deps.exigir_projeto`, `datasets_store`, `import_dataset`, `export_dataset`.

**Padrão:** segue `routers/projetos.py` — validação inline, HTTPException para erros, `Depends(usuario_atual)` em todas as rotas.

**Testes alvo:** parser CSV (formato BR e EN), parser XLSX, inferência de tipos, limite 100k linhas, bulk insert, export round-trip.

### 3.2 `backend/datasets_store.py` (v4.0)

**Responsabilidade:** CRUD de datasets e dataset_rows (dual Neon/SQLite), seguindo o padrão de `projetos_store.py`.

**Funções principais:**
- `listar_datasets(projeto_id)` → inclui datasets sintéticos de locais/itens
- `criar_dataset(projeto_id, nome, schema_json, fonte)` → valida limite de datasets
- `get_dataset(dataset_id)` → schema + metadados
- `atualizar_dataset(dataset_id, nome?, schema_json?)`
- `excluir_dataset(dataset_id)` → cascata em dataset_rows
- `contar_linhas(dataset_id)` → para validação de limite
- `inserir_linhas_bulk(dataset_id, rows: list[dict])` → INSERT batch
- `listar_linhas(dataset_id, offset, limit)` → paginação
- `excluir_linhas_dataset(dataset_id)` → DELETE em massa

**Datasets read-only automáticos (locais/itens):**
Quando `listar_datasets(projeto_id)` é chamado, além de consultar a tabela `datasets`, o store gera 2 datasets virtuais:
- `{id: "locais-{projeto_id}", nome: "Locais", fonte: "locais", schema: [...colunas fixas...]}`
- `{id: "itens-{projeto_id}", nome: "Itens", fonte: "itens", schema: [...colunas fixas...]}`

Quando um widget referencia um dataset virtual, a agregação é feita consultando as tabelas `locais`/`itens` diretamente. Isso evita duplicar dados e mantém a compatibilidade.

**Padrão de ramificação:** `_sqlite()` / `_conn()` como em `projetos_store.py`.

### 3.3 `backend/import_dataset.py` (v4.0)

**Responsabilidade:** Parse de CSV e XLSX para inserção em dataset_rows.

**Funções:**
- `parse_csv(conteudo: bytes, filename: str) -> tuple[list[str], list[dict]]` — detecta separador (`;` vs `,`), decimal (`,` vs `.`), encoding (utf-8, latin-1), BOM. Retorna (colunas, linhas).
- `parse_xlsx(conteudo: bytes, sheet_index: int = 0) -> tuple[list[str], list[dict]]` — via openpyxl (já no requirements). Primeira linha = cabeçalho.
- `inferir_tipos(colunas: list[str], linhas: list[dict]) -> list[dict]` — infere `number`, `text`, `date`, `boolean` por coluna.

**Testes alvo:** CSV com separador `;` e decimal `,` (BR), CSV com separador `,` e decimal `.` (EN), XLSX com múltiplas abas, encoding latin-1, cabeçalho com acentos, linhas vazias, tipos mistos.

### 3.4 `backend/export_dataset.py` (v4.0)

**Responsabilidade:** Export de dataset para CSV e XLSX.

**Funções:**
- `exportar_csv(dataset_id, datasets_store) -> bytes` — gera CSV com separador `;` e decimal `,` (padrão BR).
- `exportar_xlsx(dataset_id, datasets_store) -> bytes` — via openpyxl, uma aba com nome do dataset.

### 3.5 `backend/agregador.py` (v4.0)

**Responsabilidade:** Agregação de dados para widgets de dashboard (GROUP BY, SUM, AVG, COUNT, MIN, MAX).

**Estratégia dual:**
- **SQL (preferencial):** para datasets com > 1000 linhas, gera query `SELECT ... GROUP BY ...` no Neon/SQLite.
- **Python puro (fallback):** para datasets pequenos (< 1000 linhas) ou quando a agregação envolve campos calculados.

**Funções:**
- `agregar(dataset_id, config: dict, datasets_store, formula_evaluator=None) -> dict` — recebe a config do widget (x, y, aggregation, groupBy, filters) e retorna `{labels: [...], series: [{name, data: [...]}]}`.
- `_agregar_sql(dataset_id, config, conn)` — gera e executa SQL.
- `_agregar_python(dataset_id, config, datasets_store)` — carrega linhas e agrega em Python.

**Filtros (slicers):** aplicados como `WHERE` no SQL ou como filtro de lista no Python.

**Testes alvo:** agregação SUM/AVG/COUNT/MIN/MAX, groupBy múltiplo, filtros, dataset vazio, dataset com 100k linhas (benchmark < 2s via SQL).

### 3.6 `backend/routers/dashboards.py` (v4.1)

**Responsabilidade:** CRUD de dashboards, widgets e slicers.

**Rotas:**
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/projetos/{id}/dashboards` | Lista dashboards do projeto (limite 20) |
| POST | `/api/projetos/{id}/dashboards` | Cria dashboard (aceita `eh_interno: bool`) |
| GET | `/api/projetos/{id}/dashboards/{dbid}` | Dashboard completo (widgets + slicers) |
| PATCH | `/api/projetos/{id}/dashboards/{dbid}` | Atualiza nome/layout/`eh_interno` |
| DELETE | `/api/projetos/{id}/dashboards/{dbid}` | Remove (cascata widgets/slicers) |
| POST | `/api/dashboards/{dbid}/widgets` | Adiciona widget (limite 50) |
| PATCH | `/api/dashboards/{dbid}/widgets/{wid}` | Atualiza widget |
| DELETE | `/api/dashboards/{dbid}/widgets/{wid}` | Remove widget |
| POST | `/api/dashboards/{dbid}/slicers` | Adiciona slicer |
| DELETE | `/api/dashboards/{dbid}/slicers/{sid}` | Remove slicer |

**Validações:**
- Limite 20 dashboards/projeto → 400 com mensagem.
- Limite 50 widgets/dashboard → 400 com mensagem.
- `config_json` do widget validado contra schema (tipo de gráfico, campos existentes no dataset).

### 3.7 `backend/dashboards_store.py` (v4.1)

**Responsabilidade:** CRUD de dashboards, widgets e slicers (dual Neon/SQLite).

**Padrão:** idêntico a `projetos_store.py` — ramificação `_sqlite()` / `_conn()`.

**Funções principais:**
- `listar_dashboards(projeto_id)`, `criar_dashboard(...)`, `get_dashboard(dbid)` (com widgets e slicers aninhados), `atualizar_dashboard(...)`, `excluir_dashboard(dbid)`
- `contar_dashboards(projeto_id)`, `contar_widgets(dashboard_id)` — para limites
- `criar_widget(dashboard_id, ...)`, `atualizar_widget(wid, ...)`, `excluir_widget(wid)`
- `criar_slicer(dashboard_id, ...)`, `excluir_slicer(sid)`

### 3.8 `backend/routers/compartilhados.py` (v4.3)

**Responsabilidade:** Listar dashboards internos para todos os usuários logados.

**Rota:**
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/dashboards/compartilhados` | Lista dashboards com `eh_interno = true` (todos os projetos) |

**Nota:** este endpoint não tem prefixo de projeto — é um router independente registrado em `main.py` com `prefix="/api"`.

### 3.9 `backend/formula_parser.py` (v4.2)

**Responsabilidade:** Lexer + parser recursivo descendente + avaliador para fórmulas Excel-like. **Sem `eval`/`exec`.**

**Arquitetura interna:**

```
formula_parser.py
├── Token (dataclass: tipo, valor, posicao)
├── Lexer
│   └── tokenizar(formula: str) -> list[Token]
│       Tipos: NUMERO, STRING, IDENTIFICADOR, OPERADOR, LPAREN, RPAREN, VIRGULA, EOF
├── AST (nós)
│   ├── NumeroLiteral(valor)
│   ├── StringLiteral(valor)
│   ├── ColunaRef(nome)
│   ├── BinOp(op, esquerda, direita)
│   ├── ChamadaFuncao(nome, args)
│   └── UnarioOp(op, operando)
├── Parser
│   └── parse(tokens: list[Token], colunas_validas: set[str]) -> AST
│       Valida: identificadores ∈ colunas_validas, funções ∈ LISTA_BRANCA_FUNCOES
├── Avaliador
│   └── avaliar(ast: AST, linha: dict, contexto_agregacao: list[dict] | None) -> Any
│       Funções suportadas: SUM, AVERAGE, IF, CONCAT, DATE, SUMIF, COUNTIF, MIN, MAX
└── validar_formula(formula: str, colunas_validas: set[str]) -> tuple[bool, str]
    Retorna (ok, mensagem_erro) — usado pelo endpoint antes de salvar
```

**Lista branca:**
- **Funções:** `SUM`, `AVERAGE`, `IF`, `CONCAT`, `DATE`, `SUMIF`, `COUNTIF`, `MIN`, `MAX`
- **Operadores:** `+`, `-`, `*`, `/`, `=`, `>`, `<`, `>=`, `<=`, `&` (concatenação)
- **Literais:** números, strings entre aspas duplas, datas via `DATE(ano, mes, dia)`
- **Identificadores:** apenas nomes de colunas existentes no dataset (case-insensitive)

**Tratamento de erros:**
- Token desconhecido → `FormulaInvalidaError` com posição
- Identificador fora da lista branca → erro com nome do identificador
- Função desconhecida → erro com nome da função
- Parênteses desbalanceados → erro
- Divisão por zero → retorna `None` (exibido como `#DIV/0!` no frontend)

**Casos maliciosos a cobrir em testes:**
- `__import__('os')` → rejeitado (identificador `__import__` não é coluna)
- `;DROP TABLE datasets` → rejeitado (`;` não é token válido)
- `eval("1+1")` → rejeitado (`eval` não é função da lista branca)
- `exec("print('hi')")` → rejeitado
- `os.system("rm -rf /")` → rejeitado (`.` não é operador válido)
- `lambda x: x` → rejeitado (`lambda` não é token válido)
- Fórmula com 10.000 caracteres → rejeitado (limite de tamanho)
- Recursão infinita via `SUM(SUM(SUM(...)))` → limite de profundidade do parser (máx 100 níveis)

**Testes alvo:** ~30 testes unitários cobrindo:
- Operações aritméticas básicas
- Cada função da lista branca
- Referências por nome de coluna
- Fórmulas aninhadas (`IF(SUM(x) > 100, "alto", "baixo")`)
- Todos os casos maliciosos listados acima
- Edge cases: fórmula vazia, coluna inexistente, tipo incompatível

### 3.10 `backend/routers/campos_calculados.py` (v4.2)

**Responsabilidade:** CRUD de campos calculados com validação via parser.

**Rotas:**
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/datasets/{did}/campos-calculados` | Cria campo (valida fórmula; 400 se inválida) |
| PATCH | `/api/datasets/{did}/campos-calculados/{cid}` | Atualiza campo |
| DELETE | `/api/datasets/{did}/campos-calculados/{cid}` | Remove campo |

**Nota de inconsistência:** a spec lista `POST /api/projetos/{id}/campos-calculados` mas a tabela `campos_calculados` referencia `dataset_id`. A rota correta deve ser por dataset (`/api/datasets/{did}/campos-calculados`), não por projeto. Ver seção 11 (Inconsistências).

### 3.11 `backend/routers/publicacoes.py` (v4.3)

**Responsabilidade:** Publicação externa de dashboards.

**Rotas:**
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/dashboards/{dbid}/publicar` | Gera token (secrets.token_urlsafe(32)), cria publicação, registra audit_log |
| DELETE | `/api/publicacoes/{pid}` | Revoga (set `revogado_em`), registra audit_log |
| GET | `/api/publicacoes` | Lista publicações do usuário |

### 3.12 `backend/routers/publico.py` (v4.3)

**Responsabilidade:** Render público do dashboard via token.

**Rota:**
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/p/{token}` | **Nenhuma** | Retorna dashboard completo (widgets + dados agregados) se token válido e não revogado |

**Rate limiting:** 60 req/min por IP via `slowapi` (middleware no `main.py`). Configuração:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
```

**Nota:** o `vercel.json` precisa de rewrite adicional para `/p/:token` → `/api/index` (ou a rota pode ser servida pelo FastAPI diretamente, já que o rewrite `/:path*` → `index.html` capturaria — preciso adicionar exceção).

### 3.13 `backend/routers/agendamentos.py` (v4.3)

**Responsabilidade:** CRUD de agendamentos + listagem de relatórios.

**Rotas:**
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/agendamentos` | Cria agendamento (diária/semanal/mensal/on_demand) |
| GET | `/api/agendamentos` | Lista agendamentos do usuário |
| PATCH | `/api/agendamentos/{aid}` | Ativa/desativa/pausa |
| DELETE | `/api/agendamentos/{aid}` | Remove |
| GET | `/api/relatorios` | Lista relatórios gerados |
| GET | `/api/relatorios/{rid}/download` | Proxy do R2 → PDF (registra audit_log) |

### 3.14 `backend/routers/cron.py` (v4.3)

**Responsabilidade:** Handler do Vercel Cron para processar agendamentos pendentes.

**Rota:**
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/cron/relatorios` | Header secreto (`CRON_SECRET`) | Processa agendamentos com `proxima_execucao <= now()` |

**Fluxo:**
1. Busca agendamentos pendentes (`ativo = true AND proxima_execucao <= now()`)
2. Para cada agendamento:
   a. Carrega dashboard + widgets + dados
   b. Gera PDF via `pdf_dashboard.py`
   c. Upload para R2 via `r2_client.py`
   d. Cria registro em `relatorios`
   e. Atualiza `proxima_execucao` no agendamento
3. Em caso de falha: status `falha` no relatório, log do erro

**Vercel Cron config** (adicionar ao `vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/relatorios",
      "schedule": "0 6 * * *"
    }
  ]
}
```

### 3.15 `backend/pdf_dashboard.py` (v4.3)

**Responsabilidade:** Geração de PDF a partir de um dashboard (diferente do `report.py` que gera PDF financeiro do modelo ROTA).

**Abordagem:** renderizar widgets como tabelas/gráficos estáticos via reportlab. Gráficos ECharts não podem ser renderizados server-side (são JS) — alternativa: gerar tabelas de dados + KPIs no PDF, ou usar screenshot headless (Playwright/Puppeteer).

**Decisão recomendada:** usar reportlab para gerar PDFs tabulares (dados dos widgets em formato de tabela). Se o usuário quiser gráficos no PDF, avaliar Playwright headless como fase 2 (impacto no bundle).

### 3.16 `backend/r2_client.py` (v4.3)

**Responsabilidade:** Wrapper sobre boto3 para Cloudflare R2.

**Funções:**
- `get_client()` → `boto3.client('s3', endpoint_url=R2_ENDPOINT, aws_access_key_id=..., aws_secret_access_key=...)`
- `upload_pdf(pdf_bytes: bytes, key: str) -> str` → retorna a key
- `download_pdf(key: str) -> bytes`
- `delete_pdf(key: str)`

**Env vars necessárias:**
- `R2_ENDPOINT` (ex: `https://<account_id>.r2.cloudflarestorage.com`)
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`

### 3.17 `backend/routers/audit_log.py` (v4.3)

**Responsabilidade:** Consulta de log de auditoria.

**Rota:**
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/audit-log` | `admin_obrigatorio` | Lista eventos (paginação, filtro por evento/data) |

### 3.18 `backend/audit_store.py` (v4.3)

**Responsabilidade:** Inserção e consulta de audit_log.

**Funções:**
- `registrar(evento, usuario_id, alvo_id, alvo_tipo, metadata)` → INSERT
- `listar(filtros, offset, limit)` → SELECT com filtros

---

## 4. Novos componentes (frontend)

### 4.1 `pages/DatasetsPage.tsx` (v4.0)

**Responsabilidade:** Tela de datasets livres com AG Grid Community.

**Rota:** `/projetos/:id/datasets` e `/projetos/:id/datasets/:did`

**Funcionalidades:**
- Lista de datasets do projeto (sidebar com datasets + botão "Novo dataset")
- Grade AG Grid com:
  - Navegação por teclado (Tab/Enter)
  - Colar do Excel (TSV/CSV/BR) — handler `onPaste` custom
  - Autosave ~400ms (debounce via `lib/autosave.ts` existente)
  - Colunas tipadas (number, text, date, boolean) com editores apropriados
  - Campos calculados aparecem como colunas read-only com ícone de fórmula
- Barra de ferramentas: importar CSV/XLSX, exportar CSV/XLSX, adicionar coluna, adicionar campo calculado
- Indicador de contagem de linhas (limite 100k)

**Dependências novas:** `ag-grid-community`, `ag-grid-react`

**Integração:** usa `lib/api.ts` para chamadas ao `datasets_store`. Estado local via `useState`/`useReducer` (sem react-query/swr — manter simplicidade, seguindo o padrão v3).

### 4.2 `pages/DashboardBuilderPage.tsx` (v4.1)

**Responsabilidade:** Construtor visual de dashboards com drag-and-drop.

**Rota:** `/projetos/:id/dashboards/:dbid`

**Layout:**
- **Sidebar esquerda:** lista de datasets do projeto (campos arrastáveis) + lista de widgets disponíveis
- **Canvas central:** grid de widgets (react-grid-layout ou CSS Grid com drag)
- **Painel direito:** configurações do widget selecionado (eixos, agregação, filtros, cores)
- **Barra superior:** nome do dashboard, toggle interno/público, salvar, exportar

**Funcionalidades:**
- Drag-and-drop de campos do dataset para criar widget
- Redimensionamento e reposicionamento de widgets
- Configuração de cada widget (tipo de gráfico, eixos, agregação, groupBy)
- Slicers globais (barra superior ou lateral)
- Drill-down (v4.2): clicar em elemento de widget filtra os demais

**Dependências novas:** `echarts`, `echarts-for-react`, `react-grid-layout` (para layout drag-and-drop)

### 4.3 `components/widgets/` (v4.1)

**Novos componentes:**
| Componente | Responsabilidade |
|---|---|
| `EChartsWidget.tsx` | Wrapper genérico para ECharts (recebe config + dados, renderiza) |
| `BarWidget.tsx` | Gráfico de barras (stacked, 100% stacked, combo) |
| `LineWidget.tsx` | Gráfico de linha/área |
| `PieWidget.tsx` | Pizza/funil |
| `ScatterWidget.tsx` | Dispersão/heatmap |
| `KpiWidget.tsx` | KPI (número grande + variação) |
| `TableWidget.tsx` | Tabela simples |
| `PivotWidget.tsx` | Tabela dinâmica (linhas × colunas × métricas) |
| `SlicerBar.tsx` | Barra de slicers (lista, intervalo, data) |
| `WidgetConfigPanel.tsx` | Painel de configuração do widget selecionado |

**Padrão:** cada widget recebe `{config, dados}` e renderiza via ECharts. Dados são buscados via `agregador.py` no backend.

### 4.4 `pages/CompartilhadosPage.tsx` (v4.3)

**Responsabilidade:** Lista de dashboards internos (todos os projetos).

**Rota:** `/compartilhados`

**Layout:** grid de cards com preview/thumbnail de cada dashboard interno. Clique abre o dashboard em modo read-only.

### 4.5 `pages/PublicoPage.tsx` (v4.3)

**Responsabilidade:** Render público de dashboard via token.

**Rota:** `/p/:token`

**Diferenças:**
- Sem auth (sem cookie, sem login)
- Read-only (sem edição, sem slicers que persistem)
- Layout limpo (sem sidebar, sem menu)
- Rate limit visual (se 429, mostra "Aguarde um momento...")

### 4.6 `pages/RelatoriosPage.tsx` (v4.3)

**Responsabilidade:** Área de relatórios agendados.

**Rota:** `/relatorios`

**Funcionalidades:**
- Lista de agendamentos (com status, próxima execução, toggle ativo/inativo)
- Lista de relatórios gerados (data, tamanho, botão download)
- Criar novo agendamento (modal com periodicidade)

### 4.7 `components/ThemeProvider.tsx` (v4.0)

**Responsabilidade:** Gerenciamento de tema (claro/escuro/automático).

**Implementação:**
- Contexto React com 3 modos: `claro`, `escuro`, `automatico`
- Persistência em `localStorage` (key: `tema_preferencia`)
- Modo automático: `window.matchMedia('(prefers-color-scheme: dark)')` com listener para atualização em tempo real
- Aplica classe `dark` ou `light` no `<html>` + CSS variables correspondentes
- Toggle na barra superior (AppShell)

**Mudança no CSS (`index.css`):**
- Adicionar `:root` com variáveis de tema claro
- Adicionar `.dark` com variáveis de tema escuro (atuais)
- Adicionar `@media (prefers-color-scheme: dark)` para modo automático
- Refatorar todos os componentes que usam cores hardcoded

**Impacto:** esta é uma mudança transversal que afeta todos os componentes existentes. Recomendação: fazer na v4.0 junto com a primeira release para evitar retrabalho.

### 4.8 Atualizações em componentes existentes

| Componente | Mudança |
|---|---|
| `AppShell.tsx` | Adicionar toggle de tema, itens de menu "Datasets", "Dashboards", "Compartilhados", "Relatórios" |
| `App.tsx` | Novas rotas: `/projetos/:id/datasets/:did?`, `/projetos/:id/dashboards/:dbid?`, `/compartilhados`, `/p/:token`, `/relatorios` |
| `types.ts` | Novos tipos: `Dataset`, `DatasetSchema`, `Dashboard`, `Widget`, `Slicer`, `Publicacao`, `Agendamento`, `Relatorio`, `AuditLogEntry` |

---

## 5. Modelo de dados novo

### 5.1 Tabela `datasets` (v4.0)

```sql
create table if not exists datasets (
  id bigint generated always as identity primary key,
  projeto_id bigint not null references projetos(id) on delete cascade,
  nome text not null,
  schema_json jsonb not null,
  fonte text not null default 'livre',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_datasets_projeto on datasets(projeto_id);
```

- **FK:** `projeto_id` → `projetos(id)` ON DELETE CASCADE
- **Índice:** por projeto para listagem rápida
- **`schema_json`:** `[{"nome": "col1", "tipo": "number"}, ...]`
- **`fonte`:** `"livre"` | `"locais"` | `"itens"` | `"csv"` | `"xlsx"`
- **SQLite:** mesma DDL com `INTEGER PRIMARY KEY AUTOINCREMENT` e `TEXT` para jsonb

### 5.2 Tabela `dataset_rows` (v4.0)

```sql
create table if not exists dataset_rows (
  id bigint generated always as identity primary key,
  dataset_id bigint not null references datasets(id) on delete cascade,
  row_index integer not null,
  data_json jsonb not null
);
create index if not exists idx_dataset_rows_dataset on dataset_rows(dataset_id, row_index);
```

- **FK:** `dataset_id` → `datasets(id)` ON DELETE CASCADE
- **Índice composto:** `(dataset_id, row_index)` para paginação e upsert
- **Comportamento:** upsert por `(dataset_id, row_index)` — ao salvar célula, faz INSERT ON CONFLICT UPDATE
- **Nota de performance:** para 100k linhas, cada linha é um registro. Bulk insert via `executemany` ou `COPY` (Neon suporta). No SQLite, batch de 1000 por transação.

### 5.3 Tabela `campos_calculados` (v4.2)

```sql
create table if not exists campos_calculados (
  id bigint generated always as identity primary key,
  dataset_id bigint not null references datasets(id) on delete cascade,
  nome text not null,
  formula text not null,
  dependencias_json jsonb not null,
  ordem integer not null default 0
);
create index if not exists idx_campos_calc_dataset on campos_calculados(dataset_id);
```

- **FK:** `dataset_id` → `datasets(id)` ON DELETE CASCADE
- **`dependencias_json`:** `["quantidade", "custo_unitario"]` — colunas referenciadas pela fórmula
- **Validação:** fórmula validada pelo `formula_parser.py` antes de salvar

### 5.4 Tabela `dashboards` (v4.1)

```sql
create table if not exists dashboards (
  id bigint generated always as identity primary key,
  projeto_id bigint not null references projetos(id) on delete cascade,
  nome text not null,
  layout_json jsonb not null default '{}',
  eh_interno boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_dashboards_projeto on dashboards(projeto_id);
create index if not exists idx_dashboards_interno on dashboards(eh_interno) where eh_interno = true;
```

- **FK:** `projeto_id` → `projetos(id)` ON DELETE CASCADE
- **`layout_json`:** posição dos widgets no grid (react-grid-layout state)
- **Índice parcial:** `eh_interno = true` para query eficiente de `/compartilhados`

### 5.5 Tabela `widgets` (v4.1)

```sql
create table if not exists widgets (
  id bigint generated always as identity primary key,
  dashboard_id bigint not null references dashboards(id) on delete cascade,
  type text not null,
  dataset_id bigint references datasets(id) on delete set null,
  config_json jsonb not null,
  position_json jsonb not null,
  ordem integer not null default 0
);
create index if not exists idx_widgets_dashboard on widgets(dashboard_id);
```

- **FK:** `dashboard_id` → `dashboards(id)` ON DELETE CASCADE
- **FK:** `dataset_id` → `datasets(id)` ON DELETE SET NULL (widget órfão se dataset removido)
- **`type`:** `bar|line|pie|area|scatter|heatmap|funnel|stacked_bar|stacked100_bar|combo|kpi|table|pivot`

### 5.6 Tabela `slicers` (v4.1)

```sql
create table if not exists slicers (
  id bigint generated always as identity primary key,
  dashboard_id bigint not null references dashboards(id) on delete cascade,
  dataset_id bigint not null references datasets(id) on delete cascade,
  field text not null,
  values_json jsonb not null,
  tipo text not null
);
create index if not exists idx_slicers_dashboard on slicers(dashboard_id);
```

### 5.7 Tabela `publicacoes` (v4.3)

```sql
create table if not exists publicacoes (
  id bigint generated always as identity primary key,
  dashboard_id bigint not null references dashboards(id) on delete cascade,
  token text not null unique,
  revogado_em timestamptz,
  criado_em timestamptz not null default now(),
  criado_por bigint not null references usuarios(id)
);
create unique index if not exists idx_publicacoes_token on publicacoes(token);
```

- **Token:** gerado via `secrets.token_urlsafe(32)` (≥ 43 chars, URL-safe)
- **Revogação:** soft delete via `revogado_em` (não remove o registro)

### 5.8 Tabela `agendamentos` (v4.3)

```sql
create table if not exists agendamentos (
  id bigint generated always as identity primary key,
  publicacao_id bigint not null references publicacoes(id) on delete cascade,
  periodicidade text not null,
  proxima_execucao timestamptz not null,
  ativo boolean not null default true,
  criado_por bigint not null references usuarios(id)
);
create index if not exists idx_agendamentos_pendente on agendamentos(proxima_execucao) where ativo = true;
```

- **`periodicidade`:** `"diaria"` | `"semanal"` | `"mensal"` | `"on_demand"`
- **Índice parcial:** para o cron buscar pendentes eficientemente

### 5.9 Tabela `relatorios` (v4.3)

```sql
create table if not exists relatorios (
  id bigint generated always as identity primary key,
  agendamento_id bigint references agendamentos(id) on delete set null,
  publicacao_id bigint not null references publicacoes(id) on delete cascade,
  gerado_em timestamptz not null default now(),
  storage_key text not null,
  tamanho_bytes bigint,
  status text not null default 'gerado'
);
create index if not exists idx_relatorios_publicacao on relatorios(publicacao_id);
```

### 5.10 Tabela `audit_log` (v4.3)

```sql
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  evento text not null,
  usuario_id bigint not null references usuarios(id),
  alvo_id bigint,
  alvo_tipo text,
  criado_em timestamptz not null default now(),
  metadata_json jsonb
);
create index if not exists idx_audit_log_evento on audit_log(evento, criado_em);
```

### 5.11 Migração aditiva no boot

**Onde:** `db.py` → `_garantir_schema(conn)` e `history.py` → `_inicializar(conn)`.

**Como:** adicionar os `CREATE TABLE IF NOT EXISTS` das 9 tabelas novas ao `schema.sql` (Neon) e ao script de `_inicializar` (SQLite). Idempotente — se a tabela já existe, não faz nada.

**Ordem de criação:** respeitar FKs:
1. `datasets` (depende de `projetos`)
2. `dataset_rows` (depende de `datasets`)
3. `campos_calculados` (depende de `datasets`)
4. `dashboards` (depende de `projetos`)
5. `widgets` (depende de `dashboards`, `datasets`)
6. `slicers` (depende de `dashboards`, `datasets`)
7. `publicacoes` (depende de `dashboards`, `usuarios`)
8. `agendamentos` (depende de `publicacoes`, `usuarios`)
9. `relatorios` (depende de `agendamentos`, `publicacoes`)
10. `audit_log` (depende de `usuarios`)

**Risco de lock:** `CREATE TABLE IF NOT EXISTS` é DDL leve no Postgres — não adquire lock longo. Seguro em produção.

---

## 6. Sequenciamento técnico por release

### 6.1 v4.0 — Datasets livres + Grid + Tema

**Pré-requisitos:** nenhum (pode começar imediatamente sobre v3).

**Ordem dos passos:**

1. **Schema** (dia 1)
   - Adicionar `datasets` e `dataset_rows` ao `schema.sql`
   - Adicionar ao `_inicializar` do `history.py` (SQLite)
   - Testar boot local (SQLite) e validar no Neon via deploy de teste

2. **Store** (dia 1-2)
   - Criar `backend/datasets_store.py` seguindo padrão de `projetos_store.py`
   - Funções: CRUD datasets, CRUD linhas, contagem

3. **Import/Export** (dia 2-3)
   - Criar `backend/import_dataset.py` (parse CSV/XLSX)
   - Criar `backend/export_dataset.py` (gera CSV/XLSX)
   - Testes unitários: parse BR/EN, inferência de tipos, round-trip

4. **Endpoints** (dia 3-4)
   - Criar `backend/routers/datasets.py`
   - Registrar em `main.py`
   - Testes de integração: criar dataset → adicionar linhas → exportar → importar

5. **Tema** (dia 4-5)
   - Refatorar `index.css` para suportar claro + escuro + automático
   - Criar `components/ThemeProvider.tsx`
   - Atualizar `AppShell.tsx` com toggle
   - Testar em todas as páginas existentes

6. **Frontend — DatasetsPage** (dia 5-8)
   - Instalar `ag-grid-community` + `ag-grid-react`
   - Criar `pages/DatasetsPage.tsx` com AG Grid
   - Implementar paste do Excel, autosave, navegação por teclado
   - Import CSV/XLSX via file input
   - Export CSV/XLSX via blob download

7. **Datasets read-only de locais/itens** (dia 8)
   - Em `datasets_store.listar_datasets()`, gerar datasets virtuais
   - Validar que widgets podem referenciar esses datasets (preparação para v4.1)

8. **Testes e smoke** (dia 9-10)
   - Testes unitários: import_dataset, export_dataset, datasets_store
   - Testes de integração: fluxo completo criar → importar → editar → exportar
   - Smoke test: fluxo legado (criar projeto, planilha, dashboard) + novo fluxo datasets
   - Validar bundle < 225MB

**Critérios de "release pronto":**
- [ ] `pytest -q` verde (18 existentes + ~15 novos)
- [ ] `npm run build` sem erros
- [ ] Datasets livres funcionais (criar, editar, importar, exportar)
- [ ] AG Grid com paste do Excel e autosave
- [ ] Tema claro/escuro/automático funcional em todas as páginas
- [ ] Bundle backend < 225MB
- [ ] Smoke test do fluxo legado passa sem regressão
- [ ] Deploy na Vercel validado (`/api/health` OK)

### 6.2 v4.1 — Construtor de dashboards + ECharts

**Pré-requisitos:** v4.0 em produção.

**Ordem dos passos:**

1. **Schema** — adicionar `dashboards`, `widgets`, `slicers` ao `schema.sql` e `history.py`
2. **Store** — `backend/dashboards_store.py`
3. **Agregador** — `backend/agregador.py` (SQL + Python puro)
4. **Endpoints** — `backend/routers/dashboards.py`
5. **Frontend — dependências** — instalar `echarts`, `echarts-for-react`, `react-grid-layout`
6. **Frontend — widgets** — criar `components/widgets/` (EChartsWidget, Bar, Line, Pie, etc.)
7. **Frontend — DashboardBuilderPage** — construtor drag-and-drop
8. **Frontend — SlicerBar** — slicers globais
9. **Frontend — PivotWidget** — tabela dinâmica
10. **Compatibilidade** — primeiro dashboard criado gera widgets "Tabela — Locais" e "Tabela — Itens"
11. **Export** — exportar dashboard como PNG/CSV/PDF
12. **Testes e smoke**

**Critérios de "release pronto":**
- [ ] Construtor drag-and-drop funcional
- [ ] Todos os 10 tipos de gráfico renderizam corretamente via ECharts
- [ ] Slicers filtram múltiplos widgets
- [ ] Pivot table funcional
- [ ] Dashboard persiste e restaura ao recarregar
- [ ] Limites (50 widgets, 20 dashboards) aplicados
- [ ] Smoke test do fluxo legado passa

### 6.3 v4.2 — Drill-down + Fórmulas + Parser sandbox

**Pré-requisitos:** v4.1 em produção.

**Ordem dos passos:**

1. **Parser** — `backend/formula_parser.py` (lexer + parser + avaliador)
2. **Testes do parser** — ~30 testes unitários (incluindo casos maliciosos)
3. **Schema** — adicionar `campos_calculados` ao `schema.sql` e `history.py`
4. **Endpoints** — `backend/routers/campos_calculados.py`
5. **Integração agregador** — `agregador.py` passa a avaliar campos calculados
6. **Frontend — campos calculados** — UI para criar/editar fórmulas na DatasetsPage
7. **Frontend — drill-down** — clicar em elemento de widget filtra os demais
8. **Testes e smoke**

**Critérios de "release pronto":**
- [ ] Parser rejeita todos os casos maliciosos testados
- [ ] Campos calculados aparecem como colunas no AG Grid
- [ ] Drill-down funcional entre widgets
- [ ] Fórmulas com SUM, AVERAGE, IF, etc. funcionam corretamente
- [ ] Smoke test do fluxo legado passa

### 6.4 v4.3 — Publicação + Agendamento + R2 + Auditoria

**Pré-requisitos:** v4.2 em produção.

**Ordem dos passos:**

1. **Schema** — adicionar `publicacoes`, `agendamentos`, `relatorios`, `audit_log`
2. **Stores** — `publicacoes_store.py`, `agendamentos_store.py`, `audit_store.py`
3. **R2** — `backend/r2_client.py` + env vars
4. **PDF dashboard** — `backend/pdf_dashboard.py`
5. **Endpoints** — publicacoes, agendamentos, cron, audit_log, publico, compartilhados
6. **Rate limiting** — slowapi no `main.py`
7. **Vercel config** — adicionar cron ao `vercel.json`, rewrite para `/p/:token`
8. **Frontend — PublicoPage** — render público sem auth
9. **Frontend — CompartilhadosPage** — lista de dashboards internos
10. **Frontend — RelatoriosPage** — agendamentos e downloads
11. **Frontend — UI de publicação** — botão "Publicar" no DashboardBuilder
12. **Testes e smoke**

**Critérios de "release pronto":**
- [ ] Publicação gera token e link funcional sem login
- [ ] Revogação impede novos acessos
- [ ] Rate limit (60 req/min/IP) funcional
- [ ] Agendamento gera PDF e armazena no R2
- [ ] Download do PDF via proxy (URL R2 não exposta)
- [ ] Audit log registra publicação, revogação, download
- [ ] `/compartilhados` lista dashboards internos
- [ ] Smoke test do fluxo legado passa

---

## 7. Riscos arquiteturais e mitigações

| # | Risco | Impacto | Mitigação |
|---|---|---|---|
| R1 | **Bundle backend Vercel (> 225MB)** — adicionar boto3 + slowapi + parser próprio pode inflar o bundle | Deploy falha na Vercel | Medir bundle após cada release. boto3 é ~70MB (com botocore); avaliar `boto3-stubs` vs `boto3` puro. Se estourar, usar `urllib3` direto para R2 (API S3 é REST). slowapi é leve (~100KB). Parser próprio é zero deps. |
| R2 | **Bundle frontend (AG Grid + ECharts)** — AG Grid Community ~500KB min+gz, ECharts ~800KB min+gz | Carregamento inicial lento | Code splitting: carregar AG Grid apenas na DatasetsPage, ECharts apenas na DashboardBuilderPage. Lazy load via `React.lazy()`. Medir com `vite build --report`. |
| R3 | **Performance de agregação (100k linhas)** — Python puro é lento para GROUP BY sobre 100k registros | Timeout de 60s na Vercel | Usar SQL (`GROUP BY`) no Neon como padrão. Python puro apenas como fallback para < 1000 linhas ou campos calculados. Benchmark obrigatório no CI local. |
| R4 | **Segurança do parser de fórmulas** — parser próprio pode ter brechas não previstas | Execução de código arbitrário | Lista branca estrita (tokens, funções, operadores). Sem `eval`/`exec`. Testes de fuzzing (gerar fórmulas aleatórias e validar que nenhuma crasha ou executa código). Code review dedicado do parser. Limite de tamanho de fórmula (1000 chars) e profundidade de AST (100 níveis). |
| R5 | **Token público vazado** — link `/p/{token}` compartilhado em locais indevidos | Acesso não autorizado a dados | Token ≥ 32 chars (alta entropia). Rate limit 60 req/min/IP. Revogação manual disponível. Sem dados sensíveis por padrão (usuário escolhe o que publicar). |
| R6 | **Migração aditiva no boot** — `CREATE TABLE IF NOT EXISTS` de 9 tabelas novas no cold start | Cold start mais lento | DDL é leve (~5ms por tabela). Total estimado: ~50ms adicionais. Aceitável. Monitorar via `/api/health`. |
| R7 | **Concorrência de edição** — dois usuários abrem o mesmo dataset simultaneamente | Perda de dados (último a salvar ganha) | Comportamento documentado e aceito pelo usuário. Sem código de resolução de conflitos. Autosave com debounce 400ms reduz a janela de conflito. |
| R8 | **Vercel Cron (Hobby)** — plano Hobby permite apenas 1 cron/dia | Agendamentos "diários" podem não rodar na hora desejada | Documentar limitação. Se necessário, upgrade para Pro ($20/mês). Cron às 6h da manhã como padrão. |
| R9 | **Geração de PDF de dashboard** — ECharts é JS, não renderiza server-side sem headless browser | PDFs sem gráficos | Fase 1: PDFs tabulares via reportlab (dados em tabela). Fase 2 (se necessário): avaliar Playwright headless (impacto no bundle ~150MB — provavelmente inviável na Vercel). Alternativa: gerar imagens dos gráficos via API externa (ex: QuickChart.io). |
| R10 | **SQLite local com jsonb** — SQLite não tem tipo `jsonb` nativo; usa `TEXT` | Queries JSON no SQLite são mais lentas | Para dev, volume é baixo (< 1000 linhas). Aceitável. Se necessário, usar `json_extract()` do SQLite (suportado desde 3.38). |
| R11 | **Tema claro — retrabalho de CSS** — o CSS atual é 100% dark (768 linhas de `index.css`) | Esforço significativo para refatorar | Fazer na v4.0 (primeira release) para evitar retrabalho. Usar CSS variables (já existem) e adicionar conjunto claro. Componentes que usam cores inline (theme.ts) precisam ser atualizados. |
| R12 | **openpyxl para export XLSX de datasets grandes** — 100k linhas em openpyxl consome memória | OOM na Vercel (limite 1024MB RAM) | Usar `openpyxl` com `write_only=True` (modo streaming). Testar com 100k linhas e medir memória. |

---

## 8. Dependências externas e custos recorrentes

| Dependência | Tipo | Custo estimado mensal | Release | Notas |
|---|---|---|---|---|
| **Neon Postgres** | Banco (prod) | Free tier: 0.5GB storage, 190 compute hours. Plano Launch: $19/mês (8GB) | — | Já existente. Com 9 tabelas novas + 100k linhas/dataset, estimar ~2-5GB. Provavelmente precisa do plano Launch. |
| **Cloudflare R2** | Storage (PDFs) | $0.015/GB/mês storage + $0.36/mês por 1M operações. **Egress zero.** | v4.3 | Para ~100 PDFs de ~2MB cada = ~200MB = $0.003/mês. Praticamente gratuito. |
| **Vercel** | Deploy | Hobby: $0 (1 cron/dia, 100GB bandwidth). Pro: $20/mês (crons ilimitados, mais bandwidth) | — | Já existente. Se precisar de mais crons, upgrade para Pro. |
| **boto3** | SDK Python (R2) | $0 (open source) | v4.3 | Adicionar ao `requirements.txt`. Impacto no bundle: ~70MB. |
| **slowapi** | Rate limiting | $0 (open source, MIT) | v4.3 | Leve (~100KB). Depende de `limits` (~500KB). |
| **ag-grid-community** | Grid (frontend) | $0 (MIT) | v4.0 | Bundle ~500KB min+gz. |
| **echarts + echarts-for-react** | Gráficos (frontend) | $0 (Apache 2.0) | v4.1 | Bundle ~800KB min+gz (tree-shakeable — importar apenas tipos usados reduz para ~300KB). |
| **react-grid-layout** | Drag-and-drop (frontend) | $0 (MIT) | v4.1 | Bundle ~50KB min+gz. |

**Custo total estimado:** ~$19-39/mês (Neon Launch + Vercel Pro se necessário + R2 marginal).

---

## 9. Métricas de observabilidade

### 9.1 Logs estruturados (via `print` na Vercel → logs da função)

| Endpoint/evento | O que logar | Nível |
|---|---|---|
| Todos os endpoints | `method`, `path`, `status_code`, `duration_ms`, `user_id` | INFO |
| `POST /api/datasets/{did}/importar` | `dataset_id`, `num_linhas`, `formato`, `duration_ms` | INFO |
| `POST /api/datasets/{did}/rows` (bulk) | `dataset_id`, `num_linhas`, `duration_ms` | INFO |
| `POST /api/dashboards/{dbid}/widgets` | `dashboard_id`, `widget_type`, `dataset_id` | INFO |
| `POST /api/dashboards/{dbid}/publicar` | `dashboard_id`, `token_prefix` (8 chars), `user_id` | INFO |
| `DELETE /api/publicacoes/{pid}` | `publicacao_id`, `token_prefix`, `user_id` | INFO |
| `GET /p/{token}` | `token_prefix`, `ip`, `duration_ms` | INFO |
| `POST /api/cron/relatorios` | `num_agendamentos`, `sucessos`, `falhas`, `duration_ms` | INFO |
| `GET /api/relatorios/{rid}/download` | `relatorio_id`, `user_id`, `storage_key` | INFO |
| Erros do parser de fórmulas | `formula` (truncada), `erro`, `dataset_id` | WARNING |
| Falhas de upload R2 | `agendamento_id`, `erro`, `storage_key` | ERROR |
| Rate limit excedido | `ip`, `token_prefix`, `count` | WARNING |

### 9.2 Contadores (para dashboard de monitoramento futuro)

- `datasets_total` — número de datasets por projeto
- `dataset_rows_total` — número total de linhas por dataset
- `dashboards_total` — número de dashboards por projeto
- `widgets_total` — número de widgets por dashboard
- `publicacoes_ativas` — número de publicações não revogadas
- `relatorios_gerados` — contagem de relatórios gerados (sucesso/falha)
- `parser_errors_total` — contagem de erros do parser por tipo
- `r2_upload_errors_total` — contagem de falhas de upload ao R2
- `rate_limit_hits_total` — contagem de 429s por IP

### 9.3 Health check estendido

`GET /api/health` deve retornar:
```json
{
  "ok": true,
  "modo": "postgres",
  "versao": 4,
  "release": "4.0.0",
  "tabelas_v4": true,
  "r2_configurado": true
}
```

---

## 10. Critérios de "Pronto para v4.0"

Checklist objetivo para abrir a v4.0 para usuários:

### Backend
- [ ] Tabelas `datasets` e `dataset_rows` criadas no Neon (produção) via boot
- [ ] Tabelas `datasets` e `dataset_rows` criadas no SQLite (dev) via boot
- [ ] `datasets_store.py` com CRUD completo e testes
- [ ] `import_dataset.py` com parse CSV (BR + EN) e XLSX e testes
- [ ] `export_dataset.py` com geração CSV e XLSX e testes
- [ ] `routers/datasets.py` com todos os 9 endpoints funcionais
- [ ] Limite 100k linhas aplicado (400 com mensagem clara)
- [ ] Datasets read-only de locais/itens funcionais
- [ ] `pytest -q` verde: 18 existentes + ~15 novos = ~33 testes
- [ ] Bundle backend medido e < 225MB

### Frontend
- [ ] `ag-grid-community` + `ag-grid-react` instalados
- [ ] `DatasetsPage.tsx` funcional com AG Grid
- [ ] Paste do Excel (TSV) funcional
- [ ] Autosave ~400ms funcional
- [ ] Import CSV/XLSX via file input funcional
- [ ] Export CSV/XLSX via blob download funcional
- [ ] Navegação por teclado (Tab/Enter) no grid
- [ ] `ThemeProvider.tsx` funcional (claro/escuro/automático)
- [ ] Toggle de tema na AppShell
- [ ] CSS refatorado com variáveis de tema claro
- [ ] `npm run build` sem erros
- [ ] Novas rotas registradas em `App.tsx`

### Infraestrutura
- [ ] Deploy na Vercel bem-sucedido
- [ ] `/api/health` retorna `versao: 4`
- [ ] Smoke test do fluxo legado passa (criar projeto → planilha → dashboard → export PDF/xlsx)
- [ ] Smoke test do fluxo novo passa (criar dataset → importar CSV → editar → exportar)
- [ ] Tema claro/escuro/automático testado em todas as páginas

### Documentação
- [ ] `AGENTS.md` atualizado com estado v4.0
- [ ] `CLAUDE.md` atualizado com novos módulos
- [ ] `PROJECT_CONTEXT.md` atualizado com inventário v4.0

---

## 11. Inconsistências e perguntas em aberto

### 11.1 Inconsistências detectadas

| # | Inconsistência | Detalhes | Recomendação |
|---|---|---|---|
| I1 | **Endpoint de campos calculados** | A spec lista `POST /api/projetos/{id}/campos-calculados` mas a tabela `campos_calculados` referencia `dataset_id`, não `projeto_id`. | Usar `/api/datasets/{did}/campos-calculados` — campos calculados pertencem a um dataset, não a um projeto. |
| I2 | **boto3 "já presente"** | A spec (Seção 7, Rationale) diz "boto3 já presente no projeto" mas `boto3` **não** está no `requirements.txt` (nem raiz nem backend). | Adicionar `boto3` ao `requirements.txt` na v4.3. Medir impacto no bundle. |
| I3 | **slowapi não listado** | A spec menciona `slowapi` como dependência (EXT-009) mas não está no `requirements.txt`. | Adicionar `slowapi` ao `requirements.txt` na v4.3. |
| I4 | **Tema atual é apenas dark** | O `index.css` tem `color-scheme: dark` hardcoded no `:root` e 768 linhas de CSS dark-only. A spec pressupõe que adicionar tema claro é simples. | Refatorar significativa do CSS necessária. Fazer na v4.0 para evitar retrabalho. Estimar 2-3 dias de trabalho. |
| I5 | **Rota `/p/{token}` vs vercel.json** | O `vercel.json` atual tem rewrite `/:path*` → `index.html` (fallback SPA). A rota `/p/{token}` precisa ser servida pelo FastAPI, não pelo SPA. | Adicionar rewrite específico no `vercel.json`: `{"source": "/p/:token", "destination": "/api/index"}` **antes** do fallback SPA. |
| I6 | **Vercel Cron não configurado** | A spec menciona Vercel Cron Jobs (CON-004) mas o `vercel.json` atual não tem seção `crons`. | Adicionar na v4.3. Notar que plano Hobby permite apenas 1 cron/dia. |
| I7 | **`GET /api/dashboards/compartilhados` sem prefixo de projeto** | Este endpoint não segue o padrão `/api/projetos/{id}/...` dos demais. | Criar router independente (`routers/compartilhados.py`) registrado com `prefix="/api"` (sem prefixo de projeto). |
| I8 | **Datasets read-only de locais/itens** | A spec diz que locais/itens "ficam expostos como datasets read-only automáticos" mas não detalha o mecanismo. | Implementar como datasets virtuais no `datasets_store.listar_datasets()` (sem registro na tabela `datasets`). Quando um widget referencia um dataset virtual, o agregador consulta `locais`/`itens` diretamente. |
| I9 | **PDF de dashboard com gráficos ECharts** | ECharts é JavaScript client-side. Não é possível renderizar gráficos ECharts no backend Python para o PDF. | Fase 1: PDFs tabulares (dados em tabela via reportlab). Fase 2: avaliar alternativas (QuickChart.io, ou screenshot headless se o bundle permitir). |
| I10 | **`maxDuration` de 60s** | O `vercel.json` tem `maxDuration: 60`. Geração de PDF de dashboard complexo + upload R2 pode se aproximar desse limite. | Monitorar. Se necessário, aumentar para 120s (plano Pro permite até 300s). |

### 11.2 Perguntas em aberto

| # | Pergunta | Contexto | Impacto |
|---|---|---|---|
| P1 | O plano Neon atual suporta o volume esperado? | Com 9 tabelas novas e até 100k linhas/dataset, o storage pode crescer rápido. | Se o free tier (0.5GB) não bastar, preciso do plano Launch ($19/mês). |
| P2 | O Vercel Hobby é suficiente ou precisa do Pro? | Hobby: 1 cron/dia, 100GB bandwidth. Pro: crons ilimitados, 1TB bandwidth. | Se agendamentos forem diários e houver múltiplos usuários, Pro pode ser necessário ($20/mês). |
| P3 | Como lidar com datasets virtuais (locais/itens) em widgets? | Datasets virtuais não têm `id` na tabela `datasets`. O campo `dataset_id` em `widgets` é FK para `datasets(id)`. | Opção A: usar IDs negativos ou strings especiais (ex: `"locais-1"`) e tratar no agregador. Opção B: criar registros reais na tabela `datasets` com `fonte = "locais"` / `"itens"` no primeiro acesso. Recomendo Opção B (mais limpo). |
| P4 | O AG Grid Community suporta todas as funcionalidades desejadas? | A versão Community é MIT mas tem limitações vs Enterprise (ex: pivot nativo, group by). | Pivot table precisa ser implementada custom (PivotWidget.tsx) ou usar componente separado. AG Grid Community não tem pivot nativo. |
| P5 | Qual o tamanho máximo de um dataset para import XLSX? | openpyxl em memória pode consumir muita RAM para arquivos grandes. | Com `write_only=True` para export e leitura streaming para import, deve ser viável. Testar com 100k linhas. |
| P6 | A conta Cloudflare já existe? | R2 precisa de uma conta Cloudflare com bucket configurado. | Se não existir, criar e configurar bucket + access keys. Adicionar 4 env vars na Vercel. |

---

## Apêndice A: Árvore de arquivos novos por release

### v4.0
```
backend/
  datasets_store.py          (novo)
  import_dataset.py           (novo)
  export_dataset.py           (novo)
  routers/datasets.py         (novo)
  schema.sql                  (modificado: +2 tabelas)
  history.py                  (modificado: +2 tabelas SQLite)
  main.py                     (modificado: +1 router)
  tests/test_datasets.py      (novo)
  tests/test_import.py        (novo)
frontend/
  src/pages/DatasetsPage.tsx  (novo)
  src/components/ThemeProvider.tsx (novo)
  src/AppShell.tsx            (modificado: toggle tema + menu)
  src/App.tsx                 (modificado: +rotas)
  src/lib/types.ts            (modificado: +tipos Dataset)
  src/index.css               (modificado: tema claro)
  package.json                (modificado: +ag-grid)
```

### v4.1
```
backend/
  dashboards_store.py         (novo)
  agregador.py                (novo)
  routers/dashboards.py       (novo)
  schema.sql                  (modificado: +3 tabelas)
  history.py                  (modificado: +3 tabelas SQLite)
  main.py                     (modificado: +1 router)
  tests/test_dashboards.py    (novo)
  tests/test_agregador.py     (novo)
frontend/
  src/pages/DashboardBuilderPage.tsx (novo)
  src/components/widgets/     (novo: ~10 componentes)
  src/App.tsx                 (modificado: +rotas)
  src/lib/types.ts            (modificado: +tipos Dashboard/Widget)
  package.json                (modificado: +echarts, +react-grid-layout)
```

### v4.2
```
backend/
  formula_parser.py           (novo)
  routers/campos_calculados.py (novo)
  schema.sql                  (modificado: +1 tabela)
  history.py                  (modificado: +1 tabela SQLite)
  main.py                     (modificado: +1 router)
  tests/test_formula_parser.py (novo: ~30 testes)
  tests/test_campos_calculados.py (novo)
frontend/
  src/pages/DatasetsPage.tsx  (modificado: UI de campos calculados)
  src/components/widgets/     (modificado: drill-down)
```

### v4.3
```
backend/
  r2_client.py                (novo)
  pdf_dashboard.py            (novo)
  publicacoes_store.py        (novo)
  agendamentos_store.py       (novo)
  audit_store.py              (novo)
  routers/publicacoes.py      (novo)
  routers/agendamentos.py     (novo)
  routers/cron.py             (novo)
  routers/audit_log.py        (novo)
  routers/publico.py          (novo)
  routers/compartilhados.py   (novo)
  schema.sql                  (modificado: +4 tabelas)
  history.py                  (modificado: +4 tabelas SQLite)
  main.py                     (modificado: +6 routers, +slowapi)
  tests/test_publicacoes.py   (novo)
  tests/test_agendamentos.py  (novo)
  tests/test_r2.py            (novo, com mock)
  tests/test_audit.py         (novo)
frontend/
  src/pages/CompartilhadosPage.tsx (novo)
  src/pages/PublicoPage.tsx   (novo)
  src/pages/RelatoriosPage.tsx (novo)
  src/App.tsx                 (modificado: +rotas)
  src/lib/types.ts            (modificado: +tipos Publicacao/Agendamento)
vercel.json                   (modificado: +crons, +rewrite /p/:token)
requirements.txt              (modificado: +boto3, +slowapi)
```

---

## Apêndice B: Estimativa de esforço

| Release | Backend | Frontend | Testes | Total estimado |
|---|---|---|---|---|
| v4.0 | 5 dias | 5 dias | 2 dias | ~12 dias |
| v4.1 | 5 dias | 8 dias | 3 dias | ~16 dias |
| v4.2 | 5 dias | 3 dias | 3 dias | ~11 dias |
| v4.3 | 7 dias | 5 dias | 3 dias | ~15 dias |
| **Total** | **22 dias** | **21 dias** | **11 dias** | **~54 dias** |

*Estimativas em dias de trabalho dedicados. Overlap entre backend/frontend é possível.*

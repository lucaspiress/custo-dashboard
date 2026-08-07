# Custo Dashboard - Contexto do Projeto

Este arquivo é a referência operacional do projeto antes da migração para web.

## Localização

- Repositório: `C:\Users\assistentesolucoes\Desktop\custo-dashboard`
- Branch principal: `main`
- Aplicação atual: Streamlit local
- Banco local legado: SQLite em `data/historico.db`
- Banco web preparado: Neon PostgreSQL
- Entrypoint: `app.py`

## Inventário

### Aplicação

| Arquivo | Responsabilidade |
|---|---|
| `app.py` | Interface Streamlit, upload, seleção de snapshots, abas e download do PDF |
| `loader.py` | Leitura e validação do Excel, detecção de abas e normalização de itens |
| `analysis.py` | KPIs, composição, Pareto, anomalias e payback |
| `insights.py` | Regras de negócio e mensagens de análise em português |
| `charts.py` | Gráficos Plotly do dashboard web |
| `report.py` | PDF financeiro de seis páginas baseado no modelo visual aprovado |
| `history.py` | Persistência atual em SQLite; será substituído pela camada Postgres |
| `db.py` | Conexão Neon/Postgres, RLS, usuários, uploads e snapshots web |
| `auth.py` | Login fechado com PBKDF2 e sessão Streamlit |
| `schema.sql` | Schema idempotente do Postgres, índices e isolamento por usuário |
| `seed_admin.py` | Criação única do primeiro administrador |
| `migrar_sqlite.py` | Importação de planilhas existentes para o Postgres |
| `config.py` | Schema do template e constantes de negócio |
| `formatos.py` | Formatação de moeda e números em pt-BR |
| `theme.py` | Tokens visuais, cores, CSS e paleta de gráficos |

### Operação e testes

| Arquivo | Responsabilidade |
|---|---|
| `abrir-dashboard.bat` | Inicialização local do Streamlit |
| `requirements.txt` | Dependências Python da aplicação |
| `test_validate.py` | Validação headless das planilhas e do PDF |
| `teste_upload_browser.py` | Regressão do upload no navegador |
| `teste_visual_browser.py` | Regressão visual básica, snapshots e abas |
| `CLAUDE.md` | Convenções e comandos do projeto |
| `.streamlit/config.toml` | Tema e configuração local do Streamlit |
| `assets/rota_group_logo.png` | Logo usada no relatório |

### Arquivos locais que não entram no repositório

- `.venv/`: ambiente Python local
- `__pycache__/`: cache do Python
- `data/historico.db`: histórico local temporário
- Planilhas de entrada e PDFs de referência permanecem fora do repositório para não expor dados de negócio
- Connection strings, senhas e secrets nunca devem ser salvos neste arquivo ou no Git

## Estado atual

O fluxo local já suporta:

1. Upload de planilhas `.xlsx` no template padrão
2. Mais de um formato de aba de equipamento
3. Histórico local por snapshot
4. Dashboard com KPIs, custos, payback, insights e histórico
5. Exportação PDF com layout financeiro aprovado
6. Validação das planilhas base e Santa Rosa

## Migração web aprovada

```text
Navegador
  -> Streamlit Cloud
  -> Neon PostgreSQL
       -> usuarios
       -> uploads
       -> locais
       -> itens
```

### Regras de acesso

- Cadastro fechado
- Três administradores no máximo
- Administradores criam, ativam, desativam e redefinem usuários pelo próprio app
- Todos os usuários só enxergam seus próprios uploads e relatórios
- Usuários são desativados, não excluídos, para preservar histórico
- O login web usa formulário próprio; `st.login` não é usado porque a API nativa é OIDC-only

### Arquivos web adicionados

- `db.py`: conexão e operações Postgres por `user_id`
- `auth.py`: login fechado com formulário próprio, PBKDF2 e sessão
- `schema.sql`: criação idempotente do banco, índices e RLS
- `seed_admin.py`: criação única do primeiro administrador
- `migrar_sqlite.py`: importação de planilhas existentes para o usuário inicial

O schema Neon foi aplicado, o administrador principal foi criado e duas planilhas de referência foram importadas para a conta inicial. O deploy no Streamlit Cloud ainda é a próxima fase; a `DATABASE_URL` não está armazenada neste repositório.

## Cuidados de implementação

- Usar `psycopg` v3 e a `DATABASE_URL` somente por secret do ambiente
- Armazenar o arquivo original como `bytea` no Postgres ou em storage separado, conforme o limite de uso
- Manter o cálculo de valores derivados no código, sem confiar em cache de fórmulas do Excel
- Preservar o fallback de fonte do `report.py` para execução Linux no Streamlit Cloud
- Testar isolamento entre dois usuários antes do deploy público
- Não iniciar o deploy antes de validar schema, autenticação, migração e backup

# PRD — Custo Dashboard v3: Dados no Sistema

| | |
|---|---|
| **Versão** | 1.0 |
| **Data** | 10/08/2026 |
| **Autor** | ROTA · Desenvolvimento |
| **Status** | Aprovado para implementação |

## 1. Contexto e problema

O sistema atual recebe uma planilha .xlsx (template ROTA), analisa em memória, mostra o dashboard e permite exportar PDF e Power BI (.pbix). Problemas:

1. **A planilha é o motor**: qualquer correção exige editar o Excel e subir de novo.
2. **Dados não persistem**: atualizar a página apaga a análise.
3. **Um projeto por vez**: não há portfólio de clientes.
4. **Power BI sem uso real**: ninguém abre o .pbix; os gráficos do próprio sistema já cobrem a necessidade.

## 2. Objetivo

Transformar o sistema em uma plataforma onde cada cliente/projeto tem seus dados **salvos no sistema**, preenchidos em formulários estilo planilha (com colar do Excel), com gráficos automáticos e entregas (PDF + .xlsx preenchido) sob demanda — **sem Power BI**.

## 3. Personas

- **Consultor ROTA (admin)** — preenche/importa dados, revisa análises, entrega PDF/.xlsx ao cliente.
- **Usuário restrito** — visualiza projetos, gráficos e exporta PDF/.xlsx (acesso limitado ao sistema, dados compartilhados).

## 4. Escopo

### Inclui (v3)
- Múltiplos projetos (nome + cliente opcional)
- Persistência de locais e itens (Neon em produção, SQLite local)
- Preenchimento na tela espelhando o template (locais + itens por categoria)
- **Edição inline, navegação por teclado (Tab/Enter) e colar do Excel**
- Importação de .xlsx como atalho para criar projeto preenchido
- Dashboard com abas atuais alimentado pelos dados salvos
- Export planilha .xlsx preenchida (fiel ao template)
- Export PDF (inalterado)
- Remoção completa do Power BI

### Não inclui (backlog futuro — v4+)
- Histórico/versões mensais e comparativo temporal
- Permissões por cliente
- Comparativo entre projetos (portfólio)
- Alertas (payback acima do limite)
- Importação de planilha livre do cliente com mapeamento
- Atualização automática recorrente (email/Dropbox)

## 5. Requisitos funcionais

| # | Requisito | Critério de aceitação |
|---|---|---|
| RF-1 | Listar projetos | GET /api/projetos mostra nome, cliente, nº locais/itens e totais (receita, investimento, saldo) |
| RF-2 | Criar/renomear/excluir projeto | Exclusão remove locais e itens em cascata, com confirmação no front |
| RF-3 | Preencher locais na tela | 9 campos do template, edição inline, máscara R$, data opcional |
| RF-4 | Preencher itens por local | Categoria/código/material/qtd/valor unit; valor total calculado ao vivo |
| RF-5 | Colar do Excel | Bloco de células colado preenche várias linhas (locais e itens); formatos BR e EN de número |
| RF-6 | Autosave | Alteração por célula salva em ~400ms; erro mostra toast com retry; nada de botão salvar |
| RF-7 | Cálculos automáticos | Impostos 15%, saldos, investimento, payback, margem, fluxo 6/12/24/36 — mesmas regras de hoje, calculados da base salva |
| RF-8 | Dashboard por projeto | Abas Visão Geral/Custos/Payback/Insights/Comparativo com dados do projeto selecionado |
| RF-9 | Importar planilha | Upload .xlsx cria projeto novo preenchido (via loader atual), editável depois |
| RF-10 | Exportar planilha | GET planilha.xlsx gera o template preenchido (RELATORIO + abas por local) relido com openpyxl sem perda |
| RF-11 | Exportar PDF | Relatório do projeto salvo, mesmo layout atual |
| RF-12 | Autenticação | Todas as rotas novas exigem login; dados compartilhados entre usuários logados |
| RF-13 | Remover Power BI | Sem botão, rota, código ou dependência pbix-mcp |

## 6. Requisitos não funcionais

- **Performance**: payload do dashboard < 2s para até 20 locais; autosave invisível
- **Confiabilidade**: schema criado no boot, idempotente (Neon e SQLite); nenhuma migração de dados (nada persistido antes)
- **Bundle**: sem pandas; remoção do pbix-mcp reduz o bundle
- **Segurança**: sem credenciais no repo; sessão por cookie (existente)
- **UX**: preenchimento de 1 local (9 campos) ≤ 30s; colar de 20 linhas ≤ 5s

## 7. Métricas de sucesso

1. Projetos criados sem tocar em Excel (via formulário ou importação)
2. Correção de dados sem refazer arquivo
3. Entrega PDF/.xlsx em 1 clique a partir de dados salvos

## 8. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Formulário mais lento que Excel → não adoção | Edição inline, teclado, colar do Excel como requisito de aceitação (RF-5) |
| Export .xlsx diferente do template → atrito com cliente | Teste automatizado relê o export e confere colunas/valores |
| Escopo inflar | v4+ explicitamente fora de escopo; insights novos passam por aprovação |

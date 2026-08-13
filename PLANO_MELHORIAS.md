# Roadmap de Execução — Custo Dashboard

Atualizado em 13/08/2026.

## Estado atual

A v3 está em produção: projetos persistidos, planilha editável, importação do
template, dashboard, PDF, Excel e autenticação estão disponíveis. A base local
inclui autosave com retry, teste de interface e correção para locais sem itens.
As alterações locais ainda precisam ser revisadas, commitadas e publicadas antes
de serem consideradas entregues em produção.

## Fase 0 — Liberação segura

- Consolidar as alterações locais em um commit aprovado.
- Publicar e validar em produção: health, login, criação, importação, edição,
  PDF e Excel.
- Executar backup verificável do Neon antes de qualquer limpeza de tabelas
  legadas.

## Fase 1 — Experiência de preenchimento

- Importação de `.xlsx` por arrastar e soltar na lista de projetos.
- Skeletons nas páginas Projetos, Dashboard e Planilha.
- Revisão responsiva para celular e tablet.
- Expandir o teste Playwright para importação, colagem em massa, exportações e
  gerenciamento de usuários.

## Fase 2 — Relatórios

- Definir com o usuário os ajustes visuais e de conteúdo do PDF.
- Criar PDF consolidado por projeto, preservando o relatório detalhado por local.
- Incluir insights no Excel exportado.

## Fase 3 — Operação

- Health com versão, modo, conectividade e status do schema, sem expor segredos.
- Logs estruturados para erros de API e exportações.
- Rotina de backup e restauração do Neon documentada e testada.
- Remover tabelas legadas do Neon somente após backup aprovado.

## Fase 4 — Plataforma v4+

- Permissões por cliente/projeto.
- Histórico mensal e comparativo temporal.
- Comparativo de portfólio entre projetos.
- Alertas de payback.
- Importação de planilhas livres com mapeamento.
- Atualização recorrente por e-mail ou Dropbox.

## Critério de conclusão

Cada fase só é concluída com testes automatizados pertinentes, build de produção
e validação manual proporcional ao risco. Commit, push, deploy e operações no
Neon exigem solicitação explícita do usuário.

## Regras permanentes

1. Nunca acessar pastas da rede, especialmente soluções e licitações.
2. Não tocar no ROTACAD sem pedido explícito.
3. Não adicionar pandas ao backend.
4. Nunca versionar credenciais, `DATABASE_URL`, `SESSION_SECRET` ou senhas.

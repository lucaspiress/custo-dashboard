# Quickstart de validação — Redesign pós-login

Este é um guia de execução e validação, não um guia de implementação. Ele usa os comandos e dados locais já previstos no repositório. A validação formal é responsabilidade do orquestrador.

## Pré-requisitos

- Windows PowerShell, Node/npm e o ambiente Python existente em `.venv`.
- Dependências já instaladas no frontend e backend conforme `CLAUDE.md`.
- Nenhuma variável externa é necessária para o smoke local; o backend usa SQLite quando `DATABASE_URL` está vazio.
- Playwright/Chromium **não é instalado neste workflow**. O gate futuro está descrito ao final.

## Iniciar a aplicação local

Terminal 1 — FastAPI com SQLite:

```powershell
Set-Location "C:\Users\assistentesolucoes\Desktop\custo-dashboard\backend"
$env:DATABASE_URL=""
..\.venv\Scripts\python -m uvicorn main:app --port 8000
```

Terminal 2 — Vite:

```powershell
Set-Location "C:\Users\assistentesolucoes\Desktop\custo-dashboard\frontend"
npm run dev
```

Abra `http://localhost:5173` e use as credenciais locais documentadas em `AGENTS.md`/`CLAUDE.md` quando o banco local estiver sem outro seed.

## Checks automatizados existentes

Frontend (Vitest, mantido):

```powershell
Set-Location "C:\Users\assistentesolucoes\Desktop\custo-dashboard\frontend"
npm run test
```

Backend (baseline existente):

```powershell
Set-Location "C:\Users\assistentesolucoes\Desktop\custo-dashboard\backend"
$env:DATABASE_URL=""
..\.venv\Scripts\python -m pytest -q
```

## Cenários manuais de aceitação

1. **Contexto e redirects:** após login, abrir `/projetos`; criar ou importar um projeto e confirmar navegação para `/projetos/:id/dados`. Abrir `/projetos/:id`, `/projetos/:id/dashboard` e `/projetos/:id/planilha`; cada URL deve redirecionar para a área canônica equivalente conforme [contracts/routes.md](contracts/routes.md).
2. **Isolamento:** com dois projetos, abrir cada `/projetos/:id/visao-geral`, trocar entre `:id` e confirmar que nome, indicadores, filtros, tabelas, gráficos e estado de carregamento pertencem somente ao ID atual.
3. **Operação de custos:** em um projeto vazio, confirmar estado vazio orientativo; adicionar/editar um local e item ou usar a importação `.xlsx`; confirmar autosave, a resposta/status atual da operação e totais derivados sem alterar o segundo projeto. Não inferir nem validar aqui uma classificação por linha de aceitas, rejeitadas ou duplicadas, nem proteção contra numéricos inválidos normalizados; isso pertence à feature-pré-requisito de integridade de importação. O enhancement pendente/revertido de `PlanilhaPage.tsx` também não faz parte do aceite.
4. **Áreas existentes:** navegar por Visão geral, Custos, Payback, Insights, Comparativo, Dados, Datasets e Dashboards usando URLs canônicas; para um admin, abrir também o destino acessível `/projetos/:id/usuarios` e confirmar a preservação da capacidade existente de Usuários. Confirmar que cada área mantém o projeto ativo e que Datasets/Dashboards não são confundidos com a planilha ROTA. O isolamento completo de dez projetos segue o protocolo SC-001 acima.
5. **Filtros e ausência:** aplicar somente filtros de dimensões presentes no payload atual (por exemplo, categoria/local; período apenas quando existir); confirmar recorte visível, componentes afetados declarados na UI e estado explicativo sem resultado. Componentes pré-calculados só entram na verificação quando o contrato atual os declara afetados. Quando período, orçamento ou realizado não existir no payload atual, confirmar “indisponível”, nunca zero fabricado ou uma nova fonte.
6. **Entregas:** gerar PDF/XLSX existentes e, quando configurado/autorizado, abrir publicação, compartilhamento, relatório e agendamento. Confirmar projeto/recorte antes e estado após a ação. Não configurar R2, `CRON_SECRET` ou Vercel Cron neste smoke local.
7. **Acessibilidade/responsividade:** repetir o percurso em 1440×900, 1024×768 e 375×812; usar apenas teclado; verificar foco visível, nomes acessíveis, mensagens PT-BR e alternativa textual/tabela para gráficos essenciais.
8. **Falhas e autorização:** simular sessão expirada, projeto inexistente, erro de rede e usuário cliente sem vínculo. Confirmar recuperação segura, sem dados do projeto anterior ou detalhes internos.
9. **Login protegido:** confirmar que `frontend/src/pages/LoginPage.tsx` não foi alterado; login e contratos `/api/auth/login`, `/api/auth/logout` e `/api/auth/me` continuam funcionando.

## Protocolo de evidência para SC-001 — isolamento com dez projetos

**Setup determinístico:** use uma instância SQLite local isolada, sem dados de produção, e o fluxo/API já existente de projetos. Crie exatamente dez projetos nomeados `SC001-P01` a `SC001-P10`; registre os IDs retornados. Para cada projeto, crie pelo menos um local e um item com um marcador exclusivo (`SC001-P01-LOCAL`, `SC001-P01-ITEM`, e assim por diante) e valores sentinela diferentes. Quando a capacidade existente estiver disponível, crie também dataset/dashboard/publicação de fixture para o projeto. Não edite `backend/schema.sql` nem crie uma fonte de dados paralela.

**Execução:** autentique como usuário autorizado e, para cada ID registrado, abra todos os destinos aplicáveis abaixo. Após cada navegação, captura ou resposta, registre a URL, o ID/nome visível, o marcador sentinela esperado e a evidência. Teste também uma troca rápida entre dois IDs durante carregamento para garantir que nenhuma resposta antiga vence a rota atual.

| Projeto/ID | Destino/caso | Esperado | Observado | Passou? | Evidência (URL/captura/log) |
|---|---|---|---|---|---|
| `SC001-P01`…`P10` | `/projetos/:id/visao-geral` | ID/nome e dados do mesmo projeto |  | Sim/Não |  |
| `SC001-P01`…`P10` | `/projetos/:id/custos` | Composição/recorte do mesmo projeto |  | Sim/Não |  |
| `SC001-P01`…`P10` | `/projetos/:id/payback` | Fluxo/retorno do mesmo projeto, quando disponível |  | Sim/Não/N/A + motivo |  |
| `SC001-P01`…`P10` | `/projetos/:id/insights` | Insights e evidências do mesmo projeto |  | Sim/Não |  |
| `SC001-P01`…`P10` | `/projetos/:id/comparativo` | Comparação interna do mesmo projeto |  | Sim/Não |  |
| `SC001-P01`…`P10` | `/projetos/:id/dados` | Locais/itens e marcador do mesmo projeto |  | Sim/Não |  |
| `SC001-P01`…`P10` | `/projetos/:id/datasets` | Datasets do mesmo projeto |  | Sim/Não |  |
| `SC001-P01`…`P10` | `/projetos/:id/dashboards` | Dashboards/widgets do mesmo projeto |  | Sim/Não |  |
| `SC001-P01`…`P10` | `/projetos/:id/usuarios` (admin) | Destino Users acessível sem alterar ACL |  | Sim/Não/N/A + papel |  |
| `SC001-P01`…`P10` | `/projetos/:id`, `/projetos/:id/dashboard`, `/projetos/:id/planilha` | Redirect para o destino canônico correto, preservando ID |  | Sim/Não |  |
| aplicável | PDF/XLSX (`/api/projetos/:id/relatorio`, `/api/projetos/:id/planilha.xlsx`), publicação, compartilhamento, agendamento, `/relatorios` e `/compartilhados` | Projeto/recorte corretos e estado atual |  | Sim/Não/N/A + motivo |  |

**Evidência mínima:** uma captura da URL e do cabeçalho de projeto por caso, mais log/resposta da operação de entrega quando houver. Use os marcadores sentinela para detectar mistura mesmo quando nomes ou telas pareçam semelhantes.

**Pass rule:** 100% das células aplicáveis passam. Qualquer ID, nome, marcador, indicador, tabela, gráfico, filtro, redirect ou entrega de projeto incorreto é falha; um caso N/A só é válido com motivo registrado. A troca rápida durante carregamento também deve ter 100% de isolamento.

## Protocolos de evidência para SC-002, SC-004 e SC-005

Os protocolos abaixo medem apenas o escopo atual. Registre evidência em uma cópia desta tabela ou no relatório de validação do orquestrador; não use dados reais de clientes.

### SC-002 — conclusão do fluxo em até 5 minutos

**Amostra e setup:** 10 operadores de teste, um projeto vazio e um projeto com dados sintéticos, navegador moderno, sem treinamento individual além das instruções iniciais. Cronômetro começa ao abrir o ambiente autenticado e termina quando o operador chega à visão geral do projeto correto após criar/abrir e registrar/importar custos.

**Pass rule:** pelo menos 9 de 10 operadores concluem sem ajuda e em até 300 segundos. Ajuda, falha de ambiente e abandono devem ser registrados, não omitidos.

| Operador | Projeto/ID | Método (criar/abrir/importar) | Início UTC | Fim UTC | Segundos | Ajuda? | Chegou à visão correta? | Evidência |
|---|---|---|---|---:|---:|---|---|---|
| O-01 | `P-` |  |  |  |  | Não/Sim | Sim/Não | link/captura |
| O-02…O-10 |  |  |  |  |  |  |  |  |

### SC-004 — preservação de edição/importação no escopo atual

**Amostra e setup:** 20 alterações de custo e 5 importações suportadas, distribuídas entre pelo menos dois projetos sintéticos. Para cada caso, registre a requisição/resposta já existente, a mensagem/status exibida, o ID do projeto e o reflexo permitido no dashboard. Não marque como falha a ausência de classificação por linha: aceitas, rejeitadas, duplicadas e numéricos inválidos são N/A nesta feature e pertencem à pré-requisito separada.

**Pass rule:** 25/25 operações preservam o comportamento e contrato atuais, permanecem associadas ao projeto correto e não são apresentadas pela UI como garantia nova de integridade por linha.

| Caso | Projeto/ID | Tipo | Endpoint/fluxo atual | Status/resposta atual | Status exibido | Associação correta? | Garantia por linha | Evidência |
|---|---|---|---|---|---|---|---|---|
| E-01…E-20 | `P-` | edição |  |  |  | Sim/Não | N/A | log/captura |
| I-01…I-05 | `P-` | importação |  |  |  | Sim/Não | N/A | arquivo/resposta |

### SC-005 — filtros sobre dados analíticos existentes

**Amostra e setup:** 20 execuções de filtro em projeto(s) sintético(s), cobrindo individual e combinado somente para dimensões realmente fornecidas pelo payload atual. Inclua casos sem resultado e casos em que período, orçamento ou realizado não existe. Meça do momento em que os dados necessários estão disponíveis até os componentes declarados como afetados refletirem o recorte.

**Pass rule:** pelo menos 19 de 20 execuções atualizam os componentes declarados como afetados em até 2 segundos, sem carregar dados de outro projeto. KPIs ou gráficos pré-calculados só entram na medição se o contrato atual os declarar afetados. Toda dimensão ausente permanece explicitamente indisponível; não há ramo positivo de orçamento-versus-realizado sem bases atuais.

| Caso | Projeto/ID | Dimensão disponível? | Filtro/recorte | Início (ms) | Fim (ms) | Duração | Componentes coerentes? | Ausência explícita? | Evidência |
|---|---|---|---|---:|---:|---:|---|---|---|
| F-01…F-20 | `P-` | Sim/Não |  |  |  |  | Sim/Não | Sim/N/A | captura/log |

## Nota pós-feature não acionável: Playwright/Chromium

Após esta feature e mediante aprovação separada, uma iniciativa futura poderá instalar/configurar Playwright com Chromium em `frontend/package.json` e `frontend/playwright.config.ts`, com E2E em `frontend/e2e/project-isolation.spec.ts`. Essa iniciativa poderá:

1. iniciar o FastAPI local na porta 8000;
2. iniciar o Vite/proxy na porta 5173;
3. autenticar usando um usuário de fixture local, sem credenciais reais;
4. executar os cenários de redirects, isolamento, captura, filtro, entrega, estados e viewports acima;
5. falhar se uma resposta obsoleta, rota legada sem redirect, API incompatível ou alteração no login for detectada.

Nenhum comando de instalação, configuração ou execução do Playwright faz parte desta fase, e esta nota não é uma tarefa de implementação deste redesign.

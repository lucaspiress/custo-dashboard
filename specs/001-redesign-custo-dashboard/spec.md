# Feature Specification: Redesign do ambiente pós-login do Custo Dashboard

**Feature Branch**: `001-redesign-custo-dashboard`

**Created**: 2026-08-26

**Status**: Draft

**Input**: User description: "Manter somente o login como está e redesenhar todo o ambiente pós-login de um produto funcional de gestão de custos de licitações para que o operador preencha os dados e seu gestor receba um dashboard automático, sempre segmentado por projeto."

## Contexto e objetivo

O Custo Dashboard já é um produto funcional para gestão e análise de custos de licitações. Esta feature reorganiza e redesenha exclusivamente a experiência após a autenticação: o operador registra, edita ou importa os custos no sistema e o gestor acompanha resultados em dashboards e entregas automáticas, sempre dentro do contexto de um projeto.

Os documentos de referência foram consolidados assim: `AGENTS.md` define as regras permanentes e o inventário operacional; `docs/STATUS.md` representa o estado operacional mais recente (v4.3); `PRD_V3.md` e `SPEC_V3.md` registram as capacidades legadas de projetos, planilha, análise e exportação que devem continuar disponíveis; `DESIGN_SPEC.md` orienta a preservação do login e registra padrões de dashboard, sem autorizar alteração do login nesta feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegar com contexto de projeto (Priority: P1)

Ao entrar no ambiente autenticado, o operador ou gestor encontra uma navegação pós-login coerente, sabe em que área está e qual projeto está selecionado. Pode ir da lista de projetos para o preenchimento, dashboard, relatórios e demais capacidades disponíveis sem perder o contexto ou cair em uma tela sem orientação.

**Why this priority**: Contexto e navegação são a base para evitar lançamentos no projeto errado e para tornar utilizável todo o fluxo de custos e gestão.

**Independent Test**: Com pelo menos dois projetos, iniciar na área pós-login, abrir cada área disponível, trocar o projeto e voltar ao dashboard; em cada passo, verificar que o nome do projeto e a localização na navegação permanecem inequívocos.

**Acceptance Scenarios**:

1. **Given** que o usuário autenticado possui dois projetos, **When** abre o ambiente pós-login, **Then** vê a área inicial, a lista de projetos e uma ação clara para selecionar ou criar um projeto.
2. **Given** que um projeto está selecionado, **When** o usuário navega entre dados, dashboard e entregas, **Then** cada tela mostra o projeto ativo e oferece retorno previsível à área anterior ou à lista de projetos.
3. **Given** que o usuário tenta abrir uma área sem projeto selecionado, **When** confirma a ação, **Then** o sistema orienta a selecionar um projeto e não mistura dados de projetos diferentes.

---

### User Story 2 - Gerenciar projetos e seus custos (Priority: P1)

O operador cria ou administra um projeto e registra custos no sistema, usando as capacidades existentes de captura, edição, colagem/importação de planilha e cálculo. Ele consegue corrigir dados sem refazer todo o trabalho e identifica a situação do salvamento ou da validação.

**Why this priority**: A qualidade do dashboard depende de uma base de custos completa, corrigível e vinculada ao projeto correto.

**Independent Test**: Criar um projeto de teste, inserir e editar custos, usar uma importação suportada, revisar os dados e conferir que o dashboard do mesmo projeto reflete a alteração sem alterar outro projeto.

**Acceptance Scenarios**:

1. **Given** que o usuário está em um projeto vazio, **When** cadastra ou importa custos por uma capacidade já suportada, **Then** os registros aparecem associados somente àquele projeto e o sistema confirma o resultado ou informa as validações pendentes.
2. **Given** que existem custos registrados, **When** o operador edita um valor, quantidade, categoria ou dado equivalente já suportado, **Then** a alteração é indicada como salva ou pendente de salvamento, e os totais derivados são atualizados de forma consistente.
3. **Given** que uma importação é enviada, **When** o fluxo suportado responde, **Then** o ambiente preserva o comportamento e as mensagens atuais da operação, sem apresentar sucesso quando a API reportar falha. A integridade detalhada por linha (aceitas, rejeitadas, duplicadas e numéricos inválidos) é uma feature-pré-requisito separada e não é entregue por este redesign.

---

### User Story 3 - Acompanhar visão executiva por projeto (Priority: P1)

O gestor abre um projeto e recebe uma visão executiva automática dos custos, receitas, investimentos, saldos, retorno e demais indicadores já suportados, com período e data de atualização visíveis. A visão serve para decidir rapidamente se o projeto está dentro do esperado.

**Why this priority**: O valor central do produto é transformar os registros do operador em uma leitura gerencial confiável, sem exigir consolidação manual.

**Independent Test**: Usar um projeto com dados conhecidos, abrir sua visão executiva e comparar os indicadores exibidos com os valores de referência do projeto, alternando entre projetos para confirmar o isolamento.

**Acceptance Scenarios**:

1. **Given** que um projeto possui dados válidos, **When** o gestor abre a visão executiva, **Then** vê indicadores e resumo calculados exclusivamente a partir daquele projeto, com unidade, período e indicação de atualização.
2. **Given** que o projeto possui dados parciais, **When** o gestor consulta a visão executiva, **Then** o sistema diferencia zero, ausência e dado indisponível e não exibe uma conclusão enganosa.
3. **Given** que o usuário troca o projeto ativo, **When** a visão é carregada, **Then** todos os indicadores, gráficos, alertas e textos são substituídos pelo conjunto do novo projeto.

---

### User Story 4 - Analisar custos e variações (Priority: P2)

O gestor ou analista explora a composição dos custos por categoria, local, item e outras dimensões quando existirem no payload analítico atual, aplica filtros e consulta somente comparações já suportadas por essas bases. Período, orçamento ou realizado ausentes permanecem indisponíveis; nenhuma nova base é criada. Pode identificar variações, tendências e pontos de atenção sem sair do projeto.

**Why this priority**: A visão analítica explica o resumo executivo e permite agir sobre desvios, não apenas observar totais.

**Independent Test**: Em um projeto com dimensões disponíveis no payload atual, aplicar filtros individualmente e combinados, conferir os totais filtrados e verificar que período, orçamento ou realizado ausentes aparecem como indisponíveis, sem criar uma base comparável.

**Acceptance Scenarios**:

1. **Given** que o payload atual fornece uma categoria, local ou outra dimensão, **When** o usuário aplica um filtro nessa dimensão, **Then** somente os componentes explicitamente afetados mostram o recorte escolhido e os filtros ativos; componentes pré-calculados não são obrigados a atualizar.
2. **Given** que uma dimensão ou base comparável já é fornecida pelo payload analítico atual, **When** o usuário solicita a comparação, **Then** o sistema mostra somente os valores e a variação que esse payload já suporta, no mesmo recorte e sem criar uma nova base.
3. **Given** que período, orçamento, realizado ou outra base necessária não é fornecida pelo payload analítico atual, **When** o usuário consulta a comparação, **Then** o sistema informa que a comparação não está disponível, sem fabricar zero, estimativa ou uma nova fonte.
4. **Given** que um gráfico não possui dados no recorte, **When** o filtro é aplicado, **Then** o gráfico entra em estado vazio explicativo e os demais componentes continuam identificando o recorte.

---

### User Story 5 - Gerar, compartilhar e publicar entregas existentes (Priority: P2)

O gestor entrega a análise de um projeto por meio dos relatórios, exportações, compartilhamentos, publicações e agendamentos já disponíveis, quando aplicáveis. Cada entrega deixa claro o projeto e o período a que se refere, e o operador consegue confirmar seu estado.

**Why this priority**: Dashboards automáticos precisam ser consumíveis pelos gestores e auditáveis como entregas, sem reintroduzir consolidação manual.

**Independent Test**: A partir de um projeto com dados, gerar uma entrega existente, abrir ou baixar o resultado, publicar ou compartilhar quando autorizado e verificar projeto, período, filtros e estado informados.

**Acceptance Scenarios**:

1. **Given** que o usuário tem autorização e o projeto possui dados, **When** solicita um relatório ou exportação existente, **Then** recebe a entrega correspondente ao projeto e ao recorte visível, ou uma mensagem de erro acionável.
2. **Given** que a publicação ou compartilhamento está disponível para o usuário, **When** ele publica ou compartilha um dashboard, **Then** o sistema comunica o estado, as condições de acesso e o projeto publicado sem expor dados de outro projeto.
3. **Given** que uma entrega está em processamento, falha ou não pode ser acessada, **When** o usuário consulta seu estado, **Then** vê carregamento, erro ou sucesso claramente identificados e uma ação segura de tentar novamente quando aplicável.

---

### User Story 6 - Operar com segurança em qualquer estado (Priority: P1)

Operador e gestor conseguem usar o ambiente pós-login em desktop, tablet ou mobile, com teclado e tecnologias assistivas. O sistema comunica carregamento, vazio, erro, sucesso, privacidade e falta de permissão sem depender apenas de cor, animação ou conhecimento técnico.

**Why this priority**: Confiabilidade, acessibilidade e privacidade são necessárias para que decisões financeiras não dependam de uma condição específica de dispositivo ou de uma interpretação ambígua.

**Independent Test**: Percorrer o fluxo principal em larguras de desktop e mobile, apenas com teclado e com um leitor de tela, provocando dados vazios, carregamento, erro e falta de permissão; verificar que cada estado tem mensagem e ação compreensíveis.

**Acceptance Scenarios**:

1. **Given** que dados estão sendo buscados, **When** o usuário aguarda ou navega, **Then** os controles relevantes exibem carregamento sem sugerir que dados incompletos são finais.
2. **Given** que ocorre falha de rede, validação ou autorização, **When** o sistema recebe o erro, **Then** mostra uma mensagem em PT-BR, preserva o contexto seguro e oferece recuperação compatível com o caso.
3. **Given** que o usuário opera por teclado ou leitor de tela, **When** percorre navegação, filtros, tabelas, gráficos e ações, **Then** encontra foco visível, nomes acessíveis, ordem lógica e alternativa textual para informação essencial.
4. **Given** que o usuário abre uma tela em viewport estreito, **When** consulta ou edita dados, **Then** conteúdo, ações e mensagens permanecem utilizáveis sem perda silenciosa de informação ou ação essencial.
5. **Given** que o usuário não está autorizado a uma capacidade ou projeto, **When** tenta acessá-lo, **Then** o sistema nega o acesso sem revelar dados protegidos e explica o próximo passo permitido.

---

### Edge Cases

- Um projeto recém-criado sem custos deve ter estado vazio orientativo, sem gráficos ou totais que aparentem dados reais.
- Um projeto com apenas parte das dimensões disponíveis deve continuar analisável, indicando quais filtros, indicadores ou comparações não se aplicam.
- Valores nulos, zero, negativos permitidos pelas regras vigentes, unidades incompatíveis e arredondamentos devem ser distinguidos e apresentados de forma consistente.
- Uma edição ou importação interrompida não pode confirmar silenciosamente um valor que não foi persistido; o usuário deve saber o que precisa revisar ou reenviar.
- Uma mesma importação repetida deve seguir o comportamento já suportado e comunicar somente o resultado atualmente retornado, sem que o redesign prometa classificação ou deduplicação por linha.
- Trocar rapidamente entre projetos durante carregamentos não pode deixar dados do projeto anterior na tela como se fossem do novo projeto.
- Filtros sem resultados, períodos inválidos ou intervalos sem dados devem manter o projeto identificado e oferecer limpeza ou ajuste do filtro.
- Arredondamentos de moeda, percentuais e totais devem ser estáveis entre captura, dashboard e relatório.
- Falha ao gerar, publicar, compartilhar ou agendar uma entrega deve manter o dado original intacto e não criar um link apresentado como válido.
- Sessão expirada, acesso revogado e recurso inexistente devem ser tratados separadamente de erro temporário, sem vazar detalhes internos.
- Conteúdo extenso, muitas categorias, tabelas largas e gráficos densos devem continuar navegáveis em telas pequenas e com zoom.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST manter `frontend/src/pages/LoginPage.tsx` exatamente como está, incluindo aparência, comportamento, animações, assets e contratos de autenticação.
- **FR-002**: O sistema MUST apresentar, após login válido, uma navegação pós-login coerente em PT-BR, com área atual, projeto selecionado e retorno previsível para projetos.
- **FR-003**: O sistema MUST permitir listar e selecionar projetos existentes e oferecer as operações de projeto já suportadas, sem misturar dados entre projetos.
- **FR-004**: O sistema MUST manter a identificação do projeto ativo em toda captura de custos, edição, importação, dashboard, relatório, compartilhamento e publicação aplicáveis.
- **FR-005**: O sistema MUST preservar as capacidades existentes de captura, edição e importação de custos, incluindo seus fluxos suportados, validações, cálculos e mensagens de estado.
- **FR-006**: O sistema MUST preservar os estados e mensagens atualmente retornados para captura, edição e importação e MUST NOT apresentar a operação como concluída quando o contrato atual indicar falha. Garantias de integridade por linha — aceitas, rejeitadas, duplicadas ou numéricos inválidos — pertencem a uma feature-pré-requisito separada e não são requisito de entrega deste redesign.
- **FR-007**: O sistema MUST atualizar os totais e indicadores derivados a partir dos dados válidos do projeto, mantendo as regras de negócio existentes e sem criar uma fonte de cálculo paralela não rastreável.
- **FR-008**: O sistema MUST oferecer uma visão executiva automática por projeto com os indicadores, totais, alertas ou insights existentes aplicáveis, incluindo unidade, período e atualização quando disponíveis.
- **FR-009**: O sistema MUST oferecer uma visão analítica por projeto para detalhar custos por categorias e demais dimensões existentes, sem apresentar dimensões inexistentes como se fossem dados reais.
- **FR-010**: O sistema MUST permitir filtros somente em dimensões fornecidas pelo payload analítico atual, mostrar os filtros ativos e informar visualmente quais componentes cada filtro afeta. O requisito não inclui filtro global nem atualização de KPIs ou gráficos pré-calculados quando o contrato atual não a suporta.
- **FR-011**: O sistema MUST permitir consultar tendências, composição, tabelas e gráficos existentes aplicáveis ao projeto, com título, unidade, legenda ou alternativa textual suficiente para interpretação.
- **FR-012**: O sistema MUST expor somente comparações entre dimensões ou bases já suportadas pelo payload analítico atual, usando o mesmo recorte e as regras de cálculo existentes; MUST NOT adicionar uma ramificação positiva de orçamento versus realizado neste redesign.
- **FR-013**: O sistema MUST informar explicitamente quando orçamento, realizado, período, categoria ou outra dimensão necessária estiver ausente no payload atual, sem substituir ausência por zero, estimativa silenciosa ou nova fonte de dados.
- **FR-014**: O sistema MUST preservar e tornar acessíveis as capacidades existentes de dashboards, indicadores, gráficos, relatórios, exportações, compartilhamento, publicação e agendamento quando aplicáveis ao projeto e ao usuário.
- **FR-015**: O sistema MUST identificar em cada entrega o projeto, o período e o recorte de dados que originaram o conteúdo, quando esses dados existirem.
- **FR-016**: O sistema MUST comunicar estados de vazio, carregamento, sucesso, validação, erro temporário, erro permanente e falta de autorização em PT-BR, com ação de recuperação quando segura e aplicável.
- **FR-017**: O sistema MUST impedir que dados de um projeto anterior permaneçam apresentados como dados do projeto selecionado durante troca, recarregamento ou falha.
- **FR-018**: O sistema MUST respeitar autenticação, autorização e visibilidade existentes em consultas, ações, entregas, links publicados e mensagens de erro, sem ampliar exposição de dados.
- **FR-019**: O sistema MUST manter a funcionalidade utilizável em desktop, tablet e mobile, incluindo tabelas, filtros, gráficos, navegação, edição e ações essenciais.
- **FR-020**: O sistema MUST permitir operação por teclado com foco visível, ordem lógica, controles nomeados e sem depender exclusivamente de arrastar, apontar, cor ou animação.
- **FR-021**: O sistema MUST fornecer texto alternativo, resumo ou tabela equivalente para informação essencial comunicada somente por gráficos ou visualizações.
- **FR-022**: O sistema MUST preservar contratos de API, autenticação e modelo persistido existentes nesta fase e MUST reutilizar suas capacidades antes de introduzir qualquer alternativa.
- **FR-023**: O sistema MUST NOT remover uma capacidade existente sem substituição equivalente, critério de aceite e comunicação clara da mudança.
- **FR-024**: O escopo MUST NOT alterar o login, criar uma nova autenticação, alterar contratos de API, alterar o modelo persistido, criar comparativo entre projetos ou introduzir capacidades de backlog sem requisito aprovado para esta fase; também MUST NOT incluir a feature-pré-requisito de integridade detalhada por linha de importação.

### Key Entities

- **Projeto**: unidade obrigatória de contexto que reúne dados de custos, análises, dashboards e entregas; possui identificação e metadados já suportados.
- **Registro de custo**: valor ou conjunto de valores operacionais capturados, editados ou importados dentro de um projeto, com categoria, dimensão, período e origem quando disponíveis.
- **Categoria e dimensão de custo**: classificação existente usada para agrupar e filtrar registros, como local, item ou categoria de material quando suportada.
- **Período**: intervalo ou referência temporal usada para delimitar captura, análise, comparação e entrega.
- **Orçamento e realizado**: bases financeiras comparáveis quando existentes nos dados suportados; originam variações absolutas e percentuais sem substituir valores ausentes.
- **Indicador**: medida executiva ou analítica derivada dos dados válidos de um projeto, com unidade, recorte e estado de disponibilidade.
- **Dashboard**: visão configurada ou existente que reúne indicadores, tabelas, gráficos e filtros de um único projeto.
- **Relatório e exportação**: entrega derivada de um projeto e de um recorte identificável, incluindo formatos já suportados.
- **Publicação e compartilhamento**: forma autorizada de disponibilizar uma visão ou entrega, com projeto, acesso e estado explícitos.
- **Usuário e papel**: pessoa autenticada que opera, revisa, administra ou consome dados conforme as permissões existentes.

## Scope and Limits

### In scope

- Redesenho completo da experiência pós-login, incluindo navegação, projetos, custos, dashboards, análise, filtros, estados, relatórios e entregas existentes.
- Fluxo operador → dados persistidos → dashboard automático para gestor, sempre segmentado por projeto.
- Preservação e organização das capacidades já existentes de captura, edição, importação, cálculo, visualização, exportação, publicação, compartilhamento e agendamento, conforme aplicabilidade.
- Requisitos de responsividade, acessibilidade, privacidade, rastreabilidade e tratamento de estados.

### Out of scope

- Qualquer alteração visual, comportamental, de animação, de assets ou de contrato na tela de login.
- Alteração de autenticação, contratos de API ou modelo persistido nesta fase.
- Garantia nova de integridade por linha em importações (aceitas, rejeitadas, duplicadas ou numéricos inválidos); essa é uma feature-pré-requisito separada. Este redesign preserva o comportamento atual, sem prometer essa classificação.
- Remoção de capacidades existentes sem substituição equivalente.
- Comparativo entre projetos, permissões por projeto, histórico de versões, alertas novos, internacionalização além de PT-BR ou sincronizações externas, salvo quando já existentes e preservados.
- Nova fonte de período, orçamento ou realizado para ampliar a análise; registrar eventual evolução como nota não acionável de backlog, sem tarefa nesta feature.
- Decisões de implementação, escolha de bibliotecas, estrutura de componentes, desenho de banco ou formato de endpoint.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em um teste determinístico com pelo menos 10 projetos, 100% das telas pós-login e entregas avaliadas exibem o projeto correto, sem mistura de indicadores, filtros, tabelas ou gráficos entre projetos. O protocolo de fixtures, matriz, evidências e regra de aprovação está em `quickstart.md`.
- **SC-002**: Pelo menos 90% dos operadores de teste concluem criar ou abrir um projeto, registrar ou importar custos e chegar ao dashboard desse projeto sem ajuda e em até 5 minutos.
- **SC-003**: Em 100% dos casos avaliados com o payload analítico atual sem base de orçamento, o dashboard e a entrega mostram indisponibilidade explícita, sem zero, estimativa ou ramificação positiva de orçamento versus realizado; comparações permitidas continuam limitadas às bases atuais.
- **SC-004**: Em uma amostra de 20 alterações de custo e 5 importações suportadas, 100% das operações preservam o comportamento, o status e as mensagens do contrato atual, permanecem vinculadas ao projeto correto e não são representadas pela UI como uma garantia nova de integridade por linha. A classificação detalhada de linhas é N/A nesta feature e depende da feature-pré-requisito separada.
- **SC-005**: Em 95% dos testes de filtros sobre dimensões efetivamente fornecidas pelo payload analítico atual (por exemplo, categoria ou local; período somente quando existir), os componentes declarados como afetados atualizam para o recorte ativo sem recarregar dados de outro projeto e em até 2 segundos após os dados estarem disponíveis. KPIs ou gráficos pré-calculados só entram na medição quando o contrato atual os declara afetados; período ou orçamento ausentes permanecem explicitamente indisponíveis.
- **SC-006**: 100% dos fluxos avaliados possuem estados identificáveis de vazio, carregamento, erro e sucesso, com mensagem PT-BR e próximo passo quando aplicável.
- **SC-007**: Usuários de teste concluem o fluxo principal usando apenas teclado em 100% dos passos essenciais, com foco visível e sem perda de conteúdo; informação essencial de gráficos tem alternativa textual em 100% das telas avaliadas.
- **SC-008**: O fluxo principal permanece utilizável nos viewports de 1440×900, 1024×768 e 375×812, sem ocultar ação essencial, identidade do projeto ou mensagem de estado.
- **SC-009**: Nenhum cenário de teste de sessão expirada, falta de autorização, projeto inexistente ou link não autorizado revela dados de custo de outro projeto.
- **SC-010**: Todas as capacidades existentes cobertas pelo inventário de `docs/STATUS.md` e pelos fluxos legados de `PRD_V3.md`/`SPEC_V3.md` têm um cenário de preservação ou substituição equivalente antes da aprovação.

## Assumptions

- A autenticação e os usuários existentes continuam sendo a porta de entrada e a fonte de autorização do produto.
- Os contratos de backend, dados persistidos e capacidades disponíveis em produção são a fonte de verdade; a especificação não presume um novo armazenamento ou contrato.
- O comportamento de visibilidade atual entre usuários autenticados é preservado nesta fase; regras novas de acesso por projeto não fazem parte do escopo.
- O template de custos e os formatos de captura, edição, importação, exportação e cálculo já suportados continuam válidos e em PT-BR.
- A integridade detalhada por linha de importação não está disponível como garantia deste redesign; uma feature-pré-requisito futura deverá defini-la sem ser absorvida por esta implementação.
- Orçamento e realizado podem não estar presentes em todo conjunto de dados; nesses casos a ausência é um estado legítimo e deve ser comunicada.
- Usuários têm navegador moderno e conexão suficiente para carregar o produto, mas podem enfrentar indisponibilidade temporária, dispositivos móveis e uso assistivo.
- Compartilhamento, publicação, relatórios agendados e auditoria são mantidos quando já habilitados para o projeto e o papel do usuário; a feature não cria provedor, canal ou política nova.

## Dependencies

- Contratos e capacidades de backend existentes para projetos, custos, análises, dashboards, relatórios e publicações.
- Dados persistidos atuais e suas regras de cálculo e serialização.
- Regras permanentes, fluxos e critérios de preservação descritos em `AGENTS.md`, `PRD_V3.md`, `SPEC_V3.md` e `docs/STATUS.md`.
- A tela de login existente, que deve permanecer imutável conforme a constituição.
- Feature-pré-requisito separada para integridade de importação por linha; não bloquear o redesign com implementação ou mudança de contrato nesta fase.
- Eventual futura fonte de período/orçamento/realizado é apenas uma nota não acionável de backlog; não é dependência executável desta feature.

# Contrato visual e de UX — Custo Dashboard pós-login

**Feature:** `001-redesign-custo-dashboard`  
**Escopo:** ambiente autenticado, da primeira tela após o login até dados, análises e entregas.  
**Fora do escopo:** `frontend/src/pages/LoginPage.tsx`. O login deve permanecer byte a byte igual: layout, assets, animações, autenticação e contratos não são redesenhados.

> Este documento é um contrato de direção, não um convite a criar produto paralelo. A interface deve reorganizar e tornar legíveis capacidades já existentes, reutilizando API, persistência, cálculos, permissões e formatos atuais. A validação final do plano integrado cabe ao orquestrador.

## 1. Direção: “mesa de controle da proposta”

O produto deve parecer uma ferramenta de decisão para uma operação financeira real — não um template genérico de SaaS. A metáfora visual é uma **mesa de controle**: um canvas navy profundo, uma faixa lateral de instrumentos e superfícies que organizam evidência, alerta e ação.

- **Clima:** preciso, sóbrio e técnico; dados são o foco, não decoração.
- **Assinatura:** azul Rota para ação, ciano para dados vivos, âmbar para revisão/atenção. O âmbar é uma marca de inspeção, não um segundo CTA.
- **Composição:** rail persistente + barra de contexto + canvas arejado; no projeto, uma coluna estreita de recorte e uma área principal de leitura.
- **Profundidade:** superfícies quase pretas em camadas, linhas finas, pequenos marcadores de estado e uma textura/grid técnico muito discreto apenas no fundo. Sem glassmorphism, sombras pretas pesadas, gradientes em todos os cards ou ilustrações decorativas.
- **Personalidade:** números monoespaçados e alinhados, títulos Space Grotesk, labels operacionais em caixa alta; textos de orientação em IBM Plex Sans. O login não herda nenhuma mudança visual deste contrato.

### Princípios de decisão

1. **Projeto antes de tela:** todo dado, gráfico, filtro e entrega declara o projeto ativo.
2. **Evidência antes de conclusão:** ausência, zero, dado parcial e erro têm tratamentos diferentes.
3. **Resumo → explicação → origem:** KPI primeiro, composição/tendência depois, tabela e linha de origem por último.
4. **Ação no lugar da dúvida:** toda falha, vazio ou pendência informa o próximo passo seguro.
5. **Capacidade não desaparece:** uma ação pode mudar de lugar, mas deve ser encontrável e equivalente.
6. **Uma mão no teclado:** captura e exploração devem funcionar sem mouse, arraste ou cor isolada.

## 2. Arquitetura de informação

### Nível global (sem projeto selecionado)

| Área | Papel | Ações principais |
|---|---|---|
| **Projetos** | ponto de entrada e troca segura de contexto | buscar, criar, importar `.xlsx`, abrir dashboard/planilha, renomear e excluir conforme permissão |
| **Compartilhados** | dashboards internos disponíveis ao usuário autenticado | localizar por projeto, abrir visão publicada internamente |
| **Relatórios** | histórico de entregas geradas | filtrar a própria tabela por status já disponível, identificar publicação, baixar ou tentar novamente quando suportado |

O rail também pode oferecer **Ajuda/atalhos** apenas se já existir capacidade equivalente; não criar onboarding, alertas ou permissões novas nesta fase.

### Nível de projeto (contexto obrigatório)

Ao abrir um projeto, a navegação passa a ser contextual e mantém o ID do projeto na rota e na UI:

1. **Visão geral** — leitura executiva automática.
2. **Custos** — composição, filtros, tabela e drill-down já suportados.
3. **Payback** — retorno e fluxo 6/12/24/36 quando disponível.
4. **Insights** — regras existentes, com severidade e evidência.
5. **Comparativo** — comparação suportada dentro do próprio conjunto/recorte; nunca comparação entre projetos.
6. **Dados** — planilha ROTA editável, locais, itens, colagem/importação e autosave.
7. **Datasets** — datasets livres/read-only, importação/exportação, linhas e campos calculados existentes.
8. **Dashboards** — dashboards configuráveis, widgets, slicers, drill-down e publicação existentes.

**Entregas** (PDF, XLSX, publicação, compartilhamento e agendamento) aparecem como ações do projeto e também em **Relatórios**/**Compartilhados** globalmente. Nunca devem ser um “menu perdido” no topo sem projeto.

### Modelo mental de percurso

`Projetos → escolher projeto → Dados ou Visão geral → analisar recorte → Dashboard/entrega`

O seletor de projeto global não deve aparecer como filtro de dados. Trocar projeto é uma operação de contexto, com confirmação visual e limpeza de estado; período, local e categoria só são filtros de análise quando presentes no payload atual e sempre com escopo de componente declarado.

## 3. Jornadas essenciais

### 3.1 Gestor: “o que mudou e o que precisa de decisão?”

1. Após autenticar, chega a **Projetos**, com busca e cartões resumidos; se houver último projeto seguro, ele é sugerido, mas não substituído silenciosamente.
2. Seleciona um projeto. A barra de contexto mostra `Projeto / nome / Visão geral`, unidade quando existente, período quando disponível e “Atualizado em”.
3. Vê quatro KPIs principais e um bloco de “Leitura rápida”: tendência, variação e insights existentes.
4. Usa filtros somente nas dimensões presentes no payload atual; o recorte aparece em chips removíveis e cada filtro informa visualmente quais componentes ele afeta. Componentes pré-calculados não são obrigados a atualizar quando o contrato atual não oferece esse recálculo.
5. Abre um gráfico para detalhar custos; acessa a tabela equivalente quando precisa conferir origem.
6. Publica/compartilha um dashboard existente ou gera PDF/XLSX. Antes da ação, o resumo confirma projeto, período e filtros; depois, mostra estado e acesso.

**Critério:** em até 3 ações a partir de um projeto aberto, o gestor identifica total, recorte, atualização e próxima decisão; nenhum número pode parecer agregado de outro projeto.

### 3.2 Operador: “registrar sem perder o fio”

1. Em **Projetos**, cria projeto vazio ou importa o template `.xlsx`; o sistema encaminha para **Dados** e mostra o nome do projeto no cabeçalho.
2. Preenche locais e itens na grade, com edição inline, Tab/Enter, colar do Excel, formatos BR/EN e cálculo ao vivo já suportado.
3. O indicador de persistência acompanha cada alteração: `Salvo`, `Salvando…`, `Alteração pendente` ou `Não foi possível salvar — tentar novamente`.
4. O fluxo de importação preserva o feedback operacional já existente e não apresenta sucesso quando a API informa falha. Resumos por linha (aceitas, rejeitadas, duplicadas, preservação de válidas ou validação de numéricos) pertencem a uma feature-pré-requisito separada e não são prometidos aqui.
5. Abre **Visão geral** para conferir totais derivados e usa **Datasets** somente quando a operação exigir uma fonte livre ou campo calculado existente.
6. Entrega ou publica quando autorizado; a confirmação sempre preserva o projeto e o recorte.

**Critério:** criar/abrir, preencher ou importar e chegar ao dashboard sem voltar ao Excel e sem botão “Salvar” obrigatório. O autosave não pode confirmar o que falhou.

> **Limite explícito de importação:** este redesign preserva somente o feedback operacional de importação que já existe. A definição e implementação de resultados por linha e de validação numérica é uma feature-pré-requisito separada, não acionável neste escopo.

## 4. Shell pós-login

### Estrutura

- **Rail esquerdo desktop (232–256 px):** logo compacta Rota sem filtro, nome do produto, seletor de projeto e navegação agrupada em `Portfólio` e `Projeto atual`. O item ativo tem barra azul de 2 px e fundo azul translúcido; ícone nunca é a única pista.
- **Topbar (64 px):** breadcrumb (`Projetos / Projeto / Área`), título da área, status de sincronização, ações contextuais, notificações existentes e avatar/nome/sair.
- **Canvas:** largura máxima de 1360 px, padding lateral 32 px em desktop, 24 px em tablet e 16 px em mobile. Grid de 12 colunas desktop; módulos sempre alinham pelas bordas.
- **Barra de contexto do projeto:** faixa persistente abaixo da topbar no nível de projeto, com marcador ciano, nome completo, cliente quando houver, seletor acessível e link “Todos os projetos”. Deve permanecer visível em Dados, Datasets, Dashboards e entregas do projeto.

### Regras de navegação

- O rail não muda de ordem entre páginas. `Dados`, `Datasets` e `Dashboards` são claramente distintos.
- No mobile, o rail vira drawer acionado por botão “Abrir navegação”; o nome do projeto permanece fixo na topbar. Ao navegar, o drawer fecha e devolve foco ao título.
- Breadcrumb é navegável, com a página atual como texto, não link.
- Ações destrutivas ficam em menu secundário, usam confirmação explícita e nomeiam projeto/dataset.
- Se uma URL de projeto não carregar, mostrar o identificador seguro e motivo acionável; não mostrar dados antigos enquanto carrega.
- O shell deve suportar páginas legadas existentes sem esconder PDF, XLSX, publicação, compartilhamento, agendamento ou Usuários para admin.

## 5. Tela Projetos

Cabeçalho com `Seus projetos`, contagem, busca “Buscar projetos ou clientes…” e dois caminhos de entrada: **Novo projeto** (primário) e **Importar planilha** (secundário). A área de arrastar `.xlsx` é um convite auxiliar, nunca a única maneira de importar.

Cada projeto é um cartão de trabalho, não apenas um bloco decorativo:

- nome e cliente; data de criação/atualização quando existente;
- status de dados: `Sem dados`, `Em revisão`, `Pronto para análise` (somente quando houver evidência disponível);
- `locais`, `itens`, investimento, saldo mensal — números tabulares;
- ação primária **Abrir visão geral**; ações secundárias **Abrir dados**, editar nome, excluir;
- nenhum cartão compara projetos entre si: KPIs do topo de portfólio são apenas contagem/soma já suportada e devem ser rotulados como visão administrativa, não análise comparativa.

Vazio inicial: explicar “Crie um projeto vazio ou importe o template ROTA” e oferecer as duas ações. Busca sem resultado preserva o termo e oferece limpar. Leitura restrita oculta ações não autorizadas, não as deixa aparentes e desabilitadas sem explicação.

## 6. Dashboard principal do projeto

### Cabeçalho e filtros

O título deve ser o nome do projeto, não o nome técnico do arquivo. Abaixo: cliente, unidade (se houver), período do recorte quando disponível, data/hora de atualização e estado dos dados. Ações agrupadas:

- **Editar dados** (operador autorizado);
- **Exportar XLSX** e **Gerar PDF**;
- **Compartilhar/Publicar** e **Agendar** somente quando já habilitados;
- **Abrir dashboards** para configurações/widgets existentes.

Filtros ficam em uma barra horizontal somente para `Período`, `Local`, `Categoria` e demais dimensões efetivamente disponíveis no payload atual. Filtros indisponíveis não são inventados: mostram “não disponível neste projeto”. Chips ativos mostram valor e botão de remoção; “Limpar filtros” aparece a partir de um filtro. Cada filtro declara na própria UI os componentes afetados (por exemplo, uma tabela ou gráfico de custos); não há promessa de filtro global nem de atualização de KPIs/gráficos pré-calculados quando o contrato atual não a suporta. Análises filtradas no servidor são uma feature futura/pré-requisito não acionável.

### Ordem de conteúdo da Visão geral

1. **Faixa de confiança:** `Dados válidos`, `Dados parciais`, `Atualizando` ou `Atenção necessária`, com explicação curta.
2. **KPIs:** Receita mensal/anual, Saldo mensal, Investimento, Tempo de retorno; usar somente indicadores existentes/aplicáveis. Cada card traz valor, unidade, recorte, status e nota de cálculo quando relevante.
3. **Tendência e composição:** gráfico de fluxo/retorno ao lado de composição por categoria/local, com título, unidade e período explícitos.
4. **Bases comparáveis:** exibir somente comparações que o payload atual já suporte, no mesmo recorte e com os componentes afetados identificados. Como o payload atual não fornece base de orçamento, orçamento versus realizado permanece “Comparação indisponível — não há orçamento registrado”; não criar ramo positivo, zero ou estimativa.
5. **Pontos de atenção:** insights existentes ordenados por severidade e evidência; não criar alerta novo.
6. **Detalhe verificável:** tabela resumida com total por local/categoria e link para custos/dataset de origem.

Os cards não devem ser uma parede de caixas iguais. KPIs têm borda inferior funcional; gráficos têm mais altura e respiro; insights usam uma faixa lateral de severidade. Um único módulo pode ocupar duas colunas para criar ritmo visual.

## 7. Dados, planilha e captura de custos

### Planilha ROTA

- Manter a sensação de grade operacional: cabeçalho congelado, primeira coluna identificadora, totais legíveis, seleção visível e rolagem horizontal controlada.
- Separar visualmente `Locais` e `Itens por local`, com expansão do local sem perder o cabeçalho.
- Campos editáveis parecem células; campos calculados são identificados como derivados e não fingem ser editáveis.
- Colar bloco do Excel preserva a prévia/resultado e o feedback operacional já suportados, sem modal que cubra a grade inteira. Não prometer resumo por linha ou detecção de coerção numérica silenciosa nesta feature.
- No topo: projeto, contador de linhas/locais, `Salvo`/`Salvando…`, desfazer somente se já existir suporte, e retorno para dashboard.
- Totais de receita, investimento e saldo ficam em uma faixa fixa/visível durante edição, sempre marcados como “calculados”.

### Datasets

Datasets são uma segunda camada de dados, não substituto silencioso da planilha ROTA. A tela usa lista lateral de datasets e canvas de grade. Cada item informa nome, fonte (`Livre`/`Somente leitura`) e linhas. Ações existentes permanecem visíveis: importar CSV/XLSX, exportar CSV/XLSX, adicionar linha, excluir, renomear e campos calculados quando autorizado. O feedback de importação continua limitado ao contrato operacional atual; integridade por linha é a feature-pré-requisito separada.

- Dataset read-only tem badge âmbar e campos claramente não editáveis.
- O estado vazio orienta “Crie um dataset” e explica a diferença para a planilha do projeto.
- Fórmulas exibem nome e expressão em mono; erros de fórmula ficam na própria linha e em resumo textual.

## 8. Insights, análise e relatórios

### Insights

Cada insight existente usa uma faixa de cor + rótulo textual (`OK`, `Atenção`, `Alerta`, `Dica`), título, evidência numérica e ação de investigação (`Ver custos`, quando suportado). Não ordenar apenas por cor: severidade escrita e ícone com nome acessível são obrigatórios. Ausência de dados vira “Não há evidência suficiente”, não “OK”.

### Dashboards configuráveis

O construtor preserva widgets, ECharts, slicers, campos calculados, drill-down e publicação. A experiência segue `Biblioteca de dashboards → editar dashboard → visualizar → publicar`, com o projeto fixo no cabeçalho. O modo edição distingue arrastar/reordenar de leitura; no teclado, cada widget tem ações equivalentes de mover/configurar ou uma lista ordenada alternativa.

Publicação e compartilhamento mostram antes de confirmar: nome do dashboard, projeto, período/recorte quando disponível, visibilidade (`Interno`/externo quando existente), validade e estado. Dimensão ausente é indicada como indisponível, não preenchida por estimativa. Um link só aparece como válido após sucesso.

### Relatórios e entregas

Relatórios globais usam tabela responsiva com **projeto**, data, publicação/origem, recorte quando disponível, tamanho e status. A tela do projeto oferece o mesmo fluxo em contexto. Status são texto + sinal visual: `Em processamento`, `Gerado`, `Falhou`, `Sem acesso`.

Erro de PDF/XLSX/publicação/agendamento mantém o dado original, informa o que falhou e oferece `Tentar novamente` quando seguro. O download confirma formato e projeto no nome/feedback, sem alegar sucesso antes do blob chegar.

## 9. Gráficos, tabelas e filtros

- **Gráficos:** fundo de superfície, gridlines discretas, uma cor principal azul/ciano e cores semânticas para variação; evitar arco/pizza para muitas categorias. Tooltip mostra valor formatado, unidade, período quando disponível e origem do recorte.
- **Linha/área:** tendências e fluxo temporal; zero é linha real, nulo é lacuna. Não conectar pontos ausentes.
- **Barras:** composição por categoria/local e comparações somente entre bases atuais; orçamento versus realizado permanece indisponível quando essa base não existir no payload. Ordenar por valor e informar “demais” somente se o backend já agrupar.
- **Dispersão:** só usar quando houver duas dimensões reais; legenda e tabela equivalente obrigatórias.
- **Tabelas:** cabeçalho persistente, alinhamento numérico à direita, unidade no cabeçalho, separadores finos, hover não essencial, ordenação anunciada e paginação/rolagem sem prender a página. Em filtros, a tabela deve indicar explicitamente que é um componente afetado ou não afetado.
- Todo gráfico tem título descritivo, legenda próxima, resumo textual (“maior categoria…”) e botão/aba “Ver dados” quando a informação for essencial.
- Valores: `R$ 18.733,68`, percentuais com regra estável existente, negativos com sinal e zeros como `R$ 0,00`. Nulo/indisponível usa `—` com explicação; nunca converter ausência em zero.

## 10. Estados de interface

Todos os estados devem ser localizados em PT-BR e conter uma ação ou motivo quando aplicável.

| Estado | Tratamento visual e texto | Ação |
|---|---|---|
| Carregando | skeleton da mesma geometria; cabeçalho mantém projeto, conteúdo antigo é removido ao trocar ID | aguardar; não anunciar totais finais |
| Vazio | ícone linear simples, título orientativo, explicação e CTA contextual | criar/importar/preencher/limpar filtro |
| Sem resultado | recorte e projeto continuam visíveis; dizer qual filtro zerou | remover filtro ou ajustar período |
| Sucesso | confirmação curta próxima à ação + `aria-live`; não bloquear fluxo | continuar/abrir entrega |
| Pendente | âmbar discreto, `Alteração pendente` ou `Processando`; nada é apresentado como concluído | aguardar, revisar ou tentar novamente |
| Validação | feedback operacional atual próximo ao campo/operação; não prometer aceitas/rejeitadas/duplicadas por linha nem preservação de válidas | corrigir/reenviar conforme o contrato atual |
| Erro temporário | faixa de erro sem apagar contexto seguro | tentar novamente |
| Erro permanente/permissão | mensagem sem detalhes internos ou dados protegidos | voltar, pedir acesso ou escolher projeto permitido |
| Sessão expirada | informar expiração e encaminhar ao fluxo de autenticação existente | autenticar novamente |

Troca rápida entre projetos cancela/ignora respostas obsoletas. Enquanto o novo conjunto carrega, o canvas mostra skeleton com o novo nome, nunca o dashboard anterior.

## 11. Tokens e regras visuais

### Cores funcionais

| Token | Valor | Uso |
|---|---|---|
| `canvas` | `#121622` | fundo pós-login |
| `canvas-deep` | `#0C111C` | rail e faixas profundas |
| `surface` | `#181F32` | cards, tabelas e painéis |
| `surface-raised` | `#222B45` | hover, input e controles elevados |
| `border` | `#1F2740` | divisores e contornos |
| `text-primary` | `#F5F7FC` | títulos, números e ações principais |
| `text-secondary` | `#8FA3C7` | apoio, metadados e labels |
| `action-blue` | `#2E59F6` | CTA e seleção ativa |
| `data-cyan` | `#18D6EC` | dado, atualização, equipamento |
| `review-amber` | `#E07B1A` | atenção, parcial, read-only |
| `success` | `#10B981` | salvo, gerado, positivo |
| `danger` | `#EF4444` | erro e exclusão |

Gradiente azul→teal fica reservado a CTA principal ou faixa de destaque. Não usar branco puro dominante, não usar cor como única codificação e não introduzir tema claro nesta fase.

### Tipografia, forma e ritmo

- `Space Grotesk` para títulos 22–28 px e números de destaque; `IBM Plex Sans` para interface 13–15 px; `IBM Plex Mono` para moeda, datas técnicas, fórmulas e status operacionais.
- Corpo mínimo 13 px; texto auxiliar nunca abaixo de 12 px. Line-height 1.4–1.6 para leitura.
- Escala de espaçamento 4/8/12/16/24/32/48 px. Cards 12–14 px de raio; controles 6–8 px; evitar pills exceto status/badges.
- Foco visível de 2 px azul/ciano com offset de 2 px. Área de toque mínima 44×44 px.
- Elevação por diferença tonal e sombra azul-marinho translúcida. Bordas e alinhamento devem fazer o trabalho pesado.

## 12. Responsividade

| Viewport | Regra |
|---|---|
| 1440×900 | rail aberto, grid de 12 colunas, KPIs em 4, gráficos 2/3 + 1/3, tabela completa |
| 1024×768 | rail 208 px, grid de 8, KPIs em 2×2, filtros podem quebrar em duas linhas |
| 375×812 | drawer, topbar compacta, KPIs em coluna/2 colunas conforme largura, ações em menu ou stack; projeto e estado nunca somem |

No mobile, gráficos podem rolar horizontalmente dentro de uma região anunciada, mas a leitura essencial fica em resumo/tabela. Tabelas largas não devem encolher números até ilegibilidade: usar colunas prioritárias + expansão de linha ou rolagem com cabeçalho. A planilha mantém edição, colagem e autosave; não trocar por cards que removam campos.

Zoom de 200% e orientação horizontal não podem ocultar CTA, projeto, mensagem de estado ou foco. Nada essencial depende de hover.

## 13. Acessibilidade e privacidade

- Landmarks: `header`, `nav`, `main`, `aside` e headings em ordem única; título da página atualizado ao trocar área/projeto.
- Toda ação tem nome em PT-BR; ícones decorativos têm `aria-hidden`; ícones acionáveis têm label.
- Foco segue a ordem visual, retorna ao gatilho após modal e nunca fica invisível em drawer/grade.
- Filtros usam `label`, estado selecionado e anúncio de atualização; chips removíveis informam filtro e valor.
- Tabelas têm caption/headers; células editáveis anunciam linha, coluna, valor anterior/novo e estado do autosave.
- Gráficos têm resumo textual e equivalente tabular; não depender de cor, tooltip ou movimento.
- Erros são associados aos campos, anunciados por `aria-live` sem roubar foco indevidamente; mensagens não expõem stack trace, IDs internos ou dados de outro projeto.
- Contraste mínimo WCAG AA para texto e controles; foco não pode ser confundido com estado de erro.
- `prefers-reduced-motion: reduce` desliga shimmer, transições não essenciais e animações decorativas. Nenhum efeito contínuo é requisito de compreensão.
- Permissões atuais são mantidas: ocultar ou negar ações conforme papel, sem sugerir acesso a projetos não autorizados; links públicos só exibem o conteúdo publicado já autorizado.

## 14. Critérios verificáveis de aceite visual/UX

1. Em 10 projetos, toda tela pós-login e toda entrega avaliada mostram nome/ID do projeto correto; troca de projeto limpa widgets, filtros, tabelas e gráficos antigos. O protocolo determinístico e a matriz de evidências estão em `quickstart.md`.
2. Em 1440×900, 1024×768 e 375×812, o usuário encontra Projetos, projeto ativo, área atual, CTA principal e estado de dados sem rolagem horizontal da página.
3. Gestor conclui abrir projeto → aplicar filtro em um componente explicitamente afetado → interpretar a informação desse componente → gerar entrega, com projeto, período e recorte confirmados quando disponíveis.
4. Operador conclui criar/importar → editar/colar → observar autosave → receber o feedback operacional atual → abrir dashboard; esta feature não promete integridade por linha de importação.
5. Quando orçamento, período ou outra base não existe no payload atual, 100% das telas de comparação mostram indisponibilidade explícita; nenhum zero, estimativa ou ramo positivo novo é fabricado.
6. Cada gráfico essencial tem título, unidade, legenda, resumo textual e alternativa tabular; tabelas distinguem zero, nulo e indisponível.
7. Vazio, carregamento, sucesso, pendência, validação, erro temporário, erro permanente, falta de acesso e sessão expirada possuem mensagem PT-BR e próximo passo seguro.
8. O fluxo principal funciona apenas com teclado: navegação, seletor de projeto, filtros, grade, modal, exportação e publicação; foco visível em 100% dos passos.
9. Todas as capacidades inventariadas — planilha, datasets, dashboards/widgets, insights, payback, relatórios PDF, exportações XLSX/CSV, compartilhamento, publicação, agendamento e usuários admin — têm destino visível e equivalente, sem alterar seus contratos.
10. `LoginPage.tsx` não é tocado e nenhum token, shell ou padrão deste documento é aplicado à tela de login.

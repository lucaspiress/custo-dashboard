# Design Spec — Login Custo Dashboard

Status: análise concluída; nenhum arquivo de código foi alterado.
Data: 08/08/2026
Escopo: tela de login dark-only, inspirada no Meridian e na identidade Rota Group.

## Referências analisadas

| Arquivo | Dimensão | Leitura principal |
|---|---:|---|
| `Captura de tela 2026-08-08 081212.png` | 1916 x 874 | Login Rota 360: composição dividida, narrativa de marca à esquerda e formulário à direita. |
| `Captura de tela 2026-07-16 113304.png` | 1439 x 734 | Rota CAD: topbar operacional, rail lateral, canvas central e inspector lateral. |
| `WhatsApp Image 2026-08-08 at 08.13.21.jpeg` | 1354 x 637 | Dashboard Rota 360: sidebar fixa, topbar, cards de resumo e navegação por áreas. |
| `Finance Dashboard UI Concept.jpg` | 736 x 552 | Referência de dashboard financeiro escuro, denso e orientado a gráficos. |
| `Financial Investment Dashboard.jpg` | 736 x 552 | Referência de painel financeiro em navy profundo com superfícies discretas. |
| `X-Rii Dashboard Template for Building Professional Admin & Analytics Interfaces 📊.jpg` | 735 x 525 | Referência de organização admin: navegação persistente, topbar e grid de dados. |

As cores dominantes foram extraídas por amostragem de pixels quantizados. As medidas de layout abaixo são aproximações geométricas das capturas e devem ser ajustadas visualmente na implementação.

## Layout do login

### Composição principal

- Página inteira em tema escuro, sem modo claro e sem toggle.
- Header operacional horizontal com aproximadamente 60–68 px de altura.
- Corpo em duas colunas, com painel visual à esquerda e autenticação à direita.
- A captura do Rota 360 usa aproximadamente 66% para a área de marca e 34% para o formulário.
- O Meridian usa `grid-template-columns: 1.15fr 1fr`; esta é a base recomendada para o login replicado, preservando largura confortável para o card de autenticação.
- Breakpoint principal em 900 px: as colunas viram uma pilha vertical; telemetria e caption podem ser ocultadas em telas pequenas.
- O card de login deve ter largura máxima de aproximadamente 380–420 px e padding horizontal entre 28–64 px conforme o viewport.

### Header operacional

- Lado esquerdo: `ROTA GROUP // CUSTO DASHBOARD`, em caixa alta, fonte mono, 11–12 px, tracking amplo.
- Lado direito: status, operador quando autenticado e relógio UTC.
- Status recomendado: ponto ciano pulsante + `SISTEMA ESTÁVEL`.
- Divisor inferior de 1 px com baixa opacidade; não usar sombra pesada.
- O relógio deve usar números tabulares e atualizar a cada segundo.

### Painel visual esquerdo

- Fundo mais profundo que o restante da página, com grid técnico sutil ou textura de linhas finas.
- Quatro corner brackets pequenos, um em cada canto, como no Meridian.
- Starfield discreto com 40–50 pontos pequenos e opacidades diferentes.
- No centro, substituir o sonar/dial por um **logo lockup Rota**:
  - usar `LOGOPRINCE.png` como wordmark horizontal;
  - usar `ICON ATALHO.png` como marca central ou watermark orbital;
  - nunca aplicar `filter: brightness(0) invert(1)`;
  - preservar as cores azul/teal originais;
  - colocar a logo dentro de um container responsivo de aproximadamente 280–420 px de largura;
  - compensar a transparência interna do PNG para que a marca não pareça pequena.
- O lockup deve manter o tilt 3D do Meridian, limitado a aproximadamente 10–14 graus, acompanhando o ponteiro do mouse.
- O efeito de respiração deve ser sutil: escala máxima de 1.015 e opacidade/glow controlados.
- Telemetria decorativa nos cantos:
  - superior esquerdo: `LAT`, `LON` ou dados equivalentes do sistema;
  - inferior direito: `HDG`, `ALT` ou `SYS`, `UPLINK`;
  - atualizar os valores decorativos lentamente, sem sugerir que são dados reais do projeto.
- Caption inferior: `Rota Group · Custo Dashboard · aguardando credenciais`.
- Não duplicar a logo em tamanho grande e texto gigante no mesmo painel; a marca central deve ser o foco.

### Card de autenticação

- Fundo de painel elevado, separado do canvas por borda de 1 px.
- Marca superior com o ícone ou wordmark correto, sem distorção.
- Título curto: `Custo Dashboard` ou `Acesso ao Custo Dashboard`.
- Tagline mono, discreta: `ANÁLISE DE CUSTOS · CONTROLE DE ACESSO`.
- Labels acima dos campos; nunca usar placeholder como único label.
- Campo de usuário: label `ID do operador` ou `Usuário`; manter `autocomplete="username"`.
- Campo de senha: label `Senha`; manter `autocomplete="current-password"`.
- Inputs com altura mínima de 44 px, raio de 3–6 px, superfície elevada e borda fria.
- Foco com borda teal e anel externo âmbar ou teal, sempre visível para teclado.
- Erro exibido abaixo do campo relacionado, com texto curto e animação shake de aproximadamente 320 ms.
- Linha auxiliar: checkbox `Manter sessão ativa` à esquerda e `Esqueceu a senha?` à direita.
- CTA único: `AUTENTICAR`, com gradiente azul→teal da marca, altura aproximada de 48 px e texto sem quebra.
- Durante autenticação, manter o botão no lugar e mostrar três dots animados.
- Remover autenticação alternativa, divider, footer e links de funcionalidades não existentes. O login deve ficar concentrado em usuário, senha e CTA.
- Após sucesso, mostrar estado `ACESSO LIBERADO` com anel desenhado, checkmark e redirecionamento para o dashboard.

### Ritmo visual

- Header: 60–68 px.
- Padding externo do corpo: 28–64 px.
- Labels: 10–11 px, uppercase, tracking entre 0.10–0.14em.
- Campos: intervalo vertical de 18–20 px.
- CTA: margem superior de 24–28 px.
- Cantos: campos 4–6 px, card 3–8 px, controles pequenos 3–6 px. Evitar misturar cards muito arredondados com controles totalmente pill.
- Sombras apenas em superfícies elevadas; usar sombra azul-marinho/preta translúcida, nunca preto puro sólido.

## Cores

### Cores observadas nas referências

| Hex | Função observada ou recomendada |
|---|---|
| `#000020` | Navy quase preto dominante nas capturas e referências de dashboard. |
| `#002040` | Elevação azul profunda em painéis e áreas laterais. |
| `#0B0A1E` | Fundo dark observado no CSS do Rota 360. |
| `#0B0F1E` | Token seguro para canvas principal do login. |
| `#12172B` | Superfície principal de cards e formulário. |
| `#151B33` | Superfície de inputs do Meridian. |
| `#232B3A` | Borda de painéis e campos do Meridian. |
| `#0050A0` | Azul profundo da marca Rota. |
| `#0060A0` | Azul intermediário presente nos logos. |
| `#0080A0` | Teal azul observado nas capturas do Rota. |
| `#00A0A0` | Teal forte do material de marca. |
| `#10A0A0` | Token recomendado para acento funcional teal. |
| `#20C0C0` | Highlight ciano presente nas variações da logo. |
| `#6BA3D7` | Azul claro de apoio da identidade Rota 360. |
| `#D9A356` | Âmbar decorativo do Meridian: brackets, foco e microdetalhes. |
| `#F0C27B` | Âmbar claro para hover e highlights. |
| `#E0E0E0` | Branco suave observado nos wordmarks claros. |
| `#EDF1F7` | Texto principal recomendado em superfícies escuras. |
| `#8992A3` | Texto secundário e telemetria. |
| `#4C5567` | Texto de baixa prioridade e divisores. |
| `#6366F1` | Indigo de estados ativos observado em referências de dashboard. |
| `#10B981` | Sucesso e estado operacional positivo. |
| `#EF4444` | Erros e estados críticos. |

### Paleta por função

| Token | Valor recomendado |
|---|---|
| `canvas` | `#0B0F1E` |
| `canvas-deep` | `#000020` |
| `surface` | `#12172B` |
| `surface-raised` | `#1A2138` |
| `input` | `#151B33` |
| `border` | `#232B3A` |
| `text-primary` | `#EDF1F7` |
| `text-secondary` | `#8992A3` |
| `accent-primary` | `#10A0A0` |
| `accent-blue` | `#0050A0` |
| `accent-amber` | `#D9A356` |
| `focus-ring` | `#10A0A0` com halo âmbar discreto |

### Gradiente da marca

```css
linear-gradient(135deg, #0050A0 0%, #0080A0 55%, #10A0A0 100%)
```

Usar somente em CTA principal, marca ou faixa de destaque. Não aplicar gradiente em todos os cards, textos ou fundos.

## Logos

| Arquivo | Canvas | Conteúdo útil medido | Uso recomendado |
|---|---:|---:|---|
| `LOGOPRINCE.png` | 821 x 304 | 551 x 140, proporção 3.94 | Wordmark horizontal claro para fundo navy/dark. Principal logo do painel esquerdo e header dark. |
| `LOGOESCURO.png` | 2460 x 911 | 1655 x 420, proporção 3.94 | Wordmark horizontal com branco/cinza e teal; usar somente se o contraste final no fundo escolhido for superior ao `LOGOPRINCE`. |
| `LOGO SISTEMA.png` | 845 x 295 | 200 x 163, proporção 1.23 | Marca compacta/ícone; usar em espaços verticais pequenos, card de login ou header. Não tratar como wordmark horizontal. |
| `ICON ATALHO.png` | 1985 x 1859 | quase todo o canvas, proporção 1.07 | Favicon, ícone de aplicação e marca central pequena. |

Observações de implementação:

- Os PNGs têm transparência interna significativa; definir largura pelo canvas e conferir o tamanho visual do conteúdo, não apenas o `height`.
- Não recolorir logos via filtro CSS.
- Para o painel esquerdo, preferir `LOGOPRINCE.png` em uma largura responsiva e adicionar `ICON ATALHO.png` apenas como marca secundária ou watermark.
- Para o favicon, usar `ICON ATALHO.png`.
- Garantir área livre ao redor da logo de pelo menos 24 px em desktop e 16 px em mobile.

## Animações

As imagens estáticas não permitem comprovar movimento. A especificação abaixo combina o vocabulário visual das referências com os tempos já usados no protótipo Meridian.

| Elemento | Animação | Parâmetros recomendados | Objetivo |
|---|---|---|---|
| Shell/login card | Rise | 600–700 ms, ease-out/spring, translateY de 12–16 px | Apresentar a interface sem deslocamento brusco. |
| Header status | Pulse dot | 2.4 s, opacidade 1 → .35 | Comunicar sistema disponível. |
| Starfield | Twinkle | 3–5 s, delays aleatórios, opacidade baixa | Dar profundidade sem competir com a marca. |
| Logo central | Breathing | 5–7 s, escala 1 → 1.015, sem loop linear perceptível | Dar vida ao lockup sem deformar a logo. |
| Logo central | Tilt pointer | `rotateX/Y` máximo de 10–14 graus, reset ao sair | Responder ao operador e preservar a ideia de instrumento. |
| Brackets | Static + hover | Opacidade base .45–.7; highlight âmbar ao focar o formulário | Criar moldura técnica sem poluição. |
| CTA | Sweep scan | 450–600 ms no hover, transform apenas | Feedback de ação; não executar continuamente. |
| CTA loading | Dot bounce | 900 ms, delays .12 s e .24 s | Mostrar autenticação em andamento. |
| Erro | Shake | 300–330 ms, deslocamento máximo de 4 px | Associar feedback ao campo inválido. |
| Sucesso | Ring draw | 500–650 ms, checkmark após o anel | Confirmar acesso concedido. |
| Relógio | Tick | Atualização de texto a cada 1 s | Telemetria operacional. |

Regras de movimento:

- Animar somente `transform`, `opacity`, `filter` com moderação e propriedades de pintura controlada.
- Respeitar `prefers-reduced-motion: reduce`: desabilitar starfield, tilt, breathing e loops; manter estados de autenticação instantâneos e legíveis.
- Não usar scroll hijack ou efeitos contínuos no formulário.
- O movimento deve comunicar estado, foco, feedback ou profundidade; não adicionar animação sem função.
- O erro deve permanecer acessível por texto, não depender apenas do shake ou da cor.

## Organização do dashboard usada como referência futura

Esta seção não altera o escopo atual do login. Ela registra padrões identificados nas referências para manter coerência quando o dashboard for redesenhado.

- Sidebar persistente à esquerda, escura e visualmente mais profunda que o conteúdo.
- Topbar fina com marca, contexto da tela, status, notificações e operador.
- Área principal com largura controlada e grid de widgets, sem deixar cards encostarem nas bordas do viewport.
- KPIs no primeiro nível: números grandes, rótulo curto, variação/estado secundário e acento de cor sem exagero.
- Gráficos em superfícies elevadas e escuras, com gridlines discretas, tooltips e legenda próxima.
- Tabelas com cabeçalho persistente, linhas com divisores finos, hover discreto e filtros acima da tabela.
- A referência Rota CAD adiciona uma regra útil: ferramenta/controle à esquerda, canvas ou conteúdo principal no centro e propriedades/contexto à direita.
- A referência Rota 360 usa navegação categorizada na sidebar, cards de resumo em três colunas e uma seção operacional mais larga abaixo.
- Finance Dashboard e Financial Investment reforçam uma hierarquia de dados em camadas: resumo primeiro, tendência/composição depois, detalhe tabular por último.
- X-Rii reforça o uso de topbar + sidebar + widgets compactos, com azul/ciano como ação e superfícies quase pretas.

## Recomendações finais

1. Implementar primeiro a composição Meridian do login, não redesenhar o dashboard nesta etapa.
2. Usar `LOGOPRINCE.png` no painel esquerdo sem filtro e `ICON ATALHO.png` como ícone auxiliar/favicon.
3. Manter fundo quase preto/navy, superfícies com diferença tonal pequena e teal como único acento funcional principal.
4. Reservar âmbar para brackets, foco e detalhes decorativos do instrumento.
5. Remover modo claro, toggle, autenticação alternativa, divider e footer do login.
6. Manter labels em português e preservar os atributos de autocomplete do formulário existente.
7. Validar em 1440 x 900, 1024 x 768 e 375 x 812; em mobile, priorizar o formulário e reduzir a decoração do painel.
8. Aceite visual: logo sem distorção ou filtro, nenhum branco puro dominante, contraste de texto AA, CTA único claramente identificável, animações reduzidas quando solicitado pelo sistema operacional.

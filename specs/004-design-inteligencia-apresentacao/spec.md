# 🎯 Especificação de Requisitos — Redesign Visual, DRE & Modo Apresentação

## 1. Requisitos Funcionais

### RF-01: Redesign Visual & Bento Grid Layout
- **RF-01.1:** A aba **Visão Geral** deve adotar o layout **Bento Grid** com cartões de tamanhos variados destacando os KPIs críticos (Saldo Mensal e Payback em tamanho grande).
- **RF-01.2:** Todos os campos de moeda e números no sistema devem aplicar a classe `font-mono tabular-nums` para alinhamento numérico perfeito.
- **RF-01.3:** Animações sutis de fade-in/slide-up nos cartões ao carregar o dashboard.

### RF-02: Inteligência Financeira — DRE & Matriz de Sensibilidade
- **RF-02.1:** Adicionar aba **DRE & Sensibilidade** no dashboard do projeto.
- **RF-02.2:** Exibir a **DRE Projetada (Demonstração do Resultado do Exercício)** calculando:
  - Receita Bruta Mensal / Anual
  - (-) Impostos sobre Receita
  - (=) Receita Líquida
  - (-) Custos Operacionais Diretos (Manutenção, Chips, Softwares, Terceirizados)
  - (=) Margem de Contribuição Líquida
- **RF-02.3:** Exibir a **Matriz de Sensibilidade 5x5** cruzando Reajuste de Mensalidade vs Custo de Instalação para indicar o Payback em cada cenário.

### RF-03: Modo Apresentação Comercial (Pitch Deck Mode)
- **RF-03.1:** Incluir botão de destaque **"Modo Apresentação"** no cabeçalho do projeto.
- **RF-03.2:** Ao ser ativado, esconde a barra lateral (Sidebar) e os menus de navegação, expandindo o conteúdo para tela cheia (Fullscreen) com fundo escuro elegante.
- **RF-03.3:** Exibe um rodapé de apresentação com os dados do Cliente e Botão para Sair do Modo Apresentação (Esc ou clique).

---

## 2. Critérios de Aceitação

- [ ] Bento Grid responsivo em telas desktop e mobile.
- [ ] DRE calculado corretamente batendo com os totais de `resumo_projeto`.
- [ ] Matriz de Sensibilidade renderizada sem travamentos de CPU no cliente.
- [ ] Modo Apresentação ativa o modo tela cheia limpo e permite sair via tecla ESC ou botão Sair.
- [ ] Suíte de testes `pytest` e `npm run build` mantendo 100% de aprovação.

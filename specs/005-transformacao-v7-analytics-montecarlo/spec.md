# 🎯 Especificação de Requisitos — Transformação v7 (Analytics & Monte Carlo)

## 1. Requisitos Funcionais

### RF-01: Suíte de 6 Novos Gráficos Avançados
- **RF-01.1:** **Curva ABC / Análise de Pareto 80/20** de custos por categoria e por material (Gráfico combinado de barras + % acumulado).
- **RF-01.2:** **Matriz Scatter de Risco x Retorno por Local** (Eixo X: Investimento, Eixo Y: Saldo Mensal, Tamanho da Bolha: Qtd de Itens, Cor: Tempo de Retorno).
- **RF-01.3:** **Gauge / Velocímetro de Saúde Financeira do Projeto** (Score de 0 a 100 ponderando Margem, ROI, Payback e Cobertura).
- **RF-01.4:** **Donut de Distribuição de Custos Operacionais** (Softwares, Chips, Terceirização, Manutenção, Mão de Obra).
- **RF-01.5:** **Fluxo de Caixa 36 Meses Empilhado** (Receita Bruta vs Impostos vs Custos vs Saldo Líquido).
- **RF-01.6:** **Curva S de Progresso Físico-Financeiro Acumulado**.

### RF-02: Simulador Estatístico de Monte Carlo (1.000 Iterações)
- **RF-02.1:** Executar simulação de Monte Carlo no backend e frontend injetando volatilidade aleatória gaussian/triangular de custos (-15% a +25%) e inadimplência (0% a 10%).
- **RF-02.2:** Exibir a **Histograma de Distribuição de Probabilidade de Payback** (Probabilidade do investimento se pagar em até 12, 24 ou 36 meses).

### RF-03: Central de Diagnósticos e Recomendação Automática
- **RF-03.1:** Painel de Diagnóstico Financeiro Automático listando oportunidades de otimização de custos e detecção de sobrepreço.

---

## 2. Critérios de Aceitação

- [ ] Todos os 6 gráficos renderizam dinamicamente com dados reais do projeto.
- [ ] O simulador de Monte Carlo executa 1.000 iterações em < 100ms.
- [ ] Testes unitários do backend (`pytest`) e compilação frontend (`npm run build`) com 100% de aprovação.

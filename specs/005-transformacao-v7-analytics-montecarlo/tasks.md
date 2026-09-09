# 📋 Lista de Tarefas Executáveis — Release v7

- [ ] **T01 [Backend Engine]:** Implementar `simulacao_monte_carlo` e `calcular_score_saude` em `backend/analysis.py`.
- [ ] **T02 [Backend Charts]:** Implementar `grafico_pareto_global`, `grafico_scatter_risco_retorno`, `grafico_gauge_saude`, `grafico_donut_custos_operacionais` e `grafico_fluxo_empilhado` em `backend/charts.py`.
- [ ] **T03 [Backend Routers]:** Expor os novos gráficos e dados de Monte Carlo no payload de `_payload_projeto` em `backend/routers/projetos.py`.
- [ ] **T04 [Frontend DataViz]:** Criar motor Monte Carlo em `frontend/src/lib/montecarlo.ts`.
- [ ] **T05 [Frontend Tab]:** Criar a nova aba `frontend/src/components/tabs/AnalyticsAvancadoTab.tsx` com os 6 novos gráficos e o simulador probabilístico.
- [ ] **T06 [Integration]:** Integrar a aba `Analytics Avançado` em `frontend/src/pages/DashboardPage.tsx`.
- [ ] **T07 [QA & Review]:** Rodar testes unitários `pytest` e compilar o frontend com `npm run build`.

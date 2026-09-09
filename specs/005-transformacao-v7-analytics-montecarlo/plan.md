# 🏗️ Plano de Arquitetura & Orquestração por Subagentes — Release v7

## 1. Arquitetura de Subagentes & Divisão de Trabalho

```
 ┌─────────────────────────────────────────────────────────┐
 │        Orquestrador Principal (Main Agent Thread)       │
 │   Gerencia o fluxo Spec Kit, atribui tarefas e consolida │
 └───────────┬───────────────────┬───────────────────┬─────┘
             │                   │                   │
             ▼                   ▼                   ▼
 ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
 │ Subagente 1      │ │ Subagente 2      │ │ Subagente 3      │
 │ (Backend Engine) │ │ (Frontend DataViz│ │ (QA & Reviewer)  │
 │ Pareto/MonteCarlo│ │ Bento/MonteCarlo │ │ Pytest/npm build │
 └──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## 2. Detalhamento dos Módulos a Criar / Alterar

1. **Backend (`backend/analysis.py` & `backend/charts.py`):**
   - `simulacao_monte_carlo(locais, iteracoes=1000)`
   - `calcular_score_saude(locais)`
   - `grafico_pareto_global(locais)`
   - `grafico_scatter_risco_retorno(locais)`
   - `grafico_gauge_saude(score)`
   - `grafico_donut_custos_operacionais(locais)`
   - `grafico_fluxo_empilhado(locais, meses=36)`

2. **Frontend (`frontend/src/lib/montecarlo.ts` & `frontend/src/components/tabs/`):**
   - `frontend/src/lib/montecarlo.ts`: Algoritmo de Monte Carlo no cliente.
   - `frontend/src/components/tabs/AnalyticsAvancadoTab.tsx`: Nova aba centralizando os 6 gráficos e o painel Monte Carlo.

---

## 3. Estratégia de Verificação

- **Verificação 1:** `pytest` no backend (todos os testes de Monte Carlo e gráficos passando).
- **Verificação 2:** `npm run build` no frontend (zero erros de compilação).

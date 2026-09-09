# 📋 Lista de Tarefas Executáveis — Custo Dashboard v4

## Fase 1: Backend & Motor Financeiro (Curva S, Cenários e RBAC)

- [ ] **T01:** Atualizar `backend/schema.sql` e a inicialização de banco local (`backend/store.py` / `db.py`) com coluna `papel` na tabela `usuarios` e tabela `cenarios`.
- [ ] **T02:** Implementar cálculo da Curva S de investimentos acumulados em `backend/analysis.py` e novo gráfico `_grafico_curva_s` em `backend/charts.py`.
- [ ] **T03:** Adicionar suporte a controle de acesso por papel (RBAC `admin` / `leitor`) em `backend/security.py` e proteger rotas de mutação em `backend/routers/projetos.py` e `backend/routers/users.py`.
- [ ] **T04:** Criar endpoints de gestão de cenários em `backend/routers/projetos.py` (`GET/POST/DELETE /api/projetos/{id}/cenarios`).
- [ ] **T05:** Escrever testes unitários em `backend/tests/test_cenarios_rbac.py` para cobrir Curva S, criação de cenários e bloqueio de usuários `leitor`.

---

## Fase 2: Frontend & UI/UX Premium (Dashboard, Simulador e Permissões)

- [ ] **T06:** Atualizar tipos TypeScript (`frontend/src/lib/types.ts`) com `PapelUsuario`, `Cenario` e payloads da Curva S.
- [ ] **T07:** Desenvolver o motor de simulação no cliente em `frontend/src/lib/simulator.ts` para recalculagem instantânea.
- [ ] **T08:** Criar a nova aba **Simulador & Cenários** (`frontend/src/components/tabs/SimuladorTab.tsx`) com sliders de ajuste e tabela comparativa.
- [ ] **T09:** Atualizar a aba **Visão Geral** (`frontend/src/components/tabs/VisaoGeralTab.tsx`) para incluir o gráfico de **Curva S** e novos cards de KPI refinados.
- [ ] **T10:** Ajustar o `AuthContext` e os componentes de UI (`AppShell`, `PlanilhaPage`, `ProjetosPage`) para desabilitar ações de alteração quando o usuário for `leitor`.

---

## Fase 3: Validação, Regressão & Entrega Final

- [ ] **T11:** Executar toda a suíte de testes `pytest` e verificar aprovação de 100%.
- [ ] **T12:** Compilar o frontend com `npm run build` e garantir zero erros ou avisos de tipagem.
- [ ] **T13:** Gerar relatório de verificação final e apresentar a reformulação pronta para o usuário.

# 🏛️ Plano de Evolução Arquitetural v5 — Custo Dashboard

Este documento consolida o plano de evolução da arquitetura do **Custo Dashboard** estruturado sob o padrão **Spec Kit Standard** e guiado pelas **Karpathy Guidelines**.

---

## 📂 Estrutura de Artefatos no Repositório

Todos os documentos formais do Spec Kit foram persistidos em [`specs/003-arquitetura-evolucoes/`](file:///C:/Users/assistentesolucoes/Desktop/custo-dashboard/specs/003-arquitetura-evolucoes):

1. **[constitution.md](file:///C:/Users/assistentesolucoes/Desktop/custo-dashboard/specs/003-arquitetura-evolucoes/constitution.md):** Princípios de arquitetura limpa por domínios, repositórios tipados, zero-bloat na Vercel e auditoria.
2. **[spec.md](file:///C:/Users/assistentesolucoes/Desktop/custo-dashboard/specs/003-arquitetura-evolucoes/spec.md):** Especificação de requisitos funcionais e não-funcionais (NFRs), esquemas Pydantic v2 e modularidade.
3. **[plan.md](file:///C:/Users/assistentesolucoes/Desktop/custo-dashboard/specs/003-arquitetura-evolucoes/plan.md):** Abordagem técnica de refatoração incremental com verificação automatizada.
4. **[tasks.md](file:///C:/Users/assistentesolucoes/Desktop/custo-dashboard/specs/003-arquitetura-evolucoes/tasks.md):** Roadmap de tarefas executáveis e gates de verificação.
5. **[analyze.md](file:///C:/Users/assistentesolucoes/Desktop/custo-dashboard/specs/003-arquitetura-evolucoes/analyze.md):** Análise de cobertura, riscos e mitigação de regressão.

---

## 🎯 Fases de Execução do Plano

### ✅ Fase 1: Pydantic v2 & Tipagem Estrita nas APIs (CONCLUÍDO)
- [x] **T01:** Criado módulo `backend/schemas.py` com esquemas Pydantic v2 (`ProjetoCreateSchema`, `LocalCreateSchema`, `ItemCreateSchema`, `CenarioCreateSchema`).
- [x] **T02:** Endpoint `POST /api/projetos/{id}/cenarios` e rotas principais refatoradas para tipagem estrita.
- [x] **T03:** Suíte `pytest` executada e 100% aprovada (154 passed).

### ⏳ Fase 2: Modernização da Camada de Repositório (EM ANDAMENTO)
- [ ] **T04:** Implementar a classe `ProjectRepository` em `backend/repositories.py` abstraindo o acesso a SQLite e Neon Postgres.
- [ ] **T05:** Atualizar chamadas em `projetos_store.py` e rotas do backend.
- [ ] **T06:** Validação com `pytest` (cobertura 100% sem regressão).

### ⏳ Fase 3: Organização por Módulos & Build Final
- [ ] **T07:** Organizar módulos do frontend em diretórios por funcionalidade (`features/`).
- [ ] **T08:** Verificação final de compilação `npm run build` e deploy na Vercel.

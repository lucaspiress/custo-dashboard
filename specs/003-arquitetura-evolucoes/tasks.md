# 📋 Lista de Tarefas Arquiteturais Executáveis — Spec Kit v5

## Fase 1: Pydantic v2 & Tipagem Estrita de APIs (Backend)

- [ ] **T01:** Criar o arquivo `backend/schemas.py` com os modelos Pydantic v2 para requisições e respostas de Projetos, Locais, Itens e Cenários.
- [ ] **T02:** Refatorar endpoints em `backend/routers/projetos.py` para utilizar os Schemas Pydantic como parâmetros de entrada.
- [ ] **T03:** Executar a suíte de testes `pytest` e verificar 100% de aprovação após a introdução da tipagem Pydantic.

---

## Fase 2: Repositories & Abstração da Camada de Dados

- [ ] **T04:** Encapsular a lógica de banco de dados SQLite/Neon de `projetos_store.py` dentro de uma estrutura limpa e tipada.
- [ ] **T05:** Executar testes unitários do backend para garantir regressão zero.

---

## Fase 3: Validação & Build Final

- [ ] **T06:** Executar o build do frontend (`npm run build`) e teste completo de regressão.

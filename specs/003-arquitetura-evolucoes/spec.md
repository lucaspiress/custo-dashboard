# 🎯 Especificação de Requisitos da Nova Arquitetura — Custo Dashboard

## 1. Visão Geral
Esta especificação define a refatoração e evolução arquitetural do **Custo Dashboard**, visando máxima manutenibilidade, tipagem estrita no backend e frontend, organização por domínios e alta performance no ambiente Serverless da Vercel.

---

## 2. Requisitos Arquiteturais & Funcionais

### RF-01: Padronização de Payloads com Pydantic v2 no Backend
- **RF-01.1:** Todos os endpoints em `backend/routers/` que aceitam corpo de requisição (POST, PATCH, PUT) devem migrar de `dict` genérico para modelos Pydantic v2 fortemente tipados com validação automática de dados.
- **RF-01.2:** As respostas dos endpoints devem declarar explicitamente `response_model` com os Schemas Pydantic.

### RF-02: Padrão Repositório na Camada de Dados (Data Layer Modernization)
- **RF-02.1:** Unificar o acesso a banco de dados em classes de Repositório (`ProjectRepository`, `UserRepository`, `ScenarioRepository`).
- **RF-02.2:** Eliminar duplicação de blocos `if _sqlite(): ... else: ...` espalhados pelas funções, encapsulando os dialetos SQL nos repositórios específicos.

### RF-03: Reorganização Modular do Frontend (Feature-Based Structure)
- **RF-03.1:** Agrupar componentes, hooks e utilitários da SPA em módulos funcionais claros (`features/projetos`, `features/planilha`, `features/dashboard`, `features/simulador`).
- **RF-03.2:** Centralizar serviços de API HTTP em um cliente fortemente tipado com tratamento de erros padronizado.

### RF-04: Estratégia de Cache e Estado no Cliente
- **RF-04.1:** Implementar cache em memória das análises de projeto no frontend para eliminar requisições HTTP redundantes ao alternar entre abas.
- **RF-04.2:** Garantir invalidação automática do cache ao salvar edições na planilha ou criar cenários.

---

## 3. Critérios de Aceitação Arquiteturais

- [ ] Todos os endpoints aceitam e retornam Schemas Pydantic validados sem usar `dict` como tipo coringa no parâmetro de requisição.
- [ ] A camada de repositório abstrai SQLite/Postgres com 100% de cobertura nos testes.
- [ ] A compilação do frontend (`npm run build`) e os testes do backend (`pytest`) continuam com 100% de sucesso sem quebra de contrato (regressão zero).

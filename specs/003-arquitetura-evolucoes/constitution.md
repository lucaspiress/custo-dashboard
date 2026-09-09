# 📜 Constituição da Nova Arquitetura — Custo Dashboard

## 1. Princípios Arquiteturais Fundamentais

1. **Separação Limpa de Domínios (Lightweight Domain-Driven Architecture):**
   - O sistema é dividido em domínios bem delimitados: **Autenticação & RBAC**, **Gestão de Projetos & Locais**, **Motor Financeiro & Simulação**, **Visualização & Widgets**, e **Exportadores (PDF/Excel)**.
   - Nenhuma regra de negócio financeiro deve residir nos componentes visuais do frontend ou nos arquivos de rota de API; todo o cálculo deve ser isolado nos módulos de serviço/domínio (`analysis`, `simulator`).

2. **Desempenho Serverless & Zero Bloat (Vercel Optimization):**
   - O backend deve ser mantido estritamente abaixo do limite de 225MB da Vercel.
   - Proibido adicionar bibliotecas de análise pesadas (`pandas`, `numpy`, `scipy`). Todas as operações devem ser nativas em Python e TypeScript.
   - Tempo de resposta da API para consultas e cálculos deve permanecer < 100ms.

3. **Padrão Repositório & Persistência Agnóstica:**
   - A camada de dados utiliza o **Repository Pattern**, permitindo alternar de forma transparente entre Neon PostgreSQL (Produção) e SQLite (Desenvolvimento Local / Offline).
   - Migrações de schema devem ser idempotentes (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ADD COLUMN IF NOT EXISTS`).

4. **Tipagem Ponta-a-Ponta (End-to-End Type Safety):**
   - Todas as respostas de API no FastAPI utilizam modelos **Pydantic v2**.
   - Todos os componentes e clientes HTTP do frontend utilizam interfaces TypeScript sincronizadas com a API.

5. **Auditoria & Resiliência:**
   - Ações de criação, edição e exclusão devem registrar entradas no histórico de auditoria (`audit_log`).
   - Falhas no banco de dados ou em uploads devem ser capturadas com mensagens de erro estruturadas e amigáveis ao usuário.

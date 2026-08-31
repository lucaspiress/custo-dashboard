# Custo Dashboard

Dashboard para análise de custos de projetos, com visualização de indicadores e geração de relatórios a partir de dados financeiros.

## O que o projeto oferece

- Importação e leitura de planilhas `.xlsx` no formato do projeto.
- Dashboard com visão geral, custos, payback, insights e comparativos.
- Persistência de usuários e dados em PostgreSQL (Neon) na produção.
- Exportação de relatórios em PDF e arquivos para análise.

## Stack

- **Frontend:** React, TypeScript, Vite e Tailwind CSS.
- **Backend:** Python e FastAPI.
- **Dados:** Neon PostgreSQL em produção e SQLite no desenvolvimento.
- **Deploy:** Vercel, com frontend e API no mesmo domínio.

## Executar localmente

```bash
# Backend
cd backend
python -m uvicorn main:app --port 8000

# Em outro terminal: frontend
cd frontend
npm install
npm run dev
```

A aplicação fica disponível em `http://localhost:5173`. Consulte [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) para requisitos, variáveis de ambiente e validações de deploy.

## Documentação

- [Contexto e arquitetura](PROJECT_CONTEXT.md)
- [PRD v3 — dados no sistema](PRD_V3.md)
- [Especificação v3](SPEC_V3.md)
- [Plano de melhorias](PLANO_MELHORIAS.md)

## Segurança

Nunca envie `DATABASE_URL`, `SESSION_SECRET` ou senhas para o repositório.
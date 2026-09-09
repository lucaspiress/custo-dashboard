# 🎯 Especificação de Requisitos — Custo Dashboard v4 (Reformulação)

## 1. Visão Geral
Reformulação completa da plataforma **Custo Dashboard** unindo uma nova experiência visual premium (UI/UX), arquitetura clean full-stack (FastAPI + React 18 + TS) e capacidades financeiras avançadas (Simulador de Cenários em Tempo Real, Curva S de Investimentos e Controle de Acesso RBAC).

---

## 2. Requisitos Funcionais

### RF-01: Redesign Visual & Dashboard Interativo
- **RF-01.1:** O dashboard deve exibir novos cards de KPIs com métricas financeiras consolidadas (Investimento Inicial, Custo Mensal Recorrente, Retorno Esperado, Margem Bruta e Payback).
- **RF-01.2:** Incorporar gráfico de **Curva S de Investimento Acumulado** (comparando desembolso inicial vs receitas acumuladas ao longo dos 36 meses).
- **RF-01.3:** Incorporar gráfico de **Distribuição de Custos por Categoria e por Local** com filtros dinâmicos.

### RF-02: Comparador de Cenários & Simulador de Payback em Tempo Real
- **RF-02.1:** Permitir a criação de cenários alternativos no projeto (Base, Otimista, Conservador).
- **RF-02.2:** O usuário pode ajustar sliders/inputs de variação (% de reajuste mensal, alteração de custos operacionais, taxa de inflação) e ver o impacto imediato no gráfico de fluxo de caixa e no tempo de payback sem requisitar o banco de dados.
- **RF-02.3:** Exibir visão comparativa lado a lado (*side-by-side*) entre cenários.

### RF-03: Gestão de Múltiplos Usuários & Permissões (RBAC)
- **RF-03.1:** Suporte a dois perfis de acesso: `ADMIN` (acesso total) e `LEITOR` (acesso somente leitura e simulação em memória).
- **RF-03.2:** Painel administrativo para criação, alteração de senhas e bloqueio de usuários.
- **RF-03.3:** Usuários `LEITOR` não podem salvar edições na planilha ou excluir projetos.

### RF-04: Exportações & Compartilhamento Seguro
- **RF-04.1:** Geração de relatório executivo em PDF de 6 páginas com o novo design visual.
- **RF-04.2:** Exportação de planilha Excel `.xlsx` multi-abas estruturada.
- **RF-04.3:** Geração de link público com token de leitura temporário (`/p/:token`) para compartilhamento externo com clientes ou diretoria.

---

## 3. Critérios de Aceitação

- [ ] Todos os 152 testes unitários atuais devem continuar passando (regressão zero).
- [ ] O simulador de cenários deve recalcular KPIs e gráficos em tempo de execução no cliente em < 50ms.
- [ ] Usuários com papel `LEITOR` devem receber HTTP 403 Forbidden ao tentar chamadas de mutação (POST/PATCH/DELETE em projetos).
- [ ] A Curva S de investimentos deve ser exibida corretamente na aba Visão Geral.
- [ ] A aplicação deve compilar e rodar sem erros de TypeScript no frontend e sem alertas de lint.

# 📜 Constituição do Projeto — Custo Dashboard (Reformulação v4)

## 1. Princípios Fundamentais

1. **Simplicidade Operacional & Desempenho:**
   - O sistema deve carregar dados e calcular cenários em tempo real no cliente e no servidor sem latência perceptível.
   - Proibido o uso de bibliotecas de dados com alto custo de footprint na Vercel (limite de 225MB mantido estritamente sem `pandas`).

2. **UX/UI Anti-Generic & Premium:**
   - Interface limpa, moderna e responsiva utilizando Tailwind CSS, design tokens bem definidos e interações fluidas.
   - Visualização de dados de alto impacto com gráficos Plotly interativos, Curva S de investimentos e distribuição dinâmica por categoria/local.

3. **Arquitetura Clean & Tipagem Estrita:**
   - Frontend em React 18 + TypeScript com tipagem estrita de todos os payloads de API.
   - Backend FastAPI fortemente modularizado por routers e serviços de domínio limpos.
   - Persistência transparente com suporte dual (Neon PostgreSQL em Produção, SQLite em Dev local).

4. **Confiabilidade Financeira & Integridade:**
   - Todos os cálculos de ROI, Payback, Margem e Tributação devem ser validados por suíte de testes unitários automatizados.
   - Tolerância zero para regressões em fórmulas financeiras.

5. **Segurança e Controle de Acesso:**
   - Autenticação JWT com cookies `httpOnly` seguros.
   - Suporte a controle de acesso baseado em funções (RBAC) com níveis de usuário (Admin / Leitor).

# 🏗️ Plano Técnico de Arquitetura — Custo Dashboard v4

## 1. Visão Geral da Solução
A reformulação v4 estende o monólito serverless existente na Vercel introduzindo:
1. Um **Simulador de Cenários no Cliente (Client-Side Real-Time Engine)** para respostas instantâneas (< 50ms).
2. Um motor de **Curva S de Investimentos Acumulados** integrado ao Plotly.
3. Controle de acesso baseado em funções **RBAC (Admin / Leitor)** no backend Python e refletido no frontend React.

---

## 2. Mudanças no Banco de Dados (`schema.sql` & SQLite Dev)

```sql
-- Alteração na tabela de usuários para suporte a RBAC
alter table public.usuarios add column if not exists papel text not null default 'admin';

-- Nova tabela para cenários salvos de projetos
create table if not exists public.cenarios (
    id bigint generated always as identity primary key,
    projeto_id bigint not null references public.projetos(id) on delete cascade,
    nome text not null,
    variacao_mensal numeric(5,2) not null default 0.00, -- Ex: +5.00%
    variacao_instalacao numeric(5,2) not null default 0.00,
    criado_em timestamptz not null default now()
);
```

---

## 3. Arquitetura do Frontend (`frontend/src/`)

- **`src/lib/simulator.ts`**: Motor de simulação de cenários puro em TypeScript para recalcular locais, fluxo de caixa e payback sem requisições HTTP adicionais.
- **`src/components/tabs/SimuladorTab.tsx`**: Nova aba com sliders interativos (% reajuste, variação de equipe, margem desejada) e gráfico comparativo.
- **`src/components/PlotlyChart.tsx`**: Suporte expandido para renderização da **Curva S** de fluxo de caixa acumulado.
- **`src/lib/auth.tsx`**: Guarda de rotas e componentes baseada no papel do usuário (`user.papel === 'admin'`).

---

## 4. Arquitetura do Backend (`backend/`)

- **`backend/analysis.py`**: Adicionada função `gerar_curva_s(locais, meses)` que calcula o acumulado de investimento vs faturamento ao longo do tempo.
- **`backend/security.py`**: Middleware/Injetor de dependência `requer_papel("admin")` que barra modificações feitas por leitores.
- **`backend/routers/projetos.py`**: Adicionados endpoints CRUD para cenários (`/api/projetos/{id}/cenarios`).

---

## 5. Estratégia de Implementação e Verificação
1. Atualizar schema SQL e modelos locais SQLite/Neon.
2. Atualizar funções de análise backend (`analysis.py` & `charts.py`) com Curva S.
3. Adicionar controle de papéis (`security.py`).
4. Desenvolver o motor de simulação frontend e componentes visuais.
5. Executar os 152 testes pytest existentes + novos testes de cenários e RBAC.

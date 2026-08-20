# Plano — Redesenho da Planilha estilo Excel

**Data:** 17/08/2026
**Status:** aprovado para execução (M1)
**Contexto:** o usuário pediu que a planilha tenha cara de Excel (células, abas por local, barra de fórmulas, toolbar) e vire o ponto de entrada do projeto. O dashboard vira um toggle.

## Decisões já fechadas

- **`/projetos/:id` → redirect 307 → `/projetos/:id/dashboard`** (preserva bookmarks antigos)
- **`/projetos/:id/planilha`** → nova PlanilhaPage (Excel-like, **default entry**)
- **`/projetos/:id/dashboard`** → DashboardPage atual (acessível via toggle)
- `ProjetosPage` (lista) → click no card → vai para `/projetos/:id/planilha`
- Toggle [Planilha] [Dashboard] no topo da PlanilhaPage navega entre as duas rotas
- Sem mexer no backend / modelo de dados (zeros alterações)
- Voom design permanece (sem redesign visual, só reorganização)

## Estrutura de abas (sheet tabs)

Cada aba = uma "planilha":
- **DADOS** — locais como linhas (uma linha por local, mesma tabela atual)
- **ITENS · SESC** — itens do SESC (paste do Excel aqui)
- **ITENS · SESC 2** — itens do SESC 2
- ...
- **INSIGHTS** — regras + severidade
- **RESUMO** — KPIs agregados (receita, saldo, investimento, payback médio)
- `+` no fim para criar novo local

## Cara de Excel

- **Cabeçalho de coluna**: `A`, `B`, `C`... visível e clicável
- **Número de linha**: `1`, `2`, `3`... na lateral esquerda
- **Células**: borda fina, hover claro, célula ativa destacada (borda azul)
- **Tab/Enter**: move para próxima célula (já existe)
- **Barra de fórmulas**: endereço da célula ativa (ex: `B2`) + caixa com o valor editável
- **Toolbar Excel**: `Σ Auto-soma`, `Média`, `Contar`, `Copiar`, `Colar`

## Limites

- Sem Excel formulas complexas (SOMA, SE, PROCV, etc.) nesta fase. Cálculo é client-side nas células selecionadas.
- Sem row/column resizing
- Sem cell comments
- Sem seleção múltipla complexa (apenas shift+click básico)

## Milestones

### M1 — Entry point + estrutura base ← EM EXECUÇÃO

**Backend:** nada.
**Frontend:**
- [ ] Criar rota `/projetos/:id/planilha` → PlanilhaPage (componente novo)
- [ ] Mover rota atual `/projetos/:id` → redirect 307 → `/projetos/:id/dashboard`
- [ ] `App.tsx`: rotas atualizadas
- [ ] `ProjetosPage.tsx`: botão "Dashboard" do card → `/projetos/:id/dashboard`; botão renomear/novo continua igual
- [ ] `PlanilhaPage.tsx` (reescrito): top toolbar com toggle [Planilha] [Dashboard] + botões `+ Local`, Exportar PDF, Exportar XLSX + grade estilo Excel (letras A, B, C... + linhas 1, 2, 3...) + manter comportamento de edição/autosave/colagem
- [ ] Validação: `pytest -q` (32/32) + `npm run build` + `npm run lint`
- [ ] Commit + push

### M2 — Grade estilo Excel (depois)
- Coluna A, B, C... + linha 1, 2, 3...
- Endereço da célula ativa (B2)
- Barra de fórmulas (edita valor)
- Highlight de célula ativa

### M3 — Sheet tabs no rodapé (depois)
- Cada local = uma aba
- Navegação
- Adicionar local via `+`
- Abas especiais (INSIGHTS, RESUMO)

### M4 — Toolbar Excel (depois)
- Auto-soma, Média, Contar
- Copiar/Colar
- Inserção de fórmula simples na célula ativa

## Estado do repositório

- Branch: `main` sincronizado
- Último commit: `c63b82c feat: select de cliente no modal de projeto`
- Working tree: deve estar limpo (commit e push feitos no fim do Phase 1 do redesenho)
- 32/32 testes passando
- Build OK
- Lint OK

## Para retomar a execução

Ao voltar:
1. `cd 'C:\Users\assistentesolucoes\Desktop\custo-dashboard'`
2. `git status` (deve estar limpo)
3. Verificar `/tmp/custo-dashboard-ui-smoke-v*.db` ou criar fresh se rodar testes
4. Continuar com M1: criar nova PlanilhaPage em `frontend/src/pages/PlanilhaPage.tsx`, ajustar `App.tsx`, ajustar `ProjetosPage.tsx`
5. Critério de aceite M1: `/projetos/id/planilha` abre a planilha Excel-like, `/projetos/id/dashboard` continua abrindo o dashboard, `/projetos/id` redireciona para dashboard, testes + build verdes

## Decisões pendentes (M2-M4)

- Implementar seleção múltipla com shift+click? (sim, simples)
- Auto-soma realmente calcula ou só coloca o valor na célula ativa? (deve calcular; lê range selecionado)
- Quebra de linha na grade (multiline cells)? (não nesta fase)
- Cores de fundo de célula? (não nesta fase)

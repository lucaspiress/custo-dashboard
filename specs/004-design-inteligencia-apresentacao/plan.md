# 🏗️ Plano Técnico de Implementação — DRE, Sensibilidade e Modo Apresentação

## 1. Módulos & Componentes a Desenvolver

1. **`frontend/src/lib/dre.ts`**:
   - Função `calcularDRE(analise: AnaliseUpload)` que gera as linhas da DRE (Receita Bruta, Impostos, Receita Líquida, Custos Fixos, Margem de Contribuição).
   - Função `gerarMatrizSensibilidade(analise: AnaliseUpload)` que constrói a matriz 5x5 de variação de mensalidade vs instalação.

2. **`frontend/src/components/tabs/DreSensibilidadeTab.tsx`**:
   - Nova aba com a tabela estruturada da DRE e a grade visual da Matriz de Sensibilidade (com cores de destaque verde/amarelo/vermelho para payback rápido/médio/lento).

3. **`frontend/src/components/ModoApresentacao.tsx`**:
   - Modal/Overlay em tela cheia com visualização executiva para reunião com cliente.

4. **`frontend/src/components/tabs/VisaoGeralTab.tsx`**:
   - Refatoração dos KPI Cards para o estilo **Bento Grid** assimétrico.

---

## 2. Estratégia de Verificação (Karpathy Guidelines)

1. **Testes de Unidade:** Testar funções do `dre.ts` com dados sintéticos.
2. **Build TypeScript:** Rodar `npm run build` para garantir zero erros.
3. **Backend `pytest`:** Verificar 100% de aprovação na suíte completa.

# Roadmap — custo-dashboard

> **Status atualizado em:** 19/08/2026 (fim de sessão v4)
> **Próxima sessão:** 20/08/2026+ (retorno do usuário)

---

## 1. Status atual (v4 completa em produção)

| Release | Backend | Frontend | Push | Notas |
|---|---|---|---|---|
| **v4.0** Datasets livres + import/export + AG Grid | ✅ 56 testes | ✅ build OK | `0dc8ea8` | Primeiro release da v4 |
| **v4.1** Construtor de dashboards + ECharts + slicers | ✅ 72 testes | ✅ build OK | `0dc8ea8` | Auto-populate do 1º dashboard com widgets locais/itens |
| **v4.2** Drill-down + campos calculados + parser sandbox | ✅ 100 testes | ✅ build OK | `0dc8ea8` + hotfix em `99818cb` | Parser próprio sem `eval`/`exec` |
| **v4.3** Publicação externa + agendamento + R2 + auditoria + rate limit | ✅ 142 testes | ✅ build OK | `99818cb` | Última release da v4 |

**URL de produção:** https://custo-dashboard-rotacad.vercel.app (Vercel auto-deploy em `main`).

**Stack mantida:** Vite + React + TS + Tailwind / FastAPI / Neon Postgres (prod) / SQLite (dev) / **sem pandas** / `boto3` + `slowapi` + `reportlab` adicionados na v4.3.

---

## 2. Pendências manuais (você precisa fazer antes de testar v4.3)

### Cloudflare R2
- [ ] Criar conta Cloudflare (se ainda não tem)
- [ ] Criar bucket R2 no dashboard Cloudflare
- [ ] Gerar Access Key ID + Secret Access Key
- [ ] Configurar env vars na Vercel:
  - `CF_ACCOUNT_ID`
  - `CF_ACCESS_KEY_ID`
  - `CF_ACCESS_KEY_SECRET`
  - `CF_R2_BUCKET`

### Cron / Vercel
- [ ] Adicionar env var `CRON_SECRET` na Vercel (string aleatório)
- [ ] Confirmar que o `vercel.json` tem a seção `crons` (já feito no commit `99818cb`)
- [ ] Verificar no Vercel Dashboard que o Cron Job está agendado para `0 8 * * *` (8h UTC diário)

### Smoke test end-to-end (após env vars configuradas)
- [ ] Criar projeto
- [ ] Criar dataset livre com algumas linhas
- [ ] Criar dashboard com widget de barras
- [ ] Publicar dashboard → abrir `/p/{token}` em aba anônima
- [ ] Agendar relatório (mensal) → disparar manualmente:
  ```bash
  curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
    https://custo-dashboard-rotacad.vercel.app/api/cron/relatorios
  ```
- [ ] Verificar relatório gerado em `/relatorios` e baixar PDF
- [ ] Confirmar que download registrou em `audit_log` (GET `/api/audit-log`)

### Compatibilidade preservada
- [ ] Confirmar visualmente que a tela de login não mudou
- [ ] Fluxo legado (criar projeto via template ROTA + gerar dashboard + exportar PDF/xlsx) continua OK

---

## 3. Backlog — v5+ (ideias)

Ordenado por valor/esforço estimado (do spec e do RAIO_X):

### Alta prioridade
1. **Tema claro (além do dark-only atual)** — adicionar refator de CSS para suportar tema claro opcional. Decisão atual: dark-only mantido; usuário pode decidir refatorar depois.
2. **PDF visual via Playwright/Chromium** — substituir PDFs tabulares por screenshots fiéis ao dashboard. Adiciona ~200MB ao bundle da Vercel (Chromium headless).
3. **Paste-from-Excel em `DatasetsPage`** — colar bloco de células direto na grade (já funciona TSV, falta BR ; e XLSX).
4. **Column add/remove em `DatasetsPage`** — editar schema do dataset depois de criado.

### Média prioridade
5. **Internacionalização (PT-BR + EN)** — strings em arquivo de tradução; permite adicionar EN depois.
6. **Onboarding / tour guiado para novos usuários**.
7. **Dark/light theme toggle** (depende do item 1).
8. **Compartilhamento por e-mail** — enviar link de dashboard publicado por e-mail (depende de provedor SMTP/SendGrid/Resend).
9. **Histórico de versões de datasets** — undo/redo, ver mudanças ao longo do tempo.
10. **Alertas (payback acima do limite, etc)** — notificações automáticas.

### Baixa prioridade
11. **Permissões por projeto (ACL)** — usuário A vê projetos X, usuário B vê projetos Y.
12. **Comparativo entre projetos** — dashboard que cruza dados de múltiplos projetos.
13. **Mobile (responsivo)** — AG Grid + ECharts otimizados para mobile.
14. **Atualização recorrente de planilhas** — sync com Dropbox/Google Drive.
15. **Marketplace de widgets custom** — comunidade cria e compartilha widgets.

---

## 4. Issues conhecidas / dívida técnica

### LSP (não-bloqueante)
- Vários warnings LSP no backend (`fastapi`/`boto3`/`slowapi` não resolvidos, `None` subscriptable, etc.) — são falsos positivos do type checker porque o venv não está sendo detectado pelo LSP. **Não afetam execução.** Os 142 testes pytest passam.
- `history.py` tem um warning de tipo (`int | None` para cursor.lastrowid) — pré-existente, não introduzido pela v4.

### Bundle size (frontend)
- AG Grid Community: ~700KB em chunk separado (`DatasetsPage-*.js`)
- ECharts: ~1.1MB em chunk separado (`renderWidget-*.js`)
- Main bundle: ~321KB
- Já isolados via `React.lazy`. Se precisar reduzir mais, considerar AG Grid Modules (tree-shaking).

### Pendências de teste
- Smoke test do fluxo legado foi automatizado em script temporário (removido). Vale criar `tests/smoke_legado.py` permanente para CI.
- Testes E2E reais (Playwright/Cypress) ainda não existem — só smoke manual.

---

## 5. Documentação de referência

| Documento | Conteúdo |
|---|---|
| `docs/RAIO_X_V4.md` | Raio-x arquitetural completo da v4 |
| `docs/v4.0_TICKET.md` | Ticket da release v4.0 (datasets livres) |
| `docs/v4.1_TICKET.md` | Ticket da release v4.1 (dashboards + ECharts) |
| `docs/v4.2_TICKET.md` | Ticket da release v4.2 (drill-down + fórmulas) |
| `docs/v4.3_TICKET.md` | Ticket da release v4.3 (publicação + R2 + auditoria) |
| `docs/STATUS.md` | Este documento — status geral + backlog |
| `interview/tenho-um-sistema-de-custo-dashboard-e-quero-muda-...md` | Spec original consolidada (20 rodadas de entrevista) |
| `CLAUDE.md` / `AGENTS.md` | Convenções e regras do repositório |
| `PROJECT_CONTEXT.md` | Inventário e setup do projeto |

---

## 6. Sessões reutilizáveis

Para retomar o trabalho sem perder contexto, ao abrir nova sessão basta passar o alias:

| Alias | Função | Estado |
|---|---|---|
| `ora-1` | Arquiteto (raio-x, decisões) | reconciled, pronto |
| `fix-1` | Executor backend (FastAPI/Python) | reconciled, pronto |
| `fix-2` | Executor frontend (React/TS) | reconciled, pronto |

---

**Última atualização:** 19/08/2026 (sessão completa da v4 — 4 releases entregues e em produção).

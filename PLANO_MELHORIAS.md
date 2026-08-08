# Plano de Melhorias — Custo Dashboard

Data: 08/08/2026
Status: aprovado em discussão; aguardando execução
Referência visual: https://360.rotagroup.com.br (Rota 360)

## 1. Identidade visual Rota 360 (primeira)

**Concluído em 08/08/2026 — v3 (dark-only + login Meridian).**

- **Dark-only**: tema claro removido por completo (index.html, useTheme.ts deletado,
  bloco `.light` excluído, toggles removidos).
- **Login nível Meridian** (replicado do protótipo): header com marca mono + chip
  "Sistema estável" (dot pulsante) + relógio UTC ao vivo; painel esquerdo com
  **logo Rota no lugar do sonar** (tilt 3D com spring via rAF, starfield 46 estrelas,
  corner brackets âmbar, telemetria LAT/LON/HDG/ALT, caption); card com campos
  rotulados, checkbox âmbar, botão AUTENTICAR (gradiente azul→teal, sweep-scan,
  loader de dots), tela "Acesso liberado" com ring-draw. Sem alt-auth/divider.
- Fontes do Meridian no login (Space Grotesk + IBM Plex Mono); dashboard mantém Inter/Exo 2.
- `DESIGN_SPEC.md` gerado por modelo de análise (referências em Desktop\ref-visual).
- Execução por 4 agentes paralelos (limpeza dark, login, CSS, scripts de teste).
- **Revisões por agente aplicadas**: motion BLOCK corrigido (tilt com lag →
  spring via ref sem re-render; reduced-motion gating no tilt/scan; logo-breathe
  redundante removido; estrelas estáticas com opacidade mínima; rise 0.7→0.5s;
  redirect 1.3→0.8s); UI/UX corrigido (contraste header-mark/logo-tag/telemetria/
  caption, bordas de inputs, placeholder, success-title, submit ≥44px, checkbox
  com área de toque, h1 semântico, foco no 1º campo inválido + role=alert +
  aria-describedby, tabular-nums na telemetria).
- Validação: 11 testes pytest, build TS, smoke test 8 abas, screenshots em
  `backend/previews/` (login.png, dashboard.png).

## 2. Desempenho — cache de análise
- payload jsonb em uploads; GET vira leitura; lazy import (plotly/reportlab)

## 3. Plataforma — projetos e dados cadastrais (pela interface)
- tabela projetos + uploads.projeto_id; renomear análises; cliente/projeto/licitação na UI

## 4. UX — drag-and-drop, skeletons, responsividade mobile

## 5. Relatórios — PDF consolidado do projeto + gráficos + Excel com insights

## 6. Operação — health rico, logs, backup Neon

## Regras permanentes
1. Nunca acessar pastas da rede (soluções/licitações — zero acesso)
2. Não tocar em ROTACAD sem pedido explícito
3. Trabalho restrito a Desktop\custo-dashboard, Downloads e tmp
4. Commits/push/deploy só quando o usuário pedir
5. Sem pandas no backend (limite 225MB do bundle)
6. Nunca commitar DATABASE_URL, SESSION_SECRET ou senhas

<section id="sync-impact-report">
<h2>Sync Impact Report</h2>
<ul>
<li><strong>Version change:</strong> template baseline → 1.0.0.</li>
<li><strong>Scope:</strong> establish the governing principles for the Custo Dashboard and the post-login redesign feature.</li>
<li><strong>Added:</strong> immutable login, cost integrity and traceability, reuse of existing contracts and persisted data, professional PT-BR UX, quality gates, and simplicity/security/privacy rules.</li>
<li><strong>Templates:</strong> the resolved Spec Kit templates remain applicable; no plan or tasks are created in this stage.</li>
<li><strong>Follow-up:</strong> future specifications and implementation reviews must explicitly verify these principles.</li>
</ul>
</section>

# Custo Dashboard Constitution

## Core Principles

### I. Login Imutável

O arquivo `frontend/src/pages/LoginPage.tsx` é uma superfície protegida. Toda mudança deve preservar exatamente sua aparência, comportamento, animações, assets e contratos de autenticação. O redesenho pós-login não pode exigir alterações nesse arquivo nem criar dependências que alterem seu funcionamento.

### II. Integridade e Rastreabilidade de Custos

Valores de custos, totais, indicadores, comparações e relatórios devem ser coerentes com os dados de origem e com as regras de negócio vigentes. O sistema deve permitir identificar o projeto, período, categoria e origem dos valores exibidos; não pode inventar, ocultar silenciosamente ou substituir dados sem sinalização clara. Correções devem permanecer verificáveis e refletir-se de modo consistente nas visões derivadas e nas entregas.

### III. Contratos e Dados Existentes Primeiro

Antes de propor alternativas, a solução deve usar os contratos de backend, capacidades existentes e dados persistidos já disponíveis. Nesta fase não se alteram contratos de API, autenticação ou modelo persistido. Capacidades atuais só podem ser removidas se houver substituição equivalente, explícita e verificável para o operador e seu gestor.

### IV. UX Profissional, Responsiva, Acessível e PT-BR

O ambiente pós-login deve oferecer navegação coerente, contexto de projeto visível, linguagem PT-BR, formatos locais de data e moeda, hierarquia visual profissional, operação em diferentes larguras de tela e conformidade prática com acessibilidade. Estados de vazio, carregamento, erro e sucesso devem ser compreensíveis e operáveis por teclado, leitor de tela e outras formas de interação assistiva.

### V. Qualidade Verificável e Mudanças Pequenas

Cada mudança deve ser pequena o suficiente para ser revisada e validada isoladamente. Lint, build e testes relevantes devem ser executados conforme o impacto; requisitos e cenários devem ser testáveis; regressões em login, dados, navegação e entregas devem ser detectáveis antes da aprovação. Não se considera concluída uma alteração apenas porque a interface aparenta funcionar.

### VI. Simplicidade, Segurança e Privacidade

Preferir o menor fluxo e a menor regra que atendam ao requisito, sem duplicar fontes de verdade ou introduzir complexidade especulativa. Dados de custos e relatórios devem respeitar a sessão, as permissões e a visibilidade existentes, sem exposição acidental em estados de erro, links ou compartilhamentos. Segredos e informações sensíveis não podem ser incorporados a artefatos, logs ou documentação.

## Invariantes do Produto

- O login permanece inalterado e é o limite entre autenticação existente e experiência pós-login.
- Toda visão de custos, dashboard, relatório, publicação ou compartilhamento mantém o projeto explicitamente identificado.
- Dados persistidos e contratos existentes são a fonte de verdade; ausência de dado deve ser indicada como ausência, nunca preenchida por estimativa implícita.
- A remoção de uma capacidade existente exige substituição equivalente e critério de aceite correspondente.
- O idioma padrão da experiência é PT-BR, incluindo mensagens de validação, estados e ações.

## Governança e Gates de Qualidade

Esta constituição prevalece sobre práticas conflitantes. Toda especificação deve declarar escopo, não escopo, suposições, entidades, casos-limite e critérios mensuráveis. Toda implementação deve demonstrar rastreabilidade aos requisitos, preservar o login e validar os contratos e dados existentes. Alterações de constituição exigem registro no Sync Impact Report, atualização de versão conforme o impacto, data e justificativa. Dúvidas não resolvidas devem ser registradas como esclarecimentos antes do planejamento.

**Version**: 1.0.0 | **Ratified**: 2026-08-26 | **Last Amended**: 2026-08-26

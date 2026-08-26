# Requirements Quality Checklist: Redesign do ambiente pós-login do Custo Dashboard

**Purpose**: Verificar a qualidade, completude, consistência e testabilidade dos requisitos antes da etapa clarify/plan.
**Created**: 2026-08-26
**Feature**: [spec.md](../spec.md)

**Review Ownership**: Esta checklist é um artefato de revisão da qualidade dos requisitos. `[x]` indica que o critério foi revisado e satisfeito; não indica implementação concluída.

## Completude e rastreabilidade

- [x] CHK001 O objetivo descreve o valor para operador e gestor e mantém o fluxo pós-login segmentado por projeto.
- [x] CHK002 As jornadas cobrem navegação, projetos, captura, edição, importação, visão executiva, análise, filtros, comparações e entregas.
- [x] CHK003 Cada jornada possui prioridade, justificativa, teste independente e cenários Given/When/Then.
- [x] CHK004 Os requisitos identificam estados vazios, carregamento, erros, sucesso, autorização, privacidade, responsividade e acessibilidade.
- [x] CHK005 As entidades representam os conceitos necessários sem depender de detalhes de implementação.
- [x] CHK006 As fontes de requisito e a reconciliação entre status v4.3 e documentos v3 estão registradas na especificação.

## Clareza e ausência de ambiguidade

- [x] CHK007 Cada requisito funcional descreve uma capacidade observável e evita placeholders.
- [x] CHK008 Os requisitos distinguem ausência de dados, zero, indisponibilidade e erro, evitando interpretações financeiras enganosas.
- [x] CHK009 Orçamento versus realizado define as condições de disponibilidade e as variações esperadas.
- [x] CHK010 O contexto do projeto e a prevenção de mistura entre projetos aparecem nas jornadas, requisitos, edge cases e métricas.
- [x] CHK011 Não há marcadores `NEEDS CLARIFICATION`; as lacunas restantes foram tratadas com suposições seguras e condicionais explícitas.
- [x] CHK012 Os termos operador, gestor, projeto, custo, indicador, dashboard, relatório e publicação são usados de forma consistente.

## Testabilidade e critérios de aceitação

- [x] CHK013 Cada requisito crítico tem cenário de aceitação ou está coberto por cenário equivalente.
- [x] CHK014 Os critérios de sucesso possuem métricas, populações de teste, limites ou condições verificáveis.
- [x] CHK015 Os critérios cobrem preservação das capacidades legadas e substituição equivalente quando aplicável.
- [x] CHK016 Os critérios cobrem responsividade nos três viewports de referência e operação por teclado/leitor de tela.
- [x] CHK017 Os critérios cobrem integridade de dados, arredondamento, origem, persistência e consistência entre dashboard e entrega.
- [x] CHK018 Os critérios cobrem privacidade em sessão expirada, falta de autorização, recurso inexistente e publicação.

## Escopo, limites e governança

- [x] CHK019 O login imutável está delimitado pelo caminho exato e por aparência, comportamento, animações, assets e autenticação.
- [x] CHK020 Alterações de autenticação, contratos de API e modelo persistido estão explicitamente fora do escopo.
- [x] CHK021 Comparativo entre projetos, novas permissões por projeto e demais itens futuros estão explicitamente limitados.
- [x] CHK022 A especificação proíbe remoção silenciosa de capacidades existentes sem substituição equivalente.
- [x] CHK023 A especificação evita decisões de implementação e mantém foco em comportamento e resultado de negócio.
- [x] CHK024 Não foram criados plan.md, tasks.md ou outros artefatos fora do escopo solicitado.

## Consistência com a constituição

- [x] CHK025 Os requisitos aplicam login imutável, integridade/rastreabilidade de custos e uso prioritário dos contratos e dados existentes.
- [x] CHK026 Os requisitos exigem UX profissional, responsiva, acessível e PT-BR.
- [x] CHK027 Os requisitos incluem qualidade verificável, mudanças pequenas, segurança, simplicidade e privacidade.

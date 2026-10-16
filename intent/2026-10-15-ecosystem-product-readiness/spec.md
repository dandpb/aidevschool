# Spec: reparos de verificação e prontidão dos engines

Change-id: `2026-10-15-ecosystem-product-readiness` · From: [intent.md](intent.md) e [design.md](design.md) · Status: **accepted**

Esta spec mantém a cadeia local `intent → spec → plan` sem duplicar a discovery. O pedido de Daniel para planejar, com prioridade aos PRs #657/#656, é a fonte da ordem; não é aceite de implementação nem claim de prontidão.

## Requirements

Os requisitos executáveis estão numerados exclusivamente em [plan.md — Criteria](plan.md#criteria): 1–7 integridade do gate; 8–13 Literacy v4 e endpoint; 14–15 integração; 16–30 qualificação dos 14 engines; 31–33 claims; 34 oferta do piloto. Cada critério deve receber prova própria na implementação; este apontador não cria um segundo conjunto de obrigações.

## Design

Shape, fronteiras e semântica são as da [discovery](design.md#shape). Reutilizar os dois PRs existentes e a autoridade atual de readiness, qualificar os engines no uso declarado e preservar estado/histórico reais. O JSON informativo dos 14 engines não é bundle de observação canônica nem concede tier. Placement de código/helpers reversível é confirmado pelo executor contra a árvore atual.

## Policy applied

Root `AGENTS.md`, engine/learner AGENTS aplicáveis, `docs/sdlc/README.md`, `REVIEW.md`, `docs/product-readiness/REGRANT-RUNBOOK.md`, regra de tentativa/evidência antes de `mastered`, produtor distinto do verificador, teste protegido com aceite específico e merge pela porta única. As regras complementam `heropa:sdlc-plan`; a casa de artefatos é `intent/` porque o helper de placement instalado resolve outro workspace.

## Flagged concerns

- Owner da política/PR: confirmar o aceite de edição protegida já citado nos reparos; ver Unresolved 1. Nenhum override foi autorizado ou aplicado por este plano.
- Responsável pelo runtime: comprovar harnesses/perfis isolados e fechar o spike sem ampliar o produto; ver Unresolved 2.
- Operador do piloto: fornecer prova do deploy realmente oferecido; ver Unresolved 3.
- Verificador de integração: main observada avançou de `f98e7fa3` para `0a2e2dbe`; renovar a âncora ao executar. Prova histórica não ganha novo SHA por edição de metadata.

## Out of scope

Os itens de [plan.md — Out of scope](plan.md#out-of-scope) são vinculantes: nenhuma plataforma nova, unificação de progresso, autonomia adicional ou correção não planejada de um incidente futuro está incluída.

> Aceite de execução local: Daniel invocou explicitamente `heropa:sdlc-implement` para este plano nesta conversa. Exceção delimitada do teste #656: [registro humano](owner-approval-pr656.json). Publicação, push, deploy e merge permanecem ações separadas.

## Decisões humanas de 16/10/2026

[Registro direto](owner-decisions-20261016.json): C11 passa a provar o único final UI oferecido (a3), preservando todos os contratos a1/a2/a3 de C8–10. Para C24, o alvo é a aplicação/entrada local existente; briefing somente leitura e núcleo de referência não substituem o ciclo completo exigido. Nenhum runtime novo ou promoção de mastery é autorizado por essa orientação. Jev usa as variáveis de ambiente configuradas, sem registrar seus valores. O freeze e o relatório da rodada1 permanecem históricos.

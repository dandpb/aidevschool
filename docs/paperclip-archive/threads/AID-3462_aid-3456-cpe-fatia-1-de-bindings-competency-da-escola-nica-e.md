# AID-3462: [AID-3456] CPE — fatia 1 de bindings/competency da escola única (escopo ratificado na matriz r2 do PR #610)

- **Status:** cancelled | **Priority:** medium | **Origin:** manual
- **Assignee:** — | **Created:** 2026-09-30T12:23:34.120958+00:00 | **Updated:** 2026-11-01T14:12:36.773+00:00
- **ID:** `0ac3cd90-8613-43f6-9d70-4143bd60dbd0`

## Description

Trabalho delegado pela ratificação AID-3456 (matriz r2, PR #610 @ f31f21e3, §12 de intent/AID-3453-unify-school/curriculum-matrix.md).

Escopo ratificado pela CCE (decisões [D] na r2):
1. Bindings dev opcionais: workflows 02–11 + exemplo, curso-simples M1–M9, sdlc-quest (18 missões + 16 tarefas TLC), projetos 01–18.
2. Binding dos 10 jogos voxel hoje sem binding (game-04, game-10–game-18) como missões dev opcionais.
3. Campo competency (P primária/S apoio) em catalog.yaml/mission-bindings — incl. atribuição primária por missão sdlc-quest e por jogo voxel.
4. Estados de missão bound/visible/guided/readiness como campos explícitos (sem breaking do schema v1) — revisão UX/QA.
5. Registrar no plano de fatia o perigo do seed ZAI (prisma/seed.ts deleteMany — R8/R9) e reusar o gate no-code existente (learner/gate/no_code.py:66, decisão AID-3453 2026-09-30).
6. Versionar fixtures/SHA dos quizzes de projeto antes do reuso (curriculum/01,02 docs/quiz.md são calibrados contra o fonte atual).

Blockers:
- Aprovação da matriz r2 pelo Content Designer (confirmação pendente em AID-3456).
- Contratos compatíveis (schema mission-bindings v1 sem breaking) + QA independente (RC-4..RC-6; recibos de harness são T1 — R10).

Hard constraints: sem exclusão em massa, sem writes em learner/mastered, IDs preservados, migração ZAI gradual por módulo com tests/e2e. AID-1222 preservado (l33–l35 data-gated).

## Comments (3)

**founder** · 2026-09-30T12:25:13.905941+00:00

Consolidada em AID-3457, frente CPE existente e já atribuída. Esta tarefa foi criada em duplicidade de coordenação; não contém implementação ou comentários. Os requisitos de currículo r2 e os gates de Content Designer/QA serão preservados na 3457 com referência a esta descrição. Não iniciar execução paralela. Histórico preservado; cancelamento recuperável, sem apagar dados.

**Curriculum Content Engineer** · 2026-09-30T12:31:15.929845+00:00



**Curriculum Content Engineer** · 2026-09-30T12:37:42.524903+00:00

# Relatório de consolidação AID-3462 + entrega r2.1 (CCE, em resposta a 343e64ea e 40d060ac)

Postado aqui porque AID-3462 é a âncora da consolidação e porque **comentários/interações da CCE em AID-3456/AID-3453 retornam 403 "outside this actor's authorization boundary"** durante o estágio de revisão (assignee = Content Designer f2b1e95d; CCE = returnAssignee). Pedidos à Coordenação/Content Designer: cross-referenciar este relatório na thread AID-3456.

## 1. Escopo exato de AID-3462 (o que foi cancelado)

6 itens: (1) bindings dev p/ workflows 02–11+exemplo, curso-simples M1–M9, sdlc-quest (18 missões+16 TLC), projetos 01–18; (2) bindings dos 10 jogos voxel sem binding (game-04, game-10–18); (3) campo `competency` P/S com atribuição primária por missão sdlc-quest e por jogo voxel; (4) estados de missão bound/visible/guided/readiness como campos explícitos (revisão UX/QA); (5) registrar perigo do seed ZAI (prisma/seed.ts deleteMany) + reusar gate no-code (learner/gate/no_code.py:66); (6) versionar fixtures/SHA dos quizzes de projeto. Não havia implementação nem comentários — cancelamento sem perda.

## 2. Overlap com AID-3457 — veredito: **apenas o item 3**

- Item 3 SOBREPÕE: entrega 2 da 3457 (campo opcional em catalog.yaml/mission-bindings + propagação em learner/substrate/mission_catalog*.py + teste). O audit do PR #611 (achado F-1, `lesson.schema.json` additionalProperties:false) já mostra que a emenda de schema é pré-requisito. A **atribuição de conteúdo** (P/S por missão/jogo) está ratificada na matriz r2 §7/§9 — insumo CCE pronto para converter os [P] do crosswalk §3 do audit.
- Itens 1, 2, 4, 5, 6 **NÃO estão no escopo atual da 3457** (entregas dela = bindings l25–l32 ai-pratica + competency + MANIFEST + PR próprio). Continuam registrados na matriz r2 §12 (itens 1, 2, 7, 8, 9) **sem frente dona**. Decisão pendente para a Coordenação: (a) estender a 3457 como fases, (b) fatia futura sob AID-3453 quando r2 aprovada, ou (c) manter só na matriz §12. Não criarei frentes/tarefas sem autorização.

## 3. Entrega executora desta onda: r2.1 — correções da revisão dirigida 40d060ac

Branch isolada **`aid3456/r2-content-fixes` @ bacc6e65** (base = PR #610 head 0481c8c0), para o FPE integrar (único integrador da branch PR610, conforme 40d060ac):
- **P1 l16**: critério `c-redact` dividido em `c-redact-shape: met` (tipo declara intenção) e `c-redact-runtime: not_met` (data é passthrough; safeForLogging só espalha o payload; data.token não é redigido em runtime) — sem creditar runtime por anotação de tipo; perChecks reescritos.
- **P2 l28**: feedback37 e feedback105 limitam prova aos cenários cobertos pela suíte ("suíte verde diz 'o que testei continua igual', não 'nada mudou'").
- **P2 l16/l27**: onSuccess em linguagem neutra ("ajuda a orientar ... e verificar").
- **Mapeamentos**: matriz §2 normalizada por objetivo — l17→D5, l29→D3, l20→F4 — + nota de que linhas agrupadas não são contrato mecânico pronto.
- §11 da matriz registra todos os fixes com rastreio.
- **Prova**: `validate.py` 32 OK; tools 46 tests passed; corpus do verificador regenerado (`--compile-verifier`); `learner/gate/tests` **525 passed, 1 skipped**; `python3 -m learner.substrate` regenerou 31 projeções sem erro.

## 4. Estado e caminho

AID-3456 segue **in_review** com caminho real: Content Designer revisando o head 0481c8c0 (diretrizes 40d060ac) + branch r2.1 acima; CCE retorna como assignee após a decisão. Blockers declarados: aprovação r2/r2.1 (Content Designer), contratos compatíveis (schema sem breaking + QA RC-4..RC-6) para os gaps §12. Sem merge/release; nada foi publicado além da branch isolada.

---


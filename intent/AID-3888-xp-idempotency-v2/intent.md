# Intent: XP idempotente por alvo/dia local + estado autoritativo completo com preservação de dados (literacyDojo)

Author: PO (Dani) via despacho `bdaa0db3` (2026-10-07T16:14:02Z) · Change-id: AID-3888-xp-idempotency-v2 · Status: accepted

> Origina do issue Paperclip AID-3888. A cadeia documental completa vive no
> fluxo do issue e é citada, não reescrita: contrato `a0bf3e8a` + errata
> `25b51990` (correção PO `a02b08b0`), plano `31b50f15`, correção lacuna-4
> `3b9e7f8a` (revisão PO `8b42a157`), precisões `46086ca0` (despacho
> `54f9a0e9`) e adendo de precedência `e3ad989e` (correção `3daff6c8`).
> Autorização de implementação + C1 (5 testes protegidos): despacho PO
> `bdaa0db3` de 2026-10-07 16:01 UTC. **Não é aceite dos hunks antigos do
> PR #663** (protótipo B, branch `aid3888/xp-idempotency` @ `30ce2fcb`,
> preservado em HOLD como referência).

## Problem

XP é attempt-granular por design (`progress.ts`): cada tentativa aprovada
paga 10 XP e cada conclusão paga 25 XP — reload no meio de uma atividade
(respostas transitórias por contrato) reconcede XP de atividade ao
re-responder (observação QA L20/AID-3694: 65 XP onde o produto quer 55).
Além disso, o boot atual descarta progresso incompatível
(`services.ts` catch → reset), o que a errata `25b51990` reclassifica como
bloqueante de design com preservação obrigatória de dados.

## Proposed outcome

- 10 XP 1× por (lessonId, activityId, **dia local**); re-concessão exige data
  estritamente posterior à última premiada do alvo (relógio recuado não paga).
- 25 XP somente na **primeira conclusão** (marcador permanente; review/replay
  não re-paga). Falha/prática/evidência não consomem elegibilidade.
- Estado autoritativo completo (progresso + XP + ledger) em namespace próprio
  (`learner-state-v2`); ramo legado (`learner-progress`) preservado e
  somente leitura pós-corte; snapshot do corte (`cutover-snapshot-v1`)
  persistido ANTES da ativação; seed somente com ausência CONFIRMADA (ausência
  ≠ erro ≠ inválido); estado novo válido é autoritativo (precedência
  `e3ad989e`); reset explícito marker-first (`reset-intent-v1`) sem
  restauração indevida; import/boot/rollback sem perda; envelope de backup v2
  com rejeição integral antes de persistir; concorrência entre abas (sem CAS)
  declarada como lacuna (last-write-wins).

## Affected users and systems

`engines/literacyDojo/` (domínio, ports, adapters, use cases, boot, UI de
bloqueio, E2E). Nenhuma mudança em curriculum/learner ou outros engines.

## Constraints

- C1 autoriza editar SOMENTE 5 arquivos de teste existentes:
  `playwright/backup-restore.spec.ts`, `playwright/gamification.spec.ts`,
  `tests/application/useCases.test.ts`, `tests/domain/migration.test.ts`,
  `tests/domain/progress.test.ts` — adaptados ao contrato final, sem
  enfraquecer garantias (trailer `SDLC-ALLOW-TEST-EDIT: AID-3888` no commit).
- HOLD de aceite/liberação até testes no head final + revisão independente
  V&E. Sem merge/publicação/deploy autorizados neste slice.
- `mastered` permanece proibido; produtor ≠ verificador; conteúdo gerado
  intocado (`gen:content`).
- Final de linha do protótipo B: schema-5-in-record é rejeição tipada
  (`prototype-schema-5`) com preservação — nunca cast silencioso.

## Open questions (carregadas como lacunas declaradas)

- CAS/concorrência entre abas (proposta futura: single-writer via Web Locks).
- Recuperação/exportação do dado em quarentena na UI de bloqueio (porta
  `readRawForRecovery` planejada; não implementada nesta fatia).

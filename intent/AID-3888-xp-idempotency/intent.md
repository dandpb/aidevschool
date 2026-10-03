# Intent: XP idempotente por atividade no literacyDojo (AID-3888)

Author: FPE (agent fa8130d5) · Change-id: AID-3888-xp-idempotency ·
Status: implemented (decisão de produto FPE no escopo do cargo: dono do
learner app; carrier AID-3888, filha da observação não-bloqueante da QA
L20/AID-3694 registrada pela V&E em `759089da`)

> Paperclip carrier: AID-3888. Input: QA L20 (AID-3694, `75de42af`) +
> contracheque V&E (`759089da`, item 4: `progress.ts` attempt-granular por
> design; encaminhamento "decisão de produto, não defeito").

## Problem

XP por atividade é attempt-granular (`awardXp(next, XP_PER_ACTIVITY_PASS, …)`
a cada tentativa aprovada) e respostas são transitórias por contrato
(`README.md` §"Respostas são transitórias"). A QA L20 mediu no RC r4
(`b20fdc74`): reload no meio da lição → mesma lição reapresentada da intro →
re-responder reconcede XP (65 = 10+30+25; 10 XP duplicados pelo reload).
Vetor de inflação de gamificação por reload intencional (ou replay/retry
aprovado). Nenhuma regra declarada era violada — decisão de produto exigida.

## Decision (owner FPE — AID-3888)

**XP passa a ser idempotente por alvo e data local:**

- **D1 — atividade:** `XP_PER_ACTIVITY_PASS` (10) paga no máximo 1× por
  (`lessonId`,`activityId`, data local). Reload/retry-aprovado/replay/revisão
  no MESMO dia não reconcedem.
- **D2 — conclusão:** `XP_PER_LESSON_COMPLETE` (25) paga no máximo 1× por
  (`lessonId`, data local). Replay no mesmo dia não reconcede.
- **D3 — dia seguinte paga de novo:** revisitas/revisões espaçadas em data
  posterior reconcedem normally. Justificativa: `DAILY_GOAL_XP = 10` reseta
  por dia e é alimentado por XP de atividade; idempotência once-ever zeraria o
  ganho de dias só-de-revisão e quebraria o loop de engajamento do público
  não-técnico. Granularidade do XP alinhada à granularidade da meta diária —
  uma regra explicável ("cada atividade paga XP uma vez por dia").
- **D4 — registro mínimo:** ledger `xpAwards: Record<chave, dataLocal>` no
  `LearnerProgress` (schema 4 → 5, migração forward-only v4→v5 com registro
  vazio). Só ids + data — sem respostas, sem texto livre (storage.policy
  intacto).
- **D5 — contratos intactos:** evidência (`LiteracyEvidenceRecord` por
  tentativa avaliada, `verifierRequired: true`), analytics (funil por
  tentativa/conclusão), streak, skills/revisão espaçada, `mastered`
  proibido — nada muda. XP é sinal de engajamento no progresso local, não
  evidência.

Efeito no cenário QA L20: 55 (10+0+10+10+25), não 65.

## Alternativas descartadas

- **Once-ever por atividade:** mata o XP de revisão em dia posterior → meta
  diária inalcançável em dias só-de-revisão (D3).
- **Persistir respostas/bestScores por atividade para dedup:** violaria o
  contrato de privacidade (respostas transitórias); o ledger D4 é suficiente.
- **Migrar XP para bônus só-na-conclusão:** mudança de cadência de recompensa
  fora do escopo da decisão pedida (idempotência), impacto maior no produto.

## Plan (collapsado — mudança pontual de domínio)

1. `src/domain/progress.ts`: campo `xpAwards`, `PROGRESS_SCHEMA_VERSION = 5`,
   `awardXpOncePerDay(progress, key, amount, now)`; `recordActivityAttempt`
   ganha `activityId` e usa a chave `activity:<lessonId>:<activityId>`;
   `completeLesson` usa `lesson:<lessonId>`.
2. `src/domain/migration.ts`: `migrateV4toV5` (acrescenta `xpAwards: {}`).
3. `src/application/useCases.ts`: repassa `activityId` (sem nova porta).
4. Testes: domínio (6 casos novos incl. cenário L20 55≠65 e replay diário),
   migração (4→5), aplicação (reload mesmo dia não reconcede; evidência por
   tentativa intacta).
5. E2E: `backup-restore.spec.ts` (schemaVersion constante), `gamification.
   spec.ts` (revisão same-day não reconcede; ledger com 4 chaves).
   **SDLC_ALLOW_TEST_EDIT** (owner FPE, precedente AID-3527/`d8d5a947`):
   edição pontual de specs E2E existentes que codificavam o comportamento
   antigo (85→55; 4→constante) — são atualizações de contrato, não afrouxamento.
6. `README.md`: contrato de XP idempotente documentado (mesma seção que a QA
   usa como contrato declarado).

# ADR — FSRS real scheduling: guided-practice conclusions advance cards (AID-5005)

**Status:** proposed (PR review) · **Date:** 2026-10-17 · **Owner:** Learning Engine Engineer

## Context

Lesson gates already feed FSRS (`learner/substrate/gate.py` → reviews →
`build_card_from_reviews` replay), and dojoToday derives the daily queue from
that replay. Two gaps kept the pedagogical motor from being honest end to end:

1. A verified **guided-practice** conclusion (OS cycle `pratica-concluida`)
   produced only local, device-bound state — no FSRS card advanced, so
   re-exposure of practiced concepts was never scheduled.
2. The card state itself (`stability`/`difficulty`/`due`) was never
   materialized into derived views, so consumers (dojoToday queue, OS
   `learner.ts`) could not observe or assert scheduling truth.

## Decision

1. **One rating source, one replay path.** A guided-practice conclusion is
   re-verified independently by the substrate (`learner/substrate/practice.py`)
   against the canonical package (content pin, rubric criteria, verdict
   policy, attempt cap, takeaway). Only a fully verified conclusion writes
   exactly ONE gate review with `gate_kind: guided_practice`:
   attempt 1 → `pass_first_try`/`good`; retry → `pass_retried`/`hard`.
   `RATING_FROM_GATE` stays the single rating source (ADR spaced-repetition:
   rating only from executable gate outcomes, never self-report).
2. **Practice never masters.** `mastered` stays `false`; `validate()` rejects
   a mastered practice unit and binds every receipt digest
   (`learner/practice_receipts/`, sha256 of file bytes; no producer-embedded
   `verifier` block; per-review trail checked).
3. **Card state is materialized.** `derive_next_reviews` rows now carry
   `stability`/`difficulty`/`due` (rounded to 4 dp, deterministic), flowing to
   dojoToday `today.ts` and both OS/dashboard `learner.ts` snapshots. The
   pixel/voxel review slices keep their frozen row shape (games don't consume
   card internals).
4. **One bridge.** `engines/minimaxDojo/core/fsrs_bridge.py` is the only
   engine-side entry: `record_practice_conclusion` (verify → commit → refresh
   derived views) and `dojo_queue` (same derivation dojoToday uses, so
   "recorded" and "reflected" cannot drift).

## Consequences

- Invariant: dada uma conclusão verificada da prática P em D, o cartão avança
  exatamente uma revisão, `mastered` permanece false e a fila diária reflete
  o novo `due` na próxima derivação (testado ponta a ponta).
- Failed/insufficient practice attempts write nothing (only *verified
  conclusions* schedule); revisit if MNEME later needs "again" semantics —
  that change must go through this ADR's rating-source rule.
- Per-user FSRS personalization stays deferred (unchanged ADR open question).

## Alternatives considered

- Record practice as a NEW review event kind — rejected: schema/ADR churn and
  a second rating producer; the `gate_kind` label (ADR-0004 pattern) keeps one
  vocabulary.
- Let the OS app write reviews directly — rejected: producer ≠ verifier; the
  substrate re-verifies every receipt independently.

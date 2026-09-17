# Agent Note: Input hardening on /api/activity and /api/playground/save

Status: implemented

> Shipped 2026-08-19 via the `prove-the-bug` workflow. Two findings from the
> W6 route audit (delegated subagent, claims verified against source) were
> closed. `/api/activity` now rejects unparseable cursors with `400
> invalid-cursor` instead of leaking a Prisma `Invalid Date` error as a 500;
> `/api/playground/save` writes via `updateMany` scoped by `learnerId` so the
> write itself — not just the upstream check — can only touch the current
> learner's thread. Pinned by new tests in `tests/api/activity.test.ts` and
> `tests/api/playground-save.test.ts`; full suite 125/125.

## Problem

The audit flagged (1) `cursor` passed raw to `new Date(...)` — the only query
param in the repo without defensive coercion, turning garbage input into a 500
— and (2) `chatThread.update` scoped only by `id`, with ownership verified in
a separate `findFirst`. The red test for (1) failed exactly as predicted:
Prisma throws `Invalid value for argument lt: Provided Date object is
invalid`, uncaught, surfaced as 500. For (2) no behavioral red exists — the
upstream guard is synchronous and catches every cross-learner path — so that
fix is defense-in-depth pinned by a characterization test (another learner's
thread is never modified), applied honestly as hardening rather than bugfix.

## Consequences

- `/api/activity` follows the repo's query-param convention (`limit` already
  coerced; `cursor` now too).
- The playground write is structurally owner-scoped: even a future refactor
  that weakens the `findFirst` guard cannot cross the ownership line.
- Still open by design: the client-supplied `reply` persisted as "assistant"
  content is an architecture decision (server-side LLM call vs client-gateway),
  not a validation bug — it stays registered for a future spec.

# 04 — Change game logic

**Trigger:** touching grading rules, heart regen/gating, streak/freeze, XP/gems awards, league math, or the lesson-completion pipeline.

All of this flows through two seams: `src/lib/game-state/index.ts` (read seam — snapshot resolves league reset, heart regen, streak preview) and `src/lib/lesson-completion.ts` (write pipeline — one interactive Prisma transaction). Routes are thin adapters; the rules live in the seams.

## Steps

1. **Write the failing test first** (red). This repo extracts and fixes game logic test-first — see `tests/unit/lesson-unlock.test.ts` (11 tests before the module existed) and `tests/unit/lesson-completion-clock.test.ts` (red → green clock fix).
2. Make the change inside the seam module, keeping shared `src/lib/` modules **pure** (zero imports) so they never pull Prisma into the client bundle.
3. Pass time explicitly. Any temporal function takes `now`/`clock`; inside the pipeline, write timestamps with `new Date(now)` — a single wall-clock `new Date()` silently defeats the injected clock (see [lesson-attempt-clock-consistency](../notes/implemented/architecture/2026-08-19-lesson-attempt-clock-consistency.md)).
4. If DB helpers need to join the pipeline's transaction, accept an optional `Prisma.TransactionClient`/`DbClient` like `getCurrentLearner` and `syncAchievements` do.
5. Green the new test, then the full bar: [verify before done](02-verify-before-done.md).

## Verification

- The new test fails before the change and passes after (cite red → green).
- `npx vitest run tests/unit` and `npx vitest run tests/api` stay green — they are the characterization suite for the seams.

## Pitfalls

- Never duplicate a rule to "move fast": five game facts once lived in two copies each and diverged (swipe grading). Single-source or don't ship.
- Remote-service calls do not belong inside the pipeline transaction (default 5s timeout).
- Time baselines get dedicated columns (e.g. `Learner.heartsUpdatedAt`); reusing `updatedAt` lets unrelated writes delay regen.
- Test clock behavior with `now` in the past **and** future — that is what exposed the wall-clock bug.

## Sources

- [lesson-completion-pipeline](../notes/implemented/architecture/2026-08-18-lesson-completion-pipeline.md)
- [game-state-snapshot-seam](../notes/implemented/architecture/2026-08-18-game-state-snapshot-seam.md)
- [lesson-attempt-clock-consistency](../notes/implemented/architecture/2026-08-19-lesson-attempt-clock-consistency.md)
- [collapse-duplicated-game-logic](../notes/implemented/simplification/2026-08-18-collapse-duplicated-game-logic.md)

# Agent Note: Achievement evaluate/award split; reads never mutate

Status: implemented

> Shipped 2026-08-18. `src/lib/achievement-sync.ts` is now two functions behind one sync facade: `awardAchievements(learnerId, slugs, client?)` persists exactly the awards it's given and returns exactly what changed ({ newlyUnlocked, gemsGained, xpGained }); `syncAchievements(client?)` = gather context → pure `evaluateAchievements` → award, joining the caller's transaction when given one and wrapping itself in `db.$transaction` otherwise. `GET /api/achievements` is read-only — the sync-on-GET side effect is gone, and the store no longer pushes toasts from GET responses. Pinned by `tests/unit/achievement-award.test.ts` (double-award is a no-op, unknown slugs ignored, rewards match return value).

## Problem

`syncAchievements()` hid check-then-create plus gem/XP increments plus activity logging behind a zero-argument interface that couldn't say what it changed. It ran inside a GET (a read that mutated the learner), its check-then-award wasn't atomic with the triggering mutation, and the impure half had zero dedicated tests while the pure half was thoroughly tested — coverage was concentrated exactly where the bugs weren't.

## Consequences

- Unlock triggers are now mutation-side only: lesson complete/practice and playground save. `liga-prata` (league-based) unlocks at the next mutation after a league reset, not on a passive GET — accepted as the honest behavior for a read-only seam.
- Toast dedup has one rule, client-side: `pushAchievementToasts` filters slugs already visible.

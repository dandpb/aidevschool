# Agent Note: Game-state snapshot seam (design-it-twice executed)

Status: implemented

> Shipped 2026-08-18. `src/lib/game-state/index.ts` is the single read seam for learner state: `snapshot(opts?: { clock? })` settles weekly league reset, heart regen, and streak preview internally and returns one typed snapshot with absolute timestamps (`at`, `hearts.nextRegenAt`) and a transient `notices[]` channel (`league-reset`, `freeze-used`, `hearts-regenerated`). `src/app/api/state/route.ts` is a one-line adapter. The Zustand store keeps one `snapshot` field + `snapshotAt` receipt clock; `refreshState()` routes notices into `freezeNoticeActive`/`freezeToastDismissed` (re-arms only when the notice reappears after an absence) and a persistent-until-dismissed `leagueResetNotice`. Client types are derived via `import type` from the server module (`src/components/game/game-state.ts`), so wire drift is a compile error. Pinned by `tests/unit/game-state.test.ts` (fixed-clock regen, freeze notice, league-reset notice, idempotency) and the rewritten `tests/api/state.test.ts`.

## Problem

The 2026-08-16 design-it-twice exercise (docs/design-it-twice/) chose this design — verdict: hybrid on design C, one `snapshot()` entry, mutations return GameSnapshot, temporal maintenance invisible to callers — but it was never executed. Meanwhile every route re-implemented temporal maintenance inline: `/api/state` carried ~90 lines of assembly, heart regen was a compute-then-persist dance in 3 routes (and forgotten in the shop route, where a learner with a pending regen could be charged 5 gems for hearts they'd get free), and the store mirrored the HTTP shape with loose fields (`recentFreezeUsed`, `leagueReset`, `heartRegenMs`) that could drift silently.

## Decision

Execute the recorded plan as written, with one deviation: `leagueMeta` was NOT re-added to the snapshot (the 2026-08-18 simplification note removed it as unread — re-adding would relitigate an implemented decision). Freeze-used remains window-based (5 minutes) rather than strictly transient, preserving the old `recentFreezeUsed` semantics consumers relied on.

## Consequences

- Temporal functions now take explicit `now` (`recomputeHearts`, `computeStreakState`, `checkAndApplyLeagueReset`) — the clock lives at the seam, not hidden in `Date.now()`.
- Mutations still trigger a store `refreshState()` rather than returning the snapshot inline (the design's "mutações retornam GameSnapshot" step); that's a deliberate staging choice, not a rejection — revisit when a mutation's response shape next changes.

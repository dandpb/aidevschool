# Intent: miniTown Bolt perf — indexed loop in Town.tick()/snapshot() (PR #676)

Author: ORDEM CEO (diretiva f0fa79ef, fila pós-#679) via Paperclip AID-4871 · Change-id: AID-4871-minitown-bolt-snapshot-loop · Status: accepted

> Origin: AID-4871 "ORDEM CEO (f0fa79ef, fila pós-#679): QA Lead — preparar
> #676 e #680 (Bolt perf, GO duplo) p/ porta: intent/ + countersign próprio;
> CEO executa o merge" (assigned to QA Lead). Runtime delta produced by
> Jules/Bolt (task 6057763349986185013); this change record documents the
> independent verification and gate preparation. The CEO executes the merge.

## Problem

`Town.tick()` iterates `this.buildings` with `for...of` and `Town.snapshot()`
indexes `this.buildings[i]` twice in the `roofedCount` loop. `tick()` +
`snapshot()` run every frame (60 FPS), so per-iteration iterator objects are a
theoretical GC-pressure source. A prior Bolt attempt to cache `roofedCount`
was rejected as buggy (misses init/load/delete lifecycle — see the
`.jules/bolt.md` 2024-10-10 entry carried by this PR); the indexed-loop
variant is the safe alternative.

## Proposed outcome

1. `tick()` and `snapshot()` iterate buildings with a traditional indexed
   `for` loop and a hoisted local with a truthiness guard; observable
   behavior unchanged (dense arrays; guard is defensive only).
2. Registry entry in `.jules/bolt.md` (+3) travels with the change; no other
   files change.
3. QA verdict GO on behavior preservation; perf claim assessed honestly
   (see plan §evidence): in Node 24/V8 the `for...of` iterator over a dense
   array is escape-analyzed away, so no measurable delta was observed —
   the change is neutral, not a regression.

## Affected users and systems

`engines/miniTown/` only (Level 0 explore-only surface; never writes learner
state). Files: `engines/miniTown/src/scene/state.ts` (+8/-3) and
`.jules/bolt.md` (+3). No substrate, no CI workflows, no learner state.

## Constraints

- Producer (Jules/Bolt) ≠ countersigner (QA Lead): independence per AID-2768;
  merge only through `scripts/merge_pr.sh` with countersign-gate green on the
  pinned head; the CEO (not QA) executes the merge for this queue.
- miniTown gates must pass on the exact head: biome lint, vitest 31/31,
  `tsc --noEmit`, `vite build`, Playwright smoke (1 spec) + readiness report.
- No new dependencies; no public API change.

## Known interaction with PR #680

Both PRs append 3 lines at the end anchor of `.jules/bolt.md`. Whichever
merges SECOND will hit a trivial `.jules/bolt.md` conflict (resolution: keep
both entries). That branch update moves the head and, by design (fail-closed
head pin), requires a FRESH independent countersign before its merge.

## Open questions

None. Cosmetic note: the carried `.jules/bolt.md` entry is dated 2024-10-10
(PR created 2026-10-10); registry-only, not runtime.

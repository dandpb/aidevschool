# Intent: miniTown Bolt perf — allocation-free renderer sync() (PR #680)

Author: ORDEM CEO (diretiva f0fa79ef, fila pós-#679) via Paperclip AID-4871 · Change-id: AID-4871-minitown-bolt-renderer-sync · Status: accepted

> Origin: AID-4871 "ORDEM CEO (f0fa79ef, fila pós-#679): QA Lead — preparar
> #676 e #680 (Bolt perf, GO duplo) p/ porta: intent/ + countersign próprio;
> CEO executa o merge" (assigned to QA Lead). Runtime delta produced by
> Jules/Bolt (task 6916670749973450109); this change record documents the
> independent verification and gate preparation. The CEO executes the merge.

## Problem

`BuildingsRenderer.sync()`, `RoadsRenderer.sync()` and `ZonesRenderer.sync()`
run every frame (60 FPS) and each allocated a fresh `Set` plus `for...of`
iterators unconditionally, only to detect removed entities in the prune pass.

## Proposed outcome

1. Add/update pass becomes an indexed loop with hoisted local + truthiness
   guard; the prune pass (including the `seen` Set) is guarded by
   `entries.size > source.length`.
2. Guard safety argument (verified by probe): the add loop runs first and
   covers every source id; source ids are unique; entries are keyed by id.
   Therefore any stale entry implies `entries.size >= distinct(source ids) +
   1 > source.length` — the guard fires exactly when a stale entry can
   exist. For roads this holds even under `recomputeRoads()` id churn (every
   placeZone regenerates all road ids): mesh count before prune = old mesh
   count + new road count > new road count.
3. Registry entry in `.jules/bolt.md` (+3) travels with the change; no other
   files change.
4. QA verdict GO on behavior preservation AND on the perf direction, with
   first-hand numbers (see plan §evidence): sync rounds ≈4× faster in
   isolation and steady-state heap growth ≈0 vs +2.3 MB/200k rounds on main.

## Affected users and systems

`engines/miniTown/` only (Level 0 explore-only surface; never writes learner
state). Files: `engines/miniTown/src/scene/{buildings,roads,zones}.ts`
(+48/-24 total) and `.jules/bolt.md` (+3). No substrate, no CI workflows, no
learner state.

## Constraints

- Producer (Jules/Bolt) ≠ countersigner (QA Lead): independence per AID-2768;
  merge only through `scripts/merge_pr.sh` with countersign-gate green on the
  pinned head; the CEO (not QA) executes the merge for this queue.
- miniTown gates must pass on the exact head: biome lint, vitest 31/31,
  `tsc --noEmit`, `vite build`, Playwright smoke (1 spec) + readiness report.
- No new dependencies; renderer public API unchanged.

## Known interaction with PR #676

Both PRs append 3 lines at the end anchor of `.jules/bolt.md`. Whichever
merges SECOND will hit a trivial `.jules/bolt.md` conflict (resolution: keep
both entries). That branch update moves the head and, by design (fail-closed
head pin), requires a FRESH independent countersign before its merge.

## Open questions

None.

## Re-anchor addendum (AID-4877, 2026-10-16)

After the AID-4871 countersign (head `bec3f0ca`, GH comment 6206678099), the
producer bot re-pushed the branch twice: `6ae73c22` (02:33:13Z) and `cf6cc455`
(03:05:01Z). Verified net delta `bec3f0ca..cf6cc455` (git diff of the trees):
ONLY the deletion of this `intent/AID-4871-minitown-bolt-renderer-sync/`
record (116 lines); every other file is byte-identical, including all runtime
blobs (`buildings.ts` `9c29f783`, `roads.ts` `aef82f5a`, `zones.ts`
`0992855e`, `.jules/bolt.md` `670a81ae`). The intermediate churn of `6ae73c22`
(catalog/status/test/docs reversions) is fully restored by `cf6cc455`.

Consequences handled by this re-anchor (ORDEM CEO AID-4877, follow-up #680):

1. The pinned head moved → countersign-gate red on `cf6cc455` (fail-closed
   head pin, by design). A FRESH independent QA countersign pins the final
   head (see the AID-4877 verdict comment in Paperclip).
2. `main` advanced to `643b8952` (PR #676 merged) hitting the
   `.jules/bolt.md` append/append conflict predicted above; resolved keeping
   BOTH entries (new blob `2fd48697`); miniTown runtime files untouched by
   the merge commit (merge brings in PR #676's `state.ts` blob from main,
   independently verified and green on main).
3. This record is restored verbatim plus this addendum, so the intent anchor
   travels with the head the CEO will merge.

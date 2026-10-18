# Plan: prepare PR #680 for the merge door (intent + own countersign)

Change-id: AID-4871-minitown-bolt-renderer-sync · From: intent/AID-4871-minitown-bolt-renderer-sync/intent.md · Status: approved

Small-fix fast path (docs/sdlc/README.md §Small-fix): the runtime delta is a
bounded 4-file GC-pressure optimization already produced by Jules/Bolt on PR
#680; QA prepares the gate (this record, independent verification,
countersign). The CEO executes the merge (AID-4871 order). Self-verification
and independent countersign are NOT skipped — QA is verifier, not
runtime-delta producer.

## Files that change

- `intent/AID-4871-minitown-bolt-renderer-sync/{intent.md,plan.md}` (new) —
  this fast-path record (the only files authored in this change).
- Carried unchanged from the PR branch (Jules, head eeb32684):
  `engines/miniTown/src/scene/buildings.ts` (+15/-8),
  `engines/miniTown/src/scene/roads.ts` (+15/-8),
  `engines/miniTown/src/scene/zones.ts` (+18/-11), `.jules/bolt.md` (+3).

## Order of work

1. Independent first-hand verification on the exact PR head eeb32684 in an
   isolated worktree: biome, vitest, `tsc --noEmit`, `vite build`, Playwright
   smoke + readiness report, plus an allocation/latency probe (3×200k
   3-renderer sync rounds) comparing main 0a2e2dbe vs head, including a
   churn-parity check across 5 placeZone waves (recomputeRoads id churn).
2. Bring the branch up-to-date with origin/main 0a2e2dbe (merge; miniTown
   untouched on main since merge-base 304456dd).
3. Add this intent/ record (head moves; re-run the full gate on the final
   head; renderer blobs must equal the verified eeb32684 blobs).
4. Register the producer trailer for Jules/Bolt on the PR conversation
   (backfill precedent #606/AID-3396, #679/AID-4864) BEFORE the countersign.
5. Publish the QA verdict in Paperclip AID-4871, then post the canonical
   countersign comment pinning the final 40-hex head.
6. Wait for countersign-gate + SDLC guardrails green on the pinned head;
   record the disposition. Merge is executed by the CEO via
   `scripts/merge_pr.sh` only (AID-2768 single door).

## Evidence recorded (first-hand, isolated worktrees)

- Gates at head eeb32684 AND at the final head (see AID-4871 verdict):
  biome clean (25 files), vitest 31/31, tsc rc=0, vite build rc=0,
  Playwright smoke 1/1 + readiness JSON.
- Probe (esbuild bundle, node 24.18, 3×200k sync rounds, 60 zones/15 roads,
  DOM-free canvas stub for the road texture):
  - main: 9.5–10.6 µs/round, heapUsed +2.3 MB per 200k-round window;
  - head: 2.43–2.53 µs/round (≈4× faster), heapUsed delta ≈0 (steady state
    allocation-free, matching the "no allocations in steady state" claim);
  - churn parity: mesh/scene-group counts MATCH the town arrays on all 5
    placeZone waves on BOTH sides (roads 15→19 with fresh ids per wave —
    the guarded prune path stays in lockstep with the old unconditional
    prune).
  - GC event counting itself was not observable in this Node (perf_hooks gc
    entries inert — sanity probe with ~300 MB churn also reported 0), so the
    GC-pressure evidence rests on wall time + heapUsed deltas.

## Re-anchor plan (AID-4877, 2026-10-16)

1. Re-verify the bot re-push delta `bec3f0ca..cf6cc455` (net: only this
   intent record deleted; runtime blobs byte-identical — git tree diff).
2. Merge `origin/main` `643b8952` into the branch; resolve the documented
   `.jules/bolt.md` append/append keeping both entries; no runtime edits.
3. Restore this record + addenda; run the miniTown gate first-hand on the
   merged tree (state.ts from #676 + renderers from #680 had never been
   tested together): biome, vitest 31/31, `tsc --noEmit`, `vite build`,
   Playwright smoke + readiness report.
4. Push; CI must be green on the pushed head; publish the AID-4877 verdict;
   post the fresh countersign pinning the final 40-hex head; countersign-gate
   must go green. Merge remains CEO-only via `scripts/merge_pr.sh`.

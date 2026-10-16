# Plan: prepare PR #676 for the merge door (intent + own countersign)

Change-id: AID-4871-minitown-bolt-snapshot-loop · From: intent/AID-4871-minitown-bolt-snapshot-loop/intent.md · Status: approved

Small-fix fast path (docs/sdlc/README.md §Small-fix): the runtime delta is a
bounded 2-file micro-optimization already produced by Jules/Bolt on PR #676;
QA prepares the gate (this record, independent verification, countersign).
The CEO executes the merge (AID-4871 order). Self-verification and
independent countersign are NOT skipped — QA is verifier, not runtime-delta
producer.

## Files that change

- `intent/AID-4871-minitown-bolt-snapshot-loop/{intent.md,plan.md}` (new) —
  this fast-path record (the only files authored in this change).
- Carried unchanged from the PR branch (Jules, head bf2abe70):
  `engines/miniTown/src/scene/state.ts` (+8/-3) and `.jules/bolt.md` (+3).

## Order of work

1. Independent first-hand verification on the exact PR head bf2abe70 in an
   isolated worktree: biome, vitest, `tsc --noEmit`, `vite build`, Playwright
   smoke + readiness report, plus a GC/latency probe (300k tick+snapshot
   iterations ×3) comparing main 0a2e2dbe vs head.
2. Bring the branch up-to-date with origin/main 0a2e2dbe (merge; miniTown
   untouched on main since merge-base 304456dd).
3. Add this intent/ record (head moves; re-run the full gate on the final
   head; state.ts blob must equal the verified bf2abe70 blob).
4. Register the producer trailer for Jules/Bolt on the PR conversation
   (backfill precedent #606/AID-3396, #679/AID-4864) BEFORE the countersign.
5. Publish the QA verdict in Paperclip AID-4871, then post the canonical
   countersign comment pinning the final 40-hex head.
6. Wait for countersign-gate + SDLC guardrails green on the pinned head;
   record the disposition. Merge is executed by the CEO via
   `scripts/merge_pr.sh` only (AID-2768 single door).

## Evidence recorded (first-hand, isolated worktrees)

- Gates at head bf2abe70 AND at the final head (see AID-4871 verdict):
  biome clean (25 files), vitest 31/31, tsc rc=0, vite build rc=0,
  Playwright smoke 1/1 + readiness JSON.
- Probe (esbuild bundle, node 24.18, 3×300k tick+snapshot, 80 buildings,
  all constructions advanced to inhabited): main 1.80–2.05 µs/iter vs head
  1.96–2.11 µs/iter — delta within run-to-run noise; heapUsed deltas ±0.8 MB
  both sides; no GC events attributable to the loop on either side. GC event
  counting itself was not observable in this Node (perf_hooks gc entries
  inert — sanity probe with ~300 MB churn also reported 0), so the assessment
  rests on wall time + heapUsed, and the claim "reduces GC pressure" is
  recorded as NOT INDEPENDENTLY DEMONSTRATED for this delta — verdict GO is
  on behavior preservation + absence of regression.

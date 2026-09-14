# Plan: Bolt air-traffic counters (PR #405)

Change-id: AID-1795-bolt-air-traffic-counters · From: intent/AID-1795-bolt-air-traffic-counters/intent.md · Status: approved (acceptance decision AID-1795)

## Files that change

- `engines/voxelDojo/game-11-air-traffic/src/game/controller.ts` — `predictionAccuracy()` and `resolveWave()`: `.filter((p) => p.correct).length` → indexed `for` loop with `correct` counter (+11/−2).
- `.jules/bolt.md` — appended learning-log entry (+4).
- `intent/AID-1795-bolt-air-traffic-counters/` — this record (new; committed to the PR branch before merge per §PRs automatizados).

## Order of work

1. Replace the two `.filter().length` count sites with counting loops (identical truthiness semantics: `predictions[i]?.correct`).
2. Append the Bolt learning-log entry.
3. Producer record (this file) committed on the PR branch before merge.
4. QA countersign (fresh-context) against this plan; merge single-writer citing the countersign.

## Risks

- Metric drift in `predictionAccuracy`/wave outcome — mitigated: same counting semantics; game test suite green.
- Optional chaining makes counting null-safe (strictly more defensive than before) — no behavioral concern.

## Proof

- CI on the code head `ae6657f0` (pre-record): 38 check-runs, 37 success + 1 skipped, zero failures — including `SDLC guardrails (diff)`, `product readiness (claims)`, `voxelDojo (TS)`, `voxelDojo games/game-11-air-traffic (TS)`.
- After the record commit: same matrix must be green on the new head before merge (hard rule: red does not enter).

## Verification split

QA Lead (Paperclip ca6a3f95) verifies fresh-context against this plan +
intent: diffboundedness (no hunks beyond Files that change), semantic
equivalence of the two count rewrites, CI green on the record head. Producer
(CEO registering the bot's diff) ≠ verifier, never waived.

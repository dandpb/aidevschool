# Plan: adopt verified Bolt renderer-sync delta on a stable branch (PR novo)

Change-id: AID-4882-adopt-bolt-renderer-sync · From: intent/AID-4882-adopt-bolt-renderer-sync/intent.md · Status: approved

Small-fix fast path (docs/sdlc/README.md §Small-fix): the runtime delta is
already produced (Jules/Bolt) and independently verified (QA AID-4871
b101e6ac + AID-4877 91baff31, GO duplo). This change only re-homes that
byte-identical delta on a bot-immovable branch and walks it through the
standard door. Nothing is re-implemented; self-verification and independent
countersign are NOT skipped.

## Files that change

- `intent/AID-4882-adopt-bolt-renderer-sync/{intent.md,plan.md}` (new) —
  the only files authored in this change.
- Carried unchanged from `0c3d88b2` (nothing re-touched):
  `engines/miniTown/src/scene/buildings.ts`, `engines/miniTown/src/scene/roads.ts`,
  `engines/miniTown/src/scene/zones.ts`, `.jules/bolt.md`,
  `intent/AID-4871-minitown-bolt-renderer-sync/`.

## Order of work

1. Isolated clone; fetch and verify `0c3d88b2` lineage: it sits strictly on
   top of origin/main `643b8952` (merge-base = main) and its runtime blobs
   equal the QA-pinned blobs (`git rev-parse` per path).
2. Cut `aid-4882/adopt-bolt-renderer-sync` at `0c3d88b2`; add this record.
3. First-hand gates on the final head (§Proof). Abort on any red.
4. Push branch; open the PR novo against `main` with provenance trailer in
   the body (producer = learning-engineer) and a producer registry comment
   before any countersign (AID-2768 §5 earliest-trailer).
5. Confirm CI on the pushed head: all suites green except `countersign-gate`
   red (expected fail-closed: no countersign yet — it can only go green
   after QA pins this head).
6. Hand off: QA Lead countersigns the new head (fresh verdict comment with
   `head=<40-hex>` + own trailer, citing a re-verification of the carried
   blobs); CEO merges via `scripts/merge_pr.sh` and posts the usual receipts.

## Risks

- Bot force-pushes/creates a conflicting `bolt/*` successor PR — ignored by
  design here; adoption branch is the single door for this delta. (Not
  chosen: re-using PR #680's branch — moving target, already closed.)
- Hidden divergence between carried trees and re-run gates — mitigated by
  running the full gate on the exact final head before the handoff.
- Countersign staleness if anything re-pushes the adoption branch after the
  QA pin — rule: nobody pushes this branch after handoff; any fix means a
  new head and a fresh countersign.

## Proof

Commands on the final head, from the repo's engine contract:

- `cd engines/miniTown && npm run lint` → clean
- `cd engines/miniTown && npm test` → all green (31 specs)
- `cd engines/miniTown && npm run typecheck` → rc 0
- `cd engines/miniTown && npm run build` → rc 0
- `cd engines/miniTown && npm run smoke` → Playwright 1/1 + readiness report
- `git rev-parse <head>:<path>` per runtime file → blobs `9c29f783`
  (buildings), `aef82f5a` (roads), `0992855e` (zones), `2fd48697`
  (.jules/bolt.md) — byte-identity with the verified delta.

## Verification split

- Self (producer, Learning Engine Engineer): gates above, recorded in the
  PR body / Paperclip AID-4882.
- Independent countersigner: QA Lead (ca6a3f95) — fresh verdict + countersign
  comment pinned on the new PR head (fail-closed gate turns green).
- Merge executor: CEO via `scripts/merge_pr.sh` only.

# Plan: Palette explicit ARIA labels for dojoToday track nodes (PR #487)

Change-id: AID-2360-palette-dojotoday-tracknode-a11y · From: intent/AID-2360-palette-dojotoday-tracknode-a11y/intent.md · Status: gated-on-countersign (FPE verdict GO on AID-2360; merge per acceptance path below)

## Files that change

Code (the a11y change itself, by the Palette bot — already on the PR branch):

- `engines/dojoToday/src/main.ts` (+6/−3) — in `trackSection()`: builds
  `ariaLabel = "Lição ${n.num}: ${n.title} (${stateText})"` with
  `stateText` ∈ {concluída, ativa, disponível} covering the full
  `TrackStatus` union; sets `aria-label="${escapeHtml(ariaLabel)}"` on the
  `.track-node` `<li>`; adds `aria-hidden="true"` to the inner
  `.track-num`/`.track-title` spans. Nothing else.

Producer record (this file + intent.md) — committed to the PR branch
before merge (fast path §PRs automatizados item 1; AID-2034/#434
precedent).

## Order of work

1. Bot a11y commit `55f6edb2` (done, 2026-09-17T19:50:54Z, authored by
   google-labs-jules[bot]).
2. Record commit on the PR branch: intent/ + plan/ (this commit). New
   head = record head.
3. QA countersign fresh-context against this plan — verdict on Paperclip
   only; **silent window**: no comments/reviews on PR #487 until merge
   (Jules reacts to comments; clobber class AID-1795). Countersign
   verifies on the record head, not the bot head.
4. Merge-time checklist for the single-writer (CEO or explicitly
   registered delegate — #478 coaching, AID-2316):
   - re-read the carrier thread (merge protocol item 1);
   - re-anchor: PR is behind main (`a6dd262d` → main moved to `19f5b1b3`
     via #474); `update-branch` to satisfy strict up-to-date;
   - CI by-name green on the FINAL head incl. `SDLC guardrails (diff)`
     present+success and `dojoToday (TS + substrate)` success
     (AID-1618 §2, full pagination);
   - merge with `expected_head_sha` = final head and a merge message
     citing the countersign (`Countersign: <AID-id> verdict <commentId>`,
     AID-2318 pattern), mirroring #434's
     `fb711de7` merge message format;
   - post-merge: confirm PR closed+merged, main contains the record.

## Risks

- Bot clobber during verification — mitigated by silent window +
  `expected_head_sha` merge guard (a moved head fails the merge cleanly).
- Head moves between countersign and merge — merge-writer must re-verify
  CI by-name on the head actually merged (binding, AID-1618 §2).
- Screen-reader nuance (double announcement) — addressed in-diff by
  aria-hidden on the redundant spans; pattern precedented (#434, #228).

## Proof

- CI first-hand @ bot head `55f6edb2` (FPE, 2026-09-17 ~20:5xZ, full
  pagination): 41 check-runs = 40 success + 1 structural skip
  (pre-existing on base `a6dd262d`), incl. `SDLC guardrails (diff)`
  success, `dojoToday (TS + substrate)` success, `product readiness
  (claims)` success, `DESIGN.md lint` success.
- FPE verdict GO posted on carrier AID-2360 before this record commit's
  merge (ordering AID-2219).
- After this record commit: same matrix must be green on the record head
  before merge (hard rule: red does not enter; absence of a named check
  is a failure state).

## Verification split

Producer (Palette bot) ≠ FPE verdict (fa8130d5, posted on AID-2360) ≠
QA countersign (fresh-context against this plan, on the record head) ≠
merge-writer (CEO single-writer or explicitly registered delegate).
No role verifies its own diff; CI green is necessary, never sufficient
(AID-2219).

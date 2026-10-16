# Plan: prepare PR #624 for the merge door (update-branch + intent + fresh countersign)

Change-id: AID-4906-624-door-prep · From: intent/AID-4906-624-door-prep/intent.md · Status: approved

Small-fix fast path (docs/sdlc/README.md §Small-fix): the code delta (2
files) was produced by learning-engine-engineer and already carries FSE
review GO + V&E delta verification GO (AID-4270). V&E prepares the gate
(update-branch, this record, ready, fresh session-real countersign). The CEO
executes the merge (AID-4906 order). V&E is verifier, not code producer.

## Files that change

- `intent/AID-4906-624-door-prep/{intent.md,plan.md}` (new) — this fast-path
  record (the only files authored in this change).
- Merge commit `ecde66fd` (update-branch of main `98a06326` into
  `2530a9a3`) — carries 183 main-side files; PR content byte-identical
  (spec `a2bc8cc3`; main.ts merged blob `32a4e267` preserving both deltas).

## Order of work

1. Pre-flight: merge-tree clean (rc=0); overlap scan — `main.ts` touched by
   both sides, merged blob verified to contain both deltas first-hand.
2. `update-branch` (PUT pulls/624/update-branch, HTTP 202) → merge head
   `ecde66fd2d08…`.
3. Add this intent/ record on the branch (head moves to the final head).
4. Mark the PR ready for review (draft → ready).
5. Watch CI to green on the final head (incl. the inline-game-reopen spec);
   countersign-gate stays red until the countersign comment (expected).
6. Publish the V&E receipt in Paperclip AID-4906, then post the canonical
   countersign comment pinning the final 40-hex head with the REAL session
   (`ses_ebb64f6b9ffeltAJ6Ci1q323SJ`) of registry run
   `60774032-ed59-4ce1-b3b1-277cda33b58c`; verify countersign-gate green.
7. Receipt on AID-4906; hand the merge to the CEO via
   `scripts/merge_pr.sh 624 --merge` only (AID-2768 single door).

## Evidence recorded (first-hand)

- Merge purity: parents `2530a9a3` + `98a06326`; diff vs main = 2 PR files.
- main.ts merged semantics: sentinel guard + 13 aria-label occurrences.
- Prior chain: FSE GO @ `60f73d79` (AID-3530 comment 2026-09-30), V&E GO
  AID-4270 @ `2530a9a3` (2026-10-09) — superseded here only by head movement
  and the session-REAL policy (AID-4898), not by any content finding.

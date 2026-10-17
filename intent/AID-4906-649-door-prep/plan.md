# Plan: prepare PR #649 for the merge door (update-branch + intent + fresh countersign)

Change-id: AID-4906-649-door-prep · From: intent/AID-4906-649-door-prep/intent.md · Status: approved

Small-fix fast path (docs/sdlc/README.md §Small-fix): the 40-file kit delta
was produced by learner-analytics-engineer from immutable source PR #645 and
already carries V&E delta verification GO (AID-4299). V&E prepares the gate
(update-branch, this record, ready, fresh session-real countersign). The CEO
executes the merge (AID-4906 order). V&E is verifier, not content producer.

## Files that change

- `intent/AID-4906-649-door-prep/{intent.md,plan.md}` (new) — this fast-path
  record (the only files authored in this change).
- Merge commit `1b28f14f` (update-branch of main `98a06326` into `f8ff629b`)
  — carries only main-side files; all 40 kit files byte-identical.

## Order of work

1. Pre-flight: merge-tree clean (rc=0); overlap scan — empty.
2. `update-branch` (PUT pulls/649/update-branch, HTTP 202) → merge head
   `1b28f14f858a…`.
3. Add this intent/ record on the branch (head moves to the final head).
4. Mark the PR ready for review (draft → ready).
5. Watch CI to green on the final head; countersign-gate stays red until the
   countersign comment (expected, AID-2768).
6. Publish the V&E receipt in Paperclip AID-4906, then post the canonical
   countersign comment pinning the final 40-hex head with the REAL session
   (`ses_ebb64f6b9ffeltAJ6Ci1q323SJ`) of registry run
   `60774032-ed59-4ce1-b3b1-277cda33b58c`; verify countersign-gate green.
7. Receipt on AID-4906; hand the merge to the CEO via
   `scripts/merge_pr.sh 649 --merge` only (AID-2768 single door).

## Evidence recorded (first-hand)

- Merge purity: parents `f8ff629b` + `98a06326`; diff vs main = 40 PR files;
  40/40 blobs identical to the previously pinned head.
- Prior chain: source acceptance AID-3648/3654/3659 (PR #645 @ `b028652d`);
  V&E GO AID-4299 @ `f8ff629b` (2026-10-09) — superseded here only by head
  movement and the session-REAL policy (AID-4898), not by any content finding.

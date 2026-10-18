# Plan: prepare PR #667 for the merge door (update-branch + intent + own countersign)

Change-id: AID-4890-667-founder-direct-merge-prep · From: intent/AID-4890-667-founder-direct-merge-prep/intent.md · Status: approved

Small-fix fast path (docs/sdlc/README.md §Small-fix): the runtime/docs
delta (41 files) was produced founder-direct by Codex Cloud and carries its
own complete intent/spec/plan/evidence/review records; QA prepares the gate
(this record, re-verification, producer backfill registration, countersign).
The CEO executes the merge (AID-4890 order). QA is verifier, not runtime
producer.

## Files that change

- `intent/AID-4890-667-founder-direct-merge-prep/{intent.md,plan.md}` (new)
  — this fast-path record (the only files authored in this change).
- All 41 PR files carried byte-identical from the verified producer head
  `c981caff9b65` (zero overlap with main's 178-file delta since base
  `b9f77774643b`).

## Order of work

1. Pre-flight: merge-tree of `origin/main` (5bb14a49) × branch — clean
   (tree 152582eb, rc=0); file-overlap scan — empty.
2. `update-branch` (PUT pulls/667/update-branch, HTTP 202) → merge head
   `b12ca52d1c65…`; blob-identity check of all 41 files vs `c981caff` —
   identical.
3. Add this intent/ record on the branch (head moves to the final head);
   fallback if push rejected: registry-on-main (CEO-authorized).
4. Re-verify at the final head: isolated worktree pytest
   engines/aiDevschoolMvp/tests (67) + test_replay_fold.py (19); watch CI
   to green (SDLC guardrails (diff), engine jobs); countersign-gate stays
   red until the countersign comment (expected, AID-2768).
5. Mark the PR ready for review (draft → ready; `gh pr merge` refuses
   drafts and the door wraps it).
6. Register the producer trailer by factual backfill (anchors: producer
   commits `42345a82`/`c981caff`, CI run of the producer push, package
   SHA-256 — all already recorded in the PR body) BEFORE the countersign.
7. Publish the QA verdict in Paperclip AID-4890, then post the canonical
   countersign comment pinning the final 40-hex head; verify
   countersign-gate green (issue_comment trigger runs main's logic).
8. Receipt on AID-4890 + the standing channel (AID-3317); hand the merge
   to the CEO via `scripts/merge_pr.sh 667 --merge` only (AID-2768).

## Evidence recorded (first-hand)

- Merge purity: merge-tree rc=0; 41/41 blob SHAs identical to `c981caff`;
  diff vs main stat-identical (+2984/−103 across 41 files).
- Worktree gates at the final head: see AID-4890 verdict comment
  (pytest 67/67 + 19/19, installer --help cold copy, CI all-green except
  the pre-countersign gate).

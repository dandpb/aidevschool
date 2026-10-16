# Plan: finalize single variant PR #679 and close the duplicate queue

Change-id: AID-4864-dojotoday-a11y-toggles · From: intent/AID-4864-dojotoday-a11y-toggles/intent.md · Status: approved

Small-fix fast path (docs/sdlc/README.md §Small-fix): the runtime delta is a
bounded 2-file a11y change already produced by Jules on PR #679 head; QA
finalizes the variant with this change record, independent verification, and
the mechanical merge door. Self-verification and independent countersign are
NOT skipped — QA is verifier, not runtime-delta producer.

## Files that change

- `intent/AID-4864-dojotoday-a11y-toggles/{intent.md,plan.md}` (new) — this
  fast-path record (the only files authored in this change).
- Carried unchanged from the PR branch (Jules, commit 62e00ce4):
  `engines/dojoToday/src/main.ts` (+6/-4) and `.jules/palette.md` (+3).

## Order of work

1. Triage the five variants by blob/patch evidence; confirm #679 is the
   single complete variant (done: main.ts blob `99fe05dc` == #675/#681;
   #677 lacks aria-label; #678 misses soc-config-btn).
2. Independent first-hand verification on the PR head 5ab183bf in an isolated
   worktree: biome, `tsc --noEmit`, `vite build`, substrate regen + selfcheck,
   Playwright 8/8; before/after accessible-name probe vs main a8993bdc.
3. Add this intent/ record to the PR branch (head moves; re-verify gates on
   the final head; main.ts blob must stay `99fe05dc`).
4. Register the producer trailer for Jules on the PR conversation (backfill
   precedent #606/AID-3396) BEFORE the countersign comment.
5. Publish the QA verdict in Paperclip AID-4864, then post the canonical
   countersign comment pinning the final 40-hex head.
6. Close #675/#681 (duplicates) and #677/#678 (subsets) with evidence
   comments; no approval or countersign implied for closed branches.
7. Merge through `scripts/merge_pr.sh` only; post-merge: verify the main push
   run receipt and record the disposition in AID-4864.

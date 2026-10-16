# Intent: prepare founder-direct PR #667 for the merge door

Author: ORDEM CEO (diretiva f0fa79ef, fila pós-#685) via Paperclip AID-4890 · Change-id: AID-4890-667-founder-direct-merge-prep · Status: accepted

> Origin: AID-4890 "ORDEM CEO (f0fa79ef, fila pós-#685): QA Lead — preparar
> #667 (founder-direct, GO c/ ressalva) p/ porta: update-branch + intent/ +
> countersign; CEO executa o merge" (assigned to QA Lead). Runtime delta
> produced founder-direct by a Codex Cloud session delegated by Dani
> (2026-10-04, shared GitHub credential), scope explicitly authorized by
> Dani (41 files). This change record documents the gate preparation and
> the independent verification chain. The CEO executes the merge.

## Problem

PR #667 (draft since 2026-10-04) carries a verified founder-direct delta —
docs/handbook ownership docs (15/16/17), MVP replay fold extraction,
installer `--help` bootstrap fix, plus complete intent/spec/plan/evidence/
review records for five change-ids — but was opened 98 commits behind main
against base `b9f77774643b`, with no canonical producer trailer in the
conversation (Codex Cloud has no native run/session identifiers; the
producer refused to invent them), so `countersign-gate` fails closed
("producer unattributed") and the branch is stale relative to main.

## Proposed outcome

1. Branch updated with current main (`update-branch`, expected_method
   merge); the 41-file runtime+docs delta stays byte-identical to the
   verified head `c981caff9b65` (zero file overlap with main's delta since
   the merge-base — merge is trivially clean).
2. This intent/ record travels on the PR branch (fallback authorized by
   the CEO order: registry-on-main if the push is rejected).
3. Producer registered by factual backfill (anchors already recorded in
   the PR body: CI run of the producer's push, commit SHAs, package
   SHA-256), BEFORE the countersign — backfill precedents #606/AID-3396,
   #679/AID-4864, #676/AID-4871.
4. Fresh independent QA countersign pinning the final 40-hex head;
   countersign-gate + SDLC guardrails green on that head; PR marked ready.
   Merge remains exclusively with the CEO via `scripts/merge_pr.sh`
   (AID-2768 single door). No deploy, no auto-merge.

## Verification chain (first-hand)

- Producer head `c981caff` (QA verdict AID-4835, 2026-10-15, GO COM
  RESSALVA): pytest MVP 67/67, replay_fold 19/19, complexity gate max 8
  baseline intact, installer `--help` cold-copy exit 0 with zero bytecode
  artifacts; provenance honest (no invented trailers). FPE AID-4834
  confirmed provenance. CI green on the head; only countersign-gate red
  (expected pre-countersign).
- Post update-branch head `b12ca52d…`: merge-tree clean (rc=0); all 41
  files byte-identical blobs to `c981caff`; diff vs main stat-identical
  (41 files, +2984/−103); MVP suite re-executed in an isolated worktree;
  CI green on the final head (this record adds only intent/ docs).

## Ressalvas → follow-ups (from verdicts AID-4834/4835, non-blocking)

- The full 73-synthetic-ledger replay battery was not re-executed by QA
  (producer evidence in intent/2026-10-04-offline-replay-plan/; frozen
  suite 19/19 + parity covered by the 67). Re-run before any replay-path
  refactor of `replay.py`/`replay_fold.py`.
- Handbook docs 15–17 are new canonical guidance; wire cross-references
  into onboarding docs at the next docs cycle (AID-4834 condition).

## Constraints

- Producer (codex-cloud, founder-direct) ≠ countersigner (qa-lead):
  independence per AID-2768 is by agent slug.
- No test/gate/workflow edits in this change; only intent/ docs added on
  the branch (protected paths untouched).
- Update-branch and this record move the head — the countersign pins the
  FINAL head only; any later push invalidates it by design (fail-closed).

# Intent: prepare draft PR #649 for the merge door (update-branch + fresh countersign)

Author: ORDEM CEO (diretiva f0fa79ef, onda de promoção) via Paperclip AID-4906 · Change-id: AID-4906-649-door-prep · Status: accepted

> Origin: AID-4906 "ORDEM CEO (f0fa79ef, onda de promoção): V&E — preparar
> drafts #624 → #649 → #651 p/ porta (update-branch + intent/ + draft→ready +
> countersign FRESCO com session REAL); CEO executa os merges" (assigned to
> V&E). This fast-path record documents the gate preparation only. The CEO
> executes the merge (single door `scripts/merge_pr.sh`, AID-2768).

## Problem

PR #649 packages the U13 pg-e01-evals-offline kit (immutable source PR #645 @
`b028652d`, accepted AID-3648/3654/3659; V&E delta verification AID-4299 GO
at `f8ff629b`) but:

- the branch went stale: 70 commits behind main (now `98a06326`);
- the operative countersign (AID-4299) carries `session=opencode_local` —
  the adapter placeholder (policy 2026-10-01, audit AID-4897 §4, hardened
  gate AID-4898 §4/§8): a fresh session-REAL countersign is required;
- the PR is still a DRAFT.

## Proposed outcome

1. Branch updated with current main (`update-branch` API): head
   `1b28f14f858…` = merge(`f8ff629bfc0…`, main `98a06326…`), clean.
2. This intent/ record travels on the PR branch and moves the head to the
   FINAL head; nothing else changes (no test/gate/workflow edits).
3. PR marked ready for review (draft → ready).
4. Fresh independent V&E countersign pinning the FINAL 40-hex head with the
   real run/session of AID-4906 (`run=60774032-…`,
   `session=ses_ebb64f6b9ffeltAJ6Ci1q323SJ`). Countersign-gate green on that
   head. Merge remains exclusively with the CEO.

## Verification chain (first-hand, this change)

- Update-branch purity: `1b28f14f` parent1 = `f8ff629b` (previously pinned
  head), parent2 = `98a06326` (= origin/main at update time).
- Blob identity: ALL 40 PR-delta files byte-identical `f8ff629b` →
  `1b28f14f` (kit ZIPs/manifests/docs unchanged); zero file overlap with
  main's delta since merge-base `4913a70b` (update delta = 100% main's).
- Diff vs main after update = exactly the 40 PR files.
- CI watched to green on the FINAL head; countersign-gate red only until the
  fresh countersign comment lands (fail-closed by design).

## Constraints

- Producer (`learner-analytics-engineer`, canonical trailer in the PR body
  with real session `ses_f06c3cdb4ffe…`, run `b1260a4c-…`) ≠ countersigner
  (`verifier-evidence-engineer`): independence per AID-2768 is by agent slug.
- Immutable-source rule respected: kit content not re-authored, blobs
  byte-identical; only merge + intent/ docs added on the branch.
- The intent commit moves the head — the countersign pins the FINAL head
  only; any later push invalidates it by design (fail-closed).

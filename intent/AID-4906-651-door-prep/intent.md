# Intent: prepare draft PR #651 for the merge door (update-branch + fresh countersign)

Author: ORDEM CEO (diretiva f0fa79ef, onda de promoção) via Paperclip AID-4906 · Change-id: AID-4906-651-door-prep · Status: accepted

> Origin: AID-4906 "ORDEM CEO (f0fa79ef, onda de promoção): V&E — preparar
> drafts #624 → #649 → #651 p/ porta (update-branch + intent/ + draft→ready +
> countersign FRESCO com session REAL); CEO executa os merges" (assigned to
> V&E). This fast-path record documents the gate preparation only. The CEO
> executes the merge (single door `scripts/merge_pr.sh`, AID-2768).

## Problem

PR #651 delivers the learner-downloads catalog preview (3 new files in
`docs/learner-downloads/catalogo-preview/`, 391 insertions; V&E delta
verification AID-4307 GO at `19d73f83`) but:

- the branch went stale: 65 commits behind main (now `98a06326`);
- the operative countersign (AID-4307) carries `session=opencode_local` —
  the adapter placeholder (policy 2026-10-01, audit AID-4897 §4, hardened
  gate AID-4898 §4/§8): a fresh session-REAL countersign is required;
- the PR is still a DRAFT.

## Proposed outcome

1. Branch updated with current main (`update-branch` API): head
   `35445c651d3…` = merge(`19d73f83ca5…`, main `98a06326…`), clean.
2. This intent/ record travels on the PR branch and moves the head to the
   FINAL head; nothing else changes (no test/gate/workflow edits).
3. PR marked ready for review (draft → ready).
4. Fresh independent V&E countersign pinning the FINAL 40-hex head with the
   real run/session of AID-4906 (`run=60774032-…`,
   `session=ses_ebb64f6b9ffeltAJ6Ci1q323SJ`). Countersign-gate green on that
   head. Merge remains exclusively with the CEO.

## Verification chain (first-hand, this change)

- Update-branch purity: `35445c65` parent1 = `19d73f83` (previously pinned
  head), parent2 = `98a06326` (= origin/main at update time).
- Blob identity: all 3 PR files (`README.md`, `catalogo-texto.md`,
  `catalogo-visual.html`) byte-identical `19d73f83` → `35445c65`; zero file
  overlap with main's delta since merge-base `1d72dcbe`.
- Diff vs main after update = exactly the 3 PR files.
- CI watched to green on the FINAL head; countersign-gate red only until the
  fresh countersign comment lands (fail-closed by design).

## Constraints

- Producer (`uxdesigner`, canonical trailer in the PR body with real session
  `ses_f06b73f87ffe…`, run `9401f8a4-…`) ≠ countersigner
  (`verifier-evidence-engineer`): independence per AID-2768 is by agent slug.
- Docs-only delta; no test/gate/workflow edits; only intent/ docs added on
  the branch (protected paths untouched).
- The intent commit moves the head — the countersign pins the FINAL head
  only; any later push invalidates it by design (fail-closed).

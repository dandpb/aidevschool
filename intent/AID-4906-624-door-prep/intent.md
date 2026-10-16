# Intent: prepare draft PR #624 for the merge door (update-branch + fresh countersign)

Author: ORDEM CEO (diretiva f0fa79ef, onda de promoção) via Paperclip AID-4906 · Change-id: AID-4906-624-door-prep · Status: accepted

> Origin: AID-4906 "ORDEM CEO (f0fa79ef, onda de promoção): V&E — preparar
> drafts #624 → #649 → #651 p/ porta (update-branch + intent/ + draft→ready +
> countersign FRESCO com session REAL); CEO executa os merges" (assigned to
> V&E). This fast-path record documents the gate preparation only. The CEO
> executes the merge (single door `scripts/merge_pr.sh`, AID-2768).

## Problem

PR #624 carries the verified AID-3530 fix (dojoToday inline game reload on
reopen; FSE review GO at `60f73d79`, V&E delta verification AID-4270 GO at
`2530a9a3`) but:

- the branch went stale: 100 commits behind main (now `98a06326`), so the
  pinned head `2530a9a3…` no longer reflects what a merge would land;
- the operative countersign (AID-4270) carries `session=opencode_local` — the
  adapter placeholder. Policy 2026-10-01 / audit AID-4897 §4: a placeholder is
  not a session; the hardened gate (AID-4898 §4/§8) rejects it. A fresh
  countersign with the REAL session of a registry-anchored run is required;
- the PR is still a DRAFT — `gh pr merge` refuses drafts and the promotion
  wave needs it ready.

## Proposed outcome

1. Branch updated with current main (`update-branch` API): head
   `ecde66fd2d08…` = merge(`2530a9a34bc…`, main `98a06326…`), clean.
2. This intent/ record travels on the PR branch and moves the head to the
   FINAL head; nothing else changes (no test/gate/workflow edits).
3. PR marked ready for review (draft → ready).
4. Fresh independent V&E countersign pinning the FINAL 40-hex head, with the
   real run/session of AID-4906 (`run=60774032-…`,
   `session=ses_ebb64f6b9ffeltAJ6Ci1q323SJ` — opencode session serving the
   run, registered in the heartbeat-run registry). Countersign-gate green on
   that head. Merge remains exclusively with the CEO.

## Verification chain (first-hand, this change)

- Update-branch purity: `ecde66fd` parent1 = `2530a9a3` (previously pinned
  head), parent2 = `98a06326` (= origin/main at update time).
- Blob identity of the PR-only file:
  `engines/dojoToday/playwright/inline-game-reopen.spec.ts` =
  `a2bc8cc35fe7…` byte-identical `2530a9a3` → `ecde66fd`.
- `engines/dojoToday/src/main.ts` (touched by both sides since merge-base
  `0431e7d8`): merged blob `32a4e267…` contains BOTH the AID-3530 sentinel
  guard (`currentSrc === "about:blank"` → reload, lines ~348–350) AND main's
  a11y changes (13 `aria-label` occurrences, `aria-expanded` toggle) —
  merge-tree clean, no conflict, semantics of both deltas preserved; CI runs
  the reopen spec on the merged head to prove it.
- Delta vs main after update = exactly the 2 PR files (spec + main.ts);
  update delta (183 files) = 100% main's delta since the merge-base.
- CI watched to green on the FINAL head; countersign-gate red only until the
  fresh countersign comment lands (fail-closed by design).

## Constraints

- Producer (`learning-engine-engineer`, LEE `98ed5775-…`, canonical trailer in
  the PR body with real session `ses_f0bd18ef0ffe…`, CEO relay AID-4180
  Opção B) ≠ countersigner (`verifier-evidence-engineer`): independence per
  AID-2768 is by agent slug.
- No test/gate/workflow edits in this change; only intent/ docs added on the
  branch (protected paths untouched).
- The intent commit moves the head — the countersign pins the FINAL head
  only; any later push invalidates it by design (fail-closed).
- session REAL requirement (AID-4898): the countersign run must be SUCCEEDED
  in the run registry with the cited session registered; posting happens
  after CI green, run completion is recorded by the harness at heartbeat end.

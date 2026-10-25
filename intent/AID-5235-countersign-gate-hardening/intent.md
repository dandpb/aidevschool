# Intent: countersign-gate hardening — run window, verdict resolution, task↔PR binding, deletion alert

Author: Paperclip AID-5235 (hardenings for incident AID-5233 — cloned-identity
citations from the CLOSED run `ed9921cc` (task AID-5061, bound to PR #700) greened
the gates of PRs #704 and #714 on 2026-10-18 and were deleted ~5 min later; verdict
token was the free word 'GO') · Change-id: AID-5235-countersign-gate-hardening ·
Status: implemented (this change)

> One source of truth: the AID-5233 incident state + the AID-5235 issue. Acceptance:
> every one of the four incident failure modes becomes mechanically RED in
> `scripts/countersign_gate_check.py` (fail-closed), with hermetic self-test
> regressions reproducing the incident shapes first-hand.

## Problem

AID-5233 proved the §8b registry anchor necessary but not sufficient: the cloned
citation carried REAL registry facts (agent, task, run, session all matched run
`ed9921cc`), so it passed §4/§5/§8b — yet

1. the run had CLOSED 82 min before the citation was posted (no temporal window);
2. the verdict token 'GO' named nothing (no resolution; it referred to another PR's
   verdict);
3. the cited task AID-5061 is bound to PR #700, not to the gated PRs #704/#714
   (no task↔PR binding);
4. the citations were deleted ~5 min after greening the gate, leaving stale green
   check-runs (no deletion detection).

## Proposed outcome

Four new fail-closed acceptance conditions in the gate (contract §8c/§9/§10/§11):

- **§8c RUN TEMPORAL WINDOW** — the operative citation's `createdAt` must fall
  inside the cited run's `[startedAt, finishedAt]` (±120s clock tolerance);
  registry records without timestamps fail closed. Implemented against
  `/api/heartbeat-runs/<id>` fields already fetched by §8b.
- **§9 VERDICT RESOLUTION** — the verdict token must be a canonical comment id
  (Paperclip UUID for AID-, numeric GH comment id for GH-) that resolves on the
  cited task's thread (`/api/issues/<key>/comments`): exists, not `deletedAt`,
  and `createdByRunId == run=` (the verdict is the countersign run's own —
  verified first-hand on the healthy AID-5225/PR #703 countersign: verdict
  comment `c3650cb6…` created by run `1beec6e5…`, the trailer's run).
- **§10 TASK↔PR BINDING** — the cited task's title/description must reference
  the gated PR number (`#<n>` / `PR #<n>`; `countersign_assign.sh`-created tasks
  already carry `[CS PR#<n>@<head>]` in the title). AID-5061 names only
  #700/#705 → the cross-post to #714/#704 is mechanically red.
- **§11 DELETION ALERT** — live mode recovers the operative citations recorded
  by prior SUCCESSFUL countersign-gate workflow runs on the current head (from
  the runs' logs via `gh run list --commit`/`gh run view --log`; check-run
  outputs are empty on GitHub Actions) and requires each to still be present
  (same createdAt, same line); otherwise RED with a DELETION ALERT. A newer
  citation does not launder a deletion.

Fail-closed doctrine unchanged: unconfigured board credentials, transport and
auth failures on any new fetch are distinguishable violations, never 'absent'.

## Acceptance evidence

- `python3 scripts/countersign_gate_check.py --self-test` — 62/62, including
  13 new AID-5233 regression cases (clone-after-close, free-text 'GO',
  ghost/wrong-run/deleted verdict comments, cross-PR binding, deletion alert,
  no-laundering, healthy-hardened pass).
- `bash scripts/merge_pr.sh --self-test` — 26/26 (merge door extraction intact).
- `python3 scripts/test_receipt_canon_check.py` — 32/32 (shared regex contract
  intact).
- `python3 -m pytest docs/product-readiness/tests/test_factory_body_producer.py`
  — 6/6 (factory producer-at-origin test upgraded to the hardened contract).

## Out of scope (follow-ups)

- `scripts/receipt_canon_check.py` remains shape-level (offline helper cannot
  resolve verdicts; it does not contradict §9 — a draft passing shape can still
  fail live resolution by design).
- GitHub-side admin audit of WHO deleted the incident citations remains with the
  CEO (unblock owner named in AID-5233).

# Intent: countersign-gate issue_comment tier must never redden main's HEAD

Author: Paperclip AID-3278 (finding of triage AID-3272, post-merge PR #604, observed
2026-09-28T22:26Z; founder approval comment `240f2c95` 2026-10-17 — HIGH priority) ·
Change-id: AID-3278-countersign-comment-tier · Status: accepted (founder-approved
implementation; design rounds in the AID-3278 thread, Sept/2026)

> One source of truth: the AID-3278 issue body + founder approval comment. Acceptance:
> an `issue_comment`-triggered `countersign-gate` run on main resolves red verdicts as
> verdict DATA (job summary + annotation), so its check-run on main's HEAD stays green
> even when the evaluated PR fails the gate; `pull_request` and `workflow_dispatch`
> semantics are unchanged.

## Problem

`countersign-gate.yml` triggers on `issue_comment` (created) for PR conversations. Such
runs execute on main's HEAD: the check-run natively attaches to `github.sha` (main's
HEAD), never to the target PR's head. When a comment on an OLD/OPEN PR (e.g. PR #547)
fires the gate and the verdict is red — expected, since unrelated PRs routinely fail the
countersign contract — the red check-run lands on main's HEAD, painting merge commits of
UNRELATED PRs (evidence 2026-09-28: run 36492377134, event=issue_comment, PR #547,
head_sha=a02b1833 = PR #604's merge commit, marked `countersign-gate failure` 4 min
after that merge; the same pattern on 8390e913 at 22:08:45Z/22:17:02Z; 18 such red
check-runs across 7 distinct main HEADs). Push-run receipts then read red from activity
unrelated to the merge, and "expected red (real gate)" vs "cross-PR noise" becomes
indistinguishable without manual event forensics.

## Proposed outcome

Two tiers, same check-run name, DIFFERENT contracts:

- `pull_request` tier: unchanged — the GATE. Its check-run attaches to the PR head;
  red/green is the required verdict GitHub enforces; `scripts/merge_pr.sh` still re-runs
  the gate live at merge time.
- `issue_comment` tier: a VERDICT EMITTER, never a gate. On this tier only:
  - both self-tests and the live gate run under `continue-on-error` — their outcomes
    become DATA, not job conclusions;
  - the gate step records `GATE_RC` (via GITHUB_ENV) and tees to `gate-output.txt`;
  - a final `emit structured verdict` step (only `if: github.event_name ==
    'issue_comment'`) maps {self-tests, GATE_RC, first gate reason line} to a
    `countersign-gate.verdict/1` document (job summary) pinned to the evaluated PR +
    head SHA, ending in a machine-readable `VERDICT:` line and a `::notice`/`::warning`
    annotation. PASS → notice; FAIL/FAIL_CLOSED → warning. The job itself stays green.
  - comment-tier evaluations are serialized per PR via a `concurrency` group
    (`countersign-gate-issue_comment-<PR>`, cancel-in-progress: false) so racing
    parallel heartbeats (AID-2840) cannot interleave verdicts; other tiers get a unique
    group (no behavior change).
- Only raw runner/checkout infra failures can still redden main from the comment tier —
  an honest "CI itself is broken" signal.

`workflow_dispatch` (manual backfill) keeps classic red/green semantics — an intentional
operator action, out of AID-3278 scope.

## Affected users and systems

`.github/workflows/countersign-gate.yml` only. No gate-script logic, merge door, SDLC
guard, or engine change. Enforcement posture is unchanged: the required check on PR
heads is served by the `pull_request` tier, and the single merge door re-runs the gate
live at merge time. Verification: `python3 scripts/countersign_gate_check.py
--self-test` 49/49, `bash scripts/merge_pr.sh --self-test` 26/26, emitter step
exercised across all verdict classes (PASS → notice, FAIL/FAIL_CLOSED → warning, job
green in every case).

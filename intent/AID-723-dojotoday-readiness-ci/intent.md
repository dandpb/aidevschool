# Intent: dojoToday CI job must emit its producer readiness report

Author: Paperclip AID-723 (CEO order AID-721/A; defect AID-722 filed by QA sweep AID-719;
owner FPE) · Change-id: AID-723-dojotoday-readiness-ci · Status: accepted (issue scope
assigned by CEO dispatch; minimal bounded CI-only fix)

> One source of truth: the AID-723 issue body + defect AID-722. Acceptance: PR head's
> `dojoToday (TS + substrate)` job emits the `dojotoday-readiness-$SHA` artifact and the
> `product readiness (claims)` check goes green; no product/engine change in the diff.

## Problem

Main CI is red at `59359d60` (readiness grant v26). The aggregator gate `product
readiness (claims)` derives its expectations from the currently granted tiers
(enforcement.py:62-74, AID-539/PR #256): every use case with a granted tier must be
covered by a producer report from the same SHA. The v26 re-grant gave
`dojotoday-daily-guidance` the `validated-journey` tier, but the `dojoToday (TS +
substrate)` job (.github/workflows/ci.yml:311-331) only ran `selfcheck + lint + build` —
no `test:readiness`, no `*-readiness-$SHA` artifact. The aggregated candidate report
therefore omitted the use case → `BLOCKED: dojotoday-daily-guidance … candidate report
omits this use case` (run 33734625483 / job 100583454687). The product itself is fine:
QA verified `npm run test:readiness` green locally @ `0b8148e5`, and FPE re-verified at
HEAD `59359d60` (selfcheck OK + 1 playwright spec passed + report emitted with
`gitSha=59359d60…`). This is a CI coverage gap, not a product defect.

## Proposed outcome

Mirror the `literacydojo` job pattern in the `dojotoday` job: after `npm run build`, add
`npx playwright install --with-deps chromium`, `npm run test:readiness` (emits
`engines/dojoToday/test-results/readiness/dojotoday-active-unit-guidance.json`), and an
`actions/upload-artifact@v4` step (name `dojotoday-readiness-${{ github.sha }}`, path
`engines/dojoToday/test-results`, `if-no-files-found: warn`, automated-facts-only
comment). The gate then finds a candidate producer fact for the granted use case at every
future SHA, and main goes back to green once merged.

## Affected users and systems

`.github/workflows/ci.yml` (dojotoday job only) and this intent chain. No engine runtime,
learner state, curriculum content, readiness grant, `contentVersion`, or gate logic
changes. All future lands depend on this fix (gate blocks main until then).

## Constraints

- Scope floor/ceiling from AID-723: CI-only; no `contentVersion` rename/bump
  (endorsement AID-703/AID-699); no new surfaces; if more than this scope is needed
  (flaky job, secrets, gate change), stop and block with explicit `blockedBy`.
- No test edits and no protected-path touches, so no `SDLC-ALLOW-*` trailers are needed.
- Producer ≠ verifier: the readiness report carries automated facts only; observation
  assertions remain with the independent assessor. QA verdict on the PR before merge,
  and QA coordinates closing AID-722 (their defect record).
- Merge is founder-gated (dandpb, single-writer per #240/AID-608): FPE lands the PR
  branch, signals for merge, then revalidates enforcement green on the merge commit.

## Proof

- Local @ HEAD `59359d60`: `npm run test:readiness` in `engines/dojoToday` — selfcheck
  OK, 1/1 playwright spec passed (readiness dojotoday-active-unit-guidance), report
  emitted with `gitSha=59359d60b38d…`, `outcome=pass`.
- Executable proof: CI run on the PR head — `dojotoday` job green with the
  `dojotoday-readiness-$SHA` artifact present and `product readiness (claims)` green
  (receipt links run + artifact on AID-723).

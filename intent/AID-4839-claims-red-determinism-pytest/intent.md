# Intent: cure the claims-red inherited from main — determinism pytest time bomb

Author: ORDEM CEO (diretiva f0fa79ef, sweep 16:05Z) via Paperclip AID-4839 · Change-id: AID-4839-claims-red-determinism-pytest · Status: accepted

> Origin: AID-4839 "ORDEM CEO (diretiva f0fa79ef, sweep 16:05Z): FPE — CURA do
> claims-red herdado de main (trava mecânica da porta única p/ TODOS os PRs):
> pytest de determinismo + STALE-WINDOW" (assigned to FPE, 2026-10-15T16:10Z).
> Exposing evidence: ESE countersign on PR #626 (AID-4837, 2026-10-15): the
> required check `product readiness (claims)` failed on the PR head "em teste
> pytest de `docs/product-readiness/` intocado pelo delta".

## Problem

`docs/product-readiness/tests/test_check_determinism.py` baked an ABSOLUTE
calendar date into its fixtures: `_build_fixture(tmp_path, date(2026, 10, 14))`
(landed 2026-09-14 with AID-1890 r2, commit 3fe0c2ca — a 30-day time bomb).
From 2026-10-15 the runner clock crosses the fixture's `revalidateBy`, so
`test_check_accepts_reports_flag_with_empty_directory` (asserts
`check --require-current == 0`) fails: first-hand repro on main tip 304456dd
gives `STALE-WINDOW: fixture-first-lesson ... reasons=assessment has expired`
→ `1 failed`. CI evidence: PR #626 head run 38762646052, job `product readiness
(claims)` 116520586157, step "run readiness cli guard tests" (`1 failed, 55
passed, 2 skipped`). That job is a REQUIRED status check on `main`, so every
PR is red regardless of delta → the single merge door
(`scripts/merge_pr.sh` + `countersign-gate`) is mechanically locked for ALL PRs.

## Proposed outcome

1. The determinism suite is itself deterministic w.r.t. the wall clock: green
   on any future run date (fixtures use `now + 14d`), while `--require-current`
   expiry enforcement stays intact (boundary test still pins red on
   `revalidateBy < today`).
2. AID-1890's STALE-WINDOW lane split is preserved untouched: PR lanes surface
   the stale window as a non-blocking warning; only the main push lane blocks
   (re-grant factory trigger, `readiness-regrant.yml`).
3. Mechanical recurrence guard: a meta-test fails closed if an absolute
   `date(<year>, ...)` literal reappears in this test module.
4. PR lanes go green again on the claims check → the single door unlocks.

## Affected users and systems

`docs/product-readiness/` (readiness CLI test suite), CI job `product readiness
(claims)` (required check), every PR through the single merge door. No engine
runtime, no learner state, no generated projections touched.

## Constraints

- Modifying an existing test file requires the owner-approved override
  `SDLC-ALLOW-TEST-EDIT: AID-4839` commit trailer (sdlc_guard_check.sh /
  protect-tests.sh); the owner acceptance is the CEO order recorded in AID-4839
  itself ("pytest de determinismo"). The edit strengthens the check (relative
  dates + recurrence meta-test); it does not weaken any assertion.
- Do not touch `evaluate.py`/`render.py` semantics: the expiry/fingerprint
  stale-window logic is the factory's signal and stays fail-closed.
- Producer ≠ verifier: FPE produces; a distinct agent countersigns pre-merge.

## Open questions

None — bounded fix. (Main-lane red via the stale window is the standing
re-grant cycle, AID-2950/F1, owner CEO; explicitly out of scope here.)

# Plan: cure the claims-red inherited from main — determinism pytest time bomb

Change-id: AID-4839-claims-red-determinism-pytest · From: intent/AID-4839-claims-red-determinism-pytest/intent.md · Status: approved

Small-fix fast path (docs/sdlc/README.md §Small-fix): bounded single-file test
cure; self-verification and independent countersign are NOT skipped.

## Files that change

- `docs/product-readiness/tests/test_check_determinism.py` — replace the three
  absolute `date(2026, 10, 14)` fixture dates with wall-clock-relative
  `_revalidate_future()` (module helper, `now(UTC) + 14d`); add meta-test
  `test_fixture_dates_stay_wall_clock_relative` that fails closed on any
  absolute `date(<year>, ...)` literal in this module.
- `intent/AID-4839-claims-red-determinism-pytest/{intent.md,plan.md}` (new) —
  this fast-path producer record.

## Order of work

1. Reproduce red first-hand on main tip 304456dd (done: `1 failed` with
   `assessment has expired`).
2. Apply the fixture cure + recurrence meta-test.
3. Prove the meta-test bites (inject `date(2027, 3, 1)` → meta-test fails;
   revert injection).
4. Run the full readiness suite → green.
5. Commit with `SDLC-ALLOW-TEST-EDIT: AID-4839` trailer; push branch; open PR;
   verify CI `product readiness (claims)` green on the PR head (the door
   unlocking proof).
6. Independent countersign (distinct agent, pins the head) → merge through
   `scripts/merge_pr.sh` only.

## Risks

- Editing an existing test could hide a real defect → riskiest step; mitigated
  by keeping every original assertion, only changing fixture date inputs, and
  keeping the expiry-enforcement boundary test (`revalidateBy` = yesterday →
  `--require-current` exits 1) untouched and green.
- Alternative NOT chosen: `faketime` in CI (environment-dependent, new CI
  dependency); NOT chosen: deleting the failing test (weakens the
  `--reports`-flag regression pin from AID-1890 r2).
- Main push lane stays red by design until the readiness re-grant cycle heals
  (standing AID-2950/F1, owner CEO) — out of scope; PR lanes are what the
  merge door consumes.

## Proof

- BEFORE (main tip 304456dd, first-hand):
  `python3 -m pytest docs/product-readiness/tests/test_check_determinism.py -q`
  → `1 failed` (`test_check_accepts_reports_flag_with_empty_directory`,
  `STALE-WINDOW ... assessment has expired`).
- AFTER (branch head, first-hand): same command → `5 passed`; full suite
  `python3 -m pytest docs/product-readiness/tests -q` → `57 passed, 2 skipped`.
- Meta-test bite: injecting `date(2027, 3, 1)` →
  `test_fixture_dates_stay_wall_clock_relative` FAILS; reverted after proof.
- CI on the PR head: `product readiness (claims)` green (required check) —
  recorded in the PR checks.

## Verification split

Producer (FPE, this change) vs verifier (distinct agent countersign pinning
the head; `scripts/countersign_gate_check.py` + `scripts/merge_pr.sh` enforce).

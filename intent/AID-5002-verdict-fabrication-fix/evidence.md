# Evidence: Fail-closed verdict fallback + STACKS type guard

Change-id: AID-5002-verdict-fabrication-fix · base `b08e0096`

## Defect reproduction (BEFORE, on `b08e0096`)

Repro script (temp root, no repo state touched):

1. `units_log` entry `mastered: true` + `evidence_file` containing the text
   `this is not verifier evidence` → `inspect()` returned
   `verdict=PASS, gate_ready=True, mutation_score=0.65, coverage_core=0.8`
   (threshold minimums minted from `load_thresholds()`; no verification run).
2. `evaluate_stacks("L2", {"kind": "stacks-L2", "predictedTop": []}, {}, errors)`
   → `TypeError: unhashable type: 'list'`; same for L3 with `{}`.

## Fix verification (AFTER, this branch)

Same repro script against this branch:

1. → `verdict=UNKNOWN, gate_ready=False, mutation_score=None,
   coverage_core=None`; attempt discovery still reports
   `attempt_present=True`.
2. → `False` with `errors == ["observations do not match the closed L2/L3
   scenario trace"]` (structured FAIL; covered parametrized for
   `[]`, `["doc-a"]`, `{}`, `None`, `7`).

## Suites (this branch, Python 3, repo-root cwd)

- `python3 -m pytest learner/gate/tests/ -q` → **577 passed, 1 skipped**
  (includes the new STACKS unhashable-payload tests).
- `python3 -m pytest curriculum/_shared/tests/
  learner/gate/tests/test_late_games_evaluators.py -q` → **70 passed**
  (includes the 11 new chain tests + rewritten reconciliation pair).
- `python3 -m pytest curriculum/ -q` (pre-refactor baseline of same code
  semantics) → **198 passed**.
- `python3 -m unittest discover -s learner/substrate/tests -t .` →
  **215 tests OK** (regenerated 31 projections cleanly).

## Complexity gate

`python3 scripts/check_python_complexity.py --max 8 --baseline
scripts/python_complexity_baseline.txt curriculum/_shared/evidence.py
learner/gate/stacks_evaluator.py` → only pre-existing
`_detect_phase:10` (identical on pristine `b08e0096`; `curriculum/` is
outside the CI gate's scan set — `.github/workflows/ci.yml:342`). All new
functions ≤ 8 after extracting `_chain_verdict`,
`_evidence_binding_violations`, `_attempt_file_digest`. `stacks_evaluator.py`
(in CI scan set) reports no violation.

## Protected test edit

`curriculum/_shared/tests/test_evidence_reconciliation.py` (existing test
asserted the fabricated PASS) — edited under owner-accepted trailer
`SDLC-ALLOW-TEST-EDIT: AID-5002` (issue = founder-ratified follow-up closing
incident AID-4910; precedent `aca108a2`). The rewrite strengthens the case:
attempt discovery still asserted; verdict now asserted UNKNOWN without a
verifier chain; new sibling proves PASS with the full chain. No check
weakened — the assertion flipped from fabrication-accepting to
fabrication-rejecting.

## Hardening round 1 — static coordination review 6239895063 (Oct 18)

All three findings reproduced 1st-hand on head `6a39d46c` BEFORE the fix
(scripts inline in the run log of run 52a37d07):

1. Conflicting receipts (PASS + FAIL) for the same digest → filename order
   decided the verdict (`a-extra.json` FAIL won over `u0.json` PASS).
2. Whole intact chain copied under a victim project entry →
   `verdict=PASS, gate_ready=True` for `99_victim_project`; gate attempt ≠
   unit `attempt_file` also still passed.
3. Receipt with `verdict: []` → `TypeError: unhashable type: 'list'`;
   `mutation_score: 10…0` (401 digits) → `OverflowError`; evidence file with
   invalid UTF-8 bytes → `UnicodeDecodeError` — all crashed `inspect()`.

AFTER the fix (same scripts): every case → `verdict=UNKNOWN,
gate_ready=False`; intact chain still `PASS` with the receipt's metrics
(0.9/0.95); agreeing duplicate receipts still PASS.

- Contract additions: spec.md checks 7 (ownership binding) and 8 (receipt
  agreement + malformed-input tolerance).
- New regressions (7): conflicting-receipts-UNKNOWN, agreeing-duplicates-PASS,
  malformed-receipt-no-crash (unhashable + huge int), undecodable-evidence
  UNKNOWN, gate-attempt≠unit-attempt UNKNOWN, copied-chain cross-project
  UNKNOWN (legitimate owner keeps PASS), gate-scenario mismatch UNKNOWN.
- `learner/gate/*` untouched (defended at the `_shared` call boundary);
  `math` import dropped (no longer used).
- Suites: `curriculum/_shared/tests/` + late-games → 77 passed (was 70);
  full gate + shared suite and complexity gate re-run before push.

## Hardening round 2 — follow-up review 6243873612 (Oct 18)

Both residual gaps reproduced 1st-hand on head `e4d1c693` BEFORE the fix:

1. Producer record without `unit_id`, chain rebound (gate+receipt) and
   copied to another unit of the same project → `PASS/gate_ready=True`.
2. Gate `evidence_scenario_id` removed / `null` / list → `PASS` (the
   identity check silently deactivated).

AFTER: both → `UNKNOWN`. Compatibility preserved per the reviewer's
guidance: the identity binding now mirrors `security.build_receipt`
(`scenario_id` → `encounter_id` → `legacy:<game>`) — a record without
`scenario_id` still binds through `encounter_id` (PASS verified) or
`legacy:PIXEL QUEST` (PASS verified); a WRONG legacy identity
(`legacy:OTHER GAME`) → UNKNOWN.

- Contract: spec.md check 7 now requires a well-formed string `unit_id`
  equal to the unit's own (mirrors evidence_validator required fields and
  canonical_gate equality) and a gate identity compared through the
  build_receipt normalization; absent/malformed gate identity is a broken
  chain, not an inactive check.
- New regressions (4): record-without-unit_id (cross-unit copy),
  malformed unit_id values (None/7/list/object), gate identity
  absent/null/list/blank, legacy/encounter normalization (incl. mismatch).
- `learner/gate/*` untouched. Suites: `_shared` 44 passed; gate 577p/1s;
  combined 621p/1s; complexity gate exit 0; metric-lint exit 0.

# Plan: Fail-closed verdict fallback + STACKS type guard

Change-id: AID-5002-verdict-fabrication-fix · parent: spec.md

## Execution steps

1. `curriculum/_shared/evidence.py`
   - Add helpers: `_last_gate_review(unit)`, `_receipt_for_digest(digest, root)`
     (scans `learner/verifier_receipts/*.json` via
     `learner.gate.verifier_receipt.load_verifier_receipt`, skip-unparseable,
     match by `evidence_digest`), `_attempt_identity_violations(gate, root)`
     (sha256 of the gate-bound attempt file vs `evidence_attempt_digest`).
   - Rewrite `_verdict_from_canonical_state` per spec table 1–6: iterate
     `units_log` reversed, project match, first unit WITH a gate review is
     the last gate; intact chain → receipt's verdict/metrics; anything
     broken/contradictory → UNKNOWN; FAIL preserved.
   - Drop the now-unused `load_thresholds` import if nothing else uses it.
2. `learner/gate/stacks_evaluator.py`
   - L2/L3: `not isinstance(pred_top, str)` joins the existing rejection
     condition before any membership test.
3. Tests
   - New: `curriculum/_shared/tests/test_verdict_fallback_chain.py`
     (fabrication repro → UNKNOWN; full chain → PASS with receipt metrics;
     FAIL on non-mastered unit; source-reuse bound by digest; non-finite
     score; digest mismatch; mastered w/o gate review; attempt digest
     mismatch).
   - New: STACKS unhashable-payload cases appended to
     `learner/gate/tests/test_late_games_evaluators.py` (new test fns — no
     existing test weakened).
   - Protected edit (trailer `SDLC-ALLOW-TEST-EDIT: AID-5002`):
     `test_evidence_reconciliation.py::test_inspect_falls_back..._verdict`
     now expects UNKNOWN + attempt still discovered; sibling asserts full
     chain → PASS.
4. Verify: focused suites (new + reconciliation + evidence + stacks/late
   games + gate contract), substrate unittests, complexity gate vs
   baseline.
5. Ship: single PR `aid5002/verdict-fallback-fail-closed` → fresh-context
   countersign QA (distinct agent) → `scripts/merge_pr.sh`.

# Intent: Fail-closed verdict fallback + STACKS type guard (AID-5002)

Author: Curriculum Platform Engineer (paperclip ac0ec540) · Change-id: AID-5002-verdict-fabrication-fix · Status: accepted · Tracking: AID-5002 (pós-ratificação founder #689 / AID-4910)

> Originates from Paperclip issue AID-5002 (creator: CEO; founder ratification
> `e55148ff` closing incident AID-4910). Base: `main` @ `b08e0096`.
> Defects first reproduced by GH review `6220620027` on PR #689
> (head `4bb7bdd5`, merged as `49e2513d`); re-verified 1st-hand on
> `b08e0096` in this change (see evidence.md).

## Problem

Two defects are live on `main` (both reproduced 1st-hand, scripts in
evidence.md):

1. **BLOCKER — fabricated `verdict=PASS`.**
   `curriculum/_shared/evidence.py::_verdict_from_canonical_state`
   (`b08e0096`: lines 295–309) turns any `units_log` entry with
   `project` match + `mastered: true` + non-empty `evidence_file` into
   `VerifierVerdict(verdict="PASS", mutation_score=<mutation_min>,
   coverage_core=<coverage_min>, context_isolated=True)`. No verification is
   executed: a text file reading `this is not verifier evidence` yields
   `inspect() → verdict=PASS, gate_ready=True`. This fabricates mastery
   evidence from the very state the evidence should justify, violating the
   learning-gate contract and ADR-0004.
2. **`TypeError` instead of structured FAIL.**
   `learner/gate/stacks_evaluator.py` L2/L3 run `pred_top not in
   <frozenset/dict>` before any type check: an unhashable
   `predictedTop` (`[]`, `{}`) raises `TypeError: unhashable type` instead
   of appending the closed-scenario rejection and returning FAIL.

## Proposed outcome

1. The canonical-state verdict fallback is **fail-closed**: a unit's last
   gate review only produces a verdict when the whole verification chain is
   intact — gate-bound `evidence_digest` still matches the unit's
   `evidence_file` on disk; the gate's recorded attempt identity still
   matches the attempt file; and a separate verifier receipt under
   `learner/verifier_receipts/` carries the same digest (metrics come from
   that receipt, never from thresholds). Missing/stale/tampered/contradictory
   → `UNKNOWN`. A real `FAIL` receipt with an intact chain is preserved as
   `FAIL`.
2. STACKS L2/L3 validate `predictedTop` is a string before membership;
   unhashable payloads get the existing structured rejection (FAIL + error),
   never an exception.

## Affected users and systems

Shared substrate: `curriculum/_shared/evidence.py` (curriculum dashboards /
`inspect()`/`statuses()` consumers), `learner/gate/stacks_evaluator.py`
(teaching-game gate, U18). No engine UI, no production surface.

## Constraints

- Zero regression on live lessons; producer/verifier independence
  (a producer never verifies its own work — verdicts only from separate
  receipts).
- No test weakened without owner acceptance: the one existing test that
  asserts the fabricated PASS
  (`curriculum/_shared/tests/test_evidence_reconciliation.py`) is edited
  under the owner-accepted trailer `SDLC-ALLOW-TEST-EDIT: AID-5002`
  (acceptance = issue AID-5002, founder-ratified via incident AID-4910
  closure; precedent `aca108a2`).
- Merge only through `scripts/merge_pr.sh` after a fresh-context
  countersign from a distinct agent.

## Open questions

None blocking. Non-blocking review items from `6220620027` (intent/doc
tree drift; per-project justification of the 16 `cycle-complete`→`impl`
downgrades) stay out of scope — tracked in AID-5002 description §3.

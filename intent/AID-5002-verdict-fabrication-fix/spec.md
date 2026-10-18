# Spec: Fail-closed verdict fallback + STACKS type guard

Change-id: AID-5002-verdict-fabrication-fix · parent: intent.md

## Contract BEFORE (defective, `b08e0096`)

`_read_latest_verdict(project, root)`:
1. if `learner/evidence/<project>/evidence.ndjson` exists → last record wins
   (unchanged, append-only audit written by `record_verdict`);
2. else → `_verdict_from_canonical_state`: latest `units_log` entry with
   `project == project_id`, `mastered is True`, non-empty `evidence_file`
   ⇒ **fabricated** `PASS` at exactly the threshold minimums
   (`mutation_min`, `coverage_min`, `context_isolated=True`), `source` =
   the evidence file path. No digest, no receipt, no attempt binding.

## Contract AFTER (this change)

Fallback (2) becomes fail-closed. For the **latest** `units_log` entry of
the project that has a gate review (`reviews[-n].event == "gate"`), a
verdict is returned only when ALL hold:

| # | Check | Failure → |
|---|---|---|
| 1 | gate review binds a well-formed `evidence_digest` (64-hex) | UNKNOWN |
| 2 | unit `evidence_file` exists, non-empty, contained in root | UNKNOWN |
| 3 | `bound_evidence_violations(evidence_file, digest)` empty (JSON **or** NDJSON canonical digest match — reuses `learner.gate.evidence_io`) | UNKNOWN |
| 4 | gate's `evidence_attempt_id`/`evidence_attempt_digest` present; attempt file exists, non-empty, contained, sha256(bytes) matches | UNKNOWN |
| 5 | exactly a real verifier receipt under `learner/verifier_receipts/` parses and its `evidence_digest` equals the gate digest (**bound by digest, not by `source` label** — source is not unique); scores finite | UNKNOWN |
| 6 | receipt `PASS` ⇒ `unit.mastered is True`; contradiction | UNKNOWN |
| 7 | **ownership** (hardening, review 6239895063): gate's `evidence_attempt_id` == unit's `attempt_file`; the digest-matching producer record carries `project == <requested project>`; record `unit_id` (when present) == unit's; gate `evidence_scenario_id` (when present on both) == record's `scenario_id` — a copied internally-consistent chain cannot establish another unit/project's mastery | UNKNOWN |
| 8 | **receipt agreement** (hardening, review 6239895063): ALL receipts matching the digest agree on (verdict, mutation_score, coverage_core, context_isolated); a PASS cannot hide a contradictory FAIL; malformed receipts (unhashable verdict, huge-int scores, bad UTF-8) are skipped, never fatal | UNKNOWN |

- Returned metrics are the **receipt's** (`mutation_score`, `coverage_core`,
  `context_isolated`, `source`) — thresholds are never used to mint scores.
- Receipt `FAIL` with intact chain ⇒ `FAIL` preserved (previously
  impossible: old code could only mint PASS or UNKNOWN).
- No matching gated unit at all ⇒ UNKNOWN. Older gated units are not
  consulted once the latest one is found (last gate wins, mirroring the
  ndjson last-record-wins rule).

`STACKS` L2/L3: `predictedTop` must pass `isinstance(..., str)` before any
membership test; unhashable values fall into the existing
"observations do not match the closed scenario trace" rejection →
structured FAIL, no exception. L1/L4 already short-circuit on
`isinstance(x, str)`; unchanged.

## Invariants kept

- `inspect()` cold-start semantics (SPEC, all exists=False) unchanged.
- `_attempt_in_canonical_state` (attempt discovery) unchanged.
- ndjson path (1) unchanged; `record_verdict` unchanged.
- `gate_ready`/`gate_blockers` still re-check thresholds on PASS via
  `challenge_gate_blockers` (a lying PASS still fails).
- Producer/verifier independence: receipts only; state self-assertions
  (`mastered`) alone can never produce PASS again.

## Test plan

New tests (both files): fabricated-PASS reproduction now expects
UNKNOWN/not-gate-ready; full valid chain (receipt+digest+attempt identity)
expects PASS with the receipt's real metrics; FAIL preserved on non-mastered
unit; receipt bound by digest when two receipts share a `source`;
non-finite receipt score → UNKNOWN; digest mismatch → UNKNOWN; `mastered`
without any gate review → UNKNOWN; STACKS L2/L3 unhashable `predictedTop`
(list/dict) → structured FAIL, no TypeError.

Protected edit (owner-accepted, trailer `SDLC-ALLOW-TEST-EDIT: AID-5002`):
`test_inspect_falls_back_to_learning_state_for_attempt_and_verdict` asserted
the fabricated PASS from `{"pass": true}` — now asserts attempt discovery
still works and the verdict is UNKNOWN without a verifier receipt (plus a
sibling case proving PASS with the full chain).

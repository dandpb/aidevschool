# LEARNER GATE VERIFIER

## OVERVIEW

`learner/gate/` is the source-agnostic Python trust boundary that consumes raw executable evidence
and may commit a gate outcome to canonical learner state. It never produces evidence.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Evidence decision | `__init__.py` | Load, select, validate, decide, then call the gate-specific substrate API. |
| Gate transition | `../substrate/gate.py` | Pure transition and canonical commit boundary. |
| CLI behavior | `__main__.py` | Evidence-path fallback, dry-run, output, and exit semantics. |
| Verifier receipt | `verifier_receipt.py` | Confined receipt loading, typed schema, and digest binding. |
| Public evidence contract | `../../engines/shared/teaching-evidence/README.md` | Cross-engine envelope and transport contract. |
| Teaching-game contract | `../../docs/design/teaching-game-contract.md` | Producer/verifier split and cross-engine handoff rules. |
| Pixel evidence details | `../../engines/pixelDojo/EVIDENCE_CONTRACT.md` | Pixel-specific NDJSON selection and metric rules. |
| Contract tests | `tests/test_gate.py` | Preconditions, anti-replay, receipts, CLI, and nothing-to-grade cases. |

## CONVENTIONS

- Prefer `pixel-quest/.logs/evidence.ndjson`; fall back to `.logs/last_run_evidence.json` only when
  the NDJSON file is absent. `--evidence` overrides both.
- Select the latest record for the active unit. No matching record is "nothing to grade," not a
  failed gate.
- Require the active unit/project, learner attempt, `evaluating` state, metric consistency, and an
  evidence timestamp newer than the last consumed gate record.
- `pass: false` is still an eligible gate outcome; record it without marking mastery.
- Persist only through `learner.substrate.gate.commit_gate_transition`.
- `--dry-run` must decide without writing canonical or derived state.
- Reject producer-embedded `verifier` blocks. Independent verdicts arrive as separate files under
  `learner/verifier_receipts/`, bound to producer evidence by its canonical SHA-256 digest.

## COMMANDS

```bash
python3 -m learner.gate --evidence PATH --verifier-receipt learner/verifier_receipts/FILE --dry-run
python3 -m pytest learner/gate/tests/test_gate.py
```

## ANTI-PATTERNS

- Do not weaken identity, attempt, state, metric, or anti-replay checks to accept producer output.
- Do not edit `learning_state.yaml` directly or write derived projections from this module.
- Do not treat exit 0 for "nothing to grade" as a recorded gate outcome.

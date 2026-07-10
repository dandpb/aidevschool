# PIXELDOJO VERIFIER

## OVERVIEW

`verifier/` is the Python trust boundary that consumes raw PixelQuest evidence and may commit a
gate outcome to canonical learner state. It never produces game evidence.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Gate and state transition | `__init__.py` | Load, select, validate, decide, apply, then commit through the substrate. |
| CLI behavior | `__main__.py` | Evidence-path fallback, dry-run, output, and exit semantics. |
| Evidence contract | `../EVIDENCE_CONTRACT.md` | Producer/verifier split and NDJSON selection rules. |
| Contract tests | `tests/test_verifier.py` | Preconditions, anti-replay, mutation, CLI, and nothing-to-grade cases. |

## CONVENTIONS

- Prefer `pixel-quest/.logs/evidence.ndjson`; fall back to `.logs/last_run_evidence.json` only when
  the NDJSON file is absent. `--evidence` overrides both.
- Select the latest record for the active unit. No matching record is "nothing to grade," not a
  failed gate.
- Require the active unit/project, learner attempt, `evaluating` state, metric consistency, and an
  evidence timestamp newer than the last consumed gate record.
- `pass: false` is still an eligible gate outcome; record it without marking mastery.
- Persist only through `learner.substrate.commit_canonical`, which validates and resyncs projections.
- `--dry-run` must decide without writing canonical or derived state.

## COMMANDS

```bash
python3 -m engines.pixelDojo.verifier --dry-run
python3 -m pytest engines/pixelDojo/verifier/tests/test_verifier.py
```

## ANTI-PATTERNS

- Do not weaken identity, attempt, state, metric, or anti-replay checks to accept producer output.
- Do not edit `learning_state.yaml` directly or write derived projections from this module.
- Do not treat exit 0 for "nothing to grade" as a recorded gate outcome.

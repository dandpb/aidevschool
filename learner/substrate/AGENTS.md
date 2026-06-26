# LEARNER SUBSTRATE

## OVERVIEW

`learner/substrate/` is the Python read/write seam for canonical learner state. It validates
`learner/learning_state.yaml` and regenerates every derived view consumed by apps and agent cores.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Public interface | `interface.md` | Read/write contract and error modes. |
| Schema | `schema.yaml` | Types, invariants, adapter outputs. |
| Core functions | `__init__.py` | `load_canonical`, `validate`, `load_and_validate`, `sync`. |
| CLI entrypoint | `__main__.py` | Runs `sync()` for `python3 -m learner.substrate`. |
| Mavis adapter | `adapters/mavis.py` | Derives `.mavis/learning_state.yaml`. |
| Whiteboard adapter | `adapters/whiteboard.py` | Derives minimaxDojo whiteboard files. |
| Dashboard snapshot | `dashboard_snapshot.py` | Regenerates `engines/codexDojo/src/data/learner.ts`. |
| Review scheduling | `scheduling.py` | FSRS/streak gate-derived ratings. |
| Tests | `tests/test_substrate.py` | Invariants, adapters, snapshots, generated markers. |

## CODE MAP

| Symbol | Type | Location | Role |
| --- | --- | --- | --- |
| `validate` | Function | `__init__.py:53` | Enforces canonical learner-state invariants. |
| `_validate_units_log` | Function | `__init__.py:110` | Rejects mastered units without gate review evidence. |
| `_validate_streak` | Function | `__init__.py:162` | Checks streak/freeze bounds. |
| `sync` | Function | `__init__.py:194` | Regenerates Mavis, whiteboard, dashboard, and PixelDojo views. |

## CONVENTIONS

- Edit `../learning_state.yaml` first, then run `python3 -m learner.substrate`.
- Derived files are outputs, not inputs: `.mavis/learning_state.yaml`,
  `engines/minimaxDojo/whiteboard/*`, `engines/codexDojo/src/data/learner.ts`, and PixelDojo review
  slices are regenerated from canonical state.
- A rating is produced only by executable gate outcome mapping; never from self-report.
- Keep validation errors explicit. Silent repair hides evidence problems.

## COMMANDS

```bash
python3 -m pip install -r learner/substrate/requirements.txt
python3 -m learner.substrate
python3 -m unittest discover -s learner/substrate/tests
```

## ANTI-PATTERNS

- Do not back-port edits from derived views into `learning_state.yaml`.
- Do not allow `mastered` without gate review evidence.
- Do not move FSRS/streak scheduling into TypeScript apps.
- Do not weaken invariant tests to make a malformed state pass.

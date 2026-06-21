# Learner-state substrate

Small Python module that owns the canonical learner state in `learner/` and
exposes adapters that derive engine-specific mirrors.

## Files

| File | Role |
| --- | --- |
| `schema.yaml` | Canonical types and invariants |
| `interface.md` | Public interface contract |
| `__init__.py` | Read/write surface: `load_canonical`, `validate`, `sync`, ... |
| `adapters/mavis.py` | Derives `.mavis/learning_state.yaml` |
| `adapters/whiteboard.py` | Derives `engines/minimaxDojo/whiteboard/profile.yaml`, `learner_profile.md`, `trail.md` |
| `tests/test_substrate.py` | Invariant and adapter tests |

## Usage

```bash
# Install dependencies (pyyaml + fsrs; the spaced-repetition scheduler)
python3 -m pip install -r learner/substrate/requirements.txt

# Regenerate all derived views after editing learner/learning_state.yaml
python3 -m learner.substrate

# Run tests
python3 -m unittest discover -s learner/substrate/tests
```

## Rule

Edit only `learner/learning_state.yaml` (and `learner/pipeline_status.md` for
software-cycle state). The adapters keep `.mavis/` and `whiteboard/` in sync.

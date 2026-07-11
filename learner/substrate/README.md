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
| `gate.py` | Validates and atomically commits learning-gate transitions |
| `prediction_store.py` | Owns validated Arena prediction writes |
| `catalog.py` | Generates backlog and dashboard projects from the curriculum catalog |
| `dashboard_data.py` | Generates dashboard agent and cycle read models from YAML |
| `tests/test_substrate.py` | Invariant and adapter tests |

## Usage

```bash
# Install dependencies (pyyaml + fsrs; the spaced-repetition scheduler)
python3 -m pip install -e ".[dev]"   # from repo root

# Regenerate all derived views after editing learner/learning_state.yaml
python3 -m learner.substrate

# Check canonical state and generated projections without writing
python3 -m learner.substrate --check

# Run tests
python3 -m unittest discover -s learner/substrate/tests
```

## Rule

Use `learner/learning_state.yaml` for canonical learner edits and
`learner/pipeline_status.yaml` for machine cycle state. Gate and prediction
writes go through their substrate APIs. The Markdown pipeline file is narrative.

# Learner-state substrate interface

**Seam:** `learner/`  
**Implementation:** `learner/substrate/`  
**Canonical state:** `learner/learning_state.yaml`

This interface is the single place where every engine reads and writes learner
state. `.mavis/learning_state.yaml` and `engines/minimaxDojo/whiteboard/` are
**derived views** produced by adapters; they must not be edited by hand.

The dashboard and codexDojo OS each receive an engine-local generated
`src/data/learner.ts`. These modules are read models, never write APIs.

## Read surface

- `load_canonical(path) -> dict`  
  Load the canonical YAML state from `learner/learning_state.yaml`.

- `validate(state) -> list[str]`  
  Return a list of invariant violations. An empty list means the state is valid.

- `load_and_validate(path) -> dict`  
  Load + validate; raise `ValueError` on violations.

## Write surface

- `sync()`  
  Regenerate every derived view from the canonical state, including the dashboard, codexDojo OS,
  PixelDojo, and voxelDojo TypeScript projections.

- `derive_mavis_view(state) -> dict`  
  Return the `.mavis/learning_state.yaml` view.

- `derive_whiteboard_profile(state) -> dict`  
  Return the whiteboard profile core used by Mnemosyne.

- `derive_whiteboard_trail(state) -> dict`  
  Return the whiteboard trail metadata used by Cartógrafo.

## Invariants

1. `learner.id` is non-empty.
2. `learner.level` ∈ `{beginner, intermediate, advanced}`.
3. `learner.active_language` must appear in `learner.languages`.
4. `active_unit.state` ∈ `{presenting, practicing, evaluating, mastered}`.
5. `active_unit.retry_count <= active_unit.retry_limit`.
6. `gate.implementation_blocked` is boolean.
7. `empirical_gates.learning.requires_attempt_before_solution` is `true`.

## Error modes

- `FileNotFoundError`: canonical state file is missing.
- `yaml.YAMLError`: malformed YAML.
- `ValueError`: invariant violation (via `load_and_validate`).

## Ordering

Always edit the canonical state first, then call `sync()` to regenerate derived
views. Never write to a derived view and back-port changes.

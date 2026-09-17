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

- `commit_gate_transition(state, decision, ...) -> dict`
  Validate one independently verified gate transition and persist it atomically.
  A decision backed by a separate verifier receipt records
  `evidence_verifier_source` and the canonical `evidence_digest`; later state
  validation rechecks that digest against the producer artifact.
  The no-code entry point is `learner.gate.no_code.verify_and_gate_no_code`:
  it requires an evaluating unit declaring `gate_kind: no_code`, an attempt,
  raw literacy evidence and a matching independent receipt. A successful
  transition labels the unit's empirical gate with
  `require_executable_evidence: false`, without code coverage/mutation thresholds.
  This label does not remove verification, attempt or replay checks.

- `record_prediction(record, path=None) -> Path`
  Validate and append an Arena prediction through the learner-owned boundary.

- `check() -> list[Path]`
  Return generated projections that differ from canonical sources without writing.

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

Always edit a canonical source first, then call `sync()` to regenerate derived
views. Use `learner/gate/` for evidence-driven mastery transitions. Never write
to a derived view and back-port changes.

## Commit and publication failure contract

For the repository canonical path, `commit_canonical` validates state and builds
all registered projections before writing anything. A validation or projection
build failure leaves the canonical file unchanged. This synchronous dependency
is intentional: a transition must be renderable by the registered consumers.

After building, the canonical file is written first, then each projection.
Writes are atomic per file, not a transaction over the full set. A publication
I/O failure can therefore leave committed canonical state with stale or partly
updated projections; the exception propagates to the caller. Temporary/test
state paths validate and write only their requested state file.

After a write failure, inspect canonical state before retrying a gate: its
receipt may already be consumed. Repair the I/O or projection problem, use
`check()` to identify drift, run `python3 -m learner.substrate` to republish from
canonical state, then require `check() == []`. Do not replay the gate merely to
repair its projections. No asynchronous publication or automatic rollback is
provided.

## Streak semantics for consumers

The snapshot's `streak` is a **verified learning streak**, derived from passing
gate outcomes and canonical freeze rules. LiteracyDojo's local `streak` is a
**local engagement streak**, based on activity attempts on consecutive local
dates, including unsuccessful attempts. Present or report those names explicitly when combining the sources;
never add them together or feed local activity into canonical scheduling.
Existing storage keys and calculation rules remain context-local.

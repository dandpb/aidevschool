---
status: completed
title: Prediction store + substrate extension
type: backend
complexity: medium
dependencies: []
---

# Task 3: Prediction store + substrate extension

## Overview
Add a structured, append-only `learner/predictions.yaml` and extend the substrate
to read it and emit an additive `predictions` field on `LearnerSnapshot` (count +
per-metric correct/total). This captures the per-metric prediction calibration
data without touching the validated `learning_state.yaml` schema, and seeds the V2
calibration meter.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST define the `predictions.yaml` record shape per TechSpec "Data Models" (project, run, metric, predicted, actual, correct, optional reason).
- MUST provide an append-only helper that adds a prediction record without rewriting existing entries.
- Substrate MUST read `predictions.yaml` and compute `byMetric` correct/total for latency, memory, throughput.
- MUST add `predictions` to `LearnerSnapshot` additively (codexDojo `domain.ts` + generated `learner.ts`); existing snapshot fields unchanged.
- MUST NOT modify `learner/learning_state.yaml` or `learner/substrate/schema.yaml`.
- The `run` timestamp MUST be caller-supplied (no clock read), per repo determinism rules.
</requirements>

## Subtasks
- [x] 3.1 Create `learner/predictions.yaml` (empty `predictions: []` seed) and document the record shape.
- [x] 3.2 Implement an append-only write helper for prediction records.
- [x] 3.3 Extend the substrate to read predictions and aggregate `byMetric` counts.
- [x] 3.4 Add the additive `predictions` field to `LearnerSnapshot` (`domain.ts`) and the snapshot generator.
- [x] 3.5 Add unit tests for append and aggregation; confirm `learning_state.yaml` is untouched.

## Implementation Details
Create `learner/predictions.yaml` + a helper (e.g. in `curriculum/_shared/arena/`
or `learner/substrate/`). Extend `learner/substrate/dashboard_snapshot.py` (and
`__main__.py` wiring) to read it. Extend `engines/codexDojo/src/domain.ts`
`LearnerSnapshot`. See TechSpec "Data Models" for both shapes.

### Relevant Files
- `learner/substrate/dashboard_snapshot.py` — builds `LearnerSnapshot`; add the predictions aggregation here.
- `learner/substrate/__main__.py` — `sync()` entry; ensure the new input is read.
- `engines/codexDojo/src/domain.ts` — `LearnerSnapshot` type to extend additively.
- `engines/codexDojo/src/data/learner.ts` — generated snapshot consumer (regenerated, not hand-edited).
- `learner/substrate/tests/` — substrate test pattern.

### Dependent Files
- `engines/miniMaxEvolutionEngine/.claude/commands/devschool/arena.md` (task_06) — appends predictions on reveal.
- `engines/codexDojo/src/data/learner.ts` — regenerated to include the new field.

### Related ADRs
- [ADR-004: Prediction + outcome storage — dedicated predictions.yaml](../adrs/adr-004.md) — non-breaking dedicated file rationale.

## Deliverables
- `learner/predictions.yaml` + append-only helper.
- Substrate aggregation + additive `LearnerSnapshot.predictions`.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration test: append → `python3 -m learner.substrate` → snapshot reflects counts **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] Appending a record to a file with two existing records yields three records, existing ones byte-unchanged.
  - [x] `byMetric` aggregation over [latency:correct, latency:wrong, memory:correct] yields `latency {correct:1,total:2}`, `memory {correct:1,total:1}`.
  - [x] A prediction with no `reason` is accepted (optional field).
  - [x] Running the substrate does not modify `learning_state.yaml` (hash unchanged).
- Integration tests:
  - [x] After appending and running `python3 -m learner.substrate`, `learner.ts` contains the `predictions` field with matching counts.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `predictions` surfaces on the dashboard snapshot; `learning_state.yaml` untouched.

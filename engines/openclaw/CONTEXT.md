# Checklist runner

File-based, simulate-grade artifact checklist for the five-phase software cycle.
It has no event bus, AI dispatch, daemon, or empirical-verification authority.

## Language

**Checklist runner**:
The process that evaluates required artifact paths and minimum sizes, then may
advance `learner/pipeline_status.yaml`.
_Avoid_: verifier, tutor, event bus, CI pipeline

**Checklist**:
The ordered artifact-presence rules for one software-cycle phase.
_Avoid_: empirical gate, test suite, semantic review

**Preview**:
A read-only receipt of the YAML source, active project and phase, learning-gate
result, and next checklist.
_Avoid_: dry run that secretly persists state

**Simulate grade**:
A result that proves required artifacts exist and meet size floors. It never
means the artifact is correct or the learner has mastered a unit.
_Avoid_: Verifier PASS, Gate Outcome, Mastered

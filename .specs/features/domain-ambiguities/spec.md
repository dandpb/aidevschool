# Domain ambiguities specification

Status: Draft for owner review. Planning only; no implementation or commits authorized by this request.
Size: Large, eight tasks across learner validation, judgment, and pipeline consumers.

## Problem Statement

Six findings expose repeated definitions of gate reviews, registration, empirical
judgment, and pipeline state. Four minimal probes reproduced disagreement in the
previous analysis. This plan was refreshed against current source on 2026-09-13;
the original dirty implementation has since changed its Git status. Implementation
must recheck source and worktree ownership before editing.

## Goals

- Give each shared rule one implementation and test its consuming boundaries.
- Preserve independent verification and the distinction between local completion,
  canonical mastery, numeric assessment, and operational readiness.

## Out of Scope

| Feature | Reason |
| --- | --- |
| State-machine redesign and frontend progress | Different bounded contexts; not required by the six findings. |
| Automatic repair of learner history | A malformed record cannot be upgraded into evidence by inference. |
| New infrastructure, dependencies, or services | Existing Python modules suffice. |
| Pipeline transaction/lease redesign | Preserve existing write authority, rollback, and concurrency behavior. |
| Push, merge, deployment, or real learner transitions | This request only produces a plan. |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Fresh unit registration | Allow an unregistered presenting unit with absent or empty history; reject other active states. | Existing consistency validator and test_fresh_presenting_unit_may_be_missing_from_units_log define this exception. | Proposed |
| Legacy partial gate reviews | Reject malformed gate-shaped records; do not infer missing outcomes from ratings. | schema.yaml declares both fields and the gate writer emits them together. | Proposed |
| Empty pipeline identity | Preserve OpenClaw bootstrap; supervisor still rejects empty identity and missing projects. | Parsing shape and permission to operate are separate contracts. | Proposed |
| Numeric assessment | Share finite-number comparison, not a fabricated isolated-verifier verdict. | Tutor reference assessment does not establish receipt provenance. | Proposed |
| Missing threshold config | Default judgments fail explicitly; retain explicit caller-supplied thresholds. | Canonical standards already fail closed and reference tests use explicit thresholds. | Proposed |
| Old test fixtures | Complete fixtures intended to represent valid reviews; retain malformed cases as negative tests. | Strengthens fixtures without deleting or weakening assertions. Any protected-test override needs explicit owner approval. | Proposed |

Open questions: none left unrecorded; proposed defaults above remain subject to plan approval.

## User Stories

### P1: Consistent review history

As a learner-state maintainer, I need validation and scheduling to agree about
which records represent gate reviews.

**Acceptance Criteria**:
1. WHEN a review contains event=gate, a known gate_outcome, its mapped rating, and a valid review date THEN the review classifier SHALL accept it as a gate review (AMB-01).
2. IF a gate-shaped record lacks one of those fields or has a mismatched rating THEN validation SHALL report a field-specific error (AMB-02).
3. IF a gate-shaped record is malformed THEN scheduling SHALL raise ValueError before creating a card (AMB-03).
4. WHEN history contains only presented events without gate fields THEN scheduling SHALL return no card (AMB-04).
5. WHEN an active presenting unit is absent from an absent or empty units_log THEN registration validation SHALL accept its registration status (AMB-05).
6. IF an active practicing, evaluating, or mastered unit is absent from units_log THEN registration validation SHALL report a missing-unit error (AMB-06).
7. The system SHALL retain attempt, receipt, evidence, replay, and mastery-consistency checks independently of review shape validation (AMB-07).

**Independent Test**: Table-driven records run through the classifier, public
validate(), and scheduler; exercise a real gate-produced record in a temporary
workspace. A failed gate review remains schedulable and never grants mastery.

### P1: Consistent numeric judgment

As a maintainer, I need numeric checks to agree without merging trust authorities.

**Acceptance Criteria**:
1. IF either score is NaN, positive or negative infinity, boolean, None, or nonnumeric THEN both numeric assessment paths SHALL reject it (AMB-08).
2. WHEN finite scores equal their supplied thresholds THEN numeric assessment SHALL pass (AMB-09).
3. WHEN a default judgment follows a threshold-file change THEN its numeric assessment SHALL use the updated thresholds (AMB-10).
4. IF default thresholds cannot be loaded THEN judgment SHALL raise ThresholdSeamError without a PASS result (AMB-11).
5. WHEN callers supply valid explicit thresholds THEN the tutor evaluator SHALL honor those values (AMB-12).
6. The tutor evaluator SHALL retain tests_pass, lint_clean, and anti_patterns as independent failure conditions (AMB-13).
7. The VerifierVerdict.verified_pass property SHALL equal verdict_passed for the same verdict and configured thresholds (AMB-14).
8. The canonical verdict SHALL continue requiring PASS and context_isolated=True in addition to numeric acceptance (AMB-15).

**Independent Test**: Mutate a temporary threshold file between evaluations of
one evaluator instance; exercise exact and below-boundary scores; check invalid
numbers and each independent failure reason.

### P2: Consistent pipeline document

As an operator, I need malformed persisted fields rejected by both readers.

**Acceptance Criteria**:
1. IF an existing pipeline document has blockers that is not a list of strings THEN both readers SHALL reject it without writing any file (AMB-16).
2. IF an existing pipeline document has missing required shape fields, wrong field types, or an unknown phase THEN both readers SHALL reject its shared shape (AMB-17).
3. The two consumers SHALL use one six-value pipeline phase definition without changing serialized values (AMB-18).
4. WHEN OpenClaw reads an absent YAML file THEN it SHALL return its existing fresh PipelineStatus without parsing Markdown (AMB-19).
5. IF the supervisor receives absent state, empty identity, an invalid project path, or a missing project directory THEN it SHALL reject operational readiness (AMB-20).
6. WHEN a valid pipeline is saved and loaded THEN its known fields SHALL retain their values (AMB-21).
7. The change SHALL preserve Markdown bytes, learner-state bytes, and existing rollback and lease behavior (AMB-22).

**Independent Test**: Feed identical temporary documents to both public readers;
compare shared-shape rejection, then test intentional supervisor-only readiness
restrictions separately. Preserve the scheduler rollback regression suite.

## Edge Cases

Known outcomes map exactly: fail/again, pass_retried/hard,
pass_first_try/good, pass_exceeds/easy. A review date uses the existing canonical
Python date/datetime representation; malformed dates must fail before replay.
Presented events cannot carry rating or gate_outcome. Unknown non-gate events
remain outside gate classification unless they contain gate fields.

Pipeline required shared fields: cycle_id (string), current_project (string),
phase (one of the six values), blockers (list of strings). Empty strings are
shape-valid bootstrap values only. complexity_level defaults to 1 when absent,
is a positive integer excluding bool when present; awaiting defaults to an empty
string when absent and must be a string when present. Unknown extension fields
retain current reader behavior (ignored); preservation of arbitrary unknown keys
is not promised. Empty YAML is malformed, distinct from an absent file.

## Implicit requirement dimensions

| Dimension | Resolution |
| --- | --- |
| Validation and bounds | AMB-01 to AMB-06, AMB-08 to AMB-12, AMB-16 to AMB-20. |
| Failure and partial failure | AMB-03, AMB-11, AMB-22; no writes on read failure. |
| Idempotency and retries | AMB-22; repeated reads are pure, retry counters unchanged. |
| Auth and rate limits | AMB-07 and AMB-15 preserve verification authority; no new network endpoint. |
| Concurrency and ordering | AMB-22; existing lease/CAS and rollback remain in place. |
| Data lifecycle | No migration, deletion, or inferred historical proof. |
| Observability | Field-specific validation errors; no new telemetry. |
| External dependencies | N/A because no new external call is introduced. |
| State transitions | AMB-05 to AMB-07; supervisor never gains mastery authority. |

## Requirement Traceability

| Requirement ID | Story | Task | Status |
| --- | --- | --- | --- |
| AMB-01 | Review history | T1, T2 | In Tasks |
| AMB-02 | Review history | T1, T2 | In Tasks |
| AMB-03 | Review history | T1, T2 | In Tasks |
| AMB-04 | Review history | T1, T2 | In Tasks |
| AMB-05 | Registration | T3 | In Tasks |
| AMB-06 | Registration | T3 | In Tasks |
| AMB-07 | Authority | T2, T3, T8 | In Tasks |
| AMB-08 | Numeric assessment | T4, T5 | In Tasks |
| AMB-09 | Numeric assessment | T4, T5 | In Tasks |
| AMB-10 | Tutor assessment | T5 | In Tasks |
| AMB-11 | Tutor assessment | T5 | In Tasks |
| AMB-12 | Tutor assessment | T5 | In Tasks |
| AMB-13 | Tutor assessment | T5 | In Tasks |
| AMB-14 | Canonical verdict | T4 | In Tasks |
| AMB-15 | Canonical verdict | T4 | In Tasks |
| AMB-16 | Pipeline shape | T6, T7 | In Tasks |
| AMB-17 | Pipeline shape | T6, T7 | In Tasks |
| AMB-18 | Pipeline vocabulary | T7 | In Tasks |
| AMB-19 | Bootstrap | T6 | In Tasks |
| AMB-20 | Supervisor readiness | T7 | In Tasks |
| AMB-21 | Persistence boundaries | T6, T7, T8 | In Tasks |
| AMB-22 | Persistence boundaries | T6, T7, T8 | In Tasks |

Coverage: 22 requirements mapped to tasks; zero unmapped. None implemented by this plan.

## Success Criteria

All 22 criteria pass with spec-derived assertions. The independent verifier kills
behavioral faults for review classification, missing-unit registration, NaN,
threshold reload, scalar blockers, and a dropped phase. No canonical learner data
is changed, and no test is skipped, weakened, or deleted to obtain a pass.

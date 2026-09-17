# Domain ambiguities design

Status: Proposed, pending owner approval. Spec: [spec.md](spec.md).

## Architecture Overview

Use small shared functions inside existing domain owners. The only extracted
logic is used by multiple current consumers. Keep the project cycle independent
of learner mastery and keep operational readiness above document parsing.

| Approach | Trade-off | Choice |
| --- | --- | --- |
| Reuse current modules and expose pure shared checks | Small change; retains the existing supervisor-to-OpenClaw dependency. | Recommended |
| Introduce a new domain package for every shared contract | Cleaner dependency naming but more files and import migration for the same outcome. | Not selected |
| Keep implementations separate with parity tests | Fewer import changes but still permits future rule drift. | Not selected |

## Components and Code Reuse Analysis

| Owner | Change and consumers |
| --- | --- |
| learner/substrate/scheduling.py | Add a pure gate-review validator/classifier using RATING_FROM_GATE; reuse in replay and retention derivation. Return field errors for malformed gate-shaped records; distinguish non-gate events. No FSRS algorithm changes. |
| learner/substrate/__init__.py | Reuse that classifier in units-log and evidence-review selection. Report malformed records before any evidence shortcut. Retain digest, receipt, attempt, and mastered checks. Registration belongs only in _validate_active_unit_units_log_consistency; remove the duplicate membership branch from _validate_units_log. |
| learner/gate/standards.py | Extract shared numeric blockers from verdict_blockers, keeping finite-number rejection. Make verified_pass delegate to verdict_passed. Keep verdict/provenance checks outside numeric blockers. |
| engines/minimaxDojo/core/gates.py | Resolve unspecified thresholds at evaluate-time; reuse numeric blockers. Preserve constructor keyword compatibility and result fields, plus tests/lint/anti-pattern checks. Never construct a fake isolated-verifier verdict. |
| engines/minimaxDojo/core/config.py | Delegate gate_thresholds to canonical threshold validation while retaining its tuple API and explicit-config input. Retry configuration is unchanged. |
| engines/openclaw/runner/pipeline_status.py | Expose one pure parse_pipeline_mapping function from the existing _from_mapping seam. Validate persisted shape strictly, with documented optional defaults. Keep Phase here; no new package. load_status retains missing-file bootstrap. |
| engines/miniMaxEvolutionEngine/supervisor | models.py imports Phase as PipelinePhase; state.py reuses parse_pipeline_mapping before existing identity/path checks. Convert shape exceptions to existing InvalidStateError at the supervisor boundary. |

Do not unify curriculum._shared.evidence.Phase: it describes coarse challenge
phases (impl, review, optimize), unlike pipeline milestone values (spec-done,
impl-done). Preserve scheduler._PHASE_MAP as the explicit translation.

## Data Models

No persisted schema version or record migration. Valid review = event, mapped
outcome/rating, and canonical date. Valid pipeline shape is defined in the spec.
Parser output remains PipelineStatus; supervisor output remains PipelineState.
A shared numeric result is a sequence of blockers, not a proof of verification.

## Error Handling Strategy

Malformed history produces validation errors or ValueError before replay.
Threshold configuration failure raises ThresholdSeamError. Invalid persisted
pipeline fields produce StateCorruptionError in OpenClaw and InvalidStateError
in the supervisor. Retain source-path and field diagnostics; do not silently
normalize strings, booleans, or nulls into valid records.

## Risks & Concerns

| Concern | Evidence | Mitigation |
| --- | --- | --- |
| Partial legacy review fixtures | learner/substrate/tests/test_substrate.py:1167 | Complete positive fixtures with matching outcomes; preserve explicit malformed-input tests. Inventory tracked data before any compatibility decision; never infer evidence. |
| Conflicting registration assertions | learner/substrate/__init__.py:205 and :660 | Preserve the documented presenting exception and test absent versus empty logs through public validate(). |
| Hidden evidence bypass during consolidation | learner/substrate/__init__.py:435 | Keep malformed gate candidates visible to validation; run gate/receipt/anti-replay tests and real writer-to-validator integration. |
| Default evaluator uses constants | engines/minimaxDojo/core/gates.py:28 | Resolve live defaults on every evaluation; test the same instance before/after temporary config changes. |
| Numeric reuse mistaken for verifier trust | learner/gate/standards.py:168 | Extract only score comparison; context isolation and PASS remain canonical checks. |
| Bootstrap mistaken for valid operational state | engines/openclaw/tests/test_pipeline_status.py:46 | Preserve shape-valid empty identity roundtrip; supervisor still refuses to act. |
| Local interpreter previously failed before imports | Prior probe: .venv/bin/python cannot find encodings | Preflight Python >=3.11 and project dependencies before Execute; use an isolated working environment if needed. Do not reuse the cross-version sys.path workaround as release evidence. |
| Concurrent edits | Worktree contains unrelated analytics/tool changes | Recheck baseline before each task; stage explicit owned paths only. Never stash/reset other work. |
| Hook-protected tests | Root AGENTS.md and SDLC instructions | Add regression tests before fixes. Request only the exact owner-approved override if an existing protected fixture needs an edit; never set a blanket override. |

## Verification and Rollback

Use existing pytest suites and temporary workspaces. No live gate commit, tick,
or poll is required to prove these contracts. Run scheduler/supervisor integration
with injected roles, not real model calls. Capture collected-test baseline,
new tests, outcomes, full reviewed commit SHA, and all pre-existing failures.

One local commit per approved implementation task, with tasks/spec status updated
before that commit. Revert only owned task commits, in reverse dependency order,
if rollback is requested. No production or learner-data rollback is necessary.

Final verification is independent: spec outcomes, all REVIEW.md passes, and fault
injection in disposable copies. Compare real-tree status to the pre-sensor baseline.
Write validation.md only when that verifier has actually run, never as a placeholder.

## Planning evidence

Current source and six test surfaces were inspected; no implementation suite was
run for this planning request. The spec/tasks structural validators are run before
handoff. The earlier probes are diagnostic evidence, not acceptance of the fixes.

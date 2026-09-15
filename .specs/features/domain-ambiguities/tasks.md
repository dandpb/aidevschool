# Domain ambiguities tasks

## Execution Protocol

Activate tlc-spec-driven by name and follow its Execute flow and Critical Rules.
Read implement.md fully before execution. If the skill cannot be loaded, stop.
This document is a draft plan; no task is started or authorized by its creation.

One atomic local commit per approved task, including task status and traceability
updates. First record a failing spec-derived regression; then implement and run
its gate. Do not delete, skip, or weaken tests. No push, deploy, or live state
transition is included. Run a fresh independent verifier after the final task.

**Design**: [design.md](design.md)
**Status**: Draft

## Test Coverage Matrix

Generated from AGENTS.md, REVIEW.md, Makefile, pyproject.toml, engine instructions,
and .github/workflows/ci.yml. Samples: test_substrate.py, test_pipeline_status.py,
test_empirical_gates.py, test_learning_unit_e2e_contract.py, test_standards.py,
and test_supervisor.py. pytest includes both function tests and unittest classes.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Review classification/replay | unit + integration | Every accepted and rejected record shape; writer-to-validator-to-scheduler parity | learner/substrate/tests/test_domain_ambiguities.py (new), test_substrate.py | Q-review |
| Canonical numeric primitives | unit | Invalid numbers, threshold equality/reload, explicit override, trust distinction | learner/gate/tests/test_standards.py and engines/minimaxDojo/tests/test_empirical_gates.py | Q-gate |
| Tutor numeric adapter | unit + integration | Live thresholds and preserved tutor-only checks | engines/minimaxDojo/tests/test_empirical_gates.py and test_learning_unit_e2e_contract.py | Q-gate |
| Pipeline parser and consumers | unit + integration | Same malformed documents, all phases, bootstrap/readiness distinction, unchanged writes | engines/openclaw/tests/test_pipeline_status.py and engines/miniMaxEvolutionEngine/tests/test_supervisor.py | Q-pipeline |
| Contracts/documentation | contract verification | Every requirement linked; manifest paths exist; no stale ownership promise | engines/test_engine_contracts.py plus plan validators | Full |

## Gate Check Commands

Run from the repository root in a verified Python >=3.11 environment with the
project's declared development dependencies. Preflight python3 version and imports
pytest, yaml, fsrs before tests. The broken .venv from the analysis is not a valid
execution baseline. Do not install or repair the user's environment implicitly.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Q-review | T1-T3 | rtk proxy python3 -m pytest learner/substrate/tests learner/gate/tests/test_gate.py -q |
| Q-gate | T4-T5 | rtk proxy python3 -m pytest learner/gate/tests engines/minimaxDojo/tests curriculum/_shared/tests -q |
| Q-pipeline | T6-T7 | rtk proxy python3 -m pytest engines/openclaw/tests engines/miniMaxEvolutionEngine/tests -q |
| Full | T8 and final verifier | rtk make test |
| Build | End of each phase | Applicable quick gates; Python syntax/imports exercised by pytest. No Python linter or build gate is configured in the inspected Makefile/CI; do not claim one passed or add a tool for this change. |
| Structure | Before approval and after edits | rtk proxy python3 /Users/danielbarreto/.agents/skills/tlc-spec-driven/scripts/validate_spec.py .specs/features/domain-ambiguities/spec.md --strict |
| Structure tasks | Before approval and Execute | rtk proxy python3 /Users/danielbarreto/.agents/skills/tlc-spec-driven/scripts/validate_tasks.py .specs/features/domain-ambiguities/tasks.md --strict |

Before T1, collect applicable tests with the same pytest selection and
--collect-only -q. Record exact baseline counts in task evidence. Each task's
post-count must be baseline plus its new cases; no unexplained loss or new skips.
Counts are intentionally not invented in this planning-only artifact.

## Execution Plan

Tasks run sequentially. Later phases inherit completed prior-phase gates.
The order serializes shared-file edits; it does not imply domain dependencies
between numeric judgment and pipeline parsing.

### Phase 1: Review history

```text
T1 -> T2 -> T3
```

### Phase 2: Numeric judgment

```text
T4 -> T5
```

### Phase 3: Pipeline contract

```text
T6 -> T7 -> T8
```

## Complete execution order

```text
T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7 -> T8
```

## Task Breakdown

### T1: Define gate-review classification and use it in scheduling

**What**: Reuse RATING_FROM_GATE and existing date handling. Add a pure classifier with field-level errors. Gate-shaped malformed input raises ValueError before replay; presented-only history yields no card. Apply the same classification to retention/review selection in this module.
**Where**: `learner/substrate/scheduling.py`
**Depends on**: None
**Requirement**: AMB-01, AMB-03, AMB-04
**Tools**: local shell through rtk; tlc-spec-driven and repository coding/verification skills. No external service needed.
**Tests**: unit + integration: new learner/substrate/tests/test_domain_ambiguities.py; four valid outcome/rating pairs, missing event/outcome/rating/date, unknown outcome, mismatched rating, invalid date, presented-only history. Adjust only positive legacy scheduling fixtures that intentionally represent complete reviews, subject to test-edit approval.
**Gate**: Q-review
**Done when**:
- [ ] Named acceptance criteria have spec-derived assertions and pass the gate.
- [ ] Test baseline, additions, and resulting count are recorded without test loss.
- [ ] Owned diff passes REVIEW.md checks and task/traceability status is updated.
**Commit**: `fix(learner): unify scheduled gate review classification`

### T2: Use the review contract in canonical validation

**What**: Replace independent review recognition in units-log validation and evidence-file/receipt selection with T1 classification. A malformed gate candidate must produce an error, not disappear from evidence checks. Preserve actual evidence and receipt validation.
**Where**: `learner/substrate/__init__.py`
**Depends on**: T1
**Requirement**: AMB-01, AMB-02, AMB-07
**Tools**: local shell through rtk; tlc-spec-driven and repository coding/verification skills. No external service needed.
**Tests**: unit + integration: extend the new domain ambiguity tests; public validate() rejects malformed reviews, a real gate-produced temporary record is accepted, fail/again stays non-mastered, valid receipt/digest and missing-attempt regressions remain enforced.
**Gate**: Q-review
**Done when**:
- [ ] Named acceptance criteria have spec-derived assertions and pass the gate.
- [ ] Test baseline, additions, and resulting count are recorded without test loss.
- [ ] Owned diff passes REVIEW.md checks and task/traceability status is updated.
**Commit**: `fix(learner): align history validation with review classification`

### T3: Give active-unit registration one rule

**What**: Remove duplicate membership enforcement from _validate_units_log. Keep the decision in _validate_active_unit_units_log_consistency. Preserve mastered/log consistency and real attempt/evidence requirements.
**Where**: `learner/substrate/__init__.py`
**Depends on**: T2
**Requirement**: AMB-05, AMB-06, AMB-07
**Tools**: local shell through rtk; tlc-spec-driven and repository coding/verification skills. No external service needed.
**Tests**: unit + integration: public validate() accepts registration for fresh presenting units with absent, empty, or unrelated history; practicing/evaluating/mastered missing from log reject; registered units keep normal behavior. No weakening of existing mastery assertions.
**Gate**: Q-review
**Done when**:
- [ ] Named acceptance criteria have spec-derived assertions and pass the gate.
- [ ] Test baseline, additions, and resulting count are recorded without test loss.
- [ ] Owned diff passes REVIEW.md checks and task/traceability status is updated.
**Commit**: `fix(learner): preserve fresh unit registration consistently`

### T4: Consolidate canonical judgment predicates

**What**: Extract only shared numeric blockers from verdict_blockers. Keep finite checks and threshold comparison there. Make verified_pass delegate to verdict_passed; keep PASS and context_isolated checks in the canonical verdict layer.
**Where**: `learner/gate/standards.py`
**Depends on**: T3
**Requirement**: AMB-08, AMB-09, AMB-14, AMB-15
**Tools**: local shell through rtk; tlc-spec-driven and repository coding/verification skills. No external service needed.
**Tests**: unit: test_standards.py table of invalid numbers, exact thresholds, below thresholds, FAIL/UNKNOWN verdicts and missing isolation. Assert property/predicate parity and unchanged independent-verification requirements.
**Gate**: Q-gate
**Done when**:
- [ ] Named acceptance criteria have spec-derived assertions and pass the gate.
- [ ] Test baseline, additions, and resulting count are recorded without test loss.
- [ ] Owned diff passes REVIEW.md checks and task/traceability status is updated.
**Commit**: `refactor(gate): use one canonical verdict predicate`

### T5: Align the tutor empirical evaluator with numeric standards

**What**: Update gates.py and the gate_thresholds API in config.py as one empirical-evaluation component. Resolve unspecified defaults at evaluation time via canonical standards. Preserve explicit override keywords and the result shape. Retain independent tests/lint/anti-pattern checks; retry config stays unchanged.
**Where**: `engines/minimaxDojo/core`
**Depends on**: T4
**Requirement**: AMB-08, AMB-09, AMB-10, AMB-11, AMB-12, AMB-13
**Tools**: local shell through rtk; tlc-spec-driven and repository coding/verification skills. No external service needed.
**Tests**: unit + integration: test_empirical_gates.py and test_learning_unit_e2e_contract.py; NaN/infinities/bools/None/strings reject, same evaluator sees temporary config edits, missing/broken seam raises, explicit thresholds work, each nonnumeric failure condition rejects.
**Gate**: Q-gate
**Done when**:
- [ ] Named acceptance criteria have spec-derived assertions and pass the gate.
- [ ] Test baseline, additions, and resulting count are recorded without test loss.
- [ ] Owned diff passes REVIEW.md checks and task/traceability status is updated.
**Commit**: `fix(tutor): align empirical scoring with live standards`

### T6: Make the pipeline mapping parser strict

**What**: Expose parse_pipeline_mapping from the existing mapping seam with spec-defined required fields and optional defaults. Remove coercion of scalar blockers and malformed values. Keep missing-file bootstrap separate from parsing an existing empty document; preserve save/load behavior for valid known fields.
**Where**: `engines/openclaw/runner/pipeline_status.py`
**Depends on**: T5
**Requirement**: AMB-16, AMB-17, AMB-19, AMB-21, AMB-22
**Tools**: local shell through rtk; tlc-spec-driven and repository coding/verification skills. No external service needed.
**Tests**: unit + integration: test_pipeline_status.py covers strings/null/dicts/nonstrings in blockers, absent fields, bool complexity, all six phases, unknown phase, optional defaults, empty YAML versus absent file, shape-valid empty bootstrap identity, and Markdown-preserving roundtrip. Run scheduler rollback suite.
**Gate**: Q-pipeline
**Done when**:
- [ ] Named acceptance criteria have spec-derived assertions and pass the gate.
- [ ] Test baseline, additions, and resulting count are recorded without test loss.
- [ ] Owned diff passes REVIEW.md checks and task/traceability status is updated.
**Commit**: `fix(openclaw): enforce pipeline document shape`

### T7: Reuse pipeline shape and phase vocabulary in the supervisor

**What**: In models.py import the existing Phase as PipelinePhase. In state.py call T6 parsing and translate shape errors to InvalidStateError. Keep nonempty identity, exact curriculum slug, containment, required docs directory, and learner/project consistency checks.
**Where**: `engines/miniMaxEvolutionEngine/supervisor`
**Depends on**: T6
**Requirement**: AMB-16, AMB-17, AMB-18, AMB-20, AMB-21, AMB-22
**Tools**: local shell through rtk; tlc-spec-driven and repository coding/verification skills. No external service needed.
**Tests**: unit + integration: test_supervisor.py parametrizes the same document shapes as T6; tests all six serialized phases, empty bootstrap identity rejection, missing state, path traversal, missing project/docs, and valid projection. Run autonomous and poll suites with injected roles to retain write guards.
**Gate**: Q-pipeline
**Done when**:
- [ ] Named acceptance criteria have spec-derived assertions and pass the gate.
- [ ] Test baseline, additions, and resulting count are recorded without test loss.
- [ ] Owned diff passes REVIEW.md checks and task/traceability status is updated.
**Commit**: `refactor(supervisor): reuse pipeline shape and phases`

### T8: Document domain ownership and close requirement coverage

**What**: Update the manifest to the verified implementation and tests. Align affected contract descriptions in learner/substrate/interface.md, learner/substrate/schema.yaml, engines/minimaxDojo/docs/04_empirical_gates.md and engines/openclaw/AGENTS.md where they conflict with the implemented rules. Keep project-wide rules in canonical AGENTS.md files, not memory.
**Where**: `engines/codexDojo/ecosystem/MANIFEST.md`
**Depends on**: T7
**Requirement**: AMB-01 through AMB-22
**Tools**: local shell through rtk; tlc-spec-driven and repository coding/verification skills. No external service needed.
**Tests**: contract verification: engines/test_engine_contracts.py via Full; inspect links and run both structural validators. Record per-AC test evidence, then run the independent verifier and mutation sensor described below.
**Gate**: Full plus Structure and Structure tasks
**Done when**:
- [ ] Named acceptance criteria have spec-derived assertions and pass the gate.
- [ ] Test baseline, additions, and resulting count are recorded without test loss.
- [ ] Owned diff passes REVIEW.md checks and task/traceability status is updated.
**Commit**: `docs(domain): document shared judgment and pipeline contracts`

## Task Granularity Check

| Task | Scope | Result |
| --- | --- | --- |
| T1 | One review-classification/scheduling component | Atomic, tests accompany implementation |
| T2 | One canonical history-validation component | Atomic |
| T3 | One registration invariant | Atomic |
| T4 | One canonical judgment component | Atomic |
| T5 | One empirical-evaluation component, two related source files | Atomic API change with its configuration adapter |
| T6 | One pipeline parsing component | Atomic |
| T7 | One supervisor pipeline adapter, model alias plus loader | Atomic; cannot ship one side untested |
| T8 | One documentation/coverage deliverable | Cohesive contract synchronization |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram Shows | Result |
| --- | --- | --- | --- |
| T1 | None | Entry | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | T2 | T2 -> T3 | Match |
| T4 | T3 | Prior phase complete | Match |
| T5 | T4 | T4 -> T5 | Match |
| T6 | T5 | Prior phase complete | Match |
| T7 | T6 | T6 -> T7 | Match |
| T8 | T7 | T7 -> T8 | Match |

## Test Co-location Validation

| Task | Layer | Matrix Requires | Task Says | Result |
| --- | --- | --- | --- | --- |
| T1 | Review/replay | unit + integration | unit + integration | Match |
| T2 | Review/validation | unit + integration | unit + integration | Match |
| T3 | Registration | unit + integration | unit + integration | Match |
| T4 | Judgment | unit | unit | Match |
| T5 | Tutor evaluation | unit + integration | unit + integration | Match |
| T6 | Pipeline | unit + integration | unit + integration | Match |
| T7 | Supervisor adapter | unit + integration | unit + integration | Match |
| T8 | Contracts | contract verification | contract verification | Match |

## Independent verifier

After the last task, run a fresh verifier automatically. It maps all 22 criteria
to actual assertions and outcomes, applies REVIEW.md, records the full commit SHA,
and writes validation.md with PASS/FAIL. Structural checks alone are not acceptance.

In disposable copies inject one fault at a time: accept missing review event;
ignore a mismatched rating; remove the presenting exception; allow NaN; cache
stale default thresholds; accept scalar blockers; remove a phase; bypass the
supervisor's empty-identity guard. Each fault must be killed by a spec-derived test.
Do not mutate the real worktree or use git stash. Surviving faults become fix
tasks; at most three fix/reverify iterations, then report the precise blocker.
Run validate_state.py only after real implementation and verification.

## Approval boundary

The current deliverable is a reviewable plan only. Approving implementation under
tlc-spec-driven permits local task commits; it does not authorize remote actions.
Before Execute, confirm tool preferences as required by the skill and resolve any
specific protected-test fixture edit with the owner. No override is granted here.

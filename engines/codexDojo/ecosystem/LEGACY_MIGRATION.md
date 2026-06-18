# Legacy Migration and Refactoring Contract

This contract turns the original legacy/refactoring idea into reusable ecosystem rules. Legacy work is not a style cleanup lane; it is a behavior-preserving learning loop for reducing risk while improving clarity and changeability.

## When This Contract Applies

Use this contract when a project involves any of the following:

- Existing code with unclear behavior, missing tests, or weak documentation.
- Refactoring before adding a feature.
- Migrating JavaScript to TypeScript, callbacks to async/await, one framework to another, or one architecture to another.
- Extracting a module, adding boundaries, or splitting a monolith.
- Modernizing dependencies, logs, CI/CD, containers, or observability without changing external behavior.

## Required Legacy Cycle

1. **Map behavior first.** Identify entry points, dependencies, data stores, side effects, and production risks.
2. **Write characterization tests.** Lock the current observable behavior before changing code.
3. **Measure the baseline.** Capture complexity, duplication, coverage, build/test time, and any runtime metric relevant to the change.
4. **Choose one small refactor.** Prefer extract function/module, rename, dependency inversion, adapter/facade, or boundary extraction.
5. **Apply the smallest safe change.** No rewrites unless the migration plan proves incremental refactoring is riskier.
6. **Verify behavior parity.** Re-run characterization tests and any public-surface smoke test.
7. **Measure the delta.** Report whether the change improved clarity, testability, coupling, or runtime behavior.
8. **Record the lesson.** Update `learner/pitfalls.md`, `learner/journal.md`, or the project learning notes when the result is reusable.

## Code-Smell Catalog

| Smell | Symptom | Correction technique | Verification |
| --- | --- | --- | --- |
| Large script | One file owns parsing, business logic, I/O, and output. | Extract module around one behavior slice. | Characterization test passes; module has direct unit tests. |
| Framework-bound domain | Business rules require web/server objects to run. | Move rule into pure function or service; keep framework adapter thin. | Domain unit test runs without framework boot. |
| Conditional maze | New variants require editing a long branch chain. | Introduce strategy or data-driven dispatch only when variants are stable. | Existing variant tests pass; new variant adds no branch to old chain. |
| Hidden side effect | Function name suggests calculation but mutates I/O, state, or time. | Separate command from query; inject clock/I/O boundary. | Tests assert output and side-effect boundary explicitly. |
| Shotgun coupling | One concept change requires edits across many folders. | Extract cohesive module or anti-corruption adapter. | Fewer touched files for the same behavior change. |
| Untyped boundary | External input is trusted deep inside the app. | Parse/validate at the boundary; pass typed values inward. | Invalid input test fails at boundary with clear error. |
| Dead compatibility path | Old draft behavior remains after the current contract changed. | Delete path after proving no persisted/external consumer needs it. | Tests and public smoke path stay green. |

## Characterization Tests

Characterization tests capture what the system currently does, not what the refactor wishes it did.

Minimum coverage:

- Happy path for each public entry point.
- One bad input path.
- One stateful or side-effect path when the code writes files, network, database, cache, queue, or logs.
- One regression test for the behavior that made the code risky to change.

Store the evidence in the project package:

- `docs/characterization_tests.md` for scenarios and commands.
- Test files beside the implementation under the language's normal test location.
- Raw before/after command output or links in `docs/evolution_report.md`.

## Migration Strategies

Prefer incremental strategies:

- Strangler Fig for replacing slices behind the same public surface.
- Branch by Abstraction for swapping internals behind a stable interface.
- Parallel Run when correctness must be compared before cutover.
- Feature Flags for reversible exposure.
- Expand/Contract for database changes.
- Anti-corruption Layer when a legacy model should not leak into new code.

Avoid full rewrites unless the project package records why characterization, strangling, or branch-by-abstraction cannot reduce risk enough.

## Refactor Metrics

Every legacy/refactor cycle reports before and after values for the metrics that matter to the change:

| Metric | Required when | Better means |
| --- | --- | --- |
| Characterization pass rate | Always | 100% pass before and after. |
| Core coverage | Tests were added or boundaries changed. | Coverage rises or stays stable with stronger assertions. |
| Cyclomatic/cognitive complexity | Control flow was simplified. | Median stays <10; hotspot decreases. |
| Coupling/touched files | Module boundaries changed. | Same behavior change touches fewer files. |
| Duplication | Shared behavior was extracted. | Duplicate logic decreases without speculative abstraction. |
| Build/test time | Tooling or dependency graph changed. | Time stays stable or improves. |
| Runtime/latency/memory | Performance was a reason for change. | Measured workload improves with CV% <20%. |
| Regression count | Any migration. | Zero regressions accepted. |

## Training Drills

Add these as curriculum variants when the learner needs legacy practice:

- Split a large script into tested modules.
- Add characterization tests to a system with no tests.
- Migrate JavaScript to TypeScript gradually.
- Convert callbacks to async/await without changing external behavior.
- Separate business rules from a web framework.
- Extract a reusable module from a monolith.
- Compare incremental refactor against rewrite and justify the safer path.

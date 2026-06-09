# codexDojo Evaluation Models

## Code Evaluation Model

Each implementation is evaluated across seven dimensions.

| Dimension | Checks | Evidence |
| --- | --- | --- |
| Correctness | Functional requirements, edge cases, failure cases. | Unit/integration/E2E tests. |
| Type and API safety | Strict types, parse at boundaries, no unchecked escape hatches. | Typecheck, schema tests, code review. |
| Test quality | Meaningful assertions, mutation score, regression coverage. | Coverage report, mutation report, test review. |
| Maintainability | Naming, cohesion, coupling, complexity, duplication. | Code review, complexity metric. |
| Security | Input validation, auth boundaries, secret handling, dependency risk. | Threat checklist, dependency scan. |
| Performance | Runtime, latency, throughput, memory, CPU, cold start. | Benchmarks and resource metrics. |
| Operability | Logs, metrics, health checks, deployment and rollback. | Smoke test, runbook, observability check. |

## Review Severity

| Severity | Meaning |
| --- | --- |
| Blocker | Must fix before moving to the next phase. |
| Major | Material risk to correctness, security, scaling, or maintainability. |
| Minor | Improvement with limited immediate risk. |
| Educational | Useful lesson; document or schedule as a challenge. |

## Technology Comparison Model

Every comparison must use the same problem, same contract, and same measurement scenario.

| Concern | Questions |
| --- | --- |
| Fit | What use case does this technology serve best? |
| Ergonomics | How much code, ceremony, and cognitive overhead? |
| Safety | What bugs does the type/runtime model prevent or allow? |
| Performance | What are p50, p95, p99, throughput, memory, CPU? |
| Operations | How easy is build, deploy, observe, rollback, and debug? |
| Ecosystem | Are official docs, libraries, and community maturity adequate? |
| Cost | Runtime cost, cloud cost, development time, maintenance cost. |
| Scaling path | What changes when load, team size, or data volume grows? |

## Evolution Metrics

| Metric | Target or interpretation |
| --- | --- |
| Core coverage | At least 80 percent on the core behavior. |
| Mutation score | 60 to 70 percent minimum when tooling is available. |
| Complexity | Median cyclomatic complexity below 10. |
| Duplication | Below 5 to 10 percent. |
| Latency | p50/p95/p99 by scenario, never one number only. |
| Throughput | Requests or jobs per second under documented workload. |
| Memory | Idle and under-load RSS. |
| CPU | Under-load CPU and saturation point. |
| Build time | Cold and warm build time. |
| AI dependency index | Should fall as learner autonomy grows. |

## Scorecard Template

| Area | Weight | Score | Evidence |
| --- | --- | --- | --- |
| Correctness | 25 | 0-5 | Tests and verifier. |
| Test quality | 20 | 0-5 | Coverage, mutation, adversarial cases. |
| Maintainability | 15 | 0-5 | Review and complexity. |
| Security | 10 | 0-5 | Threat checklist. |
| Performance | 10 | 0-5 | Benchmark. |
| Operability | 10 | 0-5 | Runbook and smoke test. |
| Learning value | 10 | 0-5 | Reflection and next challenge. |

Weighted score is useful only as a trend. A blocker in correctness, security, or verifier evidence fails the gate regardless of total score.

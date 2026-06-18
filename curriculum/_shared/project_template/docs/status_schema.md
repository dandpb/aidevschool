# Project Status Schema

> Canonical schema for `curriculum/*/docs/status.md`. Every project must maintain this file.
> Updated by each agent at the end of their phase.

## Required Fields

```yaml
project_id: NN_slug
project_name: Human-readable name
cycle_id: YYYY-MM-DD-NN-slug
complexity_level: 1-6
phase: idle | spec-in-progress | spec-done | impl-in-progress | impl-done | review-in-progress | review-done | benchmark-in-progress | benchmark-done | optimization-in-progress | cycle-complete
awaiting: next-phase-or-agent
last_update: ISO-8601 timestamp
updated_by: agent-name
```

## Phase Transitions

| From | To | Trigger | Owner |
|------|----|---------|-------|
| idle | spec-in-progress | curator starts | curator |
| spec-in-progress | spec-done | spec.md validated | curator |
| spec-done | impl-in-progress | developers start | dev-go/rust/node |
| impl-in-progress | impl-done | all 3 implementations green | dev-* |
| impl-done | review-in-progress | reviewer starts | reviewer |
| review-in-progress | review-done | code_review.md published | reviewer |
| review-done | benchmark-in-progress | benchmarker starts | benchmarker |
| benchmark-in-progress | benchmark-done | benchmark_results.md published (N≥3) | benchmarker |
| benchmark-done | optimization-in-progress | optimizer starts | optimizer |
| optimization-in-progress | cycle-complete | evolution_report.md published | optimizer |

## Implementation Tracking

```yaml
implementations:
  go:
    status: not-started | in-progress | done | failed
    coverage: percentage
    tests_passing: count
    tests_total: count
    lint_clean: boolean
    docker_builds: boolean
  rust:
    status: ...
    coverage: ...
    ...
  node:
    status: ...
    coverage: ...
    ...
```

## Benchmark Tracking

```yaml
benchmarks:
  scenarios_run: [baseline, stress, spike, endurance]
  languages_benchmarked: [go, rust, node]
  samples_per_scenario: N (must be ≥3)
  cv_threshold: 0.20
  raw_results_path: benchmarks/results/
  report_path: docs/benchmark_results.md
```

## Verifier Evidence

```yaml
verifier:
  context_isolated: boolean (must be true — separate from producer)
  tests_pass: boolean
  mutation_score: float (must be ≥0.65)
  coverage_core: float (must be ≥0.80)
  verdict: PASS | FAIL
  evidence_path: learner/evidence/NN_slug/
```

---
status: completed
title: Extract `run_benchmark` runner seam + `benchmark.yaml` (project 01)
type: refactor
complexity: high
dependencies: []
---

# Task 1: Extract `run_benchmark` runner seam + `benchmark.yaml` (project 01)

## Overview
Lift the project-01-hardcoded k6 + docker-stats runner into a generic,
parameterized module so any curriculum project can be benchmarked. Correctness is
proven by a regression baseline: the extracted runner's aggregated output must
match project 01's committed result, guaranteeing the extraction preserves
behavior before anything else builds on it.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST expose `run_benchmark(project_dir, lang, scenario, run_num, cfg)` per TechSpec "Core Interfaces".
- MUST parse a per-project `benchmark.yaml` (images, container ports, optional host-port overrides, scenarios) into a `BenchmarkConfig`.
- MUST write raw results under `{project_dir}/benchmarks/results/{lang}/{scenario}_run{run_num}.json` (+ `_stats.json`), matching the shape `BenchmarkAnalyzer` expects.
- MUST reuse `curriculum/_shared/benchmarks/analyzer.py` unchanged (no edits to the analyzer or its CV<20% / N≥3 gates).
- MUST NOT hardcode project-01 image names, ports, container names, or absolute paths.
- MUST preserve the dev-machine host-port override capability (e.g. go→18080) via `benchmark.yaml`, not in code.
- Regression: extracted-runner aggregated output MUST equal project 01's committed `aggregated.json` within tolerance.
</requirements>

## Subtasks
- [x] 1.1 Author `benchmark.yaml` for project 01 capturing its current images, container ports, host-port override, and scenario list.
- [x] 1.2 Implement `BenchmarkConfig` parsing with defaults and optional host-port overrides.
- [x] 1.3 Port the k6 invocation + docker-stats capture from `run_matrix.sh` into `run_benchmark`, parameterized by `cfg`.
- [x] 1.4 Wire parsed samples into `BenchmarkAnalyzer.analyze_raw_samples` and `export_json`.
- [x] 1.5 Add a regression test diffing extracted output against the committed project-01 baseline.

## Implementation Details
Create `curriculum/_shared/benchmarks/runner.py` (with `BenchmarkConfig`) and
`curriculum/01_rate_limiter/benchmark.yaml`. Port logic from project 01's
`benchmarks/{run_matrix.sh, analyze_results.py, generate_report.py}`; do not
re-implement the analyzer. See TechSpec "Core Interfaces" for the `run_benchmark`
signature and `benchmark.yaml` shape.

### Relevant Files
- `curriculum/01_rate_limiter/benchmarks/run_matrix.sh` — source of the k6/docker invocation logic to generalize.
- `curriculum/01_rate_limiter/benchmarks/{analyze_results.py,generate_report.py}` — sample-parsing logic to lift; contains the hardcoded paths/ports/static dict to remove.
- `curriculum/_shared/benchmarks/analyzer.py` — reused unchanged; defines the input contract `{scenario: {lang: [samples]}}`.
- `curriculum/_shared/benchmarks/tests/test_analyzer.py` — pytest pattern to mirror.

### Dependent Files
- `curriculum/_shared/arena/` (task_02) — consumes `run_benchmark`.
- `curriculum/01_rate_limiter/benchmarks/results/aggregated.json` — the regression baseline.

### Related ADRs
- [ADR-003: Arena orchestration — command + extracted runner seam](../adrs/adr-003.md) — defines the seam and the per-project `benchmark.yaml`.

## Deliverables
- `curriculum/_shared/benchmarks/runner.py` with `run_benchmark` + `BenchmarkConfig`.
- `curriculum/01_rate_limiter/benchmark.yaml`.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration test: regression baseline diff against project 01 **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] `benchmark.yaml` with a host-port override yields a `BenchmarkConfig` whose go host-port is the override, not the container port.
  - [x] `benchmark.yaml` without overrides falls back to container ports for all three languages.
  - [x] Result path for `(lang=rust, scenario=spike, run_num=2)` is `…/results/rust/spike_run2.json`.
  - [x] Parsed k6+stats sample dict matches the `{scenario:{lang:[…]}}` shape accepted by `analyze_raw_samples` (docker/k6 subprocess mocked).
- Integration tests:
  - [x] Running the extracted runner on project 01 produces an `aggregated.json` equal to the committed baseline within tolerance.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `run_benchmark` runs from `benchmark.yaml` with no project-01 literals in `runner.py`.
- Regression baseline matches; behavior provably preserved.

# Project Package Template

> Every curriculum project must satisfy this completion checklist before its cycle is marked
> `cycle-complete`. No partial completions. No stub-only implementations.

## Identity

- Project id: `NN_slug`
- Project name:
- Cycle id:
- Owner agents:
- Status: `spec-in-progress` | `spec-done` | `impl-in-progress` | `impl-done` | `review-done` | `benchmark-done` | `cycle-complete`

## Learning Objective

State the one primary concept this project teaches.

## Required Artifacts Checklist

A project is NOT complete unless every item below is present and verified:

### Specification

- [ ] `docs/spec.md` — functional requirements (RF-NNN), non-functional requirements (RNF-NNN),
      API contracts, data models, architecture diagram (Mermaid), error handling strategy,
      acceptance criteria per requirement, edge cases
- [ ] `docs/status.md` — pipeline state file tracking current phase and handoff readiness

### Implementations (all three required: Go, Rust, Node)

For EACH of `{go-impl,rust-impl,node-impl}/`:

- [ ] Source code following idiomatic conventions for the language
- [ ] Unit tests with ≥80% line coverage on core logic
- [ ] Integration tests for critical flows
- [ ] `Dockerfile` (multi-stage, reproducible, <300MB image)
- [ ] `README.md` with "How to run" and "How to test" sections
- [ ] No `TODO`, `FIXME`, `XXX`, or placeholder code in production files
- [ ] Lint passes with zero errors (`golangci-lint` / `cargo clippy -D warnings` / `eslint`)
- [ ] Build passes (`go build ./...` / `cargo build --release` / `npm run build`)
- [ ] All tests pass (`go test -race -cover` / `cargo test` / `npm test`)

### Code Review

- [ ] `docs/code_review.md` — review covering all 7 categories:
      - Security (OWASP Top 10)
      - Performance (allocations, hot paths, complexity)
      - Readability (naming, structure)
      - Maintainability (coupling, cohesion, modularity)
      - Idiomaticity (language conventions)
      - Error Handling (propagation, recovery, observability)
      - Testing (coverage, edge cases, mutation readiness)
- [ ] Issues classified by severity: Critical / Major / Minor / Educational
- [ ] Cross-language comparison section
- [ ] `docs/learning_notes.md` — pedagogical insights and patterns discovered

### Benchmarks (N≥3, reproducible)

- [ ] `docs/benchmark_results.md` — 4 scenarios × 3 languages × N≥3 samples:
      - Baseline (10 VU, 30s)
      - Stress (100→1000 VU ramp, 60s)
      - Spike (10→500→10 VU, 30s)
      - Endurance (100 VU, 5min)
- [ ] Metrics captured: RPS, p50/p95/p99 latency, RAM, CPU, error rate, LoC, build time, binary size
- [ ] Raw results in `benchmarks/results/{lang}/{scenario}_run{N}.json`
- [ ] CV% reported per metric; conclusion blocked if CV% ≥ 20%
- [ ] Comparative analysis with trade-offs documented
- [ ] Environment/hardware documented for reproducibility

### Evolution

- [ ] `docs/evolution_report.md` — at least one measured optimization:
      - Bottleneck identified with evidence (profiler/flamegraph data)
      - Optimization pattern applied (from the catalog)
      - Before/after metrics with delta and significance
      - Rejected optimizations documented (anti-knowledge)
      - Lessons fed back to Curator for next cycle

### Verification Gate

- [ ] Separate verifier context (NOT the same agent that produced the code)
- [ ] Verifier ran tests from zero context and confirmed PASS
- [ ] Mutation score ≥60-70% OR explicit justification for lower threshold
- [ ] Coverage of core modules ≥80%

## Architecture

- Chosen architecture:
- Alternatives considered:
- Main trade-off:
- ADR path:

## Technologies

| Technology | Why used | Alternative | Why not |
| --- | --- | --- | --- |
|  |  |  |  |

## Implementation Commands

| Language | Run | Test | Build | Lint |
| --- | --- | --- | --- | --- |
| Go | `go run cmd/main.go` | `go test -race -cover ./...` | `go build ./...` | `golangci-lint run` |
| Rust | `cargo run` | `cargo test` | `cargo build --release` | `cargo clippy --all-targets -- -D warnings` |
| Node | `npm run dev` | `npm test` | `npm run build` | `npm run lint` |

## Tests

| Test type | Command | Evidence |
| --- | --- | --- |
| Unit |  |  |
| Integration |  |  | 
| Load |  |  |
| Mutation |  |  |

## Metrics

Link to `benchmark_results.md` or `metrics_snapshot.md`.

## Review

Link to `code_review.md`.

## Technology Comparison

Link to `technology_comparison.md`.

## Lessons Learned

- 

## Next Challenge

- 

## Completion Gate

**This project is NOT complete until ALL of the following are true:**

1. All three implementations pass lint, build, and tests with ≥80% coverage.
2. Docker images build and pass smoke tests.
3. Code review covers all 7 categories with severity-classified findings.
4. Benchmarks ran 4 scenarios × 3 languages × N≥3 with CV% reported.
5. Evolution report documents at least one measured optimization.
6. Status file reflects `cycle-complete`.
7. Verifier (separate context) confirmed PASS from zero.

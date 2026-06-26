---
status: blocked
title: Project 02 benchmark harness complete; arena report gate blocked
type: infra
complexity: high
dependencies:
  - task_06
---

# Task 7: Project 02 benchmark harness complete; arena report gate blocked

## Overview
Project 02 (`key_value_store`) has implementations but no benchmark harness. Author
its `benchmark.yaml`, k6 scenarios suited to a key-value store, and the
benchmark-target wiring so the three impls are reachable, then run
`/devschool-arena 02_key_value_store`. The live run proves the harness
generalizes to a memory/data-structure problem shape, but the revealed report is
blocked until every decision metric is trustworthy and verifier-confirmed.

> **Live run DONE (2026-06-25) — benchmark harness proven; report remains locked.** Ports
> confirmed (8080/8082/8081), all 3 `kv-*` images build, and a live benchmark
> (baseline, N=5, 3 langs, real docker+k6) was run. The strict decision gate now
> fails closed unless all decision metrics are trustworthy: throughput selected
> go, but latency was untrustworthy (CV 186%) and memory was untrustworthy
> (CV 20%). `curriculum/02_key_value_store/docs/arena_report.md` is therefore
> `gate: locked`; partial predictions are not logged as calibration because the
> run has no complete set of language winners, and no gate-passing/verifier-confirmed
> report is claimed.
>
> **Honest caveats:** (1) the one trustworthy metric (throughput) is marginal —
> closed-loop arrival rate pins n_requests near-identical across langs, so it's a
> thin comparison; latency/memory are genuinely unmeasurable here (macOS Docker
> Desktop noise). (2) The LLM-agent stages (arena-narrator, verifier) were NOT run
> headlessly — the report's Narrative section is still the `_pending_` placeholder;
> those stages are orchestrated interactively by `/devschool-arena`.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `curriculum/02_key_value_store/benchmark.yaml` (images, ports, host-port overrides, scenarios).
- MUST author k6 scenarios under `02_key_value_store/benchmarks/scenarios/` that exercise key-value behavior (reads/writes, hot-key, large-value) across the required scenario slots.
- MUST ensure each of the three impls exposes a benchmark-reachable endpoint (build target / Dockerfile wiring as needed).
- MUST pass the analyzer gate (CV<20%, N≥3) for all scenarios × languages.
- MUST produce a `verifier`-confirmed `arena_report.md` for project 02.
- KNOWN GAP: the exact memory-pressure scenario design is an open question (see TechSpec "Open Questions"); start with a documented default and note assumptions rather than inventing unstated specifics.
</requirements>

## Subtasks
- [x] 7.1 Author `benchmark.yaml` for project 02 and confirm each impl builds + serves.
- [x] 7.2 Author k6 scenarios for KV workloads (baseline read/write, hot-key stress, large-value spike, endurance).
- [x] 7.3 Wire benchmark-target Dockerfiles/ports for go/rust/node impls.
- [x] 7.1b Confirm impl ports from Dockerfiles (go 8080 / rust 8082 / node 8081 — matched assumption); all 3 `kv-*` images build (exit 0); live smoke ran (kv-go baseline = 24002 req, p99 5.18ms, 19.7MB).
- [x] 7.4 Run live arena on project 02 — DONE; benchmark harness works, but the strict gate fails closed because only throughput was trustworthy. `arena_report.md` is locked.
- [ ] 7.5b Predictions logged + dashboard refreshed for calibration data. **Blocked:** no calibration is logged until all three metrics have real language winners.
- [ ] 7.5 Produce a verifier-confirmed revealed report. **(blocked: the live macOS Docker run produced only one trustworthy decision metric; rerun in an isolated benchmark environment)**

## Implementation Details
Create `curriculum/02_key_value_store/benchmark.yaml` and
`benchmarks/scenarios/*.js`; reuse `runner.py` (task_01) and the project-01
harness as the structural pattern. See TechSpec "Development Sequencing" step 8 and
"Known Risks" (scenario portability).

### Relevant Files
- `curriculum/01_rate_limiter/benchmarks/` — structural pattern for scenarios/results.
- `curriculum/02_key_value_store/{go,rust,node}-impl/` — the impls to make benchmark-reachable.
- `curriculum/_shared/benchmarks/runner.py` — generic runner (task_01).

### Dependent Files
- `curriculum/02_key_value_store/docs/arena_report.md` — produced output.
- `learner/predictions.yaml` — remains unchanged for project 02 until the strict gate has real winners for all metrics.

### Related ADRs
- [ADR-003: Arena orchestration — command + extracted runner seam](../adrs/adr-003.md) — per-project `benchmark.yaml`.

## Deliverables
- `02_key_value_store/benchmark.yaml` + k6 scenarios + benchmark-target wiring.
- A locked `arena_report.md` documenting the failed trust gate; a future isolated benchmark run must produce the gate-passing, verifier-confirmed report.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration test: arena run on project 02 **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] `benchmark.yaml` for 02 parses into a `BenchmarkConfig` with three KV image names and correct ports.
  - [x] Each KV scenario file is valid k6 and targets the configured port.
  - [x] A hot-key scenario drives more requests to one key than a uniform scenario (workload-shape assertion).
- Integration tests:
- [ ] `/devschool-arena 02_key_value_store` produces a gate-passing, verifier-confirmed report with per-metric winners and logged predictions. **(blocked: the live macOS Docker run produced only one trustworthy decision metric; rerun in an isolated benchmark environment)**
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Project 02 has a reusable benchmark harness; the verifier-confirmed arena report remains pending until all decision metrics pass the trust gate.
- Scenario assumptions are documented where the open question is unresolved.

---
status: completed
title: Arena orchestration module + `arena_report.md` template
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 2: Arena orchestration module + `arena_report.md` template

## Overview
Build the arena orchestration module that drives the runner across language ×
scenario × N, aggregates via `BenchmarkAnalyzer`, and assembles a still-locked
`arena_report.md` from a template. It fails closed: a sub-gate benchmark
(`all_pass == False`) produces no revealable report, protecting the
"trustworthy lessons" bar.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST expose `run_arena(project_dir, n)` per TechSpec "Core Interfaces", calling `run_benchmark` for each (lang, scenario, run).
- MUST fail closed: when `report.all_pass` is False, raise/return without producing a revealable `arena_report.md`.
- MUST assemble `arena_report.md` with frontmatter (`project`, `run`, `gate: locked`), a scoreboard table rendered from `aggregated.json`, and empty placeholders for the narrative and code-study sections (filled by later stages).
- MUST link the canonical per-language docs (`benchmark_results.md`, `code_review.md`); MUST NOT duplicate raw evidence.
- MUST accept the `run` timestamp from the caller (no clock read inside arena logic).
</requirements>

## Subtasks
- [x] 2.1 Define `ArenaResult` (aggregated report + path to the locked report).
- [x] 2.2 Implement `run_arena` loop over lang × scenario × N with the fail-closed gate.
- [x] 2.3 Author the `arena_report.md` template (frontmatter + Scoreboard + Narrative + Code Study + Links sections).
- [x] 2.4 Implement the scoreboard table renderer from `aggregated.json` (per-metric winners).
- [x] 2.5 Add unit tests for fail-closed behavior and template assembly.

## Implementation Details
Create `curriculum/_shared/arena/__init__.py` (orchestration + assembly) and an
`arena_report.md` template (e.g. `curriculum/_shared/arena/templates/`). Consume
`run_benchmark` (task_01) and `BenchmarkAnalyzer`. See TechSpec "Core Interfaces"
(`run_arena`) and "Data Models" (`arena_report.md` shape).

### Relevant Files
- `curriculum/_shared/benchmarks/runner.py` — provides `run_benchmark` (task_01 output).
- `curriculum/_shared/benchmarks/analyzer.py` — `BenchmarkReport.all_pass`, `to_dict` for the scoreboard.
- `curriculum/01_rate_limiter/docs/benchmark_results.md` — reference for scoreboard/markdown formatting.

### Dependent Files
- `engines/miniMaxEvolutionEngine/.claude/agents/arena-narrator.md` (task_05) — fills the Narrative section.
- `engines/miniMaxEvolutionEngine/.claude/commands/devschool/arena.md` (task_06) — invokes `run_arena`.

### Related ADRs
- [ADR-001: Narrative-led projection with a prediction gate](../adrs/adr-001.md) — report is an aggregation/view.
- [ADR-003: Arena orchestration — command + extracted runner seam](../adrs/adr-003.md) — module placement and reuse.

## Deliverables
- `curriculum/_shared/arena/__init__.py` with `run_arena` + `ArenaResult`.
- `arena_report.md` template with locked frontmatter and the four sections.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration test: assemble a locked report from a fixture `aggregated.json` **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] `run_arena` with a fixture where one scenario has CV≥20% returns/raises fail-closed and writes no revealable report.
  - [x] `run_arena` with an all-pass fixture writes `arena_report.md` with `gate: locked`.
  - [x] Scoreboard renderer picks `rust` as latency winner when its p99 median is lowest in the fixture.
  - [x] The assembled report links `benchmark_results.md`/`code_review.md` and contains no inlined raw sample arrays.
- Integration tests:
  - [x] End-to-end assembly from a committed fixture `aggregated.json` produces a locked report with a correct scoreboard and empty narrative placeholder.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Sub-gate runs never yield a revealable report.
- Locked `arena_report.md` is produced with a correct scoreboard for an all-pass run.

---
status: completed
title: '`fairness-auditor` agent + effort-budget rubric'
type: docs
complexity: low
dependencies: []
---

# Task 4: `fairness-auditor` agent + effort-budget rubric

## Overview
Author the `fairness-auditor` agent — an independent judge (no Write tools) that
checks the three implementations against a written per-language effort-budget
rubric **before** benchmarking and emits a pass/flag verdict. This is the guard
against the council's top risk: a hand-tuned impl beating a naive one and teaching
a false lesson. It enforces producer ≠ verifier at the implementation-fairness
checkpoint.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST follow the existing agent frontmatter format (`name`, `description`, `tools`, `model`, `color`) with NO Write/Edit tools (mirror `verifier.md`), `model: opus`.
- MUST consume the three `*-impl/` directories plus the effort-budget rubric.
- MUST emit a structured verdict: per-language `pass` or `flag` with a concrete reason; any `flag` blocks the benchmark stage.
- The rubric MUST define concrete per-language "idiomatic, not hand-tuned" criteria (e.g. no hand-rolled SIMD/unsafe unless the others get equivalent, comparable allocation strategy, stdlib-vs-handcrafted parity).
- The auditor MUST NOT modify any implementation (judgment only).
</requirements>

## Subtasks
- [x] 4.1 Draft the per-language effort-budget rubric document.
- [x] 4.2 Author `fairness-auditor.md` mirroring `verifier.md`'s no-Write frontmatter and structure.
- [x] 4.3 Define the structured pass/flag verdict output contract.
- [x] 4.4 Create a fixture: a deliberately hand-tuned sample impl that the rubric flags, and a balanced set that passes.

## Implementation Details
Create `engines/miniMaxEvolutionEngine/.claude/agents/fairness-auditor.md` and a
rubric doc (e.g. `curriculum/_shared/arena/effort_budget_rubric.md`). Follow the
agent file format documented in TechSpec "Component Overview" and the existing
`verifier.md`. See ADR-005 for the producer ≠ verifier role boundary.

### Relevant Files
- `engines/miniMaxEvolutionEngine/.claude/agents/verifier.md` — no-Write judge frontmatter to mirror.
- `engines/miniMaxEvolutionEngine/.claude/agents/dev-{go,rust,node}.md` — what the auditor judges.
- `engines/miniMaxEvolutionEngine/.claude/agents/reviewer.md` — adjacent review format reference.

### Dependent Files
- `engines/miniMaxEvolutionEngine/.claude/commands/devschool/arena.md` (task_06) — invokes the auditor as the pre-benchmark gate.

### Related ADRs
- [ADR-005: Agent topology — fairness-auditor + arena-narrator, verifier reused](../adrs/adr-005.md) — defines this agent's role and independence.

## Deliverables
- `fairness-auditor.md` agent spec (no-Write frontmatter).
- Effort-budget rubric document with concrete per-language criteria.
- Verdict output contract.
- Fixture-based checks (flag + pass cases) **(REQUIRED)**.

## Tests
> This task ships a Markdown agent spec + rubric; "tests" are fixture verdicts that exercise the rubric. Coverage applies to any verdict-parsing helper.
- Unit tests:
  - [x] The rubric flags a Rust impl using `unsafe`/SIMD when Go/Node use plain idiomatic code (unfair-advantage case).
  - [x] The rubric passes a balanced set where all three use stdlib data structures.
  - [x] Verdict output for a flagged impl includes a non-empty reason string and `flag` status.
- Integration tests:
  - [x] Dry-run on project 01's three impls yields a `pass` verdict for all languages (baseline is known-balanced).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Auditor frontmatter has no Write/Edit tools; rubric has concrete per-language criteria.
- A flagged impl blocks the benchmark stage (verified in task_06 wiring).

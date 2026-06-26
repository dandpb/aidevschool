---
status: completed
title: '`arena-narrator` agent'
type: docs
complexity: low
dependencies: []
---

# Task 5: `arena-narrator` agent

## Overview
Author the `arena-narrator` agent — a producer that drafts the
`arena_report.md` narrative: for each metric, the winner and a *why* grounded in
the measured number and the relevant code difference, closing with one
transferable concept. It may assert only what the evidence supports; the verifier
(task_06) later blocks anything unsupported.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST follow the existing producer agent frontmatter format (Write/Edit allowed, `model: opus`).
- MUST cite the measured metric (from `aggregated.json`) for every winner claim.
- MUST reference the code-study diff (CRITICO output) when explaining *why*.
- MUST output exactly one transferable concept per report.
- MUST fill only the Narrative section of the `arena_report.md` template (task_02); MUST NOT alter the scoreboard or unlock the gate.
- MUST NOT assert any claim not supported by the scoreboard or diff.
</requirements>

## Subtasks
- [x] 5.1 Author `arena-narrator.md` mirroring a producer agent's frontmatter and structure.
- [x] 5.2 Define the Narrative section contract (per-metric winner + grounded why + one concept), referencing the task_02 template.
- [x] 5.3 Specify the grounding rule: every claim must cite a metric value or a diff line.
- [x] 5.4 Create a fixture: given a sample `aggregated.json` + code study, the narrative names the correct per-metric winners and cites numbers.

## Implementation Details
Create `engines/miniMaxEvolutionEngine/.claude/agents/arena-narrator.md`. Follow
the agent format in TechSpec "Component Overview" and the existing producer agents
(`reviewer.md`, `optimizer.md`). The narrative fills the template authored in
task_02. See ADR-005 for the producer role.

### Relevant Files
- `engines/miniMaxEvolutionEngine/.claude/agents/reviewer.md` — producer/review format reference.
- `engines/miniMaxEvolutionEngine/.claude/agents/optimizer.md` — producer agent with Write tools to mirror.
- `curriculum/_shared/arena/templates/arena_report.md` — the template whose Narrative section this fills (task_02).

### Dependent Files
- `engines/miniMaxEvolutionEngine/.claude/commands/devschool/arena.md` (task_06) — invokes the narrator after the code study.

### Related ADRs
- [ADR-005: Agent topology — fairness-auditor + arena-narrator, verifier reused](../adrs/adr-005.md) — defines this agent's producer role.

## Deliverables
- `arena-narrator.md` agent spec (producer frontmatter).
- Narrative section contract with the grounding rule.
- Fixture-based check (correct winners + citations) **(REQUIRED)**.

## Tests
> This task ships a Markdown agent spec; "tests" are fixture narratives that exercise the grounding rule. Coverage applies to any narrative-parsing/citation-check helper.
- Unit tests:
  - [x] Given a fixture where Node has the highest throughput, the narrative names Node the throughput winner and cites the throughput number.
  - [x] A narrative claim with no backing metric/diff is rejected by the grounding check.
  - [x] The narrative contains exactly one "transferable concept" block.
- Integration tests:
  - [x] On a project-01 fixture, the produced Narrative section's per-metric winners match the scoreboard winners.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Every winner claim cites a measured metric; exactly one concept per report.
- Narrator fills only the Narrative section and never unlocks the gate.

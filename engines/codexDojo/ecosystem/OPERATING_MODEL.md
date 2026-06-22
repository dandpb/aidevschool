# codexDojo Operating Model

## System Overview

`codexDojo` runs as a file-based multi-agent learning ecosystem.

The user-facing agent set matches the request: Mentor, Curriculo, Arquiteto, Implementador, Revisor de Codigo, Testes, Metricas, DevOps, Pesquisador, and Memoria. The deeper `minimaxDojo` core expands those responsibilities into 14 specialized sub-agents for long-running execution and adversarial verification.

## Layered Architecture

| Layer | Purpose | Main artifacts |
| --- | --- | --- |
| Product surface | Dashboard and user-facing protocol | `engines/codexDojo/src/`, `engines/codexDojo/ecosystem/` |
| Orchestration | Select unit, dispatch agents, track state | `.mavis/plans/plan.yaml`, `.claude/commands/devschool/` |
| Learning gate | Ensure learner attempt before mastery | `learner/learning_state.yaml`, `learner/learner_profile.md` |
| Tutor core | Long-running agent roles, memory, gates | `engines/minimaxDojo/` |
| Projects | Real code and evidence | `curriculum/NN_name/` |
| Knowledge base | Docs, prompts, reports, journal | `docs/`, `learner/journal.md`, `engines/codexDojo/ecosystem/` |

## Agent Responsibilities

| Agent | Responsibility | Primary outputs |
| --- | --- | --- |
| Mentor | Adapt explanation and challenge to current level. | Briefing, Socratic questions, next gap. |
| Curriculo | Maintain progressive curriculum from basics to advanced work. | Roadmap, prerequisites, unlocked units. |
| Arquiteto | Propose architecture and explain trade-offs. | ADRs, diagrams, module contracts. |
| Implementador | Build the smallest correct version. | Code, tests, run instructions. |
| Revisor de Codigo | Review legibility, security, performance, maintainability, and risks. | Findings, review report, improvement tasks. |
| Testes | Produce unit, integration, load, regression, and benchmark tests. | Test suites, E2E scenarios, benchmark scripts. |
| Metricas | Measure quality, performance, cost, complexity, and learning progress. | Scorecards, trend snapshots, comparison tables. |
| DevOps | Teach versioning, CI/CD, Docker, deploy, observability, and environments. | Pipelines, Dockerfiles, runbooks, health checks. |
| Pesquisador | Retrieve primary docs, best practices, libraries, and comparisons. | Source-backed research notes, adoption risks. |
| Memoria | Preserve learning history, decisions, errors, completed projects, and next steps. | Learner profile, event log, lessons, spaced review queue. |

## Continuous Cycle

Every unit follows this loop:

1. Diagnose current level. (See `/devschool-diagnose` — invokes Sonda.)
2. Pick one concept or technology.
3. Create a small practical project. (See `/devschool-spec` — invokes Curator.)
4. Define functional and non-functional requirements.
5. Propose architecture and alternatives.
6. Implement version 1. (See `/devschool-implement` — invokes dev-go/dev-rust/dev-node in parallel.)
7. Write tests.
8. Run metrics. (See `/devschool-benchmark` — invokes Benchmarker.)
9. Review code. (See `/devschool-review` — invokes Reviewer + Verifier.)
10. Refactor. (See `/devschool-optimize` — invokes Optimizer.)
11. Compare against another language, framework, architecture, or implementation.
12. Register lessons learned. (See `/devschool-mnemosyne-compact` — invokes Mnemosyne.)
13. Update the study plan. (See `/devschool-socratic` for graded hints.)
14. Select the next challenge. (See `/devschool-next`.)

**Cross-cutting commands** (run alongside any phase):

- `/devschool-socratic` — anti-dependency guardrail; routes learner questions through the STAP pipeline.
- `/devschool-recall` — generates a 15-20 min Mneme session for spaced review.
- `/devschool-mnemosyne-compact` — weekly memory compaction (handoffs >7d archived; pegadinhas rotated).
- `/devschool-decide <tipo>` — opens an Sêneca SLA 24h for consequential decisions (promote Skill, change prereq, etc).
- `/devschool-audit` — cross-model audit sample (default 20% of completed units); re-verifies with verifier-haiku.
- `/devschool-cron-list [auditar]` — lists or audits the Crons registry.

## State Machine

Learning state:

```text
apresentando -> praticando -> avaliando -> dominado
                   ^              |
                   |              v
                 retry <----------
```

Artifact state:

```text
producing -> verifying -> done
      ^          |
      |          v
      retry on verifier fail
```

## Non-Negotiable Gates

- A learner attempt must exist before a unit is treated as learned.
- A producer must not verify its own output.
- Verification must run through the real surface: CLI, HTTP, UI, tests, benchmark, or deploy check.
- Claims about performance need repeated samples and variance caveats.
- Memory updates must be curated and reusable.

## Project Package Contract

Each project must contain:

- Learning objective.
- Functional requirements.
- Non-functional requirements.
- Suggested architecture.
- Technologies used.
- Implemented code.
- Tests.
- Metrics.
- Code review report.
- Comparison with alternatives.
- Lessons learned.
- Next challenges.

Use `engines/codexDojo/ecosystem/templates/project-package.md` as the canonical shape.

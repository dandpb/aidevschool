# codexDojo Ecosystem Manifest

## Purpose

`codexDojo` is a practical, continuous programming school operated by agents. Its purpose is to help the learner improve programming, architecture, code quality, testing, scalability, and professional use of AI by building small projects that grow into robust systems.

The system is not a theory archive. Every cycle must create useful artifacts: code, tests, documentation, metrics, reviews, comparisons, memory updates, and a next challenge.

## Canonical Surfaces

| Surface | Role |
| --- | --- |
| `engines/codexDojo/` | User-facing app and product-facing ecosystem spec. |
| `engines/codexDojo/src/` | Local dashboard for agents, cycle, roadmap, and first project. |
| `engines/codexDojo/ecosystem/` | Canonical manifest, completion audit, prompts, runbooks, memory, evaluation, and templates. |
| `engines/minimaxDojo/` | Deep tutor core: 14-agent Agora Continuum, state machine, gates, whiteboard. |
| `docs/` | Existing polyglot MiniMax/OpenClaw/Hermes documentation. |
| `learner/` and `.mavis/` | Current learning gate and cycle state. |
| `.claude/` | Claude Code agent adapters and commands for the same protocol. |
| `curriculum/` | Real implementation projects and evidence. |

## Requested Deliverables Coverage

| # | Requested deliverable | Evidence in this workspace |
| --- | --- | --- |
| 1 | Architecture of the multi-agent ecosystem | `engines/codexDojo/ecosystem/OPERATING_MODEL.md`, `engines/minimaxDojo/docs/00_architecture.md`, `docs/PROMPTS/IDEIAS/codexDojo/00_ecosystem_architecture.md` |
| 2 | List of agents and responsibilities | `engines/codexDojo/ecosystem/OPERATING_MODEL.md`, `engines/codexDojo/ecosystem/AGENT_PROMPTS.md`, `engines/minimaxDojo/docs/01_agent_roster.md` |
| 3 | Continuous execution workflow | `engines/codexDojo/ecosystem/OPERATING_MODEL.md`, `engines/codexDojo/ecosystem/OPENCLAW_HERMES_RUNBOOK.md`, `.mavis/plans/plan.yaml` |
| 4 | Project folder structure | `engines/codexDojo/ecosystem/ROADMAP.md`, `engines/codexDojo/ecosystem/templates/project-package.md`, `curriculum/01_rate_limiter/` |
| 5 | Learning memory model | `engines/codexDojo/ecosystem/MEMORY_MODEL.md`, `engines/minimaxDojo/docs/05_memory_system.md`, `learner/` |
| 6 | Code evaluation model | `engines/codexDojo/ecosystem/EVALUATION_MODELS.md`, `engines/codexDojo/ecosystem/templates/code-review-scorecard.md`, `engines/minimaxDojo/docs/04_empirical_gates.md` |
| 7 | Technology comparison model | `engines/codexDojo/ecosystem/EVALUATION_MODELS.md`, `engines/codexDojo/ecosystem/templates/technology-comparison.md`, `docs/PROMPTS/IDEIAS/codexDojo/03_metrics_framework.md` |
| 8 | First 10 incremental projects | `engines/codexDojo/ecosystem/ROADMAP.md`, `engines/codexDojo/src/data/projects.ts` |
| 9 | Evolution metrics | `engines/codexDojo/ecosystem/EVALUATION_MODELS.md`, `engines/minimaxDojo/docs/06_metrics_quality_gate.md`, `engines/codexDojo/src/data/cycle.ts` |
| 10 | Individual prompt for every agent | `engines/codexDojo/ecosystem/AGENT_PROMPTS.md`, `engines/minimaxDojo/prompts/per_agent/` |
| 11 | Plan to run continuously in OpenClaw and Hermes | `engines/codexDojo/ecosystem/OPENCLAW_HERMES_RUNBOOK.md`, `docs/PROMPTS/IDEIAS/codexDojo/04_bootstrap_prompts.md` |

## Requested Scope Coverage

| Requested scope | Evidence |
| --- | --- |
| Programming fundamentals | `engines/codexDojo/ecosystem/CURRICULUM_SCOPE.md` |
| Technology use-case comparisons | `engines/codexDojo/ecosystem/CURRICULUM_SCOPE.md`, `engines/codexDojo/ecosystem/EVALUATION_MODELS.md` |
| Robust application construction | `engines/codexDojo/ecosystem/CURRICULUM_SCOPE.md`, `engines/codexDojo/ecosystem/ROADMAP.md` |
| Software architecture models | `engines/codexDojo/ecosystem/CURRICULUM_SCOPE.md`, `engines/codexDojo/ecosystem/OPERATING_MODEL.md` |
| Code review and quality | `engines/codexDojo/ecosystem/EVALUATION_MODELS.md`, `engines/codexDojo/ecosystem/templates/code-review-scorecard.md` |
| Tests and metrics | `engines/codexDojo/ecosystem/EVALUATION_MODELS.md`, `engines/minimaxDojo/docs/04_empirical_gates.md` |
| Professional AI integration | `engines/codexDojo/ecosystem/CURRICULUM_SCOPE.md`, `engines/codexDojo/ecosystem/AGENT_PROMPTS.md` |

## Core Principles

1. Build first principles through projects before tools.
2. Always explain why a decision was made and what alternative lost.
3. Compare alternatives with evidence, not preference.
4. Keep the learner active: AI assists learning, it does not replace reasoning.
5. Use empirical gates before marking a concept mastered.
6. Preserve memory as curated reusable knowledge, not raw chat history.
7. Start with the smallest robust architecture, usually a modular monolith.
8. Add complexity only when a project needs it and a metric can prove the impact.

## Completion Standard

The ecosystem is complete only when a future agent can:

1. Read this manifest.
2. Pick the next project.
3. Instantiate the correct agents.
4. Run the learning gate.
5. Produce code/tests/docs/metrics/review.
6. Verify with an adversarial gate.
7. Update memory and roadmap.
8. Repeat the cycle in OpenClaw or Hermes without hidden state.

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
| `engines/minimaxDojo/config/learner.yaml` | Single seam for numeric thresholds referenced by prompts/docs via `⟨config: path⟩`. |
| `engines/pixelDojo/` | 8-bit learning-game engine prototype. |
| `docs/` | Existing polyglot MiniMax/OpenClaw/Hermes documentation. |
| `learner/` | Canonical learner-state substrate; single source of truth for all engines. |
| `.mavis/` | Derived learning-state view generated from `learner/learning_state.yaml`. |
| `engines/miniMaxEvolutionEngine/.claude/commands/devschool/` | Phase commands for Claude Code orchestration. |
| `curriculum/` | Real implementation projects and evidence. |

## Requested Deliverables Coverage

| # | Requested deliverable | Evidence in this workspace |
| --- | --- | --- |
| 1 | Architecture of the multi-agent ecosystem | `engines/codexDojo/ecosystem/OPERATING_MODEL.md`, `engines/minimaxDojo/docs/00_architecture.md`, `docs/PROMPTS/IDEIAS/codexDojo/00_ecosystem_architecture.md` |
| 2 | List of agents and responsibilities | `engines/codexDojo/ecosystem/OPERATING_MODEL.md`, `engines/codexDojo/ecosystem/AGENT_PROMPTS.md`, `engines/minimaxDojo/docs/01_agent_roster.md` |
| 3 | Continuous execution workflow | `engines/codexDojo/ecosystem/OPERATING_MODEL.md`, `engines/codexDojo/ecosystem/OPENCLAW_HERMES_RUNBOOK.md`, `.mavis/plans/plan.yaml` |
| 4 | Project folder structure | `engines/codexDojo/ecosystem/ROADMAP.md`, `engines/codexDojo/ecosystem/templates/project-package.md`, `curriculum/01_rate_limiter/` |
| 5 | Learning memory model | `engines/codexDojo/ecosystem/MEMORY_MODEL.md`, `engines/minimaxDojo/docs/05_memory_system.md`, `learner/` |
| 6 | Code evaluation model | `engines/codexDojo/ecosystem/EVALUATION_MODELS.md`, `engines/codexDojo/ecosystem/templates/code-review-scorecard.md`, `engines/minimaxDojo/docs/04_empirical_gates.md`, `engines/minimaxDojo/config/learner.yaml` (single threshold seam) |
| 7 | Technology comparison model | `engines/codexDojo/ecosystem/EVALUATION_MODELS.md`, `engines/codexDojo/ecosystem/templates/technology-comparison.md`, `docs/PROMPTS/IDEIAS/codexDojo/03_metrics_framework.md` |
| 8 | Canonical 18-project curriculum | `curriculum/catalog.md` (canonical source of truth), `engines/codexDojo/ecosystem/ROADMAP.md`, `engines/codexDojo/src/data/projects.ts` |
| 9 | Evolution metrics | `engines/codexDojo/ecosystem/EVALUATION_MODELS.md`, `engines/minimaxDojo/docs/06_metrics_quality_gate.md`, `engines/codexDojo/src/data/cycle.ts` |
| 10 | Individual prompt for every agent | `engines/codexDojo/ecosystem/AGENT_PROMPTS.md`, `engines/minimaxDojo/prompts/per_agent/` (canonical system prompts), `engines/minimaxDojo/agents/*/README.md` (thin index) |
| 11 | Plan to run continuously in OpenClaw and Hermes | `engines/codexDojo/ecosystem/OPENCLAW_HERMES_RUNBOOK.md`, `docs/PROMPTS/IDEIAS/codexDojo/04_bootstrap_prompts.md` |
| 12 | Ludic learning surface with extensible content | Prototype work in `engines/pixelDojo/`. |

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
| Ludic practice and evidence capture | Prototype work in `engines/pixelDojo/`. |

## Core Principles

1. Build first principles through projects before tools.
2. Always explain why a decision was made and what alternative lost.
3. Compare alternatives with evidence, not preference.
4. Keep the learner active: AI assists learning, it does not replace reasoning.
5. Use empirical gates before marking a concept mastered.
6. Preserve memory as curated reusable knowledge, not raw chat history.
7. Start with the smallest robust architecture, usually a modular monolith.
8. Add complexity only when a project needs it and a metric can prove the impact.

## Architectural Seams

Deep modules introduced by the cross-language refactor. Each seam concentrates
behaviour so callers pay a tiny interface tax and tests have a single place to
probe.

| Seam | Files | What it concentrates |
| --- | --- | --- |
| **PhaseRunner** | `engines/miniMaxEvolutionEngine/.claude/commands/devschool/` | The repeated read-state → check-gate → dispatch producer → dispatch verifier → update status → retry pattern. Every `/devschool-*` command is a thin invocation of the phase runner seam. |
| **Learner substrate** | `learner/` | Canonical learner state in `learner/learning_state.yaml` with derived views for `.mavis/`, `engines/minimaxDojo/whiteboard/`, and the Markdown profile. |
| **Threshold seam** | `engines/minimaxDojo/config/learner.yaml` | Every numeric threshold the tutor uses. Prompts and docs reference values via the `⟨config: path⟩` marker instead of hardcoding them. |
| **Canonical agent prompt** | `engines/minimaxDojo/prompts/per_agent/<name>.md` | The single system prompt for an agent. The matching `engines/minimaxDojo/agents/<id>/README.md` is a thin index that links to it. |
| **Cycle domain module** | `engines/codexDojo/src/cycle.ts` | Stage advancement and completion rules. `state.ts` reducer is a shallow adapter over `advanceCycle(snapshot)`. Characterization tests in `state.test.ts` + `render.test.ts` are the parity oracle. |
| **ResponseComposer** | `curriculum/01_rate_limiter/node-impl/` · `curriculum/01_rate_limiter/go-impl/` · `curriculum/01_rate_limiter/rust-impl/` | HTTP response contract: header names, 429 body shape, status codes, content type. Cross-language parity enforced by shared test vectors. |
| **ClientKeyStrategy** | `curriculum/01_rate_limiter/node-impl/` · `curriculum/01_rate_limiter/go-impl/` · `curriculum/01_rate_limiter/rust-impl/` | Trust-boundary logic: which header/socket field to trust, IPv4/IPv6 normalization, X-Forwarded-For parsing. Production uses `ConnectInfo`/`RemoteAddr`; tests inject a fixed key. |
| **AppState (Rust)** | `curriculum/01_rate_limiter/rust-impl/src/lib.rs` | The three injected seams bundled for axum's `State`: `key_strategy` + `limiter` + `composer`. Constructed once in `router(limiter)`; passed to both middleware and `/status` handler. |

## Validation Commands

```bash
# codexDojo app (Track A)
cd engines/codexDojo && pnpm run lint && pnpm run test && pnpm run build

# Project 01 — Node/TS reference impl
cd curriculum/01_rate_limiter/node-impl && pnpm run test && pnpm run lint

# Project 01 — Go reference impl
cd curriculum/01_rate_limiter/go-impl && go test -race -cover ./...

# Project 01 — Rust reference impl
cd curriculum/01_rate_limiter/rust-impl && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test

# Learner substrate (Python)
python3 -m learner.substrate                                  # regenerate derived views
python3 -m unittest discover -s learner/substrate/tests -t .  # validate invariants
```

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

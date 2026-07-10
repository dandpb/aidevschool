# codexDojo Ecosystem Manifest

## Purpose

`codexDojo` is a practical, continuous programming school operated by agents. Its purpose is to help the learner improve programming, architecture, code quality, testing, scalability, and professional use of AI by building small projects that grow into robust systems.

The system is not a theory archive. Every cycle must create useful artifacts: code, tests, documentation, metrics, reviews, comparisons, memory updates, and a next challenge.

## Canonical Surfaces

| Surface | Role |
| --- | --- |
| `engines/codexDojo/` | User-facing app and product-facing ecosystem spec. |
| `engines/codexDojo/src/` | Local dashboard for agents, cycle, roadmap, and first project. |
| `engines/codexDojo/src/data/osEngine.ts` | Configurable, protocol-safe bridge to the canonical OS experience; production URL comes from `VITE_CODEXDOJO_OS_URL`. |
| `engines/codexdojo-os-prototype/` | Canonical educational OS experience and Engine Hub. It embeds the dashboard and teaching games, exposes fixed read-only actions for local Python engines during development, and never marks mastery. |
| `engines/codexdojo-os-prototype/src/engines/` | Typed six-engine registry, safe embedded URL resolution, source-bound raw-evidence intake, and honest unavailable states. Production URLs use `VITE_CODEXDOJO_URL`, `VITE_PIXELDOJO_URL`, and `VITE_VOXELDOJO_URL`. |
| `engines/codexdojo-os-prototype/bridge/` | Vite-development-only loopback bridge. It maps three exact action IDs to fixed commands; callers cannot supply paths, commands, or arguments. |
| `engines/codexdojo-os-prototype/src/data/learner.ts` | Generated read-only learner view from the shared substrate; never edited by hand. |
| `engines/codexDojo/ecosystem/` | Canonical manifest, completion audit, prompts, runbooks, memory, evaluation, and templates. |
| `docs/design/allium/` | Formal domain-level Allium specs for dashboard, learner substrate, tutor core, orchestration, curriculum, pixelDojo games, arena, and distributed-cache verification behaviour. |
| `engines/codexDojo/ecosystem/LEGACY_MIGRATION.md` | Legacy/refactoring contract: characterization tests, code-smell catalog, migration strategies, and before/after metrics. |
| `engines/minimaxDojo/` | Deep tutor core: 14-agent Agora Continuum, state machine, gates, whiteboard. |
| `engines/minimaxDojo/config/learner.yaml` | Single seam for numeric thresholds referenced by prompts/docs via `⟨config: path⟩`. |
| `engines/pixelDojo/` | Teaching-game engine: one curriculum concept becomes one playable arcade mechanic and emits evidence for a separate verifier; `engines/pixelDojo/pixel-quest/playwright/pixel-quest.spec.ts` is the playable smoke contract. `arcadeAcademy/` merged here on 2026-06-21; the obsolete prototypes `codexdojo-ecosystem-manifest/` and `game-01-rate-limiter/` (siblings of `pixel-quest/` from the same scaffold commit) were removed 2026-06-21 — pixel-quest is the canonical teaching-game surface. |
| `engines/voxelDojo/` | 3D teaching-simulation engine (Three.js): structures/dynamics concepts become operable 3D systems emitting evidence with `source: "voxeldojo"`. **15 spatial-concept games implemented** (2026-07-05 all-18 buildout): `game-02-warehouse`, `game-03-wormhole`, `game-05-relay-station`, `game-06-pipeline-plant`, `game-07-checkpoint-city`, `game-08-timeline-tower`, `game-09-docking-bay`, `game-10-hash-ring` (pilot), `game-11-air-traffic`, `game-12-mission-control`, `game-13-breaker-grid`, `game-14-river-delta`, `game-15-observatory`, `game-16-freight-yard`, `game-17-lighthouse-network`, `game-18-stacks`. Each ships a deterministic headless sim core + Vitest concept proofs + Three.js scene + 4 levels + voxeldojo evidence emit + Playwright smoke; per-game PLAN slice in `docs/plans/`. The two rules-shaped concepts (01 rate limiter, 04 task queue) live in pixel-quest as Shape A encounters. Cross-engine rules: `docs/design/teaching-game-contract.md`. |
| `docs/design/teaching-game-contract.md` | Canonical cross-engine teaching-game contract (evidence schema, verifier handoff, review-slice flow) shared by pixelDojo and voxelDojo; wins on conflict with engine docs. |
| `docs/design/polyglot-arena/` | Demoted design material for the polyglot evolution arena; was `engines/polyglotEvolutionArena/` at `proposal` status. The runnable comparison seams now live in shared curriculum tooling, not a separate engine. |
| `docs/` | Existing polyglot MiniMax/OpenClaw/Hermes documentation. |
| `learner/` | Canonical learner-state substrate; single source of truth for all engines. |
| `.mavis/` | Derived learning-state view generated from `learner/learning_state.yaml`. |
| `engines/miniMaxEvolutionEngine/.claude/commands/devschool/` | Phase commands for Claude Code orchestration. |
| `engines/openclaw/` | File-based continuous runner: Hermes event bus, scheduler, and agent adapters. |
| `.mavis/hermes/` | Derived event-log runtime view produced by the OpenClaw runner. |
| `curriculum/` | Real implementation projects and evidence. |
| `curriculum/_shared/arena/` | Shared Polyglot Arena runtime: strict fail-closed decision gate, scoreboard, report rendering, and prediction reveal orchestration for curriculum projects. |
| `curriculum/_shared/benchmarks/` | Shared benchmark runner, k6 scenario execution, result parsing, and per-project `benchmark.yaml` contract. |
| `learner/predictions.yaml` | Canonical prediction calibration log consumed by the learner substrate and dashboard snapshot. |

## Status Vocabulary

| Status | Meaning |
| --- | --- |
| `implemented` | code/artifact exists and passes verification |
| `scaffolded` | folder/boilerplate exists but no verified behavior |
| `planned` | documented intent, no code yet |
| `proposal` | design material only, no runtime commitment |
| `blocked` | cannot proceed due to external dependency |

## Requested Deliverables Coverage

| # | Requested deliverable | Evidence in this workspace |
| --- | --- | --- |
| 1 | Architecture of the multi-agent ecosystem | `engines/codexDojo/ecosystem/OPERATING_MODEL.md`, `engines/minimaxDojo/docs/00_architecture.md`, `docs/PROMPTS/IDEIAS/codexDojo/00_ecosystem_architecture.md`, `docs/design/allium/minimax-agora-continuum.allium`, `docs/design/allium/minimax-evolution-engine.allium` |
| 2 | List of agents and responsibilities | `engines/codexDojo/ecosystem/OPERATING_MODEL.md`, `engines/codexDojo/ecosystem/AGENT_PROMPTS.md`, `engines/minimaxDojo/docs/01_agent_roster.md` |
| 3 | Continuous execution workflow | `engines/codexDojo/ecosystem/OPERATING_MODEL.md`, `engines/codexDojo/ecosystem/OPENCLAW_HERMES_RUNBOOK.md`, `.mavis/plans/plan.yaml` |
| 4 | Project folder structure | `engines/codexDojo/ecosystem/ROADMAP.md`, `engines/codexDojo/ecosystem/templates/project-package.md`, `curriculum/01_rate_limiter/` |
| 5 | Learning memory model | `engines/codexDojo/ecosystem/MEMORY_MODEL.md`, `engines/codexDojo/ecosystem/MEMORY_CURATION.md`, `engines/minimaxDojo/docs/05_memory_system.md`, `learner/` |
| 6 | Code evaluation model | `engines/codexDojo/ecosystem/EVALUATION_MODELS.md`, `engines/codexDojo/ecosystem/templates/code-review-scorecard.md`, `engines/minimaxDojo/docs/04_empirical_gates.md`, `engines/minimaxDojo/config/learner.yaml` (single threshold seam) |
| 7 | Technology comparison model | `engines/codexDojo/ecosystem/EVALUATION_MODELS.md`, `engines/codexDojo/ecosystem/templates/technology-comparison.md`, `docs/PROMPTS/IDEIAS/codexDojo/03_metrics_framework.md` |
| 8 | Canonical 18-project curriculum | `curriculum/catalog.md` (canonical source of truth), `curriculum/BACKLOG_STATUS.md`, `engines/codexDojo/ecosystem/ROADMAP.md`, `engines/codexDojo/src/data/projects.ts`, `docs/design/allium/curriculum-catalog.allium` |
| 9 | Evolution metrics | `engines/codexDojo/ecosystem/EVALUATION_MODELS.md`, `engines/minimaxDojo/docs/06_metrics_quality_gate.md`, `engines/codexDojo/src/data/cycle.ts` |
| 10 | Individual prompt for every agent | `engines/codexDojo/ecosystem/AGENT_PROMPTS.md`, `engines/minimaxDojo/prompts/per_agent/` (canonical system prompts), `engines/minimaxDojo/agents/README.md` (roster) |
| 11 | Plan to run continuously in OpenClaw and Hermes | `engines/codexDojo/ecosystem/OPENCLAW_HERMES_RUNBOOK.md`, `docs/PROMPTS/IDEIAS/codexDojo/04_bootstrap_prompts.md` (documented manual workflow; continuous automation is `planned`) |
| 12 | Ludic learning surface with extensible content | `engines/pixelDojo/pixel-quest/` playable token-bucket slice, with Playwright evidence contract in `engines/pixelDojo/pixel-quest/playwright/pixel-quest.spec.ts`. |
| 13 | Legacy refactoring and migration plan | `engines/codexDojo/ecosystem/LEGACY_MIGRATION.md`, `engines/codexDojo/ecosystem/templates/project-package.md`, `docs/PROMPTS/00_IDEIAS.md` |
| 14 | Code-smell catalog and correction techniques | `engines/codexDojo/ecosystem/LEGACY_MIGRATION.md` |
| 15 | Characterization test model | `engines/codexDojo/ecosystem/LEGACY_MIGRATION.md`, `engines/codexDojo/ecosystem/templates/project-package.md` |
| 16 | Metrics for real refactor improvement | `engines/codexDojo/ecosystem/LEGACY_MIGRATION.md`, `engines/codexDojo/ecosystem/EVALUATION_MODELS.md` |

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
| Ludic practice and evidence capture | `engines/pixelDojo/pixel-quest/playwright/pixel-quest.spec.ts` verifies playthrough, evidence emission, journal visibility, and no mastery side effects. |
| Legacy refactoring, modernization, and migration | `engines/codexDojo/ecosystem/LEGACY_MIGRATION.md`, `engines/codexDojo/ecosystem/CURRICULUM_SCOPE.md` |

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
| **PhaseRunner** | `engines/miniMaxEvolutionEngine/.claude/commands/devschool/` | The repeated read-state → check-gate → dispatch producer → dispatch verifier → update status → retry pattern. Every `/devschool-*` command is a thin invocation of the phase runner seam. Includes the 5 tutor-core commands (`socratic`, `recall`, `mnemosyne-compact`, `cron-list`, `decide`) added 2026-06-21 to wire the missing 14-agent roles. |
| **Socratic guardrail** | `engines/miniMaxEvolutionEngine/.claude/agents/socrates.md` + `commands/devschool/socratic.md` | Anti-dependency seam. Every learner question routes through here: STAP pipeline, 15/dia quota, Dreyfus-graded fading, forbids finished solutions before attempt. |
| **Learner snapshot** | `engines/codexDojo/src/data/learner.ts` · `engines/codexdojo-os-prototype/src/data/learner.ts` (regenerated by `learner/substrate/dashboard_snapshot.py`) | Engine-local read models built from the same snapshot: active unit, profile, gate, streak, reviews, and curriculum counts. The Python substrate is the source of truth; both modules regenerate on every `python3 -m learner.substrate`. |
| **Engine adapter registry** | `engines/codexdojo-os-prototype/src/engines/registry.ts` · `engines/voxelDojo/catalog.json` · `engines/codexdojo-os-prototype/src/engines/voxelCatalog.ts` · `engines/codexdojo-os-prototype/bridge/` · `engines/minimaxDojo/os_adapter.py` · `engines/miniMaxEvolutionEngine/os_adapter.py` · `engines/shared/teaching-evidence/emit.ts` | Integrates six external engines: isolated browser origins, all 16 voxel games from the voxel-owned catalog, authenticated loopback-only local workflow briefings, and raw teaching evidence transport without verifier authority. |
| **Learner substrate** | `learner/` | Canonical learner state in `learner/learning_state.yaml` with derived views for `.mavis/`, `engines/minimaxDojo/whiteboard/`, and the Markdown profile. |
| **Arena decision gate** | `curriculum/_shared/arena/` · `curriculum/_shared/benchmarks/` · `learner/predictions.yaml` · `learner/substrate/dashboard_snapshot.py` | Cross-language benchmark evidence, strict all-metric trust gating, prediction calibration, and dashboard projection. A report remains locked until every decision metric is trustworthy and verifier-confirmed. |
| **Threshold seam** | `engines/minimaxDojo/config/learner.yaml` | Every numeric threshold the tutor uses. Prompts and docs reference values via the `⟨config: path⟩` marker instead of hardcoding them. |
| **Canonical agent prompt** | `engines/minimaxDojo/prompts/per_agent/<name>.md` | The single system prompt for an agent. Roster: `engines/minimaxDojo/agents/README.md`. |
| **Cycle domain module** | `engines/codexDojo/src/cycle.ts` | Stage advancement and completion rules. `state.ts` reducer is a shallow adapter over `advanceCycle(snapshot)`. Characterization tests in `state.test.ts` + `render.test.ts` are the parity oracle. |
| **ResponseComposer** | `curriculum/01_rate_limiter/node-impl/` · `curriculum/01_rate_limiter/go-impl/` · `curriculum/01_rate_limiter/rust-impl/` | HTTP response contract: header names, 429 body shape, status codes, content type. Cross-language parity enforced by shared test vectors. |
| **ClientKeyStrategy** | `curriculum/01_rate_limiter/node-impl/` · `curriculum/01_rate_limiter/go-impl/` · `curriculum/01_rate_limiter/rust-impl/` | Trust-boundary logic: which header/socket field to trust, IPv4/IPv6 normalization, X-Forwarded-For parsing. Production uses `ConnectInfo`/`RemoteAddr`; tests inject a fixed key. |
| **AppState (Rust)** | `curriculum/01_rate_limiter/rust-impl/src/lib.rs` | The three injected seams bundled for axum's `State`: `key_strategy` + `limiter` + `composer`. Constructed once in `router(limiter)`; passed to both middleware and `/status` handler. |

## Validation Commands

```bash
# codexDojo app (Track A)
cd engines/codexDojo && pnpm run lint && pnpm run test && pnpm run build

# codexDojo OS bounded context
cd engines/codexdojo-os-prototype && npm run lint && npm run test && npm run build && npm run test:smoke

# Project 01 — Node/TS reference impl
cd curriculum/01_rate_limiter/node-impl && pnpm run test && pnpm run lint

# Project 01 — Go reference impl
cd curriculum/01_rate_limiter/go-impl && go test -race -cover ./...

# Project 01 — Rust reference impl
cd curriculum/01_rate_limiter/rust-impl && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test

# Learner substrate (Python)
python3 -m learner.substrate                                  # regenerate derived views
python3 -m unittest discover -s learner/substrate/tests -t .  # validate invariants

# Engine contracts
python3 -m unittest engines.minimaxDojo.tests.test_learning_unit_e2e_contract
python3 engines/miniMaxEvolutionEngine/.claude/commands/devschool/tests/test_phaserunner.py
python3 -m unittest engines.test_engine_contracts
cd engines/pixelDojo/pixel-quest && pnpm run lint && pnpm run test && pnpm run build && pnpm run smoke

# OpenClaw/Hermes continuous runner (tracer bullet)
python3 -m engines.openclaw --project curriculum/01_rate_limiter --phase spec --reset --max-events 20
python3 -m pytest engines/openclaw/tests/
python3 -m engines.openclaw --preview
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

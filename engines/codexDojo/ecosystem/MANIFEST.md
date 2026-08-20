# codexDojo Ecosystem Manifest

## Purpose

AI DevSchool democratizes AI knowledge and application through short,
practical lessons for nontechnical people and programmers. `codexDojo` remains
the operational dashboard for the engineering track; it is one surface of the
school, not the whole product.

The system is not a theory archive. Every cycle must create useful artifacts: code, tests, documentation, metrics, reviews, comparisons, memory updates, and a next challenge.

## Canonical Surfaces

| Surface | Role |
| --- | --- |
| `docs/VISION.md` | Canonical product intention: two audiences, one short-lesson mechanic. It does not prove implementation status. |
| `docs/design/micro-lesson-contract.md` | Cross-surface pedagogical lifecycle. It does not merge bounded-context evidence schemas. |
| `curriculum/ai-literacy/` | Canonical pt-BR content, lesson count/status, schemas, validator, and generated-read-model compiler. `ready` is content status, not mastery. |
| `engines/literacyDojo/` | Local-first microlearning app for nontechnical people. Local progress stops at `completed`; an independent verifier is required for `mastered`. |
| `engines/codexDojo/` | User-facing app and product-facing ecosystem spec. |
| `engines/codexDojo/src/` | Local dashboard for agents, cycle, roadmap, and first project. |
| `engines/codexDojo/src/data/osEngine.ts` | Configurable, protocol-safe bridge to the canonical OS experience; production URL comes from `VITE_CODEXDOJO_OS_URL`. |
| `engines/codexdojo-os-prototype/` | Canonical educational OS experience and Engine Hub. It embeds the dashboard and teaching games, exposes fixed read-only actions for local Python engines during development, and never marks mastery. |
| `engines/codexdojo-os-prototype/src/engines/` | Typed six-engine registry, safe embedded URL resolution, source-bound raw-evidence intake, and honest unavailable states. Production URLs use `VITE_CODEXDOJO_URL`, `VITE_PIXELDOJO_URL`, and `VITE_VOXELDOJO_URL`. |
| `engines/codexdojo-os-prototype/bridge/` | Vite-development-only loopback bridge. It maps three exact engine action IDs plus the declared literacy and teaching-game evidence schemas to fixed processes; callers cannot supply paths, commands, arguments, or verifier selection. Independent verification requires the integrated bridge flag. The optional same-origin analytics batch route is schema-only and never shares verifier process dispatch. |
| `engines/codexdojo-os-prototype/src/data/learner.ts` | Generated read-only learner view from the shared substrate; never edited by hand. |
| `engines/codexdojo-os-prototype/config/mission-bindings.yaml` · `learner/substrate/mission_catalog.py` · `engines/codexdojo-os-prototype/src/data/missions.ts` | Host-owned runtime bindings join exactly three IA Prática lessons and three project-linked Voxel games into the generated, read-only first-release catalog. Chapter order, recommended entry, prerequisites, stable versions, and semantic fallback metadata are validated without copying lesson/game content or mastery authority. |
| `engines/codexdojo-os-prototype/src/journey/` · `engines/codexdojo-os-prototype/src/progress/` · `engines/codexdojo-os-prototype/src/desktop/DesktopApp.tsx` | Mission-first onboarding, hub, dual-track map, and progress-preserving track switcher over one versioned local aggregate. Stable mission IDs survive catalog reconciliation; planned/invalid content never becomes launchable, and no local status can represent canonical mastery. |
| `engines/codexdojo-os-prototype/src/progress/domain.ts` · `engines/codexdojo-os-prototype/src/progress/migration.ts` · `engines/codexdojo-os-prototype/src/missions/recommendation.ts` · `engines/codexdojo-os-prototype/src/missions/reviewMapping.ts` | OS-owned engagement and next-action policy. Immutable local transitions own XP, daily goal, engagement streak, achievements, attempts, hints, practice, and application markers; sequential migrations preserve stable completions. Recommendation order is onboarding, resume, substrate-projected due review, explicitly mapped pitfall practice, directed retry, then prerequisite-eligible content. Review mapping reads canonical FSRS/pitfall facts but never copies scheduling state, receipts, or `mastered` into IndexedDB. |
| `engines/codexdojo-os-prototype/src/mentor/` · `engines/codexdojo-os-prototype/src/learning/LearningRail.tsx` | Native contextual mentor gateway and retained desktop prototype. Mission coaching sends only bounded objective, concepts, stage, declared confusion, explicit attempt excerpts, recent turns, pedagogical level, stalls, and quota to an SDK-free provider port. Request/response policy enforces attempt-before-hint, one STAP transition, solution withholding, cancellation, stale-result rejection, and zero canonical/evidence/verifier authority; provider failure uses the five-step deterministic help ladder without consuming quota. |
| `engines/codexdojo-os-prototype/src/host/` · `engines/literacyDojo/src/host/` · `engines/shared/teaching-evidence/hostProtocol.ts` | Source-bound `aidevschool.host-engine` v1.0 handshake for all six chapter missions, revisioned state, unchanged producer-evidence forwarding, acknowledgements, stale-run rejection, and complete replacement cleanup. Opaque checkpoints are isolated by engine, mission version, and runtime content version in `src/host/indexedDbCheckpointStore.ts`; transport acceptance remains separate from verification and canonical gate eligibility. |
| `engines/codexdojo-os-prototype/src/verification/` · `engines/codexdojo-os-prototype/bridge/verification.ts` · `learner/gate/literacy_bridge.py` · `learner/gate/teaching_game_bridge.py` | Schema-aware raw-evidence intake and opaque offline storage identity. Literacy records and the three fixed WAREHOUSE, WORMHOLE, and RELAY STATION identities use fixed independent verifier dispatch, Python-owned canonical digests, identity-bound receipts, atomic receipt persistence, and retryable gateway failure. Each teaching-game evaluator recomputes metrics and pass from a closed raw-observation trace, then explicitly reports that canonical gate submission still requires a separate learner attempt and normal eligibility checks. Producer PASS, local completion, verifier PASS, and canonical mastery remain distinct; this flow never writes canonical mastery. |
| `engines/codexdojo-os-prototype/src/analytics/` · `engines/codexdojo-os-prototype/bridge/analytics.ts` · `engines/literacyDojo/src/host/LiteracyMissionAdapter.ts` · `engines/shared/teaching-evidence/hostProtocol.ts` | Host-owned activation and return analytics. A closed, content-free schema accepts only onboarding, mission, structured attempt/pass, hint, retry, review, verification-state, and renderer-degradation facts; the collector adds anonymous installation/session and declared runtime dimensions. The independent queue deduplicates, orders, batches, retries within a bound, and flushes by interval, completion, size, or page hide through in-memory or same-origin fetch/beacon transports. Questions, answers, attempt excerpts, mentor content, deterministic checks, evidence, checkpoints, and canonical paths are rejected, and analytics exposes no journey, progress, evidence, verifier, gate, or mastery transition. |
| `engines/codexdojo-os-prototype/src/rendering/` · `engines/voxelDojo/shared/projection.ts` · `engines/voxelDojo/shared/accessibleProjection.ts` · `engines/voxelDojo/shared/viewport.ts` | Evidence-neutral renderer lifecycle for the three hosted Dev missions. The correlated launch declares reduced-motion and `auto | webgl | accessible` preference; revisioned renderer state reports probing, initialization, readiness, degradation, and failure separately from mission state. Guarded WebGL construction, bounded initialization, context-loss disposal, retry, and labelled DOM projections preserve the same controller, deterministic snapshot, completion rules, and raw evidence identity. Pixel ratio remains capped at 2, and rendering never evaluates or emits evidence. |
| `engines/codexdojo-os-prototype/src/main.tsx` · `engines/codexdojo-os-prototype/src/App.tsx` · `engines/codexdojo-os-prototype/src/styles/foundation.css` · `engines/codexdojo-os-prototype/src/styles/responsive.css` · `engines/codexdojo-os-prototype/tests/release-journeys.smoke.spec.ts` · `engines/codexdojo-os-prototype/tests/security.smoke.spec.ts` · `engines/codexdojo-os-prototype/tests/accessibility.smoke.spec.ts` · `engines/codexdojo-os-prototype/tests/offline.smoke.spec.ts` | First-release cutover and acceptance boundary. The service-backed mission journey is the production root; `/desktop` retains characterized desktop and Engine Hub tools. Release smoke coverage spans both audience entries, reload and track continuity, mentor fallback, independent PASS/FAIL, gate-ineligible language, review/recovery, hostile protocol messages, keyboard/focus/live-region behavior, compact and reduced-motion geometry, semantic rendering, offline local completion, queued analytics, and retryable verification failure without granting canonical authority. |
| `engines/codexDojo/ecosystem/` | Canonical manifest, completion audit, prompts, runbooks, memory, and evaluation contracts. |
| `docs/design/allium/` | Formal domain-level Allium specs for dashboard, learner substrate, tutor core, orchestration, curriculum, pixelDojo games, arena, and distributed-cache verification behaviour. |
| `engines/codexDojo/ecosystem/LEGACY_MIGRATION.md` | Legacy/refactoring contract: characterization tests, code-smell catalog, migration strategies, and before/after metrics. |
| `engines/minimaxDojo/` | Deep tutor core: 14-agent Agora Continuum, state machine, gates, whiteboard. |
| `engines/minimaxDojo/config/learner.yaml` | Single seam for numeric thresholds referenced by prompts/docs via `⟨config: path⟩`. |
| `engines/pixelDojo/` | Teaching-game engine: one curriculum concept becomes one playable arcade mechanic and emits evidence for a separate verifier; `engines/pixelDojo/pixel-quest/playwright/pixel-quest.spec.ts` is the playable smoke contract. `arcadeAcademy/` merged here on 2026-06-21; the obsolete prototypes `codexdojo-ecosystem-manifest/` and `game-01-rate-limiter/` (siblings of `pixel-quest/` from the same scaffold commit) were removed 2026-06-21 — pixel-quest is the canonical teaching-game surface. |
| `engines/voxelDojo/` | 3D teaching-simulation engine (Three.js): structures/dynamics concepts become operable 3D systems emitting evidence with `source: "voxeldojo"`. **16 spatial-concept games implemented** (2026-07-05 all-18 buildout): `game-02-warehouse`, `game-03-wormhole`, `game-05-relay-station`, `game-06-pipeline-plant`, `game-07-checkpoint-city`, `game-08-timeline-tower`, `game-09-docking-bay`, `game-10-hash-ring` (pilot), `game-11-air-traffic`, `game-12-mission-control`, `game-13-breaker-grid`, `game-14-river-delta`, `game-15-observatory`, `game-16-freight-yard`, `game-17-lighthouse-network`, `game-18-stacks`. Each ships a deterministic headless sim core + Vitest concept proofs + Three.js scene + 4 levels + voxeldojo evidence emit + Playwright smoke; per-game PLAN slice in `docs/plans/`. The two rules-shaped concepts (01 rate limiter, 04 task queue) live in pixel-quest as Shape A encounters. Cross-engine rules: `docs/design/teaching-game-contract.md`. |
| `engines/miniTown/` | Cozy observational town-sim (Three.js): the level-0 entry surface for the non-technical audience (AD-004). Explore-only; exposes runtime state via `window.__miniTown`, never writes canonical learner state and never marks mastery. Paired curriculum track: `curriculum/00_ai_in_practice/`. |
| `docs/design/teaching-game-contract.md` | Canonical cross-engine teaching-game contract (evidence schema, verifier handoff, review-slice flow) shared by pixelDojo and voxelDojo; wins on conflict with engine docs. |
| `docs/design/polyglot-arena/` | Demoted design material for the polyglot evolution arena; was `engines/polyglotEvolutionArena/` at `proposal` status. The runnable comparison seams now live in shared curriculum tooling, not a separate engine. |
| `docs/` | Existing polyglot MiniMax and OpenClaw documentation. |
| `docs/curso/` · `.agents/skills/workflow-lab-*` | Curso offline de engenharia de IA, caso CSV executável e laboratório cumulativo com dez workflows. O skill pack separa Build, Verify independente e Maintain; resultados publicados apontam para evidência durável e não alegam aprendizado humano. |
| `learner/` | Canonical learner-state substrate; single source of truth for all engines. |
| `.mavis/` | Derived learning-state view generated from `learner/learning_state.yaml`. |
| `engines/miniMaxEvolutionEngine/.claude/commands/devschool/` | Phase commands for Claude Code orchestration. |
| `engines/openclaw/` | File-based checklist runner: scheduler, checklist, and YAML pipeline adapter. No event bus. |
| `curriculum/` | Real implementation projects and evidence. |
| `curriculum/_shared/arena/` | Shared Polyglot Arena runtime: strict fail-closed decision gate, scoreboard, report rendering, and prediction reveal orchestration for curriculum projects. |
| `curriculum/_shared/benchmarks/` | Shared benchmark runner, k6 scenario execution, result parsing, and per-project `benchmark.yaml` contract. |
| `learner/predictions.yaml` | Canonical prediction calibration log consumed by the learner substrate and dashboard snapshot. |

## Status Vocabulary

| Status | Meaning |
| --- | --- |
| `implemented` | code/artifact exists and passes verification |
| `ready` | authored content exists and passes its catalog contract; it does not certify the consuming app |
| `local` | runnable from this repository; no public deployment is implied |
| `live` | an official public route is deployed and verified at the cited revision |
| `generated` | derived projection; regenerate it from its source instead of editing it |
| `completed` | local experience progress; not a competency claim |
| `mastered` | independent verification accepted the required evidence |
| `scaffolded` | folder/boilerplate exists but no verified behavior |
| `planned` | documented intent, no code yet |
| `proposal` | design material only, no runtime commitment |
| `blocked` | cannot proceed due to external dependency |

## Requested Deliverables Coverage

| # | Requested deliverable | Evidence in this workspace |
| --- | --- | --- |
| 1 | Architecture of the multi-agent ecosystem | `engines/codexDojo/ecosystem/OPERATING_MODEL.md`, `engines/minimaxDojo/docs/00_architecture.md`, `docs/PROMPTS/IDEIAS/codexDojo/00_ecosystem_architecture.md`, `docs/design/allium/minimax-agora-continuum.allium`, `docs/design/allium/minimax-evolution-engine.allium` |
| 2 | List of agents and responsibilities | `engines/codexDojo/ecosystem/OPERATING_MODEL.md`, `engines/codexDojo/ecosystem/AGENT_PROMPTS.md`, `engines/minimaxDojo/docs/01_agent_roster.md` |
| 3 | Continuous execution workflow | `engines/codexDojo/ecosystem/OPERATING_MODEL.md`, `engines/codexDojo/ecosystem/OPENCLAW_RUNBOOK.md`, `.mavis/plans/plan.yaml` |
| 4 | Project folder structure | `engines/codexDojo/ecosystem/ROADMAP.md`, `curriculum/01_rate_limiter/` |
| 5 | Learning memory model | `engines/codexDojo/ecosystem/MEMORY_MODEL.md`, `engines/minimaxDojo/docs/05_memory_system.md`, `learner/` |
| 6 | Code evaluation model | `engines/codexDojo/ecosystem/EVALUATION_MODELS.md`, `engines/minimaxDojo/docs/04_empirical_gates.md`, `engines/minimaxDojo/config/learner.yaml` (single threshold seam) |
| 7 | Technology comparison model | `engines/codexDojo/ecosystem/EVALUATION_MODELS.md`, `docs/PROMPTS/IDEIAS/codexDojo/03_metrics_framework.md` |
| 8 | Canonical 19-entry curriculum (00–18; 18 programming projects) | `curriculum/catalog.md` (canonical source of truth), `curriculum/BACKLOG_STATUS.md`, `engines/codexDojo/ecosystem/ROADMAP.md`, `engines/codexDojo/src/data/projects.ts` |
| 9 | Evolution metrics | `engines/codexDojo/ecosystem/EVALUATION_MODELS.md`, `engines/minimaxDojo/docs/06_metrics_quality_gate.md`, `engines/codexDojo/src/data/cycle.ts` |
| 10 | Individual prompt for every agent | `engines/codexDojo/ecosystem/AGENT_PROMPTS.md`, `engines/minimaxDojo/prompts/per_agent/` (canonical system prompts), `engines/minimaxDojo/agents/README.md` (roster) |
| 11 | Run the OpenClaw checklist explicitly | `engines/codexDojo/ecosystem/OPENCLAW_RUNBOOK.md`, `engines/openclaw/README.md` (simulate-grade workflow; no background daemon or event bus) |
| 12 | Ludic learning surfaces with extensible content | `engines/pixelDojo/pixel-quest/`, `engines/voxelDojo/`, and the explore-only `engines/miniTown/`; mastery boundaries live in their contracts. |
| 13 | Legacy refactoring and migration plan | `engines/codexDojo/ecosystem/LEGACY_MIGRATION.md`, `docs/PROMPTS/00_IDEIAS.md` |
| 14 | Code-smell catalog and correction techniques | `engines/codexDojo/ecosystem/LEGACY_MIGRATION.md` |
| 15 | Characterization test model | `engines/codexDojo/ecosystem/LEGACY_MIGRATION.md` |
| 16 | Metrics for real refactor improvement | `engines/codexDojo/ecosystem/LEGACY_MIGRATION.md`, `engines/codexDojo/ecosystem/EVALUATION_MODELS.md` |
| 17 | Nontechnical AI microlearning | `docs/VISION.md`, `docs/design/micro-lesson-contract.md`, `docs/design/ai-literacy/`, `curriculum/ai-literacy/`, `engines/literacyDojo/` |
| 18 | Programmer AI-engineering course and permanent workflow lab | `docs/curso/index.html`, `docs/curso/workflow-exemplo/`, `docs/curso/workflow_lab/`, `.agents/skills/workflow-lab-build/`, `.agents/skills/workflow-lab-verify/`, `.agents/skills/workflow-lab-maintain/` |

## Requested Scope Coverage

| Requested scope | Evidence |
| --- | --- |
| Programming fundamentals | `engines/codexDojo/ecosystem/CURRICULUM_SCOPE.md` |
| Technology use-case comparisons | `engines/codexDojo/ecosystem/CURRICULUM_SCOPE.md`, `engines/codexDojo/ecosystem/EVALUATION_MODELS.md` |
| Robust application construction | `engines/codexDojo/ecosystem/CURRICULUM_SCOPE.md`, `engines/codexDojo/ecosystem/ROADMAP.md` |
| Software architecture models | `engines/codexDojo/ecosystem/CURRICULUM_SCOPE.md`, `engines/codexDojo/ecosystem/OPERATING_MODEL.md` |
| Code review and quality | `engines/codexDojo/ecosystem/EVALUATION_MODELS.md` |
| Tests and metrics | `engines/codexDojo/ecosystem/EVALUATION_MODELS.md`, `engines/minimaxDojo/docs/04_empirical_gates.md` |
| Professional AI integration | `engines/codexDojo/ecosystem/CURRICULUM_SCOPE.md`, `engines/codexDojo/ecosystem/AGENT_PROMPTS.md` |
| AI literacy for nontechnical people | `curriculum/ai-literacy/`, `engines/literacyDojo/`, `docs/design/ai-literacy/` |
| Ludic practice and evidence capture | `engines/pixelDojo/pixel-quest/playwright/pixel-quest.spec.ts` verifies playthrough, evidence emission, journal visibility, and no mastery side effects. |
| Legacy refactoring, modernization, and migration | `engines/codexDojo/ecosystem/LEGACY_MIGRATION.md`, `engines/codexDojo/ecosystem/CURRICULUM_SCOPE.md` |

## Core Principles

1. Teach one useful concept at a time through a short attempt-feedback-review loop.
2. Always explain why a decision was made and what alternative lost.
3. Compare alternatives with evidence, not preference.
4. Keep the learner active: AI assists learning, it does not replace reasoning.
5. Use empirical gates before marking a concept mastered.
6. Preserve memory as curated reusable knowledge, not raw chat history.
7. Start with the smallest robust architecture, usually a modular monolith.
8. Add complexity only when a project needs it and a metric can prove the impact.
9. Keep nontechnical and programming vocabularies distinct while preserving
   the same integrity boundary.

## Architectural Seams

Deep modules introduced by the cross-language refactor. Each seam concentrates
behaviour so callers pay a tiny interface tax and tests have a single place to
probe.

| Seam | Files | What it concentrates |
| --- | --- | --- |
| **PhaseRunner** | `engines/miniMaxEvolutionEngine/.claude/commands/devschool/` | The repeated read-state → check-gate → dispatch producer → dispatch verifier → update status → retry pattern. Every `/devschool-*` command is a thin invocation of the phase runner seam. Includes the 5 tutor-core commands (`socratic`, `recall`, `mnemosyne-compact`, `cron-list`, `decide`) added 2026-06-21 to wire the missing 14-agent roles. |
| **Socratic guardrail** | `engines/miniMaxEvolutionEngine/.claude/agents/socrates.md` + `commands/devschool/socratic.md` | Anti-dependency seam. Every learner question routes through here: STAP pipeline, 15/dia quota, Dreyfus-graded fading, forbids finished solutions before attempt. |
| **Learner snapshot** | `engines/codexDojo/src/data/learner.ts` · `engines/codexdojo-os-prototype/src/data/learner.ts` (regenerated by `learner/substrate/dashboard_snapshot.py`) | Engine-local read models built from the same snapshot: active unit, profile, gate, streak, reviews, and curriculum counts. The Python substrate is the source of truth; both modules regenerate on every `python3 -m learner.substrate`. |
| **OS mission catalog and host** | `engines/codexdojo-os-prototype/config/mission-bindings.yaml` · `learner/substrate/mission_catalog.py` · `engines/codexdojo-os-prototype/src/data/missions.ts` · `engines/codexdojo-os-prototype/src/journey/MapScreen.tsx` · `engines/codexdojo-os-prototype/src/journey/TrackSwitcher.tsx` · `engines/codexdojo-os-prototype/src/host/indexedDbCheckpointStore.ts` · `engines/literacyDojo/src/host/` · `engines/shared/teaching-evidence/hostProtocol.ts` | Runs the three-mission IA Prática chapter (`l01`–`l03`) and Dev chapter (WAREHOUSE, WORMHOLE, RELAY STATION) through one correlated, origin-bound contract. Track switching preserves stable progress; opaque checkpoints are version-compatible only; local completion, raw evidence, independent receipts, and generated canonical state remain structurally separate. |
| **OS engagement and recommendation** | `engines/codexdojo-os-prototype/src/progress/` · `engines/codexdojo-os-prototype/src/missions/recommendation.ts` · `engines/codexdojo-os-prototype/src/missions/reviewMapping.ts` · `engines/codexdojo-os-prototype/src/journey/Hub.tsx` · `engines/codexdojo-os-prototype/src/journey/ProgressScreen.tsx` · `engines/codexdojo-os-prototype/src/journey/ResultScreen.tsx` | Keeps reward, daily-goal, local-date streak, achievement, attempt, hint, and practice state in the replace-on-save OS aggregate. One pure policy overlays read-only canonical reviews and declared pitfall mappings to select a next action. Result and progress surfaces label OS-local completion, producer evidence, independent receipts, and substrate-owned mastery separately; reward transitions have no verification or canonical writer dependency. |
| **OS contextual mentor** | `engines/codexdojo-os-prototype/src/mentor/contracts.ts` · `engines/codexdojo-os-prototype/src/mentor/context.ts` · `engines/codexdojo-os-prototype/src/mentor/policy.ts` · `engines/codexdojo-os-prototype/src/mentor/mentorController.ts` · `engines/codexdojo-os-prototype/src/mentor/deterministicFallback.ts` · `engines/codexdojo-os-prototype/src/mentor/provider.ts` · `engines/codexdojo-os-prototype/src/mentor/MentorPanel.tsx` | Capability-free mission coach with closed v1 contracts, minimal context projection, provider-neutral cancellation and timeout handling, stale-response rejection, pre/post policy checks, and deterministic five-step fallback. It can ask, explain, or hint after an explicit attempt, but cannot execute tools, produce evidence, grade, call verifiers, write canonical state, or evaluate mastery. |
| **OS evidence verification** | `engines/codexdojo-os-prototype/src/verification/` · `engines/codexdojo-os-prototype/bridge/verification.ts` · `learner/gate/literacy_bridge.py` · `learner/gate/teaching_game_bridge.py` | Sends unchanged LiteracyDojo records and closed WAREHOUSE, WORMHOLE, and RELAY STATION raw-observation traces to schema-selected fixed verifiers, lets Python own stable digests, and atomically binds persisted evidence to independent PASS/FAIL receipts. Browser input cannot select a process or canonical path; canonical gating remains a separate substrate-owned operation. |
| **OS activation analytics** | `engines/codexdojo-os-prototype/src/analytics/events.ts` · `engines/codexdojo-os-prototype/src/analytics/collector.ts` · `engines/codexdojo-os-prototype/src/analytics/batcher.ts` · `engines/codexdojo-os-prototype/src/analytics/transports.ts` · `engines/codexdojo-os-prototype/bridge/analytics.ts` | Measures the two-track activation and return funnel with anonymous, allowlisted lifecycle facts. Runtime validation excludes learner/evidence/checkpoint/canonical content; independently stored best-effort delivery cannot dispatch or influence learning, verification, evidence, gate, or mastery state. |
| **Engine adapter registry** | `engines/codexdojo-os-prototype/src/engines/registry.ts` · `engines/voxelDojo/catalog.json` · `engines/codexdojo-os-prototype/src/engines/voxelCatalog.ts` · `engines/codexdojo-os-prototype/bridge/` · `engines/minimaxDojo/os_adapter.py` · `engines/miniMaxEvolutionEngine/os_adapter.py` · `engines/shared/teaching-evidence/emit.ts` | Integrates six external engines: isolated browser origins, all 16 voxel games from the voxel-owned catalog, authenticated loopback-only local workflow briefings, and raw teaching evidence transport without verifier authority. |
| **Learner substrate** | `learner/` | Canonical learner state in `learner/learning_state.yaml` with derived views for `.mavis/`, `engines/minimaxDojo/whiteboard/`, and the Markdown profile. |
| **Learning gate** | `learner/gate/` · `learner/substrate/gate.py` | Engine-neutral Prometor evaluation plus atomic canonical transition. Consumers use the single public operation `verify_and_gate(...)`; evidence checks and decision helpers remain internal. Distinct from the phase Verifier, which only approves software-cycle artifacts. |
| **Teaching evidence** | `engines/shared/teaching-evidence/` | Public `@aidevschool/evidence` envelope, validation, and dual-channel browser emission used by Pixel and Voxel. |
| **Generated catalog and dashboard data** | `learner/substrate/catalog.py` · `learner/substrate/dashboard_data.py` | Generates backlog, project, agent, and cycle read models from `curriculum/catalog.md` and minimaxDojo YAML. |
| **Linux Lab bridge** | `engines/codexDojo/src/linuxLab/` | Thin sample tiles + OS launch bridge; full desktop is `codexdojo-os-prototype/`. |
| **Recoverable Voxel projection kit** | `engines/codexdojo-os-prototype/src/rendering/` · `engines/voxelDojo/shared/sceneHarness.ts` · `engines/voxelDojo/shared/viewport.ts` · `engines/voxelDojo/shared/projection.ts` · `engines/voxelDojo/shared/accessibleProjection.ts` · `engines/voxelDojo/game-02-warehouse/src/scene/` · `engines/voxelDojo/game-03-wormhole/src/scene/` · `engines/voxelDojo/game-05-relay-station/src/scene/` | Keeps simulation ownership above disposable projections. Hosted launches carry locale, reduced-motion, and renderer preference; WebGL construction/timeout/context loss degrades to labelled keyboard-operable DOM state and controls, with explicit retry and no change to checkpoint, completion criteria, evidence identity, verification, or mastery authority. |
| **Arena decision gate** | `curriculum/_shared/arena/` · `curriculum/_shared/benchmarks/` · `learner/predictions.yaml` · `learner/substrate/prediction_store.py` | Cross-language benchmark evidence, strict all-metric trust gating, substrate-owned prediction calibration, and dashboard projection. A report remains locked until every decision metric is trustworthy and verifier-confirmed. |
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

# AI Literacy content + local microlearning app
python3 curriculum/ai-literacy/tools/validate.py
python3 -m unittest discover -s curriculum/ai-literacy/tools/tests -t .
cd engines/literacyDojo && \
  npm run gen:content && npm run lint && npm run test && npm run build && \
  npm run test:e2e

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

# Engine topology (included by default in `python3 -m pytest`)
python3 -m unittest engines.minimaxDojo.tests.test_learning_unit_e2e_contract
python3 engines/miniMaxEvolutionEngine/.claude/commands/devschool/tests/test_phaserunner.py
python3 -m pytest learner/substrate/tests/test_engine_topology.py
cd engines/pixelDojo/pixel-quest && pnpm run lint && pnpm run test && pnpm run build && pnpm run smoke

# OpenClaw checklist runner (tracer bullet)
python3 -m engines.openclaw --project curriculum/01_rate_limiter --phase spec --mode simulate --max-events 20
python3 -m pytest engines/openclaw/tests/
python3 -m engines.openclaw --preview

# Offline AI-engineering course + cumulative workflow lab
python3 -m pytest docs/curso/workflow-exemplo/test_export_tasks.py docs/curso/workflow_lab -q
python3 docs/curso/workflow_lab/lab.py --fixtures docs/curso/workflow_lab/fixtures --output "$(mktemp -d)/workflow-lab"
python3 docs/curso/validate_course.py
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
8. Repeat the cycle through explicit OpenClaw checklist runs without hidden state.

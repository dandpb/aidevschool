# AI DevSchool — Core Concepts Research Note

> **Scope:** Primary-source synthesis of the aidevschool ecosystem's architecture, conventions, learning gates, evidence model, substrate, and engine roles.
> **Date:** 2026-08-07 · **Author:** researcher (automated synthesis) · **Status:** draft
> **Method:** Read-only synthesis of authoritative files listed in §8. Every factual claim cites its source file.

---

## 1. What aidevschool Is

AI DevSchool is a **continuous, multi-agent AI learning school** — not a single app. A nontechnical learner practices "using and checking AI through short activities"; a programmer builds and verifies robust software through real projects. Agents propose and explain, while **deterministic rules and independent verification decide what the evidence supports** [`docs/handbook/README.md`].

The product vision is dual-audience democratization: short, practical lessons for both nontechnical people and programmers, with a Duolingo-like gamified mechanic and voxel-art explanations, while the learning loop stays consistent [`docs/handbook/README.md`, `docs/VISION.md`, `docs/PROMPTS/-01_GOAL.md`].

The original goal (`docs/PROMPTS/-01_GOAL.md`) is to build "an ecosystem of agents using OpenClaw and Hermes, inspired by MiniMax Agent Team: Built for Long-Running Tasks and Continuous Evolution" — a team that runs continuously to teach programming, architecture, testing, scalability and AI integration through small projects that grow into robust applications [`docs/PROMPTS/-01_GOAL.md`].

The **single most important constraint** — repeated in every canonical doc — is:

> *Completion certainty never lives in the language model.* A unit is marked `mastered` only after the learner attempts it **and** a separate verifier accepts evidence appropriate to its declared gate [`docs/handbook/README.md`, `docs/handbook/01_architecture.md`, `docs/FUNDAMENTOS.md`].

---

## 2. Architecture — Three Layers

The layered view is explicit in `docs/handbook/01_architecture.md` and mirrored in `AGENTS.md`:

| Layer | Members | Responsibility |
|---|---|---|
| **Product surface** (runnable apps) | `literacyDojo`, `miniTown`, `codexDojo`, `codexdojo-os-prototype`, `pixelDojo`, `voxelDojo` | What a human sees and touches. LiteracyDojo keeps progress local (`completed` max); miniTown is explore-only; the other apps consume generated projections. None marks mastery. |
| **Orchestration / tutoring** (agent cores) | `miniMaxEvolutionEngine`, `minimaxDojo`, `openclaw` | Agent logic plus the simulate-grade artifact checklist. Claude Code motor owns the interactive cycle. |
| **Shared substrate** (source of truth) | `learner/`, `curriculum/` | Single source of truth. Canonical state in human-readable files; derived views regenerated from it. |

**Sources:** `docs/handbook/01_architecture.md`, `docs/handbook/README.md`, `AGENTS.md`, `engines/codexDojo/ecosystem/MANIFEST.md`.

### 2.1 Two interlocking loops

Keeping them distinct is described as "essential" [`docs/handbook/01_architecture.md`]:

1. **Software cycle (5 phases):** `spec → polyglot implementation → review → benchmark → optimize → verify`. Tracked for machines in `learner/pipeline_status.yaml`; `pipeline_status.md` is human notes only. Producers create artifacts; a phase **Verifier** gates each transition from zero context [`docs/handbook/01_architecture.md`, `AGENTS.md`].
2. **Learning gate (per unit):** `presenting → practicing → evaluating → mastered` (with retry budget `⟨config: retries.max_por_unidade⟩` then escalation to Sêneca). This is the gate that preserves productive struggle. Tracked in `learner/learning_state.yaml` [`docs/handbook/01_architecture.md`, `docs/handbook/08_learner_substrate.md`, `learner/substrate/__init__.py`].

The two loops meet at the **diagnostic** (`docs/diagnostic.md`): the learner writes an attempt under `learner/attempts/`, `sonda` grades it, and only then does `gate.implementation_blocked` flip to `false`. A programming unit never becomes `mastered` from that diagnostic alone [`docs/handbook/01_architecture.md`, `docs/handbook/07_curriculum.md`, `learner/learning_state.yaml`].

---

## 3. The Founding Principles (FUNDAMENTOS)

`docs/FUNDAMENTOS.md` (Accepted 2026-07-05, decisor Daniel) frames quality as **explicit contract + independent verification** and lists 8 robustness fundamentals, each with a proof from the repo:

| # | Principle | One-line | Repo proof cited |
|---|---|---|---|
| F1 | Contract before code | Define the interface between two parties before implementing either side | pixelDojo emitted perfect evidence nobody read (GAP 2); `docs/design/teaching-game-contract.md` is the fix |
| F2 | One source of truth, many derived views | Canonical state in `learner/`; everything else regenerated via `python3 -m learner.substrate` | Eliminates "divergent dashboards" bugs |
| F3 | Producer ≠ verifier; claims require evidence | Who produces does not attest own quality; `mastered`/parity/benchmark need executable artifacts | 18 false masterizations on 2026-07-01 (`mastered: true` without any filesystem attempt; commit `04a3463`) |
| F4 | Auditable state: plain text + git | Markdown/YAML/NDJSON versioned; `git log` can find when state lied | GAP 1 was detectable only because `learning_state.yaml` + `attempts/` are comparable files |
| F5 | Vertical slice before horizontal scale | Close one end-to-end loop before replicating to 18 | MVP closed when focus became "U0 gated with real evidence", not parallel engine work |
| F6 | Empirical gates, not opinion | Numeric, pre-declared thresholds in `config/learner.yaml`, benchmark N≥3 | e.g. "p95 < 50ms in 3 executions" vs "looks good" |
| F7 | Visible failure by default | Long processes write where they stopped (`pipeline_status.md`); invariants run as code (`learner.substrate.validate`) | Evolution loop stuck at `impl-done` for a month was a verifiable fact, not a surprise |
| F8 | Simplicity as mandatory step | `/simplify` on the diff **before** every commit | Fewer moving parts = less surface for F1–F7 to fail |

**Source:** `docs/FUNDAMENTOS.md`.

Part 2 of that doc defines the **AI communication protocol**: a quality request has 5 fields in ~5 lines — CONTEXTO, OBJETIVO, RESTRIÇÕES, ACEITE, NÃO-META — plus conduct rules (one delivery per request, ask for proof with delivery, big decisions → options before code, correct with diff) [`docs/FUNDAMENTOS.md`].

---

## 4. Convention: One Learner, One Curriculum, Many Engines

> **One learner, one curriculum, many engines. Do not duplicate `curriculum/` or `learner/` inside an engine; engines use symlinks or root-relative paths to the shared substrate.** [`AGENTS.md`, `docs/handbook/01_architecture.md`, `docs/handbook/README.md`, `docs/VISION.md`]

**`curriculum/`** — Shared, numbered catalog 00–18 plus the AI Literacy track; canonical list is `curriculum/catalog.md` (19 entries: Level 0 no-code + Levels 1–6 programming). Every engine, dashboard, and roadmap MUST reference this file; other lists (`docs/PROMPTS/IDEIAS/`, `engines/codexDojo/ecosystem/ROADMAP.md`) are derived and must stay aligned [`curriculum/catalog.md`, `docs/handbook/07_curriculum.md`, `AGENTS.md`].

**`learner/`** — Shared learner state, profile, pitfalls, journal, pipeline; single source of truth for gates, profile, review history [`AGENTS.md`, `docs/handbook/08_learner_substrate.md`].

**Engines** — Each is a **separate project with its own machine surface** (own `package.json`/`pyproject.toml`, own lint/test/build). The root is an **ecosystem umbrella, not a single product**: no root `package.json`; `make` targets at root cover only the shared Python suites [`AGENTS.md`, `docs/handbook/README.md`].

Compatibility symlinks at root (`projects → curriculum`, `.agora → learner`, etc.) keep legacy tooling working [`AGENTS.md`, `docs/handbook/README.md`].

Other global conventions [`AGENTS.md`, `docs/handbook/README.md`]:

- Learning progress is file-based and auditable: Markdown, YAML, NDJSON.
- A producer does not verify its own work — keep producer/verifier contexts separate.
- When changing prompts, roadmap, gates, memory contracts, or deliverable coverage, update `engines/codexDojo/ecosystem/MANIFEST.md` in the same change.
- Numeric tutor thresholds live in `engines/minimaxDojo/config/learner.yaml`; prompts/docs use the `⟨config: path⟩` marker instead of hardcoding values.

---

## 5. The Curriculum

**Source of truth:** `curriculum/catalog.md` (canonical). See also `docs/handbook/07_curriculum.md`.

### 5.1 Level 0 — AI na Prática (non-technical entry)

- **Slug:** `00_ai_in_practice` · **Status:** scaffolded · **Gate:** no-code (ADR-0004), never the code gate [`curriculum/catalog.md`, `docs/handbook/07_curriculum.md`].
- Paired surfaces: `engines/miniTown/` (explore-only town sim) and the **AI Literacy** micro-lesson track (`curriculum/ai-literacy/catalog.yaml` — 5 modules · 14 lessons · 8 skills · contentVersion 2026-07-25.1) consumed by `engines/literacyDojo/` [`curriculum/catalog.md`].
- AI Literacy lessons are **not** counted as additional numbered catalog projects; they live inside the shared curriculum near `00_ai_in_practice` [`docs/handbook/07_curriculum.md`, `docs/VISION.md`].

### 5.2 Levels 1–6 — Programming Track (18 projects)

| Level | Focus | Projects |
|---|---|---|
| 1 — Fundamentals | Data structures, HTTP, error handling, basic concurrency | 01 Rate Limiter, 02 Key-Value Store, 03 URL Shortener |
| 2 — Concurrency & Performance | Concurrency patterns, async I/O | 04 Task Queue, 05 WebSocket Chat, 06 File Upload Pipeline |
| 3 — Architecture & Design | Clean Architecture, patterns | 07 REST API + Auth, 08 Event-Driven Orders, 09 Plugin System |
| 4 — Scalability & Distribution | Distributed systems, caching, consensus | 10 Distributed Cache, 11 Load Balancer, 12 Job Scheduler |
| 5 — Resilience & Observability | Circuit breakers, logging, metrics | 13 API Gateway + CB, 14 Log Aggregator, 15 Metrics Collector |
| 6 — Complex Systems | Production-grade distributed systems | 16 Message Queue, 17 Config Service, 18 Search Engine |

Every Level 1–6 project follows the lifecycle `spec → polyglot implementation → code review → benchmark (N≥3) → evolution → verify` and is intended to be **polyglot** (Go, Rust, Node/TypeScript) to teach comparative engineering. **Current certification is Node-only** for projects 01 and 02; Go/Rust dirs for 02 exist from an earlier ungated backfill and are explicitly unverified [`curriculum/catalog.md`, `docs/handbook/07_curriculum.md`].

**Required artifacts per project** (owner in parentheses): spec (`curator`), `go-impl/` / `rust-impl/` / `node-impl/` (`dev-*`), `code_review.md` + `learning_notes.md` (`reviewer`), `benchmark_results.md` + `benchmarks/results/` (`benchmarker`), `evolution_report.md` (`optimizer`), `status.md` (all) [`curriculum/catalog.md`].

The five golden rules reiterated in `docs/handbook/README.md`: learning gate first, producer ≠ verifier, no claims without evidence, filesystem is source of truth, simplify before commit.

---

## 6. Learning Gates and Evidence Model

### 6.1 The learning gate (state machine)

Canonical values [`docs/handbook/08_learner_substrate.md`, `learner/substrate/__init__.py`]:

- **Learning states:** `presenting → practicing → evaluating → mastered` (Mavis view: `apresentando/praticando/avaliando/dominado`; whiteboard view: uppercase PT) [`docs/handbook/08_learner_substrate.md`, `learner/substrate/__init__.py`].
- **Artifact states:** `producing → verifying → done` (sub-machine of `evaluating`) [`docs/handbook/08_learner_substrate.md`, `docs/handbook/01_architecture.md`].
- **Unit kinds:** `concept | smell | architecture | pitfall` · **Gate outcomes:** `fail | pass_retried | pass_first_try | pass_exceeds` · **FSRS ratings:** `again | hard | good | easy` [`docs/handbook/08_learner_substrate.md`].
- **Master gate:** `gate.implementation_blocked: true` blocks AI implementation until the learner's diagnostic attempt is evaluated. Retry budget is `⟨config: retries.max_por_unidade⟩` (currently 3) [`docs/handbook/08_learner_substrate.md`, `learner/learning_state.yaml`, `learner/substrate/__init__.py`].

### 6.2 Two gate branches

| Branch | Applies to | Evidence | Current substrate support |
|---|---|---|---|
| **Programming empirical gate** | Levels 1–6 (`require_executable_evidence: true`) | Executable: tests, coverage, mutation score, benchmark with isolated verifier context | Fully implemented and validated |
| **No-code falsifiable-checklist gate** | Level 0 (ADR-0004) | Falsifiable checklist judged by an independent verifier (Prometor context) | **Specified but not yet persisted/validated** in the v2 schema; local Level 0 `completed` cannot be promoted to `mastered` through the substrate today |

**Sources:** `docs/handbook/01_architecture.md`, `docs/handbook/08_learner_substrate.md`, `learner/learning_state.yaml`, `docs/VISION.md`, `engines/literacyDojo/README.md`.

`learner/learning_state.yaml` currently models the programming branch: `active_unit` carries `empirical_gate { require_executable_evidence, min_coverage, mutation_min }` and `promotion_gate` (three bullets: learner plays mission, game emits raw evidence and never writes `mastered`, Prometor validates before any mastery transition) [`learner/learning_state.yaml`, `docs/handbook/08_learner_substrate.md`].

### 6.3 Empirical thresholds (single seam)

All numeric thresholds live in `engines/minimaxDojo/config/learner.yaml`; prompts and docs reference them via `⟨config: path⟩` [`AGENTS.md`, `docs/handbook/01_architecture.md`, `docs/handbook/08_learner_substrate.md`, `engines/codexDojo/ecosystem/MANIFEST.md`].

| Gate | Key | Source |
|---|---|---|
| Core coverage | `⟨config: gates.cobertura_nucleo_min⟩` (≈ 0.80) | `docs/handbook/01_architecture.md`, `docs/handbook/05_engine_minimaxDojo.md`, `learner/learning_state.yaml` |
| Mutation score | `⟨config: gates.mutation_score_min⟩` (≈ 0.65) | same |
| Benchmark stability | `⟨config: galileu.cv_max_pct⟩` (20%), `⟨config: galileu.samples_min⟩` (10), `⟨config: galileu.warmup_min⟩` (500) | same |
| Suite green | `⟨config: gates.suíte_verde_min⟩` | same |
| Lints | `⟨config: gates.lints_erros_max⟩` | same |
| Socratic daily quota | `⟨config: socrates.quota_dia⟩` (15) | same |
| Retry budget | `⟨config: retries.max_por_unidade⟩` (3) | same |

Drift tests protect the shared-kernel threshold contract [`docs/handbook/01_architecture.md`].

### 6.4 Evidence model

**Principle:** *No claims without evidence; a producer never verifies its own work* [`docs/FUNDAMENTOS.md`, `docs/handbook/README.md`].

- **Programming evidence:** per-language test suites + coverage, **mutation testing** (`docs/mutation_gate.md` — Project 01: Stryker, 373 mutants, 71.05%, ≥60% threshold; documents that it does **not** unblock the learning gate), **benchmarks** (`benchmark.yaml` + `curriculum/_shared/benchmarks/runner.py` with 4 scenarios `baseline/stress/spike/endurance`; blocks speed claims when CV% ≥ 20%), **Polyglot Arena prediction gate** (`_shared/arena/gate.py` — report stays `gate: locked` until learner commits per-metric predictions in `learner/predictions.yaml`), **fairness rubric** (`_shared/arena/effort_budget_rubric.md`) [`docs/handbook/07_curriculum.md`, `engines/codexDojo/ecosystem/MANIFEST.md`].
- **Teaching-game evidence:** Each game maps **one concept → one mechanic**; a cleared level emits a signed raw record (NDJSON telemetry / `EVIDENCE <json>` console line / `window.__pixelQuestEvidence` or `window.__voxelDojoEvidence` / `window.__miniTown` for observability). The game **stops there** — it never writes `learning_state.yaml` or `mastered`. A **separate verifier** (Prometor context) reads that evidence and appends the gate review [`docs/handbook/01_architecture.md`, `engines/pixelDojo/README.md`, `engines/voxelDojo/README.md`, `docs/handbook/08_learner_substrate.md`].
- **LiteracyDojo evidence:** Every evaluated attempt emits a `LiteracyEvidenceRecord` with `verifierRequired: true` and structured `deterministicChecks`; responses are transient (not persisted); UI records at most `completed` [`engines/literacyDojo/README.md`, `docs/design/micro-lesson-contract.md`]. Independent judgment lives in `learner/gate/literacy_verifier.py` (`python3 -m learner.gate.literacy_verifier --evidence PATH`) and produces a structured receipt (`verdict`, `mastery_eligible`, `producer_writes_mastered: false`) [`docs/VISION.md`, `engines/literacyDojo/README.md`].
- **Micro-lesson contract** (`docs/design/micro-lesson-contract.md`) — cross-surface pedagogical lifecycle: objective → attempt → immediate feedback → hint + retry → raw structured evidence → experience progress (`completed`, XP, streak) → review → independent verification (`mastered`). Envelopes stay separate; this doc does not merge evidence schemas [`docs/design/micro-lesson-contract.md`, `docs/handbook/README.md`].

Current live example: active unit `U2-key-value-store` is in `evaluating` with `attempt_file: learner/attempts/U2-key-value-store-attempt-1.md` and `evidence_file: engines/voxelDojo/game-02-warehouse/.logs/evidence.ndjson`; `gate.implementation_blocked: false`; next action is for the verifier to gate the unit from fresh WAREHOUSE evidence with a Prometor receipt [`learner/learning_state.yaml`].

### 6.5 Producer ≠ verifier in practice (layer by layer)

- **codexDojo OS:** learner status is a generated read-only projection; missions/catalog/terminal/mentor are local demonstrations; OS never writes canonical state [`docs/handbook/01_architecture.md`, `engines/codexdojo-os-prototype/README.md`].
- **pixelDojo/voxelDojo:** game is the attempt surface only; Playwright smoke tests assert the absences (no `mastered` write) explicitly [`docs/handbook/01_architecture.md`, `engines/pixelDojo/README.md`, `docs/handbook/04_engine_pixelDojo.md` via `engines/voxelDojo/README.md`].
- **miniMaxEvolutionEngine:** `verifier` subagent has no write tools and starts from clean context (anti-anchoring); second `verifier-haiku` at a different model tier; disagreement escalates to `seneca` [`docs/handbook/01_architecture.md`].
- **minimaxDojo:** `PROMĘTOR` runs at a different model tier from the generator and never receives the producer's context [`docs/handbook/01_architecture.md`, `docs/handbook/05_engine_minimaxDojo.md`].

---

## 7. The Learner Substrate

### 7.1 Canonical state vs derived views

- **Canonical:** `learner/learning_state.yaml` — `version: 2`, `system: agora-continuum`. The only place to edit learner mastery [`learner/substrate/__init__.py`, `learner/substrate/interface.md`, `docs/handbook/08_learner_substrate.md`].
- **Derived (never hand-edited; carry `DO NOT EDIT BY HAND` header):** `.mavis/learning_state.yaml`, `minimaxDojo/whiteboard/{profile.yaml, learner_profile.md, trail.md}`, dashboard/OS `src/data/learner.ts` + `projects.ts` + `agents.ts` + `cycle.ts`, `pixelDojo`/`voxelDojo` `reviewSlice.ts` / `shared/content.ts`, `curriculum/BACKLOG_STATUS.md` [`docs/handbook/01_architecture.md`, `docs/handbook/08_learner_substrate.md`, `learner/substrate/interface.md`].

Rule: **edit canonical YAML first, then run `python3 -m learner.substrate`** (sync) — the reverse is forbidden [`docs/handbook/08_learner_substrate.md`, `learner/substrate/interface.md`, `AGENTS.md`].

Actual current learner (from canonical): `id: daniel-barreto`, `level: intermediate`, `active_language: TypeScript`, `goal: robust professional-quality code without AI dependency`, `active_unit: U2-key-value-store` in `evaluating`, `units_log` with `U0` mastered (`pass_first_try → good`) and `U2` presented, `streak.current: 1` with `freezes: 2/2`, `aidi.current: 0.34` [`learner/learning_state.yaml`].

### 7.2 Public API

Read surface: `load_canonical(path) -> dict`, `validate(state) -> list[str]`, `load_and_validate(path) -> dict` [`learner/substrate/__init__.py`, `learner/substrate/interface.md`].

Write surface: `save_canonical(state, path)` (write only; validates first), `commit_canonical(state, path)` (builds every derived view, then persists canonical + views for the real repo path; for temp/test paths behaves like `save_canonical`), `sync()` (load + validate then regenerate all registered projections), plus adapters `derive_mavis_view`, `derive_whiteboard_profile/trail`, `commit_gate_transition`, `record_prediction`, `check` [`learner/substrate/__init__.py`, `learner/substrate/interface.md`, `docs/handbook/08_learner_substrate.md`].

Error modes: `FileNotFoundError` (missing canonical), `yaml.YAMLError` (malformed), `ValueError` (invariant violation) [`learner/substrate/__init__.py`, `learner/substrate/interface.md`].

### 7.3 `validate()` invariants

Implemented in `learner/substrate/__init__.py:validate` (delegates to helpers):

1. `version` present; `system == "agora-continuum"`
2. `learner.id` non-empty; `learner.level ∈ {beginner, intermediate, advanced}`; `learner.active_language ∈ learner.languages`
3. `active_unit.id` non-empty; `active_unit.state ∈ {presenting, practicing, evaluating, mastered}`; `retry_count ≤ retry_limit`
4. `gate.implementation_blocked` is boolean
5. `empirical_gates.learning.requires_attempt_before_solution is True`
6. **units_log** — each `rating` (if present) ∈ `RATINGS`; if `gate_outcome` present, `rating == RATING_FROM_GATE[outcome]` ("the gate is the only rating producer"); `mastered: true` must have at least one gate review; `active_unit.id` must be registered in `units_log` [`learner/substrate/__init__.py:_validate_units_log`]
7. **streak** — `current` is non-negative int; `0 ≤ equipped ≤ max ≤ 2` (research: 3 freezes performed no better than 2) [`learner/substrate/__init__.py:_validate_streak`]
8. **AIDI** (ADR-0003) — `learner.aidi` required; `current ∈ [0,1]`; `0 ≤ amber < red ≤ 1`; `measurement_source ∈ {self_reported, event_computed, derived}`; `history` list of `{date: YYYY-MM-DD, value: [0,1], measurement_source}` strictly ascending unique dates; final `history.value == current` [`learner/substrate/__init__.py:_validate_aidi`]
9. **Attempt files** — every `mastered: true` unit must have a non-empty `attempt_file` that resolves via `secure_attempt_path` and has non-zero size (closes the false-masterization class of 2026-07-01) [`learner/substrate/__init__.py:_validate_attempt_files`]
10. **Evidence files** — every unit with a gate review (`gate_outcome ∈ RATING_FROM_GATE`) must have evidence that passes `curriculum._shared.evidence.check_evidence` or, when bound to a verifier receipt (`evidence_verifier_source` + `evidence_digest`), passes `bound_evidence_violations` (canonical digest recheck, rejects embedded verifier blocks) [`learner/substrate/__init__.py:_validate_evidence_files`]

`sync()` calls `load_and_validate()` first — a sync on invalid state raises — then regenerates all derived families via `build_generated_views` shared across TypeScript renderers [`docs/handbook/08_learner_substrate.md`, `learner/substrate/__init__.py:commit_canonical`].

### 7.4 FSRS spaced repetition and streak

Implemented in `learner/substrate/scheduling.py`, summarized in `docs/handbook/08_learner_substrate.md`:

- **Non-negotiable rule:** the rating that feeds the scheduler comes **only from gate outcomes**, never from self-report.
- **Mapping** `RATING_FROM_GATE`: `fail → again`, `pass_retried → hard`, `pass_first_try → good`, `pass_exceeds → easy`; `rating_from_gate_outcome` raises on unknown outcome [`learner/substrate/__init__.py`, `docs/handbook/08_learner_substrate.md`].
- Config (Phase 1, `fsrs` v6): `learning_steps=(1d, 4d)`, `relearning_steps=(1d,)`, `enable_fuzzing=False` (deterministic; day-scale because code concepts aren't flashcards) [`docs/handbook/08_learner_substrate.md`].
- Card reconstruction is read-only: `build_card_from_reviews()` replays gate-rated reviews chronologically to reconstruct `due`; a unit with only `presented` is due now. `derive_next_reviews(units_log, pitfalls, today)` surfaces units where `due ≤ today` (today is injected, never reads clock inside pure logic); top recurring pitfall appended as `recurring-trap` reason [`docs/handbook/08_learner_substrate.md`].
- **Streak + freeze (Phase 2):** `record_gate_outcome(streak, passed, today)` increments on pass, no-op on fail; `reconcile_streak(streak, today)` consumes one freeze per missed full day; cap comes from canonical `streak.freezes.max` (≤2) [`docs/handbook/08_learner_substrate.md`, `learner/substrate/__init__.py`].
- **CURR (Phase 4):** `compute_curr(...)` is a 7-day trailing retention-rate proxy; explicitly **unvalidated** and must not drive automated decisions [`docs/handbook/08_learner_substrate.md`].

---

## 8. Engine Roles — Detailed

All engines are separate projects; each has its own `AGENTS.md`/`README.md` and checklist via `docs/handbook/README.md:Read in this order`.

### 8.1 Runnable apps (product surface)

| Engine | One-liner | Stack / entry | Key constraint |
|---|---|---|---|
| **`engines/codexDojo/`** — Dashboard / control surface | Vite/TS SPA showing learner snapshot, agent roster, cycle, 19-entry roadmap | `pnpm lint / test / build`; `mountCodexDojo` + `buildInitialState`/`reduceState` | Read-only wrt learner state; `ecosystem/MANIFEST.md` maps every deliverable to concrete files; keep it updated when changing prompts/roadmap/gates |
| **`engines/codexdojo-os-prototype/`** — Canonical educational OS | React/Vite desktop bounded context; canonical mission-first host (`/`), local missions/catalog/terminal/mentor are non-authoritative | `npm lint / test / build / test:smoke`; `src/data/learner.ts` is generated | Holds onboarding, `src/data/missions.ts` (6 first-release missions via `config/mission-bindings.yaml` + `mission_catalog.py`), local IndexedDB for XP/streak/checkpoints; Engine Hub embeds 6 engines with origin-bound handles |
| **`engines/literacyDojo/`** — Local-first AI microlearning | Short 3–5 min lessons for nontechnical people | React/Vite + Vitest + Playwright + Biome; `npm gen:content / lint / test / build / test:e2e` | Local `completed` max; `mastered` requires independent verifier; IndexedDB progress, PWA, vibe/voxel world |
| **`engines/miniTown/`** — Cozy Level 0 entry | Three.js/Vite observational town sim; explore-only; townscaper + A Short Hike aesthetic; 5-min day/night cycle | `pnpm lint / test / typecheck / build / smoke` | **Never writes canonical learner state; never marks mastery** — exposes `window.__miniTown` only |
| **`engines/pixelDojo/`** — 8-bit teaching-game engine | One concept → one arcade mechanic (Phaser 3 on Vite) | `pnpm lint / test / typecheck / build / smoke`; canonical game `pixel-quest/` (GATEKEEPER: token-bucket) | Emits `EVIDENCE <json>` + `window.__pixelQuestEvidence` + NDJSON; Playwright smoke is the evidence contract |
| **`engines/voxelDojo/`** — 3D teaching simulations | One concept → one spatial 3D mechanic (Three.js) | `pnpm lint / test / typecheck / build / smoke` per `game-*`; 16 spatial games shipped; `game-10-hash-ring` is the HASH RING pilot | Deterministic headless sim core + 4 levels + `source: "voxeldojo"` evidence; `game-01/04` rules-shaped concepts live in pixel-quest instead |

**Sources:** `AGENTS.md`, `docs/handbook/README.md`, `docs/handbook/01_architecture.md`, `engines/*/README.md`, `engines/codexDojo/ecosystem/MANIFEST.md`.

### 8.2 Agent cores and runners

| Engine | Role | How it runs | Separation |
|---|---|---|---|
| **`engines/minimaxDojo/`** — Ágora Continuum | 14-agent tutoring spec (state machine, gates, whiteboard) on MiniMax Agent Team | Paste `prompts/bootstrap/00_system.md` + `01_first_cycle.md`; `config/learner.yaml` is the numeric-threshold seam; `core/` is the Python reference impl | Python reference impl covered by `make test-core`; whiteboard is a derived view |
| **`engines/miniMaxEvolutionEngine/`** — Claude Code motor | Runnable 5-phase loop (`spec → impl → review → benchmark → optimize`) as `.claude/agents/*.md` + `/devschool-*` commands | `/devschool-status`, `/devschool-diagnose`, `/devschool-cycle` from this dir; supervisor `tick/poll/complete/fail/block/reconcile` from repo root | Orchestrator delegates to subagents, runs verifier gate between phases, never writes impl code itself; supervisor is file-based, not a daemon |
| **`engines/openclaw/`** — Checklist runner | File-based simulate-grade advancement when artifacts exist and meet size floors | `python3 -m engines.openclaw --preview / --project … --phase spec --mode simulate` | No event bus, no AI calls; halts if `gate.implementation_blocked: true`; YAML-first pipeline adapter |

**Sources:** `AGENTS.md`, `docs/handbook/01_architecture.md`, `docs/handbook/05_engine_minimaxDojo.md`, `docs/handbook/06_engine_miniMaxEvolutionEngine.md`, `engines/miniMaxEvolutionEngine/README.md`, `engines/minimaxDojo/README.md`, `engines/openclaw/README.md`.

### 8.3 Why two agent cores?

`minimaxDojo` and `miniMaxEvolutionEngine` implement **the same protocol** — same state machine, same adversarial verifier, same empirical gate, same agent roles — on **different platforms** (MiniMax Agent Team vs Claude Code). Both are forbidden from forking global learner state [`docs/handbook/01_architecture.md`, `AGENTS.md`, `engines/codexDojo/ecosystem/MANIFEST.md`].

### 8.4 The 14-agent roster (minimaxDojo)

Layers from `engines/minimaxDojo/README.md` and `docs/handbook/05_engine_minimaxDojo.md` (model tier in parens: opus = deep reasoning, sonnet = high-volume generation):

| # | Agent (pt) | Model | Role |
|---|---|---|---|
| 1 | **MAESTRO** | opus | Leader; R/A of every unit; decomposes objective → trail → units; operates state machine; defines verifiable DoD |
| 2 | **CRONOS** | sonnet | Long-running scheduler; recurring tasks in fresh sessions; single ownership per cron |
| 3 | **SONDA** | sonnet | Short diagnostic (10–15 min); classifies Dreyfus × Bloom; pinpoints 3–5 gaps |
| 4 | **CARTÓGRAFO** | opus | Robustness trail (TDD → mutation → smells → SOLID → observability → architecture); unlocks next level only by proven prerequisite |
| 5 | **MESTRE-CONTEÚDO** | sonnet | Exercise generator (faded examples, Parsons problems, incremental projects); defines suite/DoD jointly with Prometor |
| 6 | **SÓCRATES** | sonnet | Socratic anti-dependency tutor; STAP pipeline; 15/day quota; fading; never delivers finished solution |
| 7 | **MNEME** | sonnet | Spaced repetition; 15–20 min micro-reviews; interleaving + active retrieval; prioritizes pitfalls |
| 8 | **PROMĘTOR** | opus | Adversarial verifier / empirical gate; mandate of refutation; isolated sandbox; mutation ≥60–70% + core coverage ≥80%; cross-model tier |
| 9 | **CRÍTICO** | opus | Pedagogical reviewer; explains *why* (idioms, SOLID, patterns, security, debt) |
| 10 | **GALILEU** | opus | Lab + architecture; benchmarks with statistical rigor (N≥10, warmup 500+, median/mean/min/CV% — blocks if CV≥20%); ADRs in MADR |
| 11 | **ATENA** | opus | Metrics panel; Quality Gate over new code + learning curve + Dreyfus×Bloom + `ai_dependency_index`; forbidden from using DORA as skill proxy |
| 12 | **MNEMOSYNE** | opus | 3-layer memory: intra-agent state, handoff files, persistent whiteboard/notepad; curated core small, Skills versioned |
| 13 | **OUROBOROS** | — | Continuous self-improvement: plan→act→reflect→critique→revise; stumbles → pitfalls, wins → Skills |
| 14 | **SÊNECA** | opus | Human-in-the-loop governance (auto-escala); full autonomy on reversible/low-risk actions; PAUSE-checkpoint-resume with 24h SLA on consequential decisions |

**Sources:** `engines/minimaxDojo/README.md`, `docs/handbook/05_engine_minimaxDojo.md`, `engines/codexDojo/ecosystem/MANIFEST.md`, `docs/handbook/01_architecture.md`.

### 8.5 Shared seams (`engines/codexDojo/ecosystem/MANIFEST.md`)

The manifest enumerates deep architectural seams: **PhaseRunner**, **Socratic guardrail**, **Learner snapshot**, **OS mission catalog+host**, **OS engagement+recommendation**, **OS contextual mentor**, **OS evidence verification**, **OS activation analytics**, **Engine adapter registry**, **Learner substrate**, **Learning gate**, **Teaching evidence**, **Generated catalog+dashboard data**, **Linux Lab bridge**, **Recoverable Voxel projection kit**, **Arena decision gate**, **Threshold seam**, etc. Each concentrates behavior behind a tiny interface [`engines/codexDojo/ecosystem/MANIFEST.md`].

---

## 9. Known Gaps and Pending Decisions

These are explicitly acknowledged in the sources, not inferred:

- **No-code gate persistence pending.** V2 schema cannot yet persist or validate the ADR-0004 no-code checklist branch; Level 0 local `completed` cannot be promoted to `mastered` today [`docs/handbook/01_architecture.md`, `docs/handbook/08_learner_substrate.md`, `docs/VISION.md`].
- **Polyglot certification is Node-only** for projects 01–02 despite the polyglot intent; Go/Rust for 02 are unverified backfill [`curriculum/catalog.md`].
- **Teaching-game vs curriculum counting:** voxelDojo reports 16 spatial games + 2 rules-shaped concepts in pixel-quest; only `game-10-hash-ring` and `pixel-quest` have full specs in `PLAN.md` style — the rest are seeds/prototypes [`engines/voxelDojo/README.md`, `engines/pixelDojo/README.md`].
- **Public deployment:** LiteracyDojo's Netlify URL is verified; the unified mission-first host, miniTown, and the broad programming catalog do not yet have an official public URL [`docs/VISION.md`].
- **Multi-learner:** `python3 -m learner.new_instance` replicates a filesystem instance; this is not a multi-tenant service, and IndexedDB progress does not sync to the canonical gate [`docs/VISION.md`].

**Sources:** `docs/VISION.md`, `curriculum/catalog.md`, `docs/handbook/08_learner_substrate.md`.

---

## 10. Where to Look (canonical map)

| Task | Start at | Notes |
|---|---|---|
| Repo-wide orientation | `docs/handbook/README.md` | Read this first — architecture, onboarding, per-engine refs, substrate, glossary |
| Architecture + data flow | `docs/handbook/01_architecture.md` | Layered view + two loops + evidence lifecycle |
| Onboarding / commands | `docs/handbook/02_onboarding.md` | Setup, day-to-day workflow, per-engine validate commands |
| CodexDojo dashboard | `docs/handbook/03_engine_codexDojo.md` | Vite/TS SPA; reducer-driven loop |
| codexDojo OS | `docs/handbook/03b_engine_codexdojo-os-prototype.md` | Canonical mission-first host; read-only projection |
| PixelDojo | `docs/handbook/04_engine_pixelDojo.md` | 8-bit games + evidence contract |
| MinimaxDojo core | `docs/handbook/05_engine_minimaxDojo.md` | 14-agent spec, state machine, gates |
| Evolution engine motor | `docs/handbook/06_engine_miniMaxEvolutionEngine.md` | Claude Code 5-phase loop + supervisor |
| Curriculum details | `docs/handbook/07_curriculum.md` | Catalog, per-project layout, example project 01 |
| Learner substrate | `docs/handbook/08_learner_substrate.md` | Schema, read/write contract, FSRS, streak, CURR |
| Glossary | `docs/handbook/09_glossary.md` | Portuguese agent names, state values |
| VoxelDojo | `docs/handbook/10_engine_voxelDojo.md` | 3D sims + HASH RING pilot |
| MiniTown | `docs/handbook/11_engine_miniTown.md` | Cozy Level 0 exploration |
| LiteracyDojo | `docs/handbook/12_engine_literacyDojo.md` | Local-first microlearning |
| Ecosystem invariants / where-not-to-look | `AGENTS.md` | Conventions, anti-patterns, build commands, tooling roots |
| Requirement coverage | `engines/codexDojo/ecosystem/MANIFEST.md` | Every deliverable mapped to concrete files |
| Shared teaching-game contract | `docs/design/teaching-game-contract.md` | Wins on conflict with engine docs |
| Micro-lesson contract | `docs/design/micro-lesson-contract.md` | Cross-surface pedagogical lifecycle |
| Product vision | `docs/VISION.md` | Dual-audience intention (not operational proof) |
| Robustness principles | `docs/FUNDAMENTOS.md` | 8 fundamentals + AI communication protocol |
| Original goal | `docs/PROMPTS/-01_GOAL.md` | Seed prompt the vision evolved from |

---

## 11. Source Index

Every file read to produce this note (authoritative docs as requested, plus the canonical state file for the live example):

- `docs/handbook/README.md`
- `docs/FUNDAMENTOS.md`
- `docs/PROMPTS/-01_GOAL.md`
- `AGENTS.md`
- `learner/substrate/__init__.py`
- `learner/substrate/interface.md`
- `learner/learning_state.yaml`
- `curriculum/catalog.md`
- `docs/handbook/01_architecture.md`
- `docs/handbook/03_engine_codexDojo.md`
- `docs/handbook/05_engine_minimaxDojo.md`
- `docs/handbook/06_engine_miniMaxEvolutionEngine.md` (via handbook README reference)
- `docs/handbook/07_curriculum.md`
- `docs/handbook/08_learner_substrate.md`
- `docs/handbook/12_engine_literacyDojo.md` (indirect via README)
- `docs/VISION.md`
- `docs/design/micro-lesson-contract.md`
- `engines/codexDojo/ecosystem/MANIFEST.md`
- `engines/codexDojo/README.md`
- `engines/codexdojo-os-prototype/README.md`
- `engines/literacyDojo/README.md`
- `engines/miniTown/README.md`
- `engines/pixelDojo/README.md`
- `engines/voxelDojo/README.md`
- `engines/minimaxDojo/README.md`
- `engines/miniMaxEvolutionEngine/README.md`
- `engines/openclaw/README.md`

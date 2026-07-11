# Domain Analysis — AI DevSchool Ecosystem

Strategic DDD analysis (subdomains + bounded contexts) of the whole `aidevschool` ecosystem: six
engines (`codexDojo`, `pixelDojo`, `voxelDojo`, `minimaxDojo`, `miniMaxEvolutionEngine`, `openclaw`)
sitting on a shared `curriculum/` + `learner/` substrate. This complements the existing
[`docs/handbook/01_architecture.md`](handbook/01_architecture.md) (layered/data-flow view) and
[`09_glossary.md`](handbook/09_glossary.md) (term reference) with a subdomain classification,
cohesion assessment, and bounded-context map — the strategic-design layer those docs don't cover.

Method: read each engine's own docs/source, cross-checked against root `CLAUDE.md`, the handbook,
and `docs/design/teaching-game-contract.md`; verified file-existence claims directly rather than
trusting inventory summaries alone (see Validation, end of doc).

---

## Domain Map

### Domain: Learner Journey & Mastery

**Type**: Core Domain

**Ubiquitous Language**: learner, active unit, learning gate, empirical gate, producer ≠ verifier,
executable evidence, attempt, diagnostic, verdict, rating (FSRS), streak / freeze, Dreyfus × Bloom,
pitfall, journal / generalization, AIDI.

**Business Capability**: Prove — with executable evidence, not model output — that a learner
actually mastered a concept, while preserving productive struggle. This is the thing AI DevSchool
sells that a plain AI coding assistant cannot: certainty of completion never lives in the LLM.

**Key Concepts**:
- Learner (Entity) — level, active language, weekly budget, goal
- Active Unit (Entity) — id, project, retry_count/limit, diagnostic file, attempt file, evidence file
- Learning State Machine (state machine) — `presenting → practicing → evaluating → mastered`
  (+ `FALHA_BLOQUEIO` escalation after 3 retries)
- Empirical Gate (Value Object) — coverage ≥80%, mutation ≥60%, benchmark CV, green suite, 0 lints
- Attempt / Verdict / Rating (Entities) — FSRS-scheduled review outcomes
- Streak, Pitfall, Journal Entry, Learner Profile (Dreyfus×Bloom matrix)

**Canonical home**: `learner/learning_state.yaml`, `learner_profile.md`, `pitfalls.md`, `journal.md`,
plus `learner/substrate/` (the validator + adapters that regenerate every derived view).

**Suggested Bounded Context**: `LearnerJourneyContext`
- Linguistic boundary: "mastered" means one specific thing everywhere in the repo — verifier PASS +
  review OK, never "the code exists" or "the AI said so."
- Integration: Open Host Service — `learner.substrate` publishes derived views (`.mavis/`,
  `whiteboard/`, `learner.ts`, `reviewSlice.ts`) that every other engine consumes read-only.

**Dependencies**:
- ← `pixelDojo`/`voxelDojo` verifiers append `units_log` (evidence in, gate decision recorded here)
- → `codexDojo`, `minimaxDojo` whiteboard, `pixelDojo`/`voxelDojo` review slices (all read-only)
- ⚠ ← `curriculum/_shared/arena/predictions.py` writes `learner/predictions.yaml` directly (see
  Low Cohesion Report)

**Cohesion Score**: 8/10 as a *concept* (crisp vocabulary, one canonical file); 5/10 as *code*,
because the same state machine is independently implemented twice (see next section and Low
Cohesion Report — this is the single biggest strategic-design tension in the repo).

---

### Domain: Polyglot Project Cycle

**Type**: Supporting Subdomain

**Ubiquitous Language**: phase (`spec-done`/`impl-done`/`review-done`/`benchmark-done`/
`cycle-complete`), producer, verifier, cycle, artifact, blocker, topic (`dojo.*`), Hermes event.

**Business Capability**: Take one curriculum project through a fixed 5-phase build loop (spec →
polyglot implementation in Go/Rust/Node → review → benchmark → optimize), gated by an isolated
verifier at every transition. Necessary and business-specific, but not itself the differentiator —
staged pipelines with a gate are a known pattern; what's specific here is *which* 5 phases and
*which* languages.

**Key Concepts**: Project/Unit-of-work, Cycle, Phase, Artifact (spec.md, `{lang}-impl/`,
code_review.md, benchmark_results.md, evolution_report.md), Producer role, Verifier role, Blocker.

**Canonical home (current)**: `learner/pipeline_status.yaml` (machine phase state),
`learner/pipeline_status.md` (human narrative), and `curriculum/NN_name/` (artifacts).

**Suggested Bounded Context**: `PolyglotProjectCycleContext`
- Linguistic boundary: "phase" here means software-cycle stage — a different state machine from
  "learning gate," even though both use gate/verifier language. The handbook calls this out
  explicitly as "the two loops," which is the right instinct; it's just not enforced in code beyond
  documentation.
- Integration: currently **two independent implementations** of this context —
  `miniMaxEvolutionEngine`'s interactive Claude Code subagents (curator/dev-go/dev-rust/dev-node/
  reviewer/benchmarker/optimizer/verifier) and OpenClaw's explicit file-based checklist runner.
  Unlike the minimaxDojo/
  miniMaxEvolutionEngine split (below), this duplication is **not** documented as intentional —
  `openclaw` doesn't even appear in the handbook's 4-engine architecture table.

**Dependencies**: → `curriculum/` (writes artifacts), → `learner/pipeline_status.yaml` (machine phase state)

**Cohesion Score**: 6/10 — clear vocabulary, but split across two unacknowledged parallel
implementations with no shared config seam between them.

---

### Domain: Tutoring Agent Roster (Ágora Continuum)

**Type**: Core Domain (it's the actor model that *realizes* the two domains above, not a domain
with its own data — classified Core because the pedagogy — Socratic tutoring, Dreyfus×Bloom
diagnosis, spaced repetition — is differentiated, not generic)

**Ubiquitous Language**: Maestro, Sonda, Cartógrafo, Mestre-Conteúdo, Sócrates, Mneme, Prometor,
Crítico, Galileu, Atena, Mnemosyne, Ouroboros, Sêneca, Cronos — 14 named pedagogical roles.

**Business Capability**: Play the roles that produce/verify/tutor/schedule/govern the two loops
above (diagnose level, plan the trail, generate exercises, Socratic-tutor, verify adversarially,
review pedagogically, benchmark, consolidate memory, escalate to a human).

**Key Concepts**: 14 named agents in 5 layers (Leadership, Pedagogy, Quality, Memory, Governance);
each agent maps to specific inputs/outputs/gates.

**Canonical home**: `engines/minimaxDojo/` — the documented **spec/prompt layer + tested Python
core** (`core/state_machine`, `core/gates`, `core/memory`), described in the handbook as the
canonical "protocol."

**Suggested Bounded Context**: `TutoringAgentContext` — but realized on **two platforms** by
explicit design (`docs/handbook/01_architecture.md`, "Why two agent cores?"):
- `minimaxDojo` — spec/prompt layer for the MiniMax Agent Team; Python reference implementation
- `miniMaxEvolutionEngine` — the same 14 roles as `.claude/agents/*.md` Claude Code subagents

This is a legitimate **Shared Kernel across two platforms**, and the handbook already documents the
rationale. The DDD risk is that a Shared Kernel needs active synchronization discipline, and there's
already evidence of drift: a `STATE_MAP_PT` translation table exists specifically to bridge the two
vocabularies; the handbook itself flags a mutation-threshold mismatch (confirmed: `learning_state.yaml`
pins `mutation_min: 0.6`, `minimaxDojo/config/learner.yaml` pins `mutation_score_min: 0.65`); and one
engine's own README claims "17 subagent definitions" against 25 actual files in `.claude/agents/`
(confirmed count). None of these break the architecture, but they're exactly the symptom a Shared
Kernel produces when the sync discipline lapses.

**Dependencies**: → `LearnerJourneyContext`, → `PolyglotProjectCycleContext` (this roster implements
both)

**Cohesion Score**: 7/10 — intentional duplication with a documented rationale, but measurable drift
in three places above pulls it down from what a single-platform implementation would score.

---

### Domain: Curriculum Catalog

**Type**: Supporting Subdomain

**Ubiquitous Language**: catalog entry, slug, level, status, dependencies, concepts, backlog status.

**Business Capability**: Maintain the canonical list of 18 projects/challenges (level, status,
dependencies, required deliverables) that every engine points learners at.

**Key Concepts**: Catalog Entry, Project/Challenge (`curriculum/NN_name/`), Deliverable/Artifact,
Backlog Status.

**Canonical home (current)**: `curriculum/catalog.md` (18-entry canonical identity, metadata, and
status); `curriculum/BACKLOG_STATUS.md` is its generated per-project projection. The original scan found two
separate hand-maintained files, 15,640 and 6,850 bytes respectively).

**Suggested Bounded Context**: `CurriculumCatalogContext`
- Integration: should be an Open Host Service (one generated file, like `learner.ts`) but currently
  is two hand-maintained files with a manual tie-break rule instead of a generation pipeline.

**Dependencies**: → `codexDojo` roadmap view (currently duplicated, not generated — see Low
Cohesion Report), ← `learner/` diagnostic files physically live inside `curriculum/NN/docs/` though
they're learning-gate (Learner Journey) artifacts.

**Cohesion Score**: 5/10 — one business capability, two competing sources of truth for the same
data.

---

### Domain: Teaching Game / Evidence Production

**Type**: Two Core Subdomains sharing infrastructure — `pixelDojo` (2D Arcade) and `voxelDojo`
(3D Spatial Simulation)

**Ubiquitous Language (shared)**: unit, project, attempt, evidence record, gate outcome (`fail` /
`pass_retried` / `pass_first_try`), mastery, review, streak, Prometor (verifier), content pack —
all defined once in `docs/design/teaching-game-contract.md`, which both engines' `AGENTS.md` cite
as canonical ("wins on conflict").

**Ubiquitous Language (pixelDojo-specific)**: encounter, wave, heat/overheat — a rule/budget mental
model (`tokenBucket`, `sequenceFlow`, `taskQueue`, `policyGate`, `routeHealth`).

**Ubiquitous Language (voxelDojo-specific)**: scenario, level, sim/scene, station, ring — a
structure/dynamics mental model (16 games implemented, `game-10-hash-ring` is the pilot).

**Business Capability**: Turn one curriculum concept into a game mechanic a learner plays, and emit
an immutable, typed evidence record when they clear it — genuinely differentiated: this is why the
Learner Journey domain has real "executable evidence" to gate on for game-based units.

**Key Concepts**: Encounter/Scenario, Evidence record (NDJSON envelope: `source`, `unit_id`,
`project`, `ts`, `pass`, `metrics`, `curriculum_context`), Gate outcome.

**Canonical home (current)**: `engines/pixelDojo/pixel-quest/`, `engines/voxelDojo/game-*/`, shared
verifier at `learner/gate/`, and public envelope at `engines/shared/teaching-evidence/`.

**Suggested Bounded Context**: `TeachingGameContext-Pixel` and `TeachingGameContext-Voxel`
- Integration: Shared Kernel via `teaching-game-contract.md` (Published Language) + one shared
  verifier module (Open Host Service) both engines conform to. This is the **healthiest**
  multi-engine relationship in the repo — a deliberate genre split (rules → pixelDojo,
  structures/dynamics → voxelDojo) documented in `voxelDojo/AGENTS.md` itself.
- Resolved naming smell: the shared, source-agnostic verifier now lives at `learner.gate`, making
  equal Pixel/Voxel ownership explicit.

**Dependencies**: → `LearnerJourneyContext` (writes `units_log` via the shared verifier — the only
writer), ← `learner.substrate` (reads back `reviewSlice.ts` scheduling)

**Cohesion Score**: 8/10 for the contract-sharing relationship itself; pulled down to 5/10 overall by
one confirmed duplication artifact: `engines/pixelDojo/games/02_key_value_store` … `18_search_engine`
(17 directories, verified on disk) is a stray tree from a prior merge duplicating `voxelDojo`'s
3D content (e.g. `game-02-warehouse`) under the wrong engine, with its own divergent evidence schema
(`schema: "02_key_value_store-v1"`) — already flagged in the repo's own tech-debt audit.

---

### Domain: Polyglot Comparison Arena

**Type**: Supporting Subdomain (nascent — partially implemented, partially design-stage)

**Ubiquitous Language**: fairness, effort budget, prediction, calibration, arena report.

**Business Capability**: Have the learner predict which of the three language implementations will
win on which metric *before* seeing benchmarks, then compare — a calibration exercise layered on top
of the Polyglot Project Cycle.

**Key Concepts**: Prediction (per-metric, pre-registered), Effort Budget (fairness check that all
three langs got equal implementation effort), Arena Report.

**Canonical home**: `curriculum/_shared/arena/` (`predictions.py`, `gate.py`,
`effort_budget_rubric.md`) — confirmed on disk — plus `docs/design/polyglot-arena/` (design-stage
proposal, demoted from `engines/polyglotEvolutionArena/` per root `CLAUDE.md` history) and
`miniMaxEvolutionEngine`'s `fairness-auditor`/`arena-narrator` subagents.

**Suggested Bounded Context**: `PolyglotArenaContext`
- Integration issue: `curriculum/_shared/arena/predictions.py` writes directly into
  `learner/predictions.yaml` (confirmed on disk, 235 bytes) — a curriculum-owned script mutating a
  learner-owned file outside the `learner.substrate` single-writer convention that governs every
  other cross-boundary write in the repo.

**Dependencies**: → `learner/predictions.yaml` (direct write — ACL violation candidate), →
`PolyglotProjectCycleContext` (arena sits on top of benchmark results)

**Cohesion Score**: 4/10 — real business concept, but its implementation crosses a substrate
boundary the rest of the system is disciplined about.

---

### Domain: Learner-Facing Dashboard

**Type**: Generic Subdomain (a presentation/reporting layer — the pattern "read-only dashboard over
domain state" is not differentiating, even though the state it shows is)

**Ubiquitous Language**: LearnerSnapshot, Agent/UserFacingAgent, CycleStage, DojoProject, Metric,
EcosystemStatus.

**Business Capability**: Give the learner and observers one screen showing current unit/gate,
profile, AIDI, pitfalls, next reviews, streak, the agent roster, the cycle, and the 18-project
roadmap — all read-only.

**Key Concepts**: `LearnerSnapshot` (central read model), `DojoProject` catalog mirror,
`CycleStage` mirror, `Agent` roster mirror.

**Canonical home**: `engines/codexDojo/` — confirmed pure static SPA (Vite/TS), no write paths in
application code (only test files touch the filesystem, to assert existence).

**Suggested Bounded Context**: `LearnerDashboardContext`
- Integration: Conformist consumer of `LearnerJourneyContext` — `src/data/learner.ts` correctly
  carries an `AUTO-GENERATED — DO NOT EDIT BY HAND` header and is regenerated by
  `learner.substrate`.
- Cohesion problem: `src/data/projects.ts`, `agents.ts`, `cycle.ts`, `ecosystem.ts` have **no**
  such header (confirmed on disk alongside `learner.ts` in the same `src/data/` directory) — they
  look hand-maintained inside codexDojo, duplicating `CurriculumCatalogContext` and
  `TutoringAgentContext` state instead of being generated the same way `learner.ts` already is.
- A second, unrelated capability — `linuxApps.ts`, a Linux-desktop skills simulator — lives in the
  same `src/data/` directory with no shared vocabulary or entities with the learner dashboard.

**Dependencies**: ← `LearnerJourneyContext` (generated, healthy); ← `CurriculumCatalogContext`,
`TutoringAgentContext` (hand-copied, unhealthy)

**Cohesion Score**: 6/10 — the core dashboard capability is clean; the un-generated roadmap/agent
data and the bundled Linux Lab pull it down.

---

### Historical Domain Finding: Event Bus / Runner Infrastructure (removed)

**Current resolution**: The consumerless runtime described below was removed. OpenClaw is now an
explicit file-based checklist runner over `learner/pipeline_status.yaml`, with no event bus or daemon.

**Type at scan time**: Generic Subdomain

**Ubiquitous Language**: Hermes bus, topic (`dojo.*`), event, outbox/inbox/log/conflicts, dedup key,
idempotency, producer/verifier (reused from Polyglot Project Cycle).

**Business Capability**: A file-based pub/sub bus with idempotency-by-content-hash — textbook
generic job-runner/event-bus infrastructure, not itself AI-DevSchool-specific.

**Key Concepts**: Event (topic, cycle_id, unit_id, artifact_path, content_hash, payload), Topic,
Conflict/Duplicate classification.

**Historical home**: the removed OpenClaw bus runtime and empty Mavis event directories.

**Suggested Bounded Context**: `EventBusInfraContext`
- Integration: currently **isolated** — no other engine subscribes to `dojo.*` topics, and
  `openclaw` is absent from the handbook's 4-engine architecture table entirely (root `CLAUDE.md`
  lists 6 engines; the architecture handbook documents 4).

**Current dependencies**: → `curriculum/` (checks artifact presence), →
`learner/pipeline_status.yaml` (reads/writes machine phase state).

**Cohesion Score**: 3/10 as an integration layer (well-built internally, but a bounded context with
no consumers is a context in name only); recommend documenting it explicitly as experimental/
incubating rather than a peer engine until something subscribes to it.

---

## Cross-Domain Cohesion Matrix

| Domain A | Domain B | Cohesion | Issue | Recommendation |
| --- | --- | --- | --- | --- |
| Learner Journey | Polyglot Project Cycle | 6/10 ⚠️ | Two distinct state machines both use "phase"/"gate" language; only the handbook's prose keeps them apart | Encode "two loops" in code/prompts (e.g. prefix state names), not just docs |
| Learner Journey (minimaxDojo impl) | Learner Journey (miniMaxEvolutionEngine impl) | 5/10 ⚠️ | Documented-intentional Shared Kernel, but drifting: `STATE_MAP_PT` translation needed, mutation threshold 0.60 vs 0.65 (confirmed in both configs), subagent count doc drift (17 claimed vs 25 files, confirmed) | Pick one numeric seam as canonical (handbook already says `config/learner.yaml` for minimaxDojo, `learning_state.yaml` for the gate) and add a drift check |
| Polyglot Project Cycle (miniMaxEvolutionEngine) | Polyglot Project Cycle (openclaw) | 3/10 ❌ | Same 5-phase vocabulary reimplemented independently; openclaw undocumented as a peer engine | Decide if openclaw supersedes or complements the manual loop; document the decision |
| Curriculum Catalog | Learner Journey | 5/10 ⚠️ | `diagnostic.md` lives inside `curriculum/NN/docs/` but is a learning-gate artifact; arena `predictions.py` writes into `learner/predictions.yaml` directly | Treat both as documented integration points (ACL), or relocate |
| Curriculum Catalog (`catalog.md`) | Curriculum Catalog (`BACKLOG_STATUS.md`) | 4/10 ⚠️ | Two hand-maintained files describing the same 18 projects, tie-broken by convention not generation | Generate `catalog.md` status from `BACKLOG_STATUS.md`, mirroring the `learner.substrate` pattern |
| Curriculum Catalog + Tutoring Agent Roster | Learner Dashboard (codexDojo) | 4/10 ⚠️ | `projects.ts`/`agents.ts`/`cycle.ts` are hand-copied, missing the AUTO-GENERATED header `learner.ts` has | Extend the substrate generator to also emit these three files |
| Teaching Game — pixelDojo | Teaching Game — voxelDojo | 8/10 ✅ | Deliberate Shared Kernel (contract + shared verifier), clean genre split | Healthy — keep the contract as the single amendment point |
| pixelDojo (`games/02-18` stray tree) | voxelDojo (`game-02-warehouse` etc.) | 2/10 ❌ | Confirmed duplicate 3D content under the wrong engine, divergent evidence schema | Delete/migrate (already flagged in the repo's own tech-debt audit) |
| Polyglot Arena | Learner Journey | 3/10 ❌ | `predictions.py` writes `learner/predictions.yaml` directly, bypassing the substrate's single-writer convention | Route through `learner.substrate`, or store predictions under `curriculum/` and sync in |
| Event Bus (openclaw) | Everyone else | 1/10 ❌ | No consumers of `dojo.*` topics; absent from the architecture handbook's engine table | Label explicitly as experimental, or wire real consumers |
| Learner Dashboard (codexDojo) | Linux Lab (inside codexDojo) | 3/10 ❌ | Generic Linux-skills simulator bundled inside the learner-state dashboard; no shared vocabulary | Split into its own module/bounded context |

---

## Low Cohesion Report

The issues and recommendations formerly expanded here are the rows of the Cross-Domain Cohesion
Matrix above — one list, not two. For action detail:

- **Per-pair issues + recommendations**: the matrix above (each ⚠️/❌ row is one issue).
- **Operational plan (concrete paths, move order)**:
  [COMPONENT_DOMAIN_MAP_2026-07-08.md](COMPONENT_DOMAIN_MAP_2026-07-08.md), "Namespace / Path
  Realignment Plan".
- **Leverage-ranked backlog**:
  [MODULAR_DECOMPOSITION_2026-07-08.md](MODULAR_DECOMPOSITION_2026-07-08.md), "Recomendações
  Consolidadas".

---

## Bounded Context Map

### LearnerJourneyContext (Core)

**Contains**: Learner, Active Unit, Learning State Machine, Empirical Gate, Attempt, Streak,
Pitfall, Journal, Profile

**Ubiquitous Language**: mastered = verifier PASS + review OK (never "code exists"); gate =
`implementation_blocked` on `learning_state.yaml`

**Integration**: Open Host Service (`learner.substrate` → `.mavis/`, `whiteboard/`, `learner.ts`,
`reviewSlice.ts`); one write path (the substrate) for canonical state

**Implementation notes**: `learner/` at repo root only, symlinked/referenced by engines, never
duplicated — already the strongest-enforced rule in the repo

### PolyglotProjectCycleContext (Supporting)

**Contains**: Project/Cycle, Phase, Artifact, Producer, Verifier, Blocker

**Ubiquitous Language**: phase ≠ learning-gate state, even though both loops use "gate"/"verifier"

**Integration**: currently two Customer-less parallel implementations (miniMaxEvolutionEngine,
openclaw) — needs an explicit decision, not silent duplication

**Implementation notes**: pick a canonical automation path; document the other as experimental if
kept

### TutoringAgentContext (Core, dual-platform Shared Kernel)

**Contains**: 14-agent roster (Maestro, Sonda, Cartógrafo, Mestre-Conteúdo, Sócrates, Mneme,
Prometor, Crítico, Galileu, Atena, Mnemosyne, Ouroboros, Sêneca, Cronos)

**Ubiquitous Language**: PT names canonical in prompts/dashboard; EN subagent ids in
miniMaxEvolutionEngine (translation table exists: `STATE_MAP_PT`)

**Integration**: Shared Kernel across `minimaxDojo` (spec/prompt + tested Python core) and
`miniMaxEvolutionEngine` (runnable Claude Code subagents) — intentional per the architecture
handbook

**Implementation notes**: needs an automated drift check (numeric thresholds, roster completeness)
given three drift symptoms already found

### CurriculumCatalogContext (Supporting)

**Contains**: Catalog Entry, Project/Challenge, Deliverable, Backlog Status

**Ubiquitous Language**: slug, level, status, dependencies, concepts

**Integration**: should be Open Host Service (one generated file); currently two hand-maintained
files with a manual tie-break rule

**Implementation notes**: apply the same substrate-generation pattern already proven for
`learner.ts`

### TeachingGameContext-Pixel & TeachingGameContext-Voxel (Core, twin contexts)

**Contains**: Encounter/Scenario, Evidence record, Gate outcome — pixelDojo's rule/budget genre vs.
voxelDojo's structure/dynamics genre

**Ubiquitous Language**: shared contract vocabulary (unit, evidence, gate outcome, Prometor) defined
once in `docs/design/teaching-game-contract.md`

**Integration**: Shared Kernel (contract) + Open Host Service (one shared, source-agnostic
verifier) — the healthiest multi-engine relationship in the repo

**Implementation notes**: relocate the verifier out of the `pixelDojo` namespace to remove implied
ownership; delete the stray `pixelDojo/games/02-18` tree

### PolyglotArenaContext (Supporting, nascent)

**Contains**: Prediction, Effort Budget, Arena Report

**Ubiquitous Language**: calibration, fairness, pre-registered prediction

**Integration**: currently an uncontrolled direct write into `LearnerJourneyContext`'s
`predictions.yaml` — needs an Anti-Corruption Layer or a substrate-mediated sync

**Implementation notes**: still partly design-stage (`docs/design/polyglot-arena/`); formalize
before extending further

### LearnerDashboardContext (Generic)

**Contains**: LearnerSnapshot, DojoProject, CycleStage, Agent mirrors — all read-only

**Ubiquitous Language**: matches `LearnerJourneyContext`/`CurriculumCatalogContext`/
`TutoringAgentContext` where those are correctly generated; diverges where they're hand-copied

**Integration**: Conformist to `LearnerJourneyContext` (done right, via `learner.ts`); should be
Conformist to `CurriculumCatalogContext`/`TutoringAgentContext` too (not yet)

**Implementation notes**: extend the generator; split Linux Lab out (see below)

### LinuxLabContext (Generic, proposed split)

**Contains**: LinuxApp, principle/concept/process/command/exercise

**Ubiquitous Language**: no overlap with the learning-gate/mastery vocabulary at all

**Integration**: none needed with the rest of the ecosystem — it's a standalone generic skills
simulator that happens to be bundled inside codexDojo today

**Implementation notes**: candidate to become its own small engine or a clearly separated module

### EventBusInfraContext (Generic, incubating)

**Contains**: Hermes Event, Topic, Conflict/Duplicate

**Ubiquitous Language**: `dojo.*` topics reuse Polyglot Project Cycle vocabulary (phase names) at
the event-envelope level

**Integration**: none yet — no consumers subscribe to these topics

**Implementation notes**: document as experimental in the architecture handbook until it has a real
consumer, or retire it if `PolyglotProjectCycleContext`'s decision (above) doesn't need it

---

## Validation

Claims that could affect action were checked directly against the filesystem rather than trusted
from inventory summaries alone:

- `engines/` top level confirmed to contain all 6 engines (`codexDojo`, `miniMaxEvolutionEngine`,
  `minimaxDojo`, `openclaw`, `pixelDojo`, `voxelDojo`) — confirming `openclaw`/`voxelDojo` are real
  but absent from the handbook's 4-engine table.
- `curriculum/catalog.md` (15,640 bytes) and `curriculum/BACKLOG_STATUS.md` (6,850 bytes) both
  confirmed to exist as separate files.
- `engines/pixelDojo/games/02_key_value_store` through `18_search_engine` (17 directories)
  confirmed on disk, alongside `engines/voxelDojo/game-02-warehouse` and 14 other `game-NN-*` dirs —
  confirming the stray-tree duplication independently of the tech-debt audit's prior finding.
- `curriculum/_shared/arena/predictions.py` and `learner/predictions.yaml` (235 bytes) both
  confirmed to exist, supporting the cross-boundary-write finding.
- `.mavis/hermes/{outbox,inbox,log,conflicts}/` confirmed to exist but effectively empty (3
  directory-listing entries each, i.e. no real event files) — corrected from an initial "absent"
  read to "scaffolded but unpopulated," which better supports the "no consumers yet" finding.
- The historical scan found a Pixel-namespaced verifier; it has since moved to `learner/gate/`.
- `engines/codexDojo/src/data/` confirmed to contain `learner.ts` alongside `agents.ts`,
  `cycle.ts`, `ecosystem.ts`, `projects.ts`, `linuxApps.ts` — supporting the generated-vs-hand-copied
  distinction.
- `engines/miniMaxEvolutionEngine/.claude/agents/*.md` confirmed at 25 files against the README's
  "17 subagent definitions" claim (`grep` on the README, `find` on the directory).
- `engines/minimaxDojo/prompts/per_agent/*.md` confirmed to contain all 14 expected files (an
  initial exploratory pass had suggested 4 were missing — that claim did not hold up under direct
  `ls` and has been removed from this report).
- Mutation-score threshold divergence confirmed directly: `learner/learning_state.yaml` pins
  `mutation_min: 0.6`; `engines/minimaxDojo/config/learner.yaml` pins `mutation_score_min: 0.65`.

This is the one correction worth flagging explicitly: an initial exploratory finding ("4 of 14
prompt files missing") turned out to be wrong once checked directly, and has been removed
throughout. Everything else above was independently confirmed.

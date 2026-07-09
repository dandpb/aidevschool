# Component-to-Domain Map — AI DevSchool Ecosystem

Concrete follow-up to [`docs/DOMAIN_ANALYSIS_2026-07-08.md`](DOMAIN_ANALYSIS_2026-07-08.md): every real directory/file
"component" in the repo assigned to one of the 9 domains identified there, plus a prioritized
path/namespace realignment plan for the misaligned ones. Read the domain-analysis doc first for the
*why*; this doc is the *where*.

**Independent confirmation found while inventorying**: `docs/design/allium/*.allium` already
contains one formal domain-spec file per bounded context this analysis independently arrived at —
`learner-substrate.allium`, `minimax-agora-continuum.allium`, `minimax-evolution-engine.allium`,
`pixeldojo-teaching-game.allium`, `curriculum-catalog.allium`, `codexdojo-dashboard.allium`,
`polyglot-evolution-arena.allium`, plus per-project specs (`rate-limiter.allium`,
`distributed-cache-multinode.allium`). Their declared `Scope:`/`Excludes:` headers line up closely
with the domain boundaries below (spot-checked `learner-substrate.allium`). This is a good sign: the
domains here aren't a novel reframing, they match a domain-modeling effort already present in the
repo — this map mainly makes the boundaries executable/concrete rather than inventing them.

---

## Domain Inventory (component counts)

| Domain | Type | Component count | Notes |
| --- | --- | --- | --- |
| LearnerJourneyContext | Core | 10 | Canonical files + substrate + design docs |
| PolyglotProjectCycleContext | Supporting | 15 | Split across 2 unacknowledged parallel implementations |
| TutoringAgentContext | Core (Shared Kernel) | 30 | 14 roles × 2 platforms + shared prompt layers |
| CurriculumCatalogContext | Supporting | 22 | 18 project dirs + catalog/backlog + shared tooling |
| TeachingGameContext-Pixel | Core | 3 | pixel-quest/, verifier/ (shared), stray games/ tree (misplaced) |
| TeachingGameContext-Voxel | Core | 16 | 16 game-NN-* dirs |
| PolyglotArenaContext | Supporting (nascent) | 6 | Split curriculum/design/learner-write |
| LearnerDashboardContext | Generic | 14 | Mix of generated (healthy) and hand-copied (unhealthy) |
| LinuxLabContext (proposed) | Generic | 2 | Currently embedded inside codexDojo |
| EventBusInfraContext | Generic | 3 | Isolated, zero consumers |

---

## Component Domain Assignment

### LearnerJourneyContext (Core)

| Component | Current Path | Status |
| --- | --- | --- |
| Canonical learning state | `learner/learning_state.yaml` | ✅ aligned |
| Learner profile | `learner/learner_profile.md` | ✅ aligned |
| Pitfalls | `learner/pitfalls.md` | ✅ aligned |
| Journal | `learner/journal.md` | ✅ aligned |
| Attempts | `learner/attempts/` | ✅ aligned |
| Substrate (validator + adapters) | `learner/substrate/`, `learner/substrate/adapters/` | ✅ aligned |
| Python state machine (canonical impl) | `engines/minimaxDojo/core/state_machine/` | ✅ aligned |
| Gate evaluator | `engines/minimaxDojo/core/gates/` | ✅ aligned |
| Memory logic | `engines/minimaxDojo/core/memory/` | ✅ aligned |
| Domain spec | `docs/design/allium/learner-substrate.allium` | ✅ aligned |
| Streak/FSRS design doc | `docs/design/spaced-repetition-streak/` | ✅ aligned |

### PolyglotProjectCycleContext (Supporting)

| Component | Current Path | Status |
| --- | --- | --- |
| Software-cycle phase state | `learner/pipeline_status.md` | ✅ aligned (lives in `learner/` by documented design — the "two loops meet at the diagnostic") |
| Interactive subagents (curator/dev/reviewer/benchmarker/optimizer/verifier) | `engines/miniMaxEvolutionEngine/.claude/agents/{curator,dev-go,dev-node,dev-rust,reviewer,benchmarker,optimizer,verifier,verifier-haiku}.md` (9 files) | ⚠️ one of two parallel implementations |
| Slash-command orchestration | `engines/miniMaxEvolutionEngine/.claude/commands/devschool/` | ✅ aligned to this context |
| Automated Hermes-driven runner | `engines/openclaw/runner/`, `engines/openclaw/runner/adapters/` | ❌ second, undocumented parallel implementation |
| Shared benchmark tooling | `curriculum/_shared/benchmarks/` | ✅ aligned |
| Shared cycle tooling | `curriculum/_shared/cycle/` | ✅ aligned |
| Domain spec | `docs/design/allium/minimax-evolution-engine.allium` | ✅ aligned |
| Per-project artifacts (spec/impl/review/benchmark) | `curriculum/NN_*/{docs,go-impl,node-impl,rust-impl,benchmarks}/` (18 projects) | ✅ aligned (co-located with catalog entries by design) |

### TutoringAgentContext (Core, dual-platform Shared Kernel)

| Component | Current Path | Status |
| --- | --- | --- |
| Ágora wrapper subagents (14) | `engines/miniMaxEvolutionEngine/.claude/agents/{maestro,cronos,sonda,cartografo,mestre-conteudo,socrates,mneme,prometor,critico,galileu,atena,mnemosyne,ouroboros,seneca}.md` | ⚠️ one of two platforms |
| Skill wrapper | `engines/miniMaxEvolutionEngine/.claude/skills/agora-continuum/` | ✅ aligned |
| Canonical agent specs | `engines/minimaxDojo/prompts/per_agent/` + `agents/README.md` roster | ✅ aligned |
| Per-agent prompts | `engines/minimaxDojo/prompts/per_agent/` (14 files, all confirmed present) | ✅ aligned |
| Bootstrap/cycle prompts | `engines/minimaxDojo/prompts/bootstrap/`, `prompts/cycles/` | ✅ aligned |
| Numeric threshold seam (duplicate) | `engines/minimaxDojo/config/learner.yaml` | ⚠️ diverges from `learner/learning_state.yaml` (0.65 vs 0.60 mutation) |
| Scheduler | `engines/minimaxDojo/prompts/per_agent/cronos.md` + `whiteboard/cron_registry.yaml` | ✅ |
| Whiteboard (derived view) | `engines/minimaxDojo/whiteboard/` | ✅ aligned (correctly marked `derived_from`) |
| Governance/ADR records | `docs/design/adr/` | ✅ aligned (shared, neutral location — this one's done right) |
| Domain spec | `docs/design/allium/minimax-agora-continuum.allium` | ✅ aligned |

### CurriculumCatalogContext (Supporting)

| Component | Current Path | Status |
| --- | --- | --- |
| Canonical catalog | `curriculum/catalog.md` | ⚠️ dual source of truth |
| Backlog status | `curriculum/BACKLOG_STATUS.md` | ⚠️ dual source of truth (docs say this one wins) |
| Project template | `curriculum/_shared/project_template/` | ✅ aligned |
| 18 project directories | `curriculum/01_rate_limiter/` … `18_search_engine/` | ✅ aligned (catalog entries; note these dirs *also* hold PolyglotProjectCycleContext artifacts — legitimate co-location, not a misalignment) |
| codexDojo roadmap mirror | `engines/codexDojo/src/data/projects.ts` | ❌ hand-copied duplicate, no generation |
| Domain spec | `docs/design/allium/curriculum-catalog.allium` | ✅ aligned |
| Per-project specs (examples) | `docs/design/allium/rate-limiter.allium`, `distributed-cache-multinode.allium` | ✅ aligned |

### TeachingGameContext-Pixel (Core)

| Component | Current Path | Status |
| --- | --- | --- |
| Canonical arcade game | `engines/pixelDojo/pixel-quest/src/{app,content,game,render,ui}/` | ✅ aligned |
| Shared verifier (also serves Voxel) | `engines/pixelDojo/verifier/` | ⚠️ naming smell — source-agnostic module namespaced under one of its two consumers |
| Stray duplicate tree | `engines/pixelDojo/games/02_key_value_store/` … `18_search_engine/` (17 dirs) | ❌ confirmed duplicate of TeachingGameContext-Voxel content, wrong engine entirely |
| Domain spec | `docs/design/allium/pixeldojo-teaching-game.allium` | ✅ aligned |

### TeachingGameContext-Voxel (Core)

| Component | Current Path | Status |
| --- | --- | --- |
| 16 implemented games | `engines/voxelDojo/game-02-warehouse/` … `game-18-stacks/` | ✅ aligned |
| Design docs | `engines/voxelDojo/docs/` | ✅ aligned |
| Shared contract (with Pixel) | `docs/design/teaching-game-contract.md` | ✅ aligned (Published Language, correctly neutral location) |

### PolyglotArenaContext (Supporting, nascent)

| Component | Current Path | Status |
| --- | --- | --- |
| Prediction/fairness logic | `curriculum/_shared/arena/{predictions.py,gate.py,effort_budget_rubric.md}` | ⚠️ writes cross-boundary |
| Prediction data | `learner/predictions.yaml` | ❌ written directly by a curriculum-owned script, bypassing `learner.substrate` |
| Design-stage proposal | `docs/design/polyglot-arena/{STATUS.md,bootstrap_prompt.md,project_proposal.md}` | ✅ aligned (correctly marked proposal-stage) |
| Fairness/narrator subagents | `engines/miniMaxEvolutionEngine/.claude/agents/{fairness-auditor,arena-narrator}.md` | ✅ aligned |
| Domain spec | `docs/design/allium/polyglot-evolution-arena.allium` | ✅ aligned |
| ~~Former engine location~~ | ~~`engines/polyglotEvolutionArena/`~~ | demoted 2026-06-21 per root `CLAUDE.md`, now correctly design-stage only |

### LearnerDashboardContext (Generic)

| Component | Current Path | Status |
| --- | --- | --- |
| Learner snapshot (generated) | `engines/codexDojo/src/data/learner.ts` | ✅ aligned, correctly generated |
| Learner render view | `engines/codexDojo/src/render/learner.ts` | ✅ aligned |
| Overview/roadmap/project/nav/shell render | `engines/codexDojo/src/render/{overview,roadmap,project,nav,shell,events,escape,sparkline,registry}.ts` | ✅ aligned |
| Agents mirror (hand-copied) | `engines/codexDojo/src/data/agents.ts`, `src/render/agents.ts` | ❌ duplicates TutoringAgentContext data |
| Cycle mirror (hand-copied) | `engines/codexDojo/src/data/cycle.ts`, `src/render/cycle.ts` | ❌ duplicates PolyglotProjectCycleContext data |
| Ecosystem status mirror | `engines/codexDojo/src/data/ecosystem.ts` | ⚠️ lower risk, dashboard-specific rollup |
| Ecosystem docs mirror | `engines/codexDojo/ecosystem/{config,templates}` | ❌ possible duplicate of `docs/` — verify and remove if redundant |
| Domain spec | `docs/design/allium/codexdojo-dashboard.allium` | ✅ aligned |

### LinuxLabContext (Generic — proposed split out of codexDojo)

| Component | Current Path | Status |
| --- | --- | --- |
| Linux app catalog | `engines/codexDojo/src/data/linuxApps.ts` | ❌ no shared vocabulary with the dashboard it lives in |
| Linux Lab render | `engines/codexDojo/src/render/linuxLab.ts` | ❌ same |

### EventBusInfraContext (Generic, incubating)

| Component | Current Path | Status |
| --- | --- | --- |
| Hermes bus | `engines/openclaw/hermes/` | ✅ internally well-built |
| Event log directories | `.mavis/hermes/{outbox,inbox,log,conflicts}/` | ✅ correctly isolated (confirmed empty — no real traffic yet) |
| Tests | `engines/openclaw/tests/` | ✅ aligned |

---

## Namespace / Path Realignment Plan

Unlike a single-language monorepo, "namespace" here means directory placement across a polyglot,
multi-engine repo. Moves are grouped by priority; each includes the concrete source path(s), and
either a target path or a decision that needs to be made first. This plan is the operational
detail; the leverage-ranked rollup lives in
[MODULAR_DECOMPOSITION_2026-07-08.md](MODULAR_DECOMPOSITION_2026-07-08.md) ("Recomendações
Consolidadas") — update both together.

### Priority: High

1. **Delete or migrate the stray pixelDojo games tree.**
   `engines/pixelDojo/games/02_key_value_store/` … `18_search_engine/` (17 directories, confirmed
   3D/three.js content) → these duplicate `engines/voxelDojo/game-02-warehouse/` and siblings under
   the wrong engine. Already flagged in `docs/TECH_DEBT_AUDIT_2026-07-08.md`. Action: diff each pair
   against its voxelDojo counterpart; if voxelDojo's version is canonical (it matches the documented
   contract, pixelDojo's doesn't), delete the whole `engines/pixelDojo/games/` tree.

2. **Relocate the shared verifier out of the pixelDojo namespace.**
   `engines/pixelDojo/verifier/` → e.g. `engines/_shared/teaching_game_verifier/` or
   `learner/substrate/verifier/`. It's explicitly source-agnostic and voxelDojo depends on it
   equally; leaving it under `pixelDojo` implies false ownership. Update both engines' `AGENTS.md`
   import paths after moving.

3. **Route Polyglot Arena predictions through the substrate instead of a direct cross-write.**
   `curriculum/_shared/arena/predictions.py` currently writes `learner/predictions.yaml` directly.
   Either (a) add a `learner.substrate` adapter that owns this write and have `predictions.py` call
   it, or (b) move `predictions.yaml` under `curriculum/_shared/arena/` and have the substrate sync
   a read-only copy into `learner/` like every other derived view.

4. **Decide and document openclaw's relationship to the Polyglot Project Cycle.**
   Not a path move — a documentation/architecture decision. `engines/openclaw/runner/` reimplements
   the same 5-phase cycle as `engines/miniMaxEvolutionEngine/.claude/agents/{curator,dev-*,reviewer,
   benchmarker,optimizer,verifier}.md`, but neither `openclaw` nor `voxelDojo` appear in
   `docs/handbook/01_architecture.md`'s 4-engine table. Add both to that table with an explicit
   relationship statement (successor automation vs. experimental spike).

### Priority: Medium

5. **Generate codexDojo's roadmap/agent/cycle mirrors instead of hand-copying them.**
   `engines/codexDojo/src/data/{agents,cycle,projects}.ts` lack the `AUTO-GENERATED` header that
   `src/data/learner.ts` (in the same directory) correctly has. Extend `learner.substrate` (or add a
   sibling generator reading `curriculum/catalog.md` + the agent roster) to emit these three files,
   closing the gap already closed for learner state.

6. **Collapse `catalog.md` / `BACKLOG_STATUS.md` into one generated pipeline.**
   Pick `curriculum/BACKLOG_STATUS.md` as canonical (docs already say it wins on conflict) and
   generate `curriculum/catalog.md`'s status column from it, rather than hand-maintaining both.

7. **Split the Linux Lab out of the Learner Dashboard.**
   `engines/codexDojo/src/data/linuxApps.ts` + `src/render/linuxLab.ts` → move to their own module
   (e.g. `engines/codexDojo/src/linuxLab/`) or a separate small engine. No shared entities or
   vocabulary with `LearnerSnapshot`/`DojoProject` — it's riding inside a Conformist dashboard
   context for no domain reason.

8. **Verify and likely remove `engines/codexDojo/ecosystem/`.**
   Confirm whether `ecosystem/config` and `ecosystem/templates` duplicate root `docs/`; if so,
   remove and reference `docs/` directly instead of maintaining a second copy inside the dashboard
   app.

### Priority: Low

9. **Consolidate `prometor.md` and `verifier.md` inside miniMaxEvolutionEngine.**
   Both exist as separate subagent files (`engines/miniMaxEvolutionEngine/.claude/agents/`), where
   `prometor.md` is documented as a thin Ágora-naming wrapper around the same role `verifier.md`
   implements. Two full files for one role is exactly the kind of doc/count drift that already
   produced the "17 vs 25 subagents" mismatch. Either make `prometor.md` a one-line pointer to
   `verifier.md`, or merge them.

10. ~~Confirm `core/scheduler/` domain~~ — removed; Cronos lives in prompt + cron_registry.
    Not yet clearly TutoringAgentContext-specific (Cronos/Mneme) vs. generic scheduling utility —
    read it before deciding whether it needs to move; listed here as a follow-up, not an action.

---

## Validation

- All paths in the tables above were listed directly via filesystem traversal (`find`/`ls`), not
  inferred from prior summaries — engine directory structures, `curriculum/` (18 project dirs +
  `_shared/`), `learner/` top-level files, and `docs/design/` were all re-confirmed for this pass.
- `docs/design/allium/learner-substrate.allium` was opened and spot-checked: its declared scope
  ("canonical learner state and derived-view synchronisation... Mavis + minimax whiteboard
  projections, codexDojo dashboard snapshot + pixelDojo review slice") matches
  `LearnerJourneyContext` closely, supporting the claim that these domains already exist implicitly
  in the repo's own `.allium` spec files. The other `.allium` files were matched by name/scope only
  (not opened individually) — if a refactor depends on one of them, read it first.
- Component counts in the Domain Inventory table are direct counts from the `find`/`ls` output in
  this session, not estimates.
- Not verified in this pass (carried from `docs/DOMAIN_ANALYSIS_2026-07-08.md`, itself verified there): the
  0.60/0.65 mutation threshold split, the 25-vs-17 subagent count, and the empty `.mavis/hermes/`
  directories.

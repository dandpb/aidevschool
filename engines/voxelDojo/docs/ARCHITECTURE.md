# voxelDojo — Architecture

Decisions, trade-offs, and integration contracts for the Three.js dojo / 3D teaching-simulation engine.
Audience: anyone (human or agent) about to implement a voxelDojo game.

## Context and goals

The ecosystem principle is *1 learner, 1 curriculum, many engines*. `curriculum/` defines 18 canonical
projects; `learner/` holds verifier-owned mastery state; engines are attempt surfaces. pixelDojo
already proves the teaching-game contract with 8-bit arcade encounters. voxelDojo adds a second game
genre — explorable 3D system simulations — for concepts whose mental model is a **structure or
dynamic** (rings, topologies, flows, quorums) rather than a **rule or budget**.

Goals: (1) make spatial concepts tangible; (2) reuse the proven evidence/verifier contract unchanged;
(3) keep every game cheap to build, test, and verify headlessly. Non-goals: multiplayer, backends,
photorealism, VR (see GAP_ANALYSIS §later), replacing pixelDojo.

## High-level design

```
../../curriculum/catalog.md ──(concept, slug)──▶ PLAN.md ──▶ game-<NN>-<slug>/
                                                              │
                             ┌────────────────────────────────┤
                             │  src/index.ts    headless module exports for agents/tests
                             │  src/sim/        headless deterministic core (pure TS,
                             │                  injected clock/RNG, Vitest-tested)
                             │  src/scene/      Three.js render layer (reads sim state only)
                             │  src/content/    data-only scenario packs (typed, validated)
                             │  src/evidence/   record builder + emitters
                             └───────┬────────────────────────┘
                                     │ window.__voxelDojoEvidence
                                     │ console: EVIDENCE <json>
                                     ▼
                    Playwright smoke captures records + screenshots → .logs/
                                     │
                                     ▼ (separate context — never the game)
                    Verifier (Prometor) validates vs empirical_gate / review policy
                                     ▼
                    ../../learner/learning_state.yaml (units_log, reviews)
                    ../../learner/substrate/ sync → derived projections
```

### Layering rule (the load-bearing decision)

**Sim core is headless; the scene is a projection.** All concept logic lives in `src/sim/` as pure
TypeScript with injected clock and seeded RNG — no `three` imports, no DOM. The Three.js layer
subscribes to sim state and renders it; input handlers dispatch sim commands. Consequences:

- Vitest can prove concept correctness (e.g. the K/N moved-keys bound) without a GPU — this is what
  makes "the game teaches the real concept" an evidenced claim instead of vibes.
- The Playwright smoke only needs to prove wiring (input → sim → evidence), not concept math.
- A future engine (terminal UI, 2D fallback) could reuse the same sim cores.

Trade-off: some duplication of state (sim world vs scene graph) and a sync step per frame. Accepted —
it is the same seam codexDojo uses (`buildInitialState`/`reduceState`) and pixel-quest's encounter
registry approximates.

## Key decisions

| # | Decision | Alternatives rejected | Why |
| --- | --- | --- | --- |
| D1 | Plain `three` + Vite + strict TS | react-three-fiber; Babylon; Unity/Godot export | Matches pixel-quest stack and ecosystem tooling (pnpm/Biome/Vitest/Playwright); no React runtime in a game loop; auditable plain TS |
| D2 | One Vite app per game (`game-<NN>-<slug>/`) | One mega-app with 18 scenes | Games ship and get verified independently; a broken game can't block another; mirrors curriculum project granularity |
| D2a | `src/index.ts` exports headless controller/sim modules only | Exporting `src/main.ts` or scene graph objects as the module API | Agents and tests can reuse the Three.js dojo logic without mounting `#stage`/`#hud` or changing Playwright hooks |
| D3 | Procedural low-poly geometry, ≤8-color flat palette | GLTF asset pipeline, MiniMax-generated models | No 3D-model generation available in-toolchain; procedural assets are diffable source, zero licensing risk, tiny bundles |
| D4 | Data-only scenario packs with typed registry | Packs shipping JS | Same policy as pixel-quest (`content-packs.md`): new mechanics require typed definitions + validator + approved factory — packs stay auditable data |
| D5 | Evidence schema = pixel-quest schema with `source: "voxeldojo"` | New bespoke schema | Verifier and substrate already consume this shape; one ingestion path, two emitters |
| D6 | Deterministic sim (seeded RNG, injected clock) | Frame-time-driven randomness | Replayable attempts; evidence metrics reproducible; Vitest-provable claims |
| D7 | No physics engine, no postprocessing in MVP | cannon-es, EffectComposer bloom | Concepts here need parametric animation, not physics; postprocessing complicates the WebGL-in-CI story (GAP §G6) |
| D8 | InstancedMesh above ~100 animated entities | One mesh per entity | Keeps the 60fps budget honest on integrated GPUs |

## Evidence contract (§Evidence)

One JSON record per cleared scenario/wave, emitted twice (belt and suspenders):
`window.__voxelDojoEvidence.push(record)` and `console.log("EVIDENCE " + JSON.stringify(record))`.

```json
{
  "source": "voxeldojo",
  "unit_id": "U9-distributed-cache",
  "project": "10_distributed_cache",
  "scenario_id": "hash-ring-L2",
  "game": "HASH RING",
  "ts": "2026-07-05T12:00:00.000Z",
  "pass": true,
  "metrics": { "moved_ratio": 0.24, "theoretical_kn": 0.25, "load_skew": 1.3, "arc_prediction_accuracy": 0.9 },
  "review_context": {
    "unit_kind": "concept",
    "scheduled_review": true,
    "review_reason": "due",
    "scheduler_source": "learner-substrate",
    "verifier_required": true
  },
  "curriculum_context": { "concept": "consistent hashing", "mechanic": "orbital hash ring" }
}
```

Rules: `unit_id` and `project` must exist in `learning_state.yaml` / `catalog.md` (read, never invent);
`metrics` are game-specific but must include the quantities the pass/fail judgment used; records are
append-only and immutable once emitted.

### Verifier handoff

The game's responsibility ends at emission. The separate, engine-neutral verifier
(`python3 -m learner.gate`, Prometor role)
reads captured records (Playwright run output in `.logs/`, or the browser-global dump), validates
against `empirical_gate` / review-scheduling policy, and appends gate/review events to `units_log`.
Whether a given attempt is a first-mastery gate or a scheduled review is decided by learner state,
not by the game: as of 2026-07-05 only U0 is honestly mastered, so HASH RING can gate
`U9-distributed-cache` for real when it becomes the active unit. Games read their review slice
from the substrate projections and derive `review_context` from it rather than assuming either mode.

## Integration points

| Surface | Direction | Contract |
| --- | --- | --- |
| `curriculum/catalog.md` | read | Slugs, concepts, per-project scope; the seed map in `README.md` must stay aligned with it |
| `learner/learning_state.yaml` | read-only | Unit ids, gate thresholds, review policy; **games never write** |
| `learner/substrate/` | read | Scheduler projections (which unit is due for review) — same slice pixel-quest renders |
| `engines/codexDojo/ecosystem/MANIFEST.md` | update | Root convention: deliverable-coverage changes must update the manifest in the same change |
| Playwright MCP / `pnpm run smoke` | verify | Playthrough asserting `EVIDENCE` console records; screenshots to `.logs/` |

## Testing strategy

Vitest on `src/sim/` proves concept math (the pedagogical claims). Vitest on `src/content/` validates
packs against the typed schema. Playwright smoke plays one level end-to-end and asserts evidence
emission and console cleanliness. Note the sandbox constraint recorded in project memory: TS
lint/test may need CI or the host machine, with `tsc` as the in-sandbox typecheck fallback.

## Data flow summary

`catalog.md` concept → `PLAN.md` mapping → scenario pack (data) → sim core (deterministic attempt) →
scene (render/input) → evidence record → Playwright capture → verifier → `units_log` review event →
substrate sync → dashboards. Every arrow is file-based and auditable; no step is skippable, and no
producer verifies itself.

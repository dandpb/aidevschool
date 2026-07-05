# VOXELDOJO

## OVERVIEW

`voxelDojo/` is the 3D teaching-simulation engine for `aidevschool`. Each game is a Three.js
simulation for one curriculum concept and emits raw evidence for a separate verifier. The implemented
pilot is `game-10-hash-ring/`.

## STRUCTURE

```text
voxelDojo/
├── AGENTS.md            # this file — engine-level rules
├── CLAUDE.md            # thin pointer for Claude Code contexts
├── README.md            # big idea + 18-project seed map
├── PLAN.md              # game-definition template + HASH RING pilot spec
├── docs/                # ARCHITECTURE.md, GAP_ANALYSIS.md, per-game design notes
├── game-10-hash-ring/   # pilot Vite app for Project 10 consistent hashing
└── game-<NN>-<slug>/    # future one-concept Vite apps
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Define a new game | `PLAN.md` | Fill the template before scaffolding. One game = one concept. |
| Run the pilot | `game-10-hash-ring/` | Vite + strict TypeScript + Three.js + Vitest + Playwright. |
| Pilot sim core | `game-10-hash-ring/src/sim/` | Deterministic consistent-hash-ring logic. |
| Pilot browser proof | `game-10-hash-ring/playwright/hash-ring.spec.ts` | Boots WebGL, clears L1/L2, asserts `EVIDENCE` records. |
| Engine decisions / data flow | `docs/ARCHITECTURE.md` | Rendering, evidence, verifier handoff. |
| What's blocking implementation | `docs/GAP_ANALYSIS.md` | Ecosystem-wide gaps and sequence. |
| Subjects to teach | `../../curriculum/catalog.md` | Canonical 18-project curriculum; slugs must match. |
| Learner gate | `../../learner/learning_state.yaml` | Verifier-owned mastery state. Read-only here. |
| **Cross-engine game contract** | `../../docs/design/teaching-game-contract.md` | Canonical rules for evidence, verifier handoff, packs. Wins on conflict. |
| Evidence record shape | `../pixelDojo/pixel-quest/docs/content-packs.md` | voxelDojo reuses this schema with `"source": "voxeldojo"`. |
| Visual language | `docs/3d-style.md` | Palette, camera, lighting, HUD conventions for every game. |
| Sister-engine conventions | `../pixelDojo/AGENTS.md` | Shared golden rules; genre differs, contract doesn't. |

## CONVENTIONS

- Keep `curriculum/` and `learner/` at the root. Reference them via `../../...`; never copy them here.
- Every game targets exactly one concept from one catalog project; name apps `game-<NN>-<slug>` with
  `<NN>` matching the catalog slug number.
- The game is an attempt surface. It emits **raw evidence only** via `window.__voxelDojoEvidence` and
  `EVIDENCE <json>` console records, then stops. `"source"` is always `"voxeldojo"`.
- The game never writes `mastered`, never appends to `units_log`, never touches
  `../../learner/learning_state.yaml`. The verifier (separate context) owns those transitions.
- The Python substrate (`learner/substrate/`) owns scheduling and review projections; games only
  render what they are given.
- Stack: `pnpm`, Vite, strict TypeScript, plain `three` (no react-three-fiber, no physics engine
  unless a concept demands it), Biome, Vitest, Playwright. Match `../codexDojo` and
  `../pixelDojo/pixel-quest` tooling.
- Simulation logic is deterministic and headless-testable: pure TypeScript modules with injected
  clocks/RNG, unit-tested without WebGL. The Three.js layer only renders state.
- Content is data-only packs (typed scenario definitions, no arbitrary JS), mirroring the
  pixel-quest pack validator pattern.
- Assets are procedural low-poly geometry and flat palettes. No downloaded model packs, no heavy
  GLTF pipelines for the MVP.

## COMMANDS

```bash
cd game-10-hash-ring
pnpm run lint && pnpm run test && pnpm run typecheck && pnpm run build && pnpm run smoke
```

Use `npm` only where `pnpm` is unavailable in Linux verification.

## ANTI-PATTERNS

- Do not let game code write `mastered`, append `units_log`, or edit `learner/learning_state.yaml`.
- Do not claim a mechanic teaches a concept without a browser playthrough plus emitted evidence.
- Do not couple simulation rules to the render loop; if it can't run in Vitest without a GPU, refactor.
- Do not use `localStorage` as learning evidence; filesystem-derived evidence remains canonical.
- Do not add a backend, database, or multiplayer netcode for the single-player teaching loop.
- Do not duplicate pixelDojo subjects gratuitously: pick the engine whose genre fits the concept
  (rules → pixelDojo, structures/dynamics → voxelDojo). Overlap is allowed only when `PLAN.md`
  argues the 3D version teaches something the 2D version cannot.
- Do not treat screenshots, `dist/`, `test-results/`, or `node_modules/` as source.

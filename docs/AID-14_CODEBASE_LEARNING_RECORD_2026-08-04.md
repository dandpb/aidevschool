# AID-14 — Codebase learning record

**Date:** 2026-08-04  
**Scope:** repository architecture, implemented engines, shared learner substrate, curriculum, and verification surfaces  
**Method:** read-only inspection of repository instructions, handbook, engine manifests/READMEs, Python packaging, and representative implementation seams

This is a learning record, not a new architecture contract. When it conflicts with a
canonical contract or current executable result, the canonical source wins. Start at
[`handbook/README.md`](handbook/README.md) and [`DOCUMENTATION.md`](DOCUMENTATION.md).

## Product model learned

AI DevSchool is an ecosystem umbrella rather than one application. The invariant is **one
learner, one curriculum, many engines**:

- `learner/` owns canonical, auditable learner state;
- `curriculum/` owns shared learning units and project evidence;
- `engines/` contains bounded applications, games, tutors, and runners;
- `.mavis/` and TypeScript learner snapshots are derived projections and must not be hand-edited.

The learning gate is structural, not a UI convention: the learner attempts first, a producer
cannot verify its own output, and `mastered` requires independently accepted, gate-appropriate
evidence. Browser-local completion or engagement state is not canonical mastery.

## Implemented runtime map

| Bounded context | Implemented purpose | Main stack / execution model | Authority boundary |
| --- | --- | --- | --- |
| `codexdojo-os-prototype` | Canonical mission-first learner host | React 19, TypeScript, Vite, Vitest, Playwright, Biome | Reads generated learner data; local IndexedDB continuity cannot mark mastery |
| `literacyDojo` | AI microlearning for nontechnical learners | TypeScript/Vite app with canonical YAML content generation and browser E2E | May record local completion; cannot write canonical mastery |
| `miniTown` | Cozy Level 0 exploration surface | Three.js, TypeScript, Vite, Vitest, Playwright | Explore-only and read-only with respect to learner state |
| `codexDojo` | Contributor/product dashboard | Vanilla DOM, TypeScript, Vite, Vitest, Biome | Displays/coordinates product state; separate from tutor core |
| `dojoToday` | Read-only “today's lesson” for programmers | Vanilla DOM, TypeScript, Vite; Python-generated FSRS/streak view | Generated `src/data/today.ts`; does not schedule, evaluate, or master |
| `pixelDojo/pixel-quest` | 2D teaching-game workspace | TypeScript/Vite, Phaser, Vitest, Playwright | Produces evidence envelopes; independent gate owns acceptance |
| `voxelDojo/game-*` | Catalog of 3D teaching simulations | pnpm workspace, Three.js, TypeScript, Vite, Vitest, Playwright | Game evidence is not self-verification; HASH RING is the reference package |
| `minimaxDojo` | 14-agent tutoring core and whiteboard protocol | Python reference core plus prompts/contracts/tests | Numeric thresholds come from `config/learner.yaml`; gate remains independent |
| `miniMaxEvolutionEngine` | Claude Code orchestration motor | File-based agents, commands, skills, hooks, and Python supervisor seams | Orchestrates the cycle; does not weaken evidence requirements |
| `openclaw` | Simulate/grade checklist runner tracer bullet | Python filesystem runner and scheduler | Deterministic phase/checklist orchestration, not semantic verification |
| `shared/teaching-evidence` | Cross-engine evidence helpers | Shared TypeScript package | Producer-side primitives only; no mastery writes |
| `aiDevschoolMvp` | Installable Python MVP/CLI surface | Python package and installer validation tests | Separate packaging surface using shared curriculum concepts |

Two additional roots, `dojoToday/` and `aiDevschoolMvp/`, are present in code but absent from the
top-level engine map in `engines/AGENTS.md`. `zai-duolingo-like/` is also present and must be
classified before being treated as an active engine. These are documentation/classification gaps,
not grounds to infer new product authority.

## Canonical data flow

1. Canonical inputs live in `learner/learning_state.yaml` and shared curriculum files.
2. `learner.substrate.validate` enforces state invariants, including evidence requirements.
3. `learner.substrate.sync` fans canonical state out to `.mavis/`, minimax whiteboards, dashboards,
   the OS learner module, and game review slices.
4. TypeScript engines consume those read models and emit bounded attempts/evidence.
5. An independent verifier/gate accepts or rejects evidence before canonical mastery changes.

FSRS scheduling and streak reconciliation remain in Python (`learner/substrate/scheduling.py`), not
in frontend engines. This prevents each UI from inventing a competing learning model.

## Representative code seams inspected

- `engines/codexDojo/src/app.ts`: dashboard mount and render/event loop.
- `engines/codexDojo/src/state.ts`: pure initial state and reducer seam.
- `engines/pixelDojo/pixel-quest/src/app/PixelQuestApp.ts`: browser game coordinator.
- `engines/voxelDojo/game-10-hash-ring/src/scene/ringScene.ts`: reference Three.js projection.
- `learner/substrate/__init__.py`: canonical validation and projection fan-out.
- `learner/substrate/scheduling.py`: FSRS/streak derivation.
- `engines/openclaw/runner/`: checklist runner and scheduler.
- `engines/miniMaxEvolutionEngine/supervisor/`: supervisor validation/model seams.

## Verification surfaces learned

There is intentionally no repo-wide Node command. Checks run inside the owning engine. The root
Python package (`pyproject.toml`, Python >=3.11) declares PyYAML, FSRS, and pytest and scopes tests
to minimaxDojo, OpenClaw, learner substrate/gate, installer validation, curriculum shared tests,
and AI Literacy content contracts.

The principal engine checks are the scripts declared in each engine's `package.json`: lint, unit
tests, type/build checks, and Playwright smoke/E2E where applicable. Full suites were not run for
this read-only learning issue because no runtime source or canonical state changed.

## Working rules retained

- Never run a root Node install/build as if this were a monorepo application.
- Never hand-edit generated learner projections.
- Never move shared curriculum or learner state into an engine.
- Never conflate local completion, verified evidence, and canonical mastery.
- Never claim release, robustness, parity, or performance without executable evidence.
- For completion-sensitive implementation, keep producer and verifier contexts separate and seek
  independent review.


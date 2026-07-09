# PIXELDOJO

## OVERVIEW

`pixelDojo/` is the teaching-game engine for `aidevschool`. The current runnable app is
`pixel-quest/`: a Vite/TypeScript/Three.js 8-bit RPG that turns curriculum concepts into playable
attempts and emits evidence for a separate verifier.

## STRUCTURE

```text
pixelDojo/                 # pnpm workspace (packageManager pnpm@9.15.9)
├── package.json           # workspace root
├── pnpm-workspace.yaml    # pixel-quest + games/*
├── biome.jsonc / tsconfig.base.json
├── shared/evidence.ts     # dualEmit for all games
├── pixel-quest/           # canonical multi-encounter app
└── games/*                # one Vite app per curriculum project
```

Install once: `cd engines/pixelDojo && pnpm install`.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Run or change the game | `pixel-quest/` | App-local guide lives in `pixel-quest/AGENTS.md`. |
| Game architecture | `pixel-quest/README.md`, `pixel-quest/DESIGN.md` | Current Three.js app, not the older Phaser plan. |
| Content-pack rules | `pixel-quest/docs/content-packs.md` | Declarative curriculum pack contract. |
| Browser smoke contract | `pixel-quest/playwright/pixel-quest.spec.ts` | Plays the game and checks evidence/console behavior. |
| Screenshot evidence | `pixel-quest/shots/` | Generated QA artifacts, not source. |
| Subjects to teach | `../../curriculum/catalog.md` | Canonical 18-project curriculum. |
| Learner gate | `../../learner/learning_state.yaml` | Verifier-owned mastery state. |
| Cross-engine game contract | `../../docs/design/teaching-game-contract.md` | Canonical rules shared with voxelDojo; wins on conflict. |

## CONVENTIONS

- Keep `curriculum/` and `learner/` at the root. Read them via `../../...`; do not copy them here.
- Every game targets exactly one concept.
- The game is an attempt surface. It emits **raw evidence only** through `window.__pixelQuestEvidence` and
  `EVIDENCE <json>` console records, then stops.
- The game never writes `mastered`; the verifier owns that transition.
- The Python substrate owns scheduling and derived review projections; the game only renders them.
- Use `pnpm`, strict TypeScript, Biome, Vitest, Playwright, and plain Three.js. Do not reintroduce
  Phaser guidance unless the app actually migrates.
- New mechanics go through the typed encounter registry in `pixel-quest/src/game/encounters/`.

## COMMANDS

```bash
cd pixel-quest
pnpm run lint
pnpm run test
pnpm run build
pnpm run smoke
```

## ANTI-PATTERNS

- Do not let game code write `mastered`, append `units_log`, or edit `learner/learning_state.yaml`.
- Do not use `localStorage` as learning evidence; filesystem-derived evidence remains canonical.
- Do not add a backend or database for the single-player teaching loop.
- Do not claim a mechanic teaches a concept without a browser playthrough plus evidence.
- Do not treat screenshots, `dist`, `test-results`, or `node_modules` as source.

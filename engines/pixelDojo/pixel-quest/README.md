# PixelDojo Quest

PixelDojo Quest is a top-down 8-bit teaching RPG for `aidevschool`. It uses Vite, TypeScript, and
plain Three.js with an orthographic camera. The current playable catalog maps all 18 numbered
projects in `../../curriculum/` into PixelDojo labs. Each lab has a mentor, practice panel, duel,
evidence emission, review journal, and gate to the next curriculum module.

The game is an attempt surface. It emits evidence through `window.__pixelQuestEvidence` and logs
`EVIDENCE <json>` to the console. It does not write `learner/learning_state.yaml`, append
`units_log`, or mark mastery. A separate verifier owns that gate.

The current HUD also renders a read-only scheduled-review projection: due review, streak, freeze
count, and verifier-pending state. This is session feedback only; the substrate remains the scheduler
and the verifier remains the mastery owner.

The playable loop exposes all teaching-game phases in the browser: briefing, map, practice, duel,
evidence, review, and gate. The encounter registry now supports a timed classifier (`token_bucket`),
an ordered-flow puzzle (`sequence_flow`), a health-routing puzzle (`route_health`), and an
authorization/isolation puzzle (`policy_gate`). Every curriculum lab supplies its own mechanic name,
resource meter, action labels, signal/trap labels, practice copy, and `curriculum_context` evidence.
Future work can keep adding richer module-specific mechanics through the typed encounter registry.

## Run

```bash
pnpm install
pnpm run dev
```

Open `http://127.0.0.1:5173/`.

## Validate

```bash
pnpm run lint
pnpm run test
pnpm run build
pnpm run smoke
```

## Controls

- Arrow keys or WASD: move
- E, Enter, or Space: interact / confirm
- Z: admit a legit request during the duel
- X: reject an abuse request during the duel
- J: open the journal
- H: open the phase list
- Escape: close panels

## Architecture

- `src/content/`: versioned content-pack schema, generated curriculum catalog, and core pack fixture.
- `src/app/`: browser app controller and input routing.
- `src/game/simulation/`: grid movement, gates, quest progress, and interaction rules.
- `src/game/phases/`: phase vocabulary for the teaching-game loop.
- `src/game/encounters/`: approved encounter registry, token-bucket classifier, sequence-flow puzzle, health-routing puzzle, and policy-gate puzzle.
- `src/game/evidence/`: evidence shape and validation.
- `src/game/review/`: read-only spaced-review and streak projection for the game surface.
- `src/render/`: Three.js render adapter; it is not the source of gameplay truth.
- `src/ui/`: DOM HUD, dialogue, journal, and duel controls.
- `playwright/`: browser smoke test that renders, plays, screenshots, and checks console errors.

## Content Packs

The browser loads `src/content/curriculumPack.ts`, which represents the numbered curriculum modules
as validated content-pack data. `src/content/packs/core/pack.json` remains as a compact fixture for
schema validation. Future packs add regions, units, encounters, assets, and Markdown dialogue
references. Declarative packs cannot execute arbitrary JavaScript; custom mechanics must be added to
the TypeScript encounter registry.

Details live in `docs/content-packs.md`.

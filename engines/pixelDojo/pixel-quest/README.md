# PixelDojo Quest

PixelDojo Quest is a top-down 8-bit teaching RPG for `aidevschool`. It uses Vite, TypeScript, and
plain Three.js with an orthographic camera. The first playable slice teaches the active
`01_rate_limiter` unit through a token-bucket duel with SONDA.

The game is an attempt surface. It emits evidence through `window.__pixelQuestEvidence` and logs
`EVIDENCE <json>` to the console. It does not write `learner/learning_state.yaml`, append
`units_log`, or mark mastery. A separate verifier owns that gate.

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
- Escape: close panels

## Architecture

- `src/content/`: versioned content-pack schema and core pack.
- `src/game/simulation/`: grid movement, gates, quest progress, and interaction rules.
- `src/game/encounters/`: approved encounter registry and token-bucket duel.
- `src/game/evidence/`: evidence shape and validation.
- `src/render/`: Three.js render adapter; it is not the source of gameplay truth.
- `src/ui/`: DOM HUD, dialogue, journal, and duel controls.
- `playwright/`: browser smoke test that renders, plays, screenshots, and checks console errors.

## Content Packs

The MVP ships `src/content/packs/core/pack.json`. Future packs add regions, units, encounters,
assets, and Markdown dialogue references. Declarative packs cannot execute arbitrary JavaScript;
custom mechanics must be added to the TypeScript encounter registry.

Details live in `docs/content-packs.md`.

# PIXEL QUEST

## OVERVIEW

`pixel-quest/` is the canonical PixelDojo game app: Vite, strict TypeScript, plain Three.js, Vitest,
and Playwright. It turns all numbered curriculum projects into playable labs and emits raw evidence;
it never decides mastery.

## STRUCTURE

```text
pixel-quest/
├── src/app/              # PixelQuestApp controller and action routing
├── src/content/          # curriculum pack data, validators, review slice
├── src/game/             # simulation, encounters, evidence, review projection
├── src/render/           # Three.js renderer adapter
├── src/ui/               # HUD labels and DOM panels
├── src/tests/            # Vitest unit/contract tests
├── playwright/           # browser smoke contract
└── shots/                # generated screenshot evidence
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| App runtime hub | `src/app/PixelQuestApp.ts` | Coordinates input, world state, encounters, evidence, HUD. |
| Browser entry | `src/main.ts` | Instantiates `PixelQuestApp`. |
| Action mapping | `src/app/actionRouter.ts` | Keyboard/action command seam. |
| Curriculum pack | `src/content/curriculumPack.ts` | Generated/curated lab content for numbered projects. |
| Pack schema | `src/content/types.ts`, `src/content/packValidator.ts` | Content packs cannot execute arbitrary JS. |
| Encounter mechanics | `src/game/encounters/` | `token_bucket`, `sequence_flow`, `route_health`, `policy_gate`. |
| Evidence contract | `src/game/evidence/` | Validate before publishing evidence. |
| Review projection | `src/game/review/` | Read-only spaced-review state for the UI. |
| Browser proof | `playwright/pixel-quest.spec.ts` | Smoke test plus screenshot/console checks. |

## CODE MAP

| Symbol | Type | Location | Refs | Role |
| --- | --- | --- | --- | --- |
| `PixelQuestApp` | Class | `src/app/PixelQuestApp.ts:37` | 3 | Main app coordinator. |
| `publishEvidence` | Method | `src/app/PixelQuestApp.ts:315` | class-local | Validates and exposes evidence. |
| `WorldRenderer` | Class | `src/render/app/WorldRenderer.ts` | adapter | Draws state; not gameplay truth. |

## CONVENTIONS

- Use `pnpm`; scripts live in `package.json`.
- Keep gameplay truth in simulation/encounter modules, not in `WorldRenderer` or HUD code.
- Add mechanics by extending the typed encounter registry and unit tests in `src/tests/`.
- Evidence goes to `window.__pixelQuestEvidence` and `EVIDENCE <json>` console output only.
- Scheduled-review and streak data are read-only projections from the learner substrate.
- `shots/` and `test-results/` are generated QA artifacts.

## COMMANDS

```bash
pnpm run lint
pnpm run test
pnpm run build
pnpm run smoke
```

## ANTI-PATTERNS

- Do not write `learner/learning_state.yaml`, `.mavis/`, or `units_log` from game code.
- Do not put curriculum rules in renderer/UI text when they belong in content packs or encounters.
- Do not skip the Playwright smoke check for visible behavior changes.
- Do not use broad dependencies for mechanics that fit the existing Three.js/TypeScript runtime.

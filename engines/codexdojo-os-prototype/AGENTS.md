# CODEXDOJO OS

## OVERVIEW

`codexdojo-os-prototype/` is the canonical educational OS experience bounded context. It is a
React/Vite app with a desktop shell, learning rail, and local lab interactions.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Composition and window state | `src/App.tsx` | Keep this as the shallow composition root. |
| App catalog and content | `src/apps/` | App manifests and app-specific views. |
| Desktop chrome | `src/desktop/` | Top bar, dock, window shell. |
| Launcher | `src/launcher/` | Search and app launch behavior. |
| Learning rail | `src/learning/` | Contextual, non-authoritative learning UI. |
| Canonical learner view | `src/data/learner.ts` | Generated; never edit by hand. |
| Visual contract | `DESIGN.md`, `src/styles/` | Preserve tokens, accessibility, and responsive behavior. |

## CONVENTIONS

- Use npm and the engine-local `package-lock.json`.
- Canonical learner truth lives at `../../learner/learning_state.yaml`; regenerate this engine's
  read-only projection with `python3 -m learner.substrate` from the repo root.
- Local window, catalog, terminal, mission, and mentor state is demonstrative. It cannot mark a
  unit mastered or write canonical learner state.
- Add behavior coverage before changing user-visible interactions. Keep the composition root
  shallow and move app-specific behavior into its owning feature directory.

## COMMANDS

```bash
npm run dev
npm run lint
npm run test
npm run build
npm run test:smoke
```

## ANTI-PATTERNS

- Do not import generated data from `../codexDojo/`; both engines receive their own projection from
  the substrate.
- Do not add a second learner store, persist fake XP as canonical progress, or self-verify mastery.
- Do not hand-edit `src/data/learner.ts`.

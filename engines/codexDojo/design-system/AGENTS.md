# CODEXDOJO DESIGN SYSTEM

## OVERVIEW

`design-system/` is a standalone React 19 package that wraps codexDojo's existing CSS vocabulary
for reuse. It is not the vanilla TypeScript dashboard runtime.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Public API | `src/index.ts` | Keep component and prop-type exports synchronized. |
| Components | `src/components/` | Thin React wrappers over native elements and dashboard classes. |
| CSS additions | `src/ds.css` | Additions only; the consuming app supplies the base dashboard styles. |
| Package contract | `package.json`, `tsconfig.json` | React is a peer dependency; build output lands in `dist/`. |
| Smoke contract | `scripts/smoke.mjs` | Imports the built package and checks the public surface. |

## CONVENTIONS

- Use `pnpm` and the package-local lockfile.
- Preserve the dashboard's established class names; wrappers should not create a competing visual
  vocabulary.
- Forward appropriate native element props and keep accessible HTML semantics.
- Export every public component and its prop type through `src/index.ts`.
- Treat `dist/` as generated output; edit `src/` and rebuild.

## COMMANDS

```bash
pnpm run build
pnpm run smoke
```

## ANTI-PATTERNS

- Do not import app state, learner state, or dashboard render modules into this package.
- Do not replace the base stylesheet from `src/ds.css`.
- Do not hand-edit `dist/` or publish an unexported component as public API.

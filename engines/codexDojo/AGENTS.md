# CODEXDOJO

## OVERVIEW

`codexDojo/` is the user-facing Vite/TypeScript dashboard and the product-facing ecosystem
contract for OpenClaw/Hermes/Codex use.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| App shell and state | `src/app.ts`, `src/state.ts`, `src/main.ts` | Runtime entry surface. |
| Views | `src/render/` | Keep render modules small and route/view-specific. |
| Static domain data | `src/data/` | Agents, cycle, projects. |
| Shared types | `src/domain.ts` | Prefer explicit domain types over loose object shapes. |
| Product contract | `ecosystem/MANIFEST.md` | Must map deliverables to concrete files. |
| Runbook | `ecosystem/OPENCLAW_HERMES_RUNBOOK.md` | Continuous operation flow. |

## CONVENTIONS

- Use `pnpm`, not `npm`, for this app.
- TypeScript is strict; preserve the `tsconfig.json` settings.
- Biome is the formatter/linter. Current local rules reject explicit `any`, non-null assertions,
  unused imports/vars, and missing type-only imports.
- The app has no runtime dependencies at the moment; do not add dependencies for simple rendering.
- Screenshots in this directory are evidence artifacts; do not treat them as source.
- When changing ecosystem docs, prompts, gates, memory, roadmap, or deliverable coverage, update
  `ecosystem/MANIFEST.md` in the same change.

## COMMANDS

```bash
pnpm run dev
pnpm run lint
pnpm run test
pnpm run build
```

## ANTI-PATTERNS

- Do not duplicate tutor-core content from `../minimaxDojo/`; link or summarize with pointers.
- Do not claim dashboard completion without running lint, tests, build, and checking the visible app.
- Do not move learner state into this app; read it from the shared root substrate.

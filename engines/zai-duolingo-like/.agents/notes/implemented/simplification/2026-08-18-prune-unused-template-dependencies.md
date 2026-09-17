# Agent Note: Prune unused template dependencies from package.json

Status: implemented

> Shipped 2026-08-18. All 15 zero-importer dependencies plus the catalog-only set from the shadcn note removed; `package.json` went from ~80 entries to 20. `bun-types` kept at the root (option 1: root `tsconfig.json` still type-checks `mini-services/**` via `**/*.ts`; a `/// <reference types="bun-types" />` was added to the mini-service). `vitest` was added as the test runner for the new suite. `package-lock.json` is now tracked for Windows/npm dev; `bun.lock` is intentionally untouched and should be resynced with `bun install` inside the sandbox. Residual: 3 `npm audit` highs in the prisma CLI chain (`deepmerge-ts` ← `@prisma/config` ← `prisma`), dev-time only, fixable only by a prisma 7 major upgrade — accepted.

## Problem

The root `package.json` still carries the z.ai sandbox template's full dependency set, but the app ("Vertical Protocol") uses only a fraction of it. A full import audit (every dependency grepped for `from '<pkg>'` / `require('<pkg>'` across `src/`, `mini-services/`, `examples/`, `prisma/`, plus all config files) finds these dependencies with **zero importers anywhere**:

| Dependency | Evidence |
|---|---|
| `next-auth` | zero importers; the app is single-device with no auth (see `prisma/schema.prisma` comment "no external auth") |
| `@tanstack/react-query` | zero importers; data fetching is raw `fetch` in `src/components/game/store.ts` |
| `@tanstack/react-table` | zero importers |
| `@mdxeditor/editor` | zero importers |
| `react-syntax-highlighter` | zero importers |
| `@reactuses/core` | zero importers |
| `@hookform/resolvers` | zero importers |
| `next-intl` | zero importers; PT-BR copy is hardcoded per the product brief |
| `react-markdown` | zero importers |
| `date-fns` | zero importers |
| `zod` | zero importers; API routes parse JSON without schema validation |
| `uuid` | zero importers; Prisma uses `@default(cuid())` |
| `tailwindcss-animate` | zero importers; superseded by `tw-animate-css` (`src/app/globals.css:2`) |
| `sharp` | zero importers and no `next/image` usage anywhere in `src/` (grep `next/image`: no matches), so Next's optional image-optimization binary is never exercised |

Two more are misplaced rather than unused:

- `z-ai-web-dev-sdk` — imported only by the playground mini-service (`mini-services/playground/index.ts`), which already declares it in its own `mini-services/playground/package.json` with its own `bun.lock`. The root copy is a duplicate.
- `bun-types` — only relevant to `mini-services/`/`examples/` (`Bun` global); the root `tsconfig.json` includes `**/*.ts`, so it currently types those files from the root.

## Proposal

- Remove from root `package.json`: `next-auth`, `@tanstack/react-query`, `@tanstack/react-table`, `@mdxeditor/editor`, `react-syntax-highlighter`, `@reactuses/core`, `@hookform/resolvers`, `next-intl`, `react-markdown`, `date-fns`, `zod`, `uuid`, `tailwindcss-animate`, `sharp`, `z-ai-web-dev-sdk`.
- Either keep `bun-types` at the root (while root `tsconfig.json` type-checks `mini-services/**` via `**/*.ts`), or move it into `mini-services/playground/package.json` and exclude `mini-services/`/`examples/` from the root tsconfig. The first option is one line; the second is cleaner boundaries — pick one, don't carry both copies.
- Regenerate the lockfile (`package-lock.json` / `bun.lock`) and verify `npm run lint` and `next build` pass.

## Why not keep it?

Unused dependencies are not free: they inflate install time and lockfile churn, they show up in `npm audit` results, and — worse in an agent-maintained repo — they invite future code to reach for a library (react-query, zod, next-auth) ad hoc, producing two ways of doing the same thing alongside the established raw-fetch / cuid / no-auth patterns. Removing them makes the actually-used stack legible. The risk is low: every removal is backed by a zero-importer grep, and anything genuinely needed later is one `npm install` away.

## Acceptance criteria

- `package.json` dependencies shrink by 15 entries (plus the `bun-types` decision); lockfile regenerated.
- `grep -r "<pkg>" src/ mini-services/ examples/ prisma/` still returns nothing for each removed package.
- `npm run lint` passes; `next build` passes; the app boots and the playground mini-service still runs (`bun run mini-services/playground/index.ts`) using its own manifest.

## Risks

- **`sharp`**: Next.js warns about missing sharp in standalone production builds for image optimization, but with zero `next/image` usage it is never invoked; if `next/image` is adopted later, reinstall sharp then.
- **Lockfile-only churn**: the repo has both `package-lock.json` and `bun.lock`; regenerate both or delete one (see the support-surface audit).
- **Future template upgrades**: none — the template is a one-time scaffold, not an upgradable base.

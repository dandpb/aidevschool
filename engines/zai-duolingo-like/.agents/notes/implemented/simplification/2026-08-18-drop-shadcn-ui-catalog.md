# Agent Note: Drop the unused shadcn/ui component catalog

Status: implemented

> Shipped 2026-08-18. As proposed: `src/components/ui/` (48 files), `src/hooks/` (2 files), `src/lib/utils.ts`, and `components.json` deleted; the never-fired `<Toaster />` unmounted from `src/app/layout.tsx`; all catalog-only dependencies removed in the same `package.json` rewrite as the dependency-prune note. Verified: zero dangling imports (grep + `tsc --noEmit`), lint green, `next build` green.

## Problem

The repo carries the full shadcn/ui starter catalog — 48 components in `src/components/ui/*.tsx` plus both hooks in `src/hooks/` — installed by the sandbox template, but the production UI (`src/app/page.tsx`, `src/components/game/**`) is built entirely from custom components styled with `globals.css` utilities (`glass-panel`, neon text/border classes, framer-motion). Consumer evidence:

- The only import of `@/components/ui/*` anywhere outside `src/components/ui/` itself is `src/app/layout.tsx:4` (`Toaster` from `@/components/ui/toaster`), and that toast stack is **mounted but never fired**: `toast()` and `useToast()` have zero call sites outside `src/hooks/use-toast.ts` and `src/components/ui/toaster.tsx` (grep for `toast(` and `useToast` across `src/`). The app's actual notifications are custom components (`AchievementToasts`, `FreezeToast`, `LeagueResetToast`, `StreakMilestoneOverlay`) driven by the Zustand store.
- `src/components/game/**` has zero imports of `@/components/ui/*` and does not even use `cn()` (grep for `@/lib/utils|cn\(` in `src/components/game`: no matches).
- `src/lib/utils.ts` (`cn`) is consumed exclusively by the dead catalog (45 importers, all inside `src/components/ui/`).
- `src/hooks/use-mobile.ts` is imported only by the unused `sidebar.tsx`; `src/hooks/use-toast.ts` only by `toaster.tsx`.
- Intra-catalog chains (`sidebar` → button/input/separator/sheet/skeleton/tooltip, `command` → dialog, `toggle-group` → toggle, `form` → label, `alert-dialog`/`calendar`/`carousel`/`pagination` → button) are all rooted in components with no production consumer.

The catalog also holds a large share of `package.json` hostage. A full import audit (every dependency grepped against `src/`, `mini-services/`, `examples/`, `prisma/`, and config files) confirms these are imported **only** through `src/components/ui/` or its exclusive support files, and die with the catalog:

- All 33 `@radix-ui/*` packages (accordion, alert-dialog, aspect-ratio, avatar, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, label, menubar, navigation-menu, popover, progress, radio-group, scroll-area, select, separator, slider, slot, switch, tabs, toast, toggle, toggle-group, tooltip) — `react-toast` is reachable only via the never-fired `Toaster` mount, which this proposal also removes.
- Catalog-only wrappers: `sonner` and `next-themes` (both only via the unused `sonner.tsx`), `cmdk` (command), `vaul` (drawer), `embla-carousel-react` (carousel), `react-day-picker` (calendar), `input-otp` (input-otp), `recharts` (chart), `react-resizable-panels` (resizable), `react-hook-form` (form).
- Styling support used only by catalog files: `class-variance-authority`, `clsx`, `tailwind-merge` (the latter two only via the deleted `src/lib/utils.ts`).

## Proposal

Delete the entire catalog and its exclusive support files:

- `src/components/ui/` — all 48 files.
- `src/hooks/use-mobile.ts` and `src/hooks/use-toast.ts`.
- `src/lib/utils.ts` (only consumer was the catalog).
- Remove `<Toaster />` and its import from `src/app/layout.tsx`.
- Remove the catalog-only dependencies from `package.json` (all `@radix-ui/*`, `sonner`, `cmdk`, `vaul`, `embla-carousel-react`, `react-day-picker`, `input-otp`, `recharts`, `react-resizable-panels`, `class-variance-authority`, `clsx`, `tailwind-merge` — subject to the import audit confirming no other importer).
- Keep `components.json` only if future shadcn installs are planned; otherwise delete it too (its `utils` alias points at the deleted `@/lib/utils`).

## Why not keep it?

The honest counterargument is optionality: shadcn is the template's sanctioned way to add UI fast, and deleting the catalog means the next form or dialog is hand-rolled or re-installed (`npx shadcn add dialog` restores any single component on demand). That optionality costs ~50 files, ~30 dependencies, and a second, divergent styling system (radix + cva + tailwind-merge) sitting next to the game's custom neon utility system — a standing invitation to build the same surface two ways. Re-installing individual components on demand keeps the option without the permanent surface.

## Acceptance criteria

- `src/components/ui/`, `src/hooks/`, and `src/lib/utils.ts` no longer exist; `grep -r "components/ui" src/` returns nothing.
- `src/app/layout.tsx` renders no `Toaster`.
- `package.json` contains no catalog-only dependencies; `npm install` (or `bun install`) succeeds and the lockfile shrinks accordingly.
- `npm run lint` and `next build` pass; the app boots and all views (home, path, lesson, leaderboard, profile, playground, achievements, shop) render unchanged.

## Risks

- **Future UI work slows down slightly** until components are re-added individually; mitigated by shadcn's per-component install.
- **A dynamic import or string-referenced path could be missed**; mitigated by grep over the whole repo (not just `src/`) before deleting, and by a production build + manual smoke of every view.
- **`components.json` tooling** (the shadcn CLI) would need re-setup if the file is removed; keeping it is a one-file concession if preferred.

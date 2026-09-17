# Agent Note: Single pure source for lesson unlock rules

Status: implemented

> Shipped 2026-08-19. `src/lib/lesson-unlock.ts` owns the unlock rules (`isModuleUnlocked`, `isLessonUnlocked`) as pure functions over structural `{ lessons: { id }[] }` shapes. Both prior copies — `/api/curriculum` (the canonical overlay) and `daily-challenge.ts` (a filter labelled "replicate unlock logic") — now call it. Extracted test-first: `tests/unit/lesson-unlock.test.ts` written before the module existed (11 tests), then the integration refactors with the existing curriculum and daily-challenge suites as characterization. Full suite 123/123.

## Problem

The rules ("module 0 always open; module i needs ALL of module i-1; lesson j needs lesson j-1") lived twice, and the second copy announced its own drift risk in a comment. Any rule change (e.g. module-level stars gating) would have needed two synchronized edits, with no shared test pinning the semantics.

## Consequences

- One tested source of truth; the daily-challenge filter lost ~10 lines of replicated branching.
- The functions take Prisma rows directly (structural typing), so no adapter layer was needed at either call site.
- Client-side unlock display still derives from the `/api/curriculum` flags — unchanged; if a third consumer appears, it imports the same module.

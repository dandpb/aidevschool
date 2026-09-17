# Agent Note: Lesson-attempt pipeline writes only use the injected clock

Status: implemented

> Shipped 2026-08-19. `src/lib/lesson-completion.ts` documented the invariant "the clock lives at the seam: one timestamp drives the whole pipeline" but wrote `lastTouch`, `lastPlayed` and `completedAt` with wall-clock `new Date()` while the rest of the pipeline honored `opts.now`. Replaced all five call sites with `new Date(now)`. Pinned by `tests/unit/lesson-completion-clock.test.ts`, which failed before the fix (red) and passes after (green); full suite 123/123.

## Problem

The pipeline accepts an injected clock precisely so tests can pin time; any wall-clock write inside it silently defeats that seam. A test passing `now: T` observed `progress.lastPlayed` land ~30 minutes off T — the exact gap between the injected clock and the wall clock. Beyond test honesty, a replayed or backfilled attempt (opts.now in the past) would have stamped future-looking streak touches.

## Consequences

- Every timestamp written during an attempt now equals `opts.now`; the invariant comment at the top of the module is no longer aspirational.
- The HTTP routes still call the pipeline without `opts.now`, so production behavior is unchanged (now defaults to Date.now()).

# Agent Note: Lesson-completion pipeline as a deep module

Status: implemented

> Shipped 2026-08-18. `src/lib/lesson-completion.ts` owns the entire attempt pipeline — heart regen + gating, grading, progress upsert, XP/gem rewards, streak touch with freeze consumption, activity log, achievement sync, daily-challenge check — inside one Prisma interactive transaction. `mode: "complete" | "practice"` parameterizes the reward rules; both routes (`complete`, `practice`) are thin adapters mapping the result to HTTP. Supporting change: `getCurrentLearner`, `syncAchievements`, and `completeDailyChallenge` accept an optional `DbClient` (`Prisma.TransactionClient`) so they join the caller's transaction. Pinned by the pre-existing `tests/api/lesson-complete.test.ts` and `tests/api/practice.test.ts`, unchanged and green.

## Problem

"What happens when a lesson completes" was ~150 lines of imperative sequencing inside the complete route, partially re-sequenced by the practice route with different reward rules, and no atomicity anywhere — a failure mid-pipeline left half-awarded state (progress saved but XP not, streak touched but activity not logged). The deletion test confirmed the extraction earns its keep: deleting it would push the pipeline back into N routes.

## Consequences

- The practice route's `newAchievements` now carries full toast payloads ({slug,title,emoji,gemReward,xpReward}) like the complete route — previously it returned bare slugs that the store pushed into a toast queue expecting objects (latent bug, practice toasts rendered undefined fields).
- Transaction timeout: Prisma interactive transactions default to 5s; the pipeline is milliseconds on local SQLite. If the pipeline ever calls a remote service, that stage must leave the transaction.

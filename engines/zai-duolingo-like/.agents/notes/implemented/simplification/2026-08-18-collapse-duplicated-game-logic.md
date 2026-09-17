# Agent Note: Collapse duplicated game logic into shared modules

Status: implemented

> Shipped 2026-08-18. `gradeExercise` lives in `src/lib/curriculum.ts` (complete-route semantics; the practice route's swipe-grading divergence is eliminated as designed). `parseExercises` + `buildActiveLesson` in `store.ts` own exercise normalization and lesson activation (the note's "activateLesson" — shipped under the name `buildActiveLesson`). `src/lib/shop-catalog.ts` is the single shop source for route and component. League metadata lives in dependency-free `src/lib/league-meta.ts` (with the two league functions); `src/lib/game.ts` re-exports it for server consumers, `src/components/game/leagues.ts` derives `LEAGUES_INFO` from it plus blurbs, and the unread `learner.leagueMeta` payload was removed from `/api/state`. `DailyChallengeState` is single-sourced in `@/lib/daily-challenge` and re-exported by client `types.ts` via `import type`. Pinned by `tests/unit/league-meta.test.ts` (client/server table consistency) and `tests/unit/grading.test.ts` (including the `swipeRightIf: "real"` regression).

## Problem

Five facts about the game are maintained in two places each, with sync glue or drift risk between the copies. All evidence verified by reading both sites:

**1. `gradeExercise` exists twice.** `src/app/api/lesson/[id]/complete/route.ts:18-63` and `src/app/api/lesson/[id]/practice/route.ts:17-52` carry the same five-way exercise grader; the practice copy even opens with the comment "Reuse the same grading logic as the complete route". The copies have already diverged: the complete route's swipe case honors `swipeRightIf: "ai" | "real"`, while the practice route assumes `answer[i] === item.value` unconditionally. Today all 10 seeded swipe exercises use `swipeRightIf: "ai"` (grep over `src/lib/curriculum.ts`), so the divergence is latent — but the first `"real"`-flipped exercise will grade wrong in practice mode.

**2. Exercise-JSON normalization exists twice.** `store.ts:209-218` (`startLesson`) and `store.ts:237-246` (`startPractice`) are identical 10-line blocks that `JSON.parse(lesson.exercises)` and copy server-side `items` into client-side `items_order` for order exercises. The surrounding `startLesson`/`startPractice` bodies differ only in the `practiceMode` flag.

**3. The shop catalog exists twice.** Server `CATALOG` (`src/app/api/shop/route.ts:8-25`, used by POST validation) and a hard-coded client `useState` array (`Shop.tsx:36-56`, what the user actually sees) duplicate both items' slug, name, description, cost, kind, emoji, and accent. The descriptions have already drifted stylistically ("(automático)" vs "Consumido automaticamente."). The GET handler that would have kept them in sync is never called (see [the unwired-API note](2026-08-18-remove-unwired-api-surface.md)).

**4. League metadata exists twice.** Server `LEAGUE_META` (`src/lib/game.ts:118-127`) and client `LEAGUES_INFO` (`src/components/game/leagues.ts:11-47`) repeat the same five leagues' label, emoji, color, and threshold; the client copy adds `blurb`. Threshold drift between the tables would silently desync league progression (server) from league display (client). Meanwhile the `/api/state` payload ships `learner.leagueMeta` (`state/route.ts:54`, typed at `types.ts:32`) that **no component reads** — every client reads `LEAGUES_INFO[learner.league]` instead (TopBar, Home, Profile, Leaderboard, LeagueResetToast). Only `leaderboard.leagueMeta` (`Leaderboard.tsx:49,52`) is actually consumed.

**5. `DailyChallengeState` is declared twice.** `src/lib/daily-challenge.ts:29-41` (the return type of `getDailyChallenge()`) and `src/components/game/types.ts:197-209` are field-for-field identical. Shape twins by convention: a server-side field rename compiles clean and breaks the client at runtime.

## Proposal

1. Move `gradeExercise` into `src/lib/curriculum.ts` (next to the `Exercise` union it switches on) and import it from both lesson routes, keeping the complete route's `swipeRightIf`-aware swipe logic as the single version.
2. Extract one `parseExercises(lesson.exercises): ClientExercise[]` helper (in `store.ts` or `types.ts`) owning the `items` → `items_order` normalization, and collapse `startLesson`/`startPractice` into a shared `activateLesson(lesson, module, practiceMode)` with two one-line wrappers.
3. Move the shop catalog to `src/lib/shop-catalog.ts` (pure data + the `ShopItem` type, no server imports); `src/app/api/shop/route.ts` imports it for POST validation and `Shop.tsx` imports it for rendering, deleting both local copies.
4. Create `src/lib/league-meta.ts` — a dependency-free module with the five leagues' label/emoji/color/threshold. `src/lib/game.ts` re-exports/uses it server-side; `src/components/game/leagues.ts` imports it and adds only `blurb`. Remove the unread `leagueMeta` field from the `/api/state` learner payload and from `LearnerState` (`types.ts:32`), keeping the consumed `leaderboard.leagueMeta`.
5. Delete the client-side `DailyChallengeState` redeclaration and replace it in `types.ts` with `import type { DailyChallengeState } from "@/lib/daily-challenge"`. `import type` is erased at compile time, so no server code enters the client bundle.

## Why not keep it?

Each pair is a change-amplification trap: grading rules, shop items, league thresholds, and challenge payloads are exactly the facts a learning game tunes most often, and each currently requires editing two files that the compiler will not reconcile. The counterargument is that server and client *should* be able to evolve separate shapes — but nothing in the product wants that today; every one of these pairs is meant to be identical, and the drift that has already occurred (swipe grading, shop copy) is accidental, not evolutionary.

## Acceptance criteria

- One `gradeExercise`, one exercise-JSON parser, one shop catalog, one league-metadata table, one `DailyChallengeState` declaration; greps for the old duplicates return single sites.
- `npm run lint` and `next build` pass.
- Manual smoke: complete and practice a lesson containing swipe and order exercises (grading identical in both modes), buy both shop items (prices and copy match), view Home/Profile/Leaderboard (league labels unchanged), daily challenge card renders.

## Risks

- **Bundle boundary**: `src/lib/` currently contains server-only modules (`db.ts`); the new shared modules (`shop-catalog.ts`, `league-meta.ts`) must stay dependency-free so client imports never pull Prisma into the bundle. Enforce by keeping them pure data/types — no imports at all.
- **Practice-mode grading changes** for any future `swipeRightIf: "real"` exercise (from accidentally-lenient to correct). No current content is affected.
- **Removing `learner.leagueMeta`** breaks any out-of-tree consumer of `/api/state`; the only in-tree consumer set is the store, verified by grep.

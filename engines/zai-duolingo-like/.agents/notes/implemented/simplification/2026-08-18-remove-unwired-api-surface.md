# Agent Note: Remove unwired API routes, the dead streak-touch action, and unread response fields

Status: implemented

> Shipped 2026-08-18. `src/app/api/route.ts`, `src/app/api/playground/chat/`, and `src/app/api/streak/touch/` deleted; `touchStreak` removed from the store; `GET /api/shop` deleted; `myRank`, `currentLessonIdx`, `results[]`, `hearts` (complete route), `heartsLost`/`results` (practice route), and `message` (heart/refill) removed from responses and types. Two deltas beyond the proposal: `LearnerState` **gained** `leagueXp: number` (the field was shipped and consumed by `Profile.tsx:153` but never typed — the audit's "unread" call was wrong for this field), and the store's `refillHearts` was simplified to match its `Promise<void>` interface. Pinned by `tests/api/*` (54 integration tests).

## Problem

An audit of all 17 route files under `src/app/api/` against their callers in `src/` found API surface that is computed or exposed but never consumed:

**Fully unwired routes (zero callers repo-wide):**

- `src/app/api/route.ts` — template hello-world returning `{ message: "Hello, world!" }`. No caller (searched `fetch("/api")`, `"Hello, world"`); REPORT-PTC.md labels it "health" but nothing health-checks it.
- `src/app/api/playground/chat/route.ts` — `GET /api/playground/chat?threadId=` for loading saved threads. The only references are its own comment and two docs (`worklog.md:134`, `REPORT-PTC.md:136`). `Playground.tsx` renders only the in-memory `playgroundThread` from the store; thread history was documented but never wired.
- `src/app/api/streak/touch/route.ts` + the `touchStreak` store action — the route's sole caller is `useGame.touchStreak` (`store.ts:364-372`), and **no component ever calls `touchStreak`** (grep across `src/`: only the definition at `store.ts:90,364`). The streak is already advanced server-side by lesson completion (`src/app/api/lesson/[id]/complete/route.ts:186-216`), which duplicates this route's streak+freeze logic nearly verbatim.

**Partially dead handler:**

- `GET /api/shop` — zero callers. `Shop.tsx:36-56` renders from a hard-coded `useState` item array instead of fetching the catalog, and purchases go through `POST /api/shop` (`Shop.tsx:73`). The GET handler exists only to serve a catalog nobody fetches.

**Response fields computed server-side but never read client-side:**

| Route | Dead field(s) | Evidence |
|---|---|---|
| `/api/leaderboard` | `myRank` | `Leaderboard.tsx:31` re-derives rank from `standings.find(s => s.isMe)?.rank`; `myRank` appears only in the `LeaderboardData` type |
| `/api/curriculum` | `currentLessonIdx` per module | `ClientModule.currentLessonIdx` (`types.ts:100`) has no consumer; `Home.tsx:37-49` walks the curriculum tree itself |
| `/api/lesson/[id]/complete` | `results[]`, `hearts` | `LessonComplete.tsx` reads only summary fields; `.results` is never accessed and `hearts` is overwritten by the immediate `refreshState()` |
| `/api/lesson/[id]/practice` | `results[]`, `total`, `correctCount`, `heartsLost` | UI reads only `gemsGained` and `passed` (`LessonComplete.tsx:32-33`) |
| `/api/heart/refill` | `message` | `store.ts:376-380` checks `data.ok` only |

## Proposal

1. Delete `src/app/api/route.ts` and `src/app/api/playground/chat/route.ts` (and fix the stale references in `worklog.md`/`REPORT-PTC.md` if those docs survive — see the template-leftovers note).
2. Delete `src/app/api/streak/touch/route.ts`, the `touchStreak` action, and its `GameStore` interface entry (`store.ts:90,364-372`). This also eliminates the duplicated streak-freeze-consumption logic shared with the complete route — one copy remains, in the complete route.
3. Delete the `GET` handler from `src/app/api/shop/route.ts` (keep `POST`; the `CATALOG` stays for purchase validation — consolidating the client/server catalog duplication is covered by [the shared-logic note](2026-08-18-collapse-duplicated-game-logic.md)).
4. Stop computing and returning the dead fields: drop `myRank` from `/api/leaderboard` and `LeaderboardData`; `currentLessonIdx` from `/api/curriculum` and `ClientModule`; `results[]` (and `hearts`/`total`/`correctCount`/`heartsLost` where unread) from both lesson routes and the `LessonResult`/`PracticeResult` types; `message` from `/api/heart/refill`.

## Why not keep it?

- `/api/playground/chat` is the tempting one to keep: thread history is a plausible feature. But the route has been unwired since it was written, the worklog describes a UI that was never built, and `ChatThread.messages` accumulates in the DB with no reader. When thread history becomes a product want, the route is ~40 lines to rebuild against the same Prisma model — meanwhile the unwired endpoint misrepresents the app's actual surface.
- `streak/touch` was designed for "touch on app open", but the shipped product touches the streak on lesson completion; the dead action+route only duplicates freeze-consumption logic in a second place to keep in sync.
- Dead response fields are small individually; together they are a standing invitation for client code to trust values the UI never verified, and they cost query/compute work on every call.

## Acceptance criteria

- The two route files and the streak/touch route no longer exist; `grep -r "streak/touch\|playground/chat" src/` returns nothing.
- `GameStore` has no `touchStreak`; no component references it.
- `/api/shop` answers POST only (GET returns 405 or the handler is absent).
- The listed fields are absent from route responses and from their TypeScript types; `npm run lint` and `next build` pass.
- Manual smoke: complete a lesson (streak advances, freeze still auto-consumes on a missed day), buy a shop item, open leaderboard and curriculum views — all unchanged.

## Risks

- **Re-adding thread history later** requires re-creating the chat route; mitigated by the Prisma `ChatThread` model remaining untouched, so saved threads survive.
- **A field judged unread is actually read via a dynamic access**; mitigated by grepping each field name across `src/` (done — patterns cited above) and by the smoke test.
- Removing `results[]` forecloses a per-exercise review UI; that UI does not exist today and the per-exercise data is still computed for grading — only the response payload shrinks.

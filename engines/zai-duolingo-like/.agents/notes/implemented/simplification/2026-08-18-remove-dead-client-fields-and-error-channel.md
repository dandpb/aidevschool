# Agent Note: Remove dead client-side fields, types, and the store's unread error channel

Status: implemented

> Shipped 2026-08-18. The store's write-only `error` channel (field + five write sites), `hidden?: boolean` on both achievement types, the unimported `PlaygroundThread` interface, and the one-entry-used `ACCENT` map in `AchievementToasts.tsx` were all removed as proposed. The inline `XXX(setstate-in-render)` flagged during the survey was fixed in the same pass: `LessonComplete.tsx` now redirects via `useEffect`.

## Problem

A read/write audit of `src/components/game/**` and the lib type surface found declarations that are written (or declared) but never read:

**1. The store's `error` field is a write-only channel.** `store.ts` declares `error: string | null` (`:68`), initializes it (`:130`), and writes it from five catch blocks (`:149` "Falha ao carregar o protocolo.", `:199` "Falha ao iniciar.", `:299`/`:325` "Falha ao enviar respostas.", `:414` "Falha ao reiniciar."). No component ever reads it: greps for `s.error` and `state.error` over `src/components/game/**` return zero readers. Failures are recorded into a black hole — the UI keeps showing stale state with no signal. (Context: 12 other fetch wrappers in the store already swallow errors with `catch { /* noop */ }`, so the five `set({ error })` calls are not a considered error design, just vestigial.)

**2. `hidden?: boolean` on achievements is never read.** Declared on `AchievementDef` (`src/lib/achievements.ts:17`) and mirrored on `AchievementClient` (`src/components/game/types.ts:156`). No `*.hidden` read exists anywhere in `src/` (the only other `hidden` match is inside the dead shadcn `calendar.tsx`). No achievement definition sets it either — it is speculative generality for a "secret achievement" feature that was never built.

**3. `PlaygroundThread` interface is never imported.** Declared at `src/components/game/types.ts:166-170`; the store types `playgroundThread` with an inline `{ id: string; messages: ChatMessage[] }` shape (`store.ts:61`) instead. Grep for `PlaygroundThread` imports across `src/`: only the declaration site.

**4. The `ACCENT` map in `AchievementToasts.tsx` indexes one of four entries.** `ACCENT` (`:9-14`) defines amber/teal/magenta/rose classes, but only `ACCENT.amber` is ever referenced (`:53`) — the toast payload (`AchievementToast` in `store.ts:22-28`) carries no accent field, so the other three entries are unreachable.

## Proposal

1. Delete the `error` field, its `GameStore` interface entry, initialization, and the five `set({ error: ... })` writes (leaving the catch blocks as explicit no-ops, consistent with the store's other 12 wrappers). If error surfacing becomes a product want, design it then — a dead channel is worse than an honest absence because it implies failures are handled.
2. Delete `hidden?: boolean` from both `AchievementDef` and `AchievementClient`.
3. Delete the `PlaygroundThread` interface (or, if the inline store shape should be named, rename it to use `PlaygroundThread` — pick one; don't carry both).
4. Replace `${ACCENT.amber}` with the literal class string and delete the `ACCENT` map.

## Why not keep it?

Each item is small, but they share one failure mode: they make the code claim a capability (error reporting, secret achievements, a named thread type, per-rarity toast accents) that the product does not have. Readers — human or agent — then either hunt for the consumer that doesn't exist or build on the assumption the capability works. The skill's bar for an Agent Note over inline TODOs is met here only because the `error` channel spans five write sites and its removal is a (small) behavioral statement: the app currently surfaces no fetch errors at all.

## Acceptance criteria

- `grep -n "error" src/components/game/store.ts` shows no `error` state field or writes; `hidden`, `PlaygroundThread`, and `ACCENT` return zero matches across `src/`.
- `npm run lint` and `next build` pass.
- Manual smoke: force a failed fetch (stop the dev DB, reload) and confirm the app behaves exactly as today (stale state, no crash) — proving the deleted channel had no reader.

## Risks

- **Future error UX**: when error surfacing is designed, the five catch sites must be rediscovered; the smoke test above documents current behavior as the baseline.
- **Secret achievements**: re-adding `hidden` later is a one-field change plus the filter logic that never existed anyway.

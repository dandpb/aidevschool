# Agent Note: One exercise items shape, no runtime patch

Status: implemented

> Shipped 2026-08-18. The order exercise's scrambled items are `items: string[]` end to end (server data, DB JSON, wire, client). `ClientExercise.items` is the union `string[] | SwipeItem[]`; `items_order` is deleted from `types.ts`, and the store's `parseExercises` normalization patch is gone — it's a plain `JSON.parse`. `OrderExercise` and `SwipeExercise` narrow the union with typeof filters; `LessonPlayer.isAnswered` reads `items` for both.

## Problem

The same concept had two names — server `items`, client `items_order` — reconciled by a runtime patch in the store. The client encoded the server's internal shape (a seam leak), and removing the patch would have broken the OrderExercise silently at runtime (it had already happened once per worklog.md entry 3).

## Consequences

- Shape drift is now a compile error, not a runtime patch.
- If a client view ever needs a genuinely different shape, the transformation belongs in the curriculum route (one adapter at the seam), not in the store.

# 05 — Add an API endpoint

**Trigger:** a new route under `src/app/api/`.

Routes are thin adapters over `src/lib/` seams. Two hard rules from the notes: **reads never mutate** (a GET that writes once hid check-then-award logic and corrupted learner state) and **no unwired surface** (routes/fields nobody consumes get deleted).

## Steps

1. Confirm a real consumer exists or lands in the same change. An endpoint without a caller is dead surface and will be pruned.
2. Put the logic in the owning `src/lib/` module; the route validates input, calls the seam, shapes the response.
3. GET routes must be side-effect free. Unlocks/awards fire only on mutation routes (lesson complete, practice, playground save) — see [achievement-evaluate-award-split](../notes/implemented/architecture/2026-08-18-achievement-evaluate-award-split.md).
4. Type the client from the server: the client derives response types via `import type` from the seam module, so shape drift is a compile error, not a runtime patch in the store.
5. Add an API test under `tests/api/` (the suite is the safety net that let 3 routes be deleted with confidence):
   ```bash
   npx vitest run tests/api/<your-route>.test.ts
   ```
6. Full bar before done: [verify before done](02-verify-before-done.md).

## Verification

- New route covered by at least one `tests/api/` test, asserting both response shape and DB effects (with `expect.poll`-style patience where effects are async).
- `npx tsc --noEmit` proves the client consumes the declared shape.

## Pitfalls

- Only return fields the client actually reads; extra fields invite the client to trust never-verified values. Before adding a field, grep its name across `src/` for the consumer.
- If the handler needs to run inside the lesson-completion transaction, accept an optional `DbClient` instead of opening a second connection.
- Toasts/notifications belong to mutation responses — never push them from a GET.

## Sources

- [remove-unwired-api-surface](../notes/implemented/simplification/2026-08-18-remove-unwired-api-surface.md)
- [achievement-evaluate-award-split](../notes/implemented/architecture/2026-08-18-achievement-evaluate-award-split.md)
- [game-state-snapshot-seam](../notes/implemented/architecture/2026-08-18-game-state-snapshot-seam.md)

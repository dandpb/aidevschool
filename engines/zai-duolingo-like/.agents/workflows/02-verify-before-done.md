# 02 — Verify before done

**Trigger:** before claiming any code change is complete, handing work back, or writing `> Shipped` on a note.

The repo's documented bar (see [code-review-followups](../notes/implemented/architecture/2026-08-18-code-review-followups.md)) is a green full suite with counts cited as evidence — "vitest 100/100, playwright 29/29, tsc clean, eslint clean" — not a vibe.

## Steps

Run in this order; stop at the first red:

```bash
npx tsc --noEmit        # 1. types — client/server drift must be a compile error
npm run lint            # 2. eslint
npm test                # 3. vitest (unit + api), serial by design
npm run build           # 4. production build (also required before e2e)
npm run test:e2e        # 5. Playwright, needs the fresh build from step 4
```

## Verification

- Every step exits 0.
- Report results with counts (`vitest N/N`, `playwright N/N`), as the shipped notes do.

## Pitfalls

- `npm run test:e2e` runs against `next start` on port 3100, **not** dev — app-code changes are invisible to e2e until you rebuild (step 4). Skipping the rebuild is the classic false-green.
- Vitest and Playwright each own a dedicated SQLite file (`db/test.db`, `db/e2e.db`) recreated by their global setups. Never point them at the dev database.
- Both suites are serial on purpose (`fileParallelism: false`, `workers: 1`) because each shares one DB file. Do not "speed them up" by parallelizing.
- If a step is red and the fix is out of scope, say so explicitly instead of silently shipping.

## Sources

- [code-review-followups](../notes/implemented/architecture/2026-08-18-code-review-followups.md)
- [playwright-e2e-suite](../notes/implemented/process/2026-08-18-playwright-e2e-suite.md)

# 07 — Write an E2E test

**Trigger:** adding a Playwright spec under `e2e/`.

The suite conventions come from [playwright-e2e-suite](../notes/implemented/process/2026-08-18-playwright-e2e-suite.md): one shared `db/e2e.db` recreated per run, serial execution, production server on port 3100, LLM stubbed at the network layer.

## Steps

1. Create `e2e/<feature>.spec.ts`, reusing helpers from `e2e/helpers.ts` (typed — no `any` casts).
2. Follow the locator conventions:
   - Scope bottom-nav buttons with `page.getByRole("navigation")...` + `exact: true` — unscoped role queries match multiple regions.
   - `hasText` on a `div` matches ancestors; scope by an inner heading instead.
   - Server-side effects are async: assert DB/state changes with `expect.poll` against `getLearner()`, never with a fixed sleep.
   - The shop's insufficient-funds guard is client-side (disabled button), not a toast — assert the disabled state.
3. Stub the playground LLM with `page.route` using a **RegExp** — glob patterns with literal `?` were a latent flake.
4. Run just your spec, then the whole suite:
   ```bash
   npx playwright test e2e/<feature>.spec.ts
   npm run test:e2e
   ```

## Verification

- New spec passes solo and within the full serial run (flakiness shows up only in the full run — do not skip it).
- Failures produce a retained trace (`trace: "retain-on-failure"`) you can open with `npx playwright show-trace`.

## Pitfalls

- `workers` must stay `1`: all specs share `db/e2e.db`. Parallelism here is not an optimization, it is a bug.
- E2E runs `next start`, so rebuild first if app code changed (`npm run build`) — stale builds are the #1 false failure/false green.
- The global setup seeds phantom league rivals; do not assume an empty leaderboard.
- `reuseExistingServer: true` means a leftover server on :3100 gets reused — kill stale ones when debugging weird state.

## Sources

- [playwright-e2e-suite](../notes/implemented/process/2026-08-18-playwright-e2e-suite.md)
- [code-review-followups](../notes/implemented/architecture/2026-08-18-code-review-followups.md)

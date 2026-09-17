# Agent Note: Playwright E2E suite

Status: implemented

> Shipped 2026-08-18. 29 browser E2E tests in `e2e/` (5 spec files) run via `npm run test:e2e`. Infrastructure: `playwright.config.ts` (workers: 1 — one shared e2e database forces serial execution), `e2e/global-setup.ts` (recreates `db/e2e.db` from scratch every run: prisma db push --force-reset + curriculum + 6 rival learners), `e2e/helpers.ts` (wipeLearner / onboard / freshOnboardedPage / getLearner / e2eDb). Playwright starts its own dev server on port 3100 with DATABASE_URL pointing at the e2e DB — the dev database (custom.db) is never touched. The playground LLM is stubbed at the network layer via page.route on `**/chat?XTransformPort=3001**`.

## Coverage

- smoke: boot flow (cinematic → onboarding → home), returning-learner skip
- navigation: home, bottom nav, top bar chips, sound/rain settings, profile, reset
- lesson-flow: all 5 exercise types through the real UI, hearts loss, practice mode, zero-hearts gate
- meta: shop (both items + unaffordable guard), leaderboard, achievements, activity feed, daily challenge
- playground: stubbed happy path, persistence, achievement unlock, error fallback, new thread

## Conventions learned (follow them when adding specs)

- Bottom nav buttons must be scoped: `page.getByRole("navigation").getByRole("button", { name, exact: true })` — Home's main also renders "Trilha" etc.
- `hasText` on `div` locators matches ancestors; scope cards by an inner heading or use leaf-level getByText with `exact: true`.
- Server-side effects are async after UI actions — use `expect.poll` with getLearner() instead of immediate DB reads.
- The unaffordable-shop case is guarded client-side (disabled button), not by an error toast; the server 400 is covered by vitest.

## Related change

`Profile.tsx` SettingRow switches gained `aria-label={label}` (a11y + testability).

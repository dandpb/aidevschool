import { expect, test } from "@playwright/test";

// Continuity scenario `dojotoday-returning-next-day` (AID-987/T1, spec §2.1):
// the same device reopens the daily view on the NEXT generated projection day
// and the view must reflect the regenerated scheduler state — updated FSRS
// due-review queue, reconciled streak, consistent active unit — without
// carrying stale day-N state and without evaluating or marking anything.
// The two fixture servers (5181 = day N, 5182 = day N+1) are declared in
// playwright.config.ts; the canonical generated read model is never touched.

const DAY_N = "http://127.0.0.1:5181";
const DAY_N_PLUS_1 = "http://127.0.0.1:5182";

test("readiness dojotoday-returning-next-day: schedule updates across days without stale carryover", async ({
  page,
}) => {
  // Day N: open the daily view and read the scheduled state.
  await page.goto(DAY_N);

  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toBeVisible();
  await expect(page.locator(".hero-date")).toContainText("segunda-feira, 7 de setembro");
  await expect(page.getByText("3 dias de sequência")).toBeVisible();
  await expect(page.getByText("overdue 44d").first()).toBeVisible();
  // Day-N queue: the overdue GATEKEEPER review AND the U2 review due today.
  await expect(page.getByRole("heading", { name: "Retome por aqui" })).toBeVisible();
  await expect(
    page.getByText("KV WAREHOUSE: hash-map-backed CRUD with TTL expiration").first(),
  ).toBeVisible();

  // Returning, next day, SAME browser profile (continuity is same-device).
  await page.goto(DAY_N_PLUS_1);

  // The regenerated projection replaced the stale one: new date, reconciled
  // streak (gate passed on day N → 4), aged overdue review, and the U2 review
  // left the due queue (next review scheduled out) without losing progress.
  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toBeVisible();
  await expect(page.locator(".hero-date")).toContainText("terça-feira, 8 de setembro");
  await expect(page.getByText("4 dias de sequência")).toBeVisible();
  await expect(page.getByText("overdue 45d").first()).toBeVisible();
  await expect(page.getByText("overdue 44d")).toHaveCount(0);
  await expect(page.getByText("due hoje")).toHaveCount(0);

  // The active unit stays consistent with the track across the day change.
  await expect(page.getByText("Sua próxima missão é")).toBeVisible();
  await expect(
    page
      .locator(".mission-card")
      .getByText("KV WAREHOUSE: hash-map-backed CRUD with TTL expiration"),
  ).toBeVisible();
  await expect(page.locator(".progress-row", { hasText: "2/2 dominadas" })).toBeVisible();

  // Read-only boundary holds on return: no local state was written and the
  // view still disclaims evaluation and mastery.
  const localStorageEntries = await page.evaluate(() => window.localStorage.length);
  expect(localStorageEntries).toBe(0);
  await expect(page.getByText(/apenas mostra o scheduler/)).toBeVisible();
  await expect(page.getByText(/O verificador independente decide/)).toBeVisible();
});

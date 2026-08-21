import { expect, test } from "@playwright/test";

test("readiness dojotoday-active-unit-guidance: shows schedule, active unit, and authority boundary", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Retome por aqui" })).toBeVisible();
  await expect(
    page.getByText("KV WAREHOUSE: hash-map-backed CRUD with TTL expiration").first(),
  ).toBeVisible();
  await expect(page.getByText(/apenas mostra o scheduler/)).toBeVisible();
  await expect(page.getByText(/O verificador independente decide/)).toBeVisible();
});

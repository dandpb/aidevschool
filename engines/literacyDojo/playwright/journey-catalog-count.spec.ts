import { expect, test } from "@playwright/test";
import { seedCorridorProgress } from "./support";

test("a quantidade anunciada para Dev corresponde ao mapa disponível", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: [] });
  await page.reload();
  await expect(page.getByTestId("journey-switch-dev")).toContainText("12 lições");
  await page.getByTestId("journey-switch-dev").click();
  await expect(page.getByTestId("map-screen")).toContainText("0/12 missões");
});

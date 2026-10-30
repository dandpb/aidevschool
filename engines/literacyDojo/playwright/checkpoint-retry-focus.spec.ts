import { expect, test } from "@playwright/test";
import { seedCorridorProgress } from "./support";

test("reiniciar uma atividade do desafio mantém um destino de teclado", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l01", "l02", "l03"] });
  await page.reload();
  await page.getByTestId("continue-button").click();
  await page.getByTestId("start-checkpoint").click();
  await page.getByTestId("sort-down-passo-tarefa").click();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
  await page.getByTestId("retry-activity").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#activity-heading")).toBeFocused();
  await expect(page.getByTestId("feedback-panel")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(page.locator("#activity-heading")).not.toBeFocused();
  expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);
});

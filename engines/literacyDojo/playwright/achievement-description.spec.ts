import { expect, test } from "@playwright/test";
import { seedCorridorProgress } from "./support";

test("a conquista de trilha descreve o percurso usado para o critério", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: [] });
  await page.reload();
  await page.getByTestId("open-progress").click();
  const achievement = page.getByTestId("achievement-track_complete");
  await expect(achievement).toContainText("todas as lições publicadas da jornada IA na Prática");
  await expect(achievement).toContainText("à época da conquista");
  await expect(achievement).not.toContainText("14 lições");
});

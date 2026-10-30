import { expect, test } from "@playwright/test";
import { seedCorridorProgress } from "./support";

test("resultado do desafio conserva explicação de aprovação parcial", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l01", "l02", "l03"] });
  await page.reload();
  await page.getByTestId("continue-button").click();
  await page.getByTestId("start-checkpoint").click();
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("next-activity").click();
  await page.getByTestId("output-out-b").check();
  await page.getByTestId("criterion-c-fontes").check();
  await page.getByTestId("criterion-c-limites").check();
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("next-activity").click();
  await page.getByTestId("option-f-noticia").check();
  await page.getByTestId("option-f-planilha").check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  await expect(page.getByTestId("feedback-check-f-lei")).toContainText("fonte oficial");
  await page.getByTestId("finish-checkpoint").click();
  await expect(page.getByTestId("checkpoint-result")).toBeVisible();
  await expect(page.getByTestId("result-review-points")).toContainText("fonte oficial");
  await expect(page.getByTestId("result-review-points")).toContainText("Atividade 3");
  await expect(page.getByTestId("checkpoint-next-lesson")).toBeVisible();
});

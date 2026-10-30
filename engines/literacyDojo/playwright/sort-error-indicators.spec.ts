import { expect, test } from "@playwright/test";
import { readProgress, seedCorridorProgress, writeProgressDoc } from "./support";

for (const forced of [false, true]) {
  test(`itens fora da posição são identificados após reprovação (cores forçadas: ${forced})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    if (forced) await page.emulateMedia({ forcedColors: "active" });
    await page.goto("/");
    await expect(page.locator(".product-bar")).toBeVisible();
    await seedCorridorProgress(page, { completedLessonIds: ["l01", "l02", "l03"] });
    await page.reload();
    await page.getByTestId("continue-button").click();
    await page.getByTestId("start-checkpoint").click();
    await page.getByTestId("sort-down-passo-tarefa").click();
    await page.getByTestId("submit-attempt").click();
    await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
    const wrong = page.getByTestId("sort-item-passo-tarefa");
    const otherWrong = page.getByTestId("sort-item-passo-pergunta");
    const correct = page.getByTestId("sort-item-passo-leitura");
    await expect(wrong).toContainText("Revise esta posição");
    await expect(otherWrong).toContainText("Revise esta posição");
    await expect(correct).not.toContainText("Revise esta posição");
    await expect(page.getByTestId("sort-up-passo-tarefa")).toHaveAccessibleDescription(
      "Revise esta posição.",
    );
    if (forced) await expect(wrong).toHaveCSS("border-top-style", "dashed");
    await page.getByTestId("sort-up-passo-tarefa").focus();
    await page.keyboard.press("Enter");
    await expect(wrong).not.toContainText("Revise esta posição");
    await expect(page.getByTestId("prior-feedback-note")).toBeVisible();
    await page.getByTestId("submit-attempt").click();
    await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  });
}

test("a mesma orientação aparece na lição", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: [], currentLessonId: "l01" });
  const progress = await readProgress(page);
  if (!progress?.lessonStatus) throw new Error("progresso ausente");
  progress.lessonStatus.l01 = "available";
  await writeProgressDoc(page, progress);
  await page.reload();
  await page.getByTestId("open-map").click();
  await page.getByTestId("map-start-l01").click();
  await page.getByTestId("start-lesson").click();
  await page.getByTestId("option-opt-rascunho").check();
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("next-activity").click();
  await page.getByTestId("sort-down-passo-tarefa").click();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
  await expect(page.getByTestId("sort-item-passo-tarefa")).toContainText("Revise esta posição");
  await page.getByTestId("sort-up-passo-tarefa").click();
  await expect(page.getByTestId("sort-item-passo-tarefa")).not.toContainText("Revise esta posição");
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
});

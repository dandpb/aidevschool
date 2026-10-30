import { expect, test } from "@playwright/test";
import { readProgress, seedCorridorProgress, writeProgressDoc } from "./support";

test("multiseleção distingue opção indevida de opção que falta", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l02"], currentLessonId: "l03" });
  const progress = await readProgress(page);
  if (!progress?.lessonStatus) throw new Error("progresso ausente");
  progress.lessonStatus.l03 = "available";
  await writeProgressDoc(page, progress);
  await page.reload();
  await page.getByTestId("continue-button").click();
  await page.getByTestId("start-lesson").click();
  for (const id of ["t-rascunho", "t-resumo", "t-faturamento"])
    await page.getByTestId(`option-${id}`).check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
  const extra = page.getByTestId("option-t-faturamento");
  const missing = page.getByTestId("option-t-ideias");
  await expect(extra).toHaveAccessibleDescription("Desmarque esta opção.");
  await expect(missing).toHaveAccessibleDescription("Falta marcar esta opção.");
  await extra.focus();
  await page.keyboard.press("Space");
  await expect(extra).not.toHaveAttribute("aria-invalid", "true");
  await expect(missing).not.toHaveAttribute("aria-invalid", "true");
  await missing.check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
});

import { expect, test } from "@playwright/test";
import { readProgress, seedCorridorProgress, writeProgressDoc } from "./support";

test("contexto extra é identificado, e marcas desaparecem durante correção", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ forcedColors: "active" });
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
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("next-activity").click();
  for (const id of ["tarefa-definida", "contexto-minimo", "formato-esperado", "temperatura"]) {
    await page.getByTestId(`context-${id}`).check();
  }
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
  const extra = page.getByTestId("context-temperatura");
  await expect(extra).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("feedback-check-temperatura")).toContainText(
    "temperatura é configuração interna",
  );
  await expect(extra.locator("..")).toHaveClass(/is-invalid/);
  await expect(extra.locator("..")).toHaveCSS("border-top-style", "dashed");
  await expect(page.getByTestId("context-tarefa-definida")).not.toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await extra.focus();
  await page.keyboard.press("Space");
  await expect(extra).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("prior-feedback-note")).toBeVisible();
  await expect(page.getByTestId("feedback-check-temperatura")).toBeVisible();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  await expect(page.getByTestId("feedback-check-temperatura")).toHaveCount(0);
});

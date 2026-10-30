import { expect, test } from "@playwright/test";
import { readProgress, seedCorridorProgress, writeProgressDoc } from "./support";

async function openLesson(page: import("@playwright/test").Page, lessonId: string) {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l02"], currentLessonId: lessonId });
  const progress = await readProgress(page);
  if (!progress?.lessonStatus) throw new Error("progresso ausente");
  progress.lessonStatus[lessonId] = "available";
  await writeProgressDoc(page, progress);
  await page.reload();
  await page.getByTestId("open-map").click();
  await page.getByTestId(`map-start-${lessonId}`).click();
  await page.getByTestId("start-lesson").click();
}

test("critério incorreto é distinguível em cores forçadas e ao teclado", async ({ page }) => {
  await openLesson(page, "l09");
  await page.getByTestId("rubric-c-fontes-not_met").check();
  await page.getByTestId("rubric-c-numeros-met").check();
  await page.getByTestId("rubric-c-incerteza-met").check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
  const wrong = page.getByTestId("rubric-c-numeros-met");
  const right = page.getByTestId("rubric-c-fontes-not_met");
  await expect(wrong).toHaveAttribute("aria-invalid", "true");
  await expect(wrong).toHaveAccessibleDescription("Revise esta resposta.");
  await expect(right).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("rubric-c-numeros")).toHaveCSS("border-top-style", "dashed");
  await expect(page.getByTestId("rubric-c-numeros")).toContainText("Revise esta resposta");
  await page.getByTestId("rubric-c-numeros-not_met").focus();
  await page.keyboard.press("Space");
  await expect(wrong).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("prior-feedback-note")).toBeVisible();
  await page.getByTestId("rubric-c-incerteza-partial").check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
});

test("classificação incorreta é distinguível em cores forçadas", async ({ page }) => {
  await openLesson(page, "l12");
  for (const id of [
    "i-senha",
    "i-site",
    "i-planilha",
    "i-vaga",
    "i-cartao",
    "i-ata",
    "i-legenda",
  ]) {
    await page.getByTestId(`item-${id}-safe`).check();
  }
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
  const wrong = page.getByTestId("item-i-senha-safe");
  await expect(wrong).toHaveAttribute("aria-invalid", "true");
  await expect(wrong).toHaveAccessibleDescription("Revise esta resposta.");
  await expect(page.getByTestId("item-i-site-safe")).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("item-i-senha")).toHaveCSS("border-top-style", "dashed");
  await expect(page.getByTestId("item-i-senha")).toContainText("Revise esta resposta");
  await page.getByTestId("item-i-senha-sensitive").focus();
  await page.keyboard.press("Space");
  await expect(wrong).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("prior-feedback-note")).toBeVisible();
  for (const id of ["i-planilha", "i-cartao", "i-ata"]) {
    await page.getByTestId(`item-${id}-sensitive`).check();
  }
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
});

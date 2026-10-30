import { expect, test } from "@playwright/test";
import { lessons } from "../src/data/generated/lessons";
import { CHECKPOINT_SELECTION } from "../src/domain/checkpoints";
import {
  answerCheckpointActivityRight,
  completeOnboarding,
  seedCorridorProgress,
  wrongOutput,
} from "./support";

test("feedback de tentativa anterior não marca a nova resposta como errada", async ({ page }) => {
  await completeOnboarding(page);
  const wrong = page.getByTestId(`output-${wrongOutput.id}`);
  const alternative = page.getByTestId("output-out-b");
  await wrong.check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
  await expect(wrong).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("criterion-c-fontes")).toHaveAttribute("aria-invalid", "true");
  await expect(wrong.locator("..")).toHaveClass(/is-invalid/);
  await expect(alternative.locator("..")).not.toHaveClass(/is-invalid/);
  await alternative.check();
  await expect(alternative).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("criterion-c-fontes")).not.toHaveAttribute("aria-invalid", "true");
  await expect(alternative.locator("..")).not.toHaveClass(/is-invalid/);
  await expect(page.getByTestId("prior-feedback-note")).toContainText("tentativa anterior");
  await page.getByTestId("criterion-c-fontes").check();
  await page.getByTestId("criterion-c-limites").check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  await expect(page.getByTestId("prior-feedback-note")).toHaveCount(0);
});

test("desafio distingue feedback anterior após edição também em cores forçadas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l01", "l02", "l03"], route: "guided" });
  await page.reload();
  await page.getByTestId("continue-button").click();
  await page.getByTestId("start-checkpoint").click();
  const ref = CHECKPOINT_SELECTION.find((entry) => entry.id === "cp-01")?.activityRefs[0];
  const first = lessons
    .find((lesson) => lesson.id === ref?.lessonId)
    ?.activities.find((item) => item.id === ref?.activityId);
  if (!first) throw new Error("atividade ausente");
  await answerCheckpointActivityRight(page, first);
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("next-activity").click();
  const wrong = page.getByTestId("output-out-a");
  const alternative = page.getByTestId("output-out-b");
  await wrong.check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
  await expect(wrong).toHaveAttribute("aria-invalid", "true");
  await expect(wrong.locator("..")).toHaveCSS("border-style", "dashed");
  await expect(alternative.locator("..")).not.toHaveClass(/is-invalid/);
  await alternative.check();
  await expect(alternative).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("prior-feedback-note")).toContainText("tentativa anterior");
  await page.getByTestId("criterion-c-fontes").check();
  await page.getByTestId("criterion-c-limites").check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  await expect(page.getByTestId("prior-feedback-note")).toHaveCount(0);
});

test("motivo extra selecionado é identificado apenas após verificação", async ({ page }) => {
  await completeOnboarding(page);
  await page.getByTestId("output-out-b").check();
  await page.getByTestId("criterion-c-fontes").check();
  await page.getByTestId("criterion-c-limites").check();
  const extra = page.getByTestId("criterion-c-confianca");
  await extra.check();
  await expect(extra).not.toHaveAttribute("aria-invalid", "true");
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
  await expect(extra).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("criterion-c-fontes")).not.toHaveAttribute("aria-invalid", "true");
  await extra.uncheck();
  await expect(extra).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("prior-feedback-note")).toBeVisible();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
});

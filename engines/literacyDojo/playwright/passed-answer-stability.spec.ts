import { expect, test } from "@playwright/test";
import { lessons } from "../src/data/generated/lessons";
import { CHECKPOINT_SELECTION } from "../src/domain/checkpoints";
import { answerCheckpointActivityRight, completeOnboarding, seedCorridorProgress } from "./support";

async function answerComparison(page: import("@playwright/test").Page) {
  await page.getByTestId("output-out-b").check();
  await page.getByTestId("criterion-c-fontes").check();
  await page.getByTestId("criterion-c-limites").check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
}

test("lição mantém resposta aprovada estável até avançar", async ({ page }) => {
  await completeOnboarding(page);
  await answerComparison(page);
  await expect(page.getByTestId("output-out-b")).toBeChecked();
  await expect(page.getByTestId("output-out-a")).toBeDisabled();
  await expect(page.getByTestId("criterion-c-fontes")).toBeDisabled();
  await expect(page.getByText("Resposta aprovada. Continue pela próxima ação.")).toBeVisible();
  await expect(page.getByTestId("next-activity")).toBeEnabled();
});

test("desafio mantém resposta aprovada estável até avançar", async ({ page }) => {
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
  await answerComparison(page);
  await expect(page.getByTestId("output-out-b")).toBeChecked();
  await expect(page.getByTestId("output-out-a")).toBeDisabled();
  await expect(page.getByText("Resposta aprovada. Continue pela próxima ação.")).toBeVisible();
  await expect(page.getByTestId("next-activity")).toBeEnabled();
});

test("texto aprovado continua focável e selecionável sem permitir edição", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, {
    completedLessonIds: ["l01", "l02", "l03", "l04"],
    inProgressLessonId: "l05",
    completedCheckpointModuleIds: ["mod-01"],
    route: "guided",
  });
  await page.reload();
  await page.getByTestId("start-lesson").click();
  const lesson = lessons.find((item) => item.id === "l05");
  const activity = lesson?.activities[0];
  if (!activity || activity.type !== "prompt_builder") throw new Error("atividade ausente");
  await answerCheckpointActivityRight(page, activity);
  const field = page.getByTestId(`field-${activity.data.fields[0].id}`);
  const original = await field.inputValue();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  await expect(field).toHaveAttribute("readonly", "");
  await expect(field).toBeEnabled();
  await expect(field).toHaveAccessibleDescription(/selecionar e copiar/);
  await field.focus();
  await expect(field).toBeFocused();
  await page.keyboard.press("Control+A");
  expect(
    await field.evaluate((node: HTMLTextAreaElement) => node.selectionEnd - node.selectionStart),
  ).toBe(original.length);
  await page.keyboard.type("alteração");
  await expect(field).toHaveValue(original);
  await page.getByTestId("next-activity").click();
  await expect(page.getByRole("checkbox").first()).toBeEnabled();
});

import { expect, test } from "@playwright/test";
import { lessons } from "../src/data/generated/lessons";
import { isValidEvidenceRecord } from "../src/domain/evidence";
import { MAP_INITIAL_LESSON_ID } from "../src/domain/progress";

const mapInitial = lessons.find((lesson) => lesson.id === MAP_INITIAL_LESSON_ID);
if (!mapInitial || mapInitial.activities[0]?.type !== "output_comparison") {
  throw new Error("Mapa Inicial precisa ser uma comparação de respostas");
}

const activity = mapInitial.activities[0];
const wrongOutput = activity.data.outputs.find(
  (output) => output.id !== activity.evaluation.betterOutputId,
);
if (!wrongOutput) throw new Error("Mapa Inicial sem alternativa incorreta");

async function completeOnboarding(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByTestId("assistant-welcome")).toBeVisible();
  await expect(page.getByTestId("dev-track-teaser")).toContainText("Em breve");
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-save_time").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-work").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-medium").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-scheduling").check();
  await page.getByTestId("onboarding-next").click();
  await expect(page.getByRole("heading", { name: mapInitial.title })).toBeVisible();
  await page.getByTestId("start-lesson").click();
}

async function answerRight(page: import("@playwright/test").Page) {
  await page.getByTestId(`output-${activity.evaluation.betterOutputId}`).check();
  for (const criterionId of activity.evaluation.requiredCriterionIds) {
    await page.getByTestId(`criterion-${criterionId}`).check();
  }
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toContainText(activity.feedback.onSuccess ?? "");
  await page.getByTestId("finish-lesson").click();
}

test("Mapa Inicial: erro, dica ou nova tentativa encaminha para a rota guiada", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.getByTestId(`output-${wrongOutput.id}`).check();
  await page.getByTestId("submit-attempt").click();
  await page.reload();
  await expect(page.getByRole("heading", { name: mapInitial.title })).toBeVisible();
  await page.getByTestId("start-lesson").click();
  await page.getByTestId(`output-${wrongOutput.id}`).check();
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("hint-button").click();
  await page.getByTestId("retry-activity").click();
  await answerRight(page);

  await expect(page.getByTestId("result-screen")).toContainText("Lição concluída");
  await expect(page.getByTestId("route-explanation")).toContainText("conversa simples");
  await page.getByTestId("next-lesson").click();
  await expect(
    page.getByRole("heading", { name: "Sua primeira conversa com uma IA" }),
  ).toBeVisible();
});

test("Mapa Inicial: acerto de primeira encaminha para a rota intermediária", async ({ page }) => {
  await completeOnboarding(page);
  await answerRight(page);

  await expect(page.getByTestId("route-explanation")).toContainText("logo de primeira");
  await page.getByTestId("next-lesson").click();
  await expect(
    page.getByRole("heading", { name: "O que a IA faz bem e onde costuma falhar" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "O que a IA faz bem e onde costuma falhar" }),
  ).toBeVisible();

  const records = await page.evaluate(() =>
    JSON.parse(window.sessionStorage.getItem("literacydojo:evidence") ?? "[]"),
  );
  expect(records).toHaveLength(1);
  expect(records.every(isValidEvidenceRecord)).toBe(true);
});

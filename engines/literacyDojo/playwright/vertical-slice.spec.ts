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

test("Mapa Inicial continua utilizável em viewport compacto", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 720 });
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== "http://localhost:4173")
      externalRequests.push(request.url());
  });
  await page.goto("/");

  await expect(page.getByTestId("assistant-welcome")).toBeVisible();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-save_time").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-work").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-low").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-news_research").check();
  await page.getByTestId("onboarding-next").click();

  await expect(page.getByTestId("task-context")).toContainText("pesquisar uma notícia");
  await expect(page.getByTestId("confidence-support")).toBeVisible();
  const layout = await page.locator(".app-shell").evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  const nextButton = await page.getByTestId("start-lesson").boundingBox();
  expect(nextButton?.width).toBeGreaterThanOrEqual(44);
  expect(nextButton?.height).toBeGreaterThanOrEqual(44);

  await page.getByTestId("start-lesson").click();
  await page.getByTestId(`output-${activity.evaluation.betterOutputId}`).focus();
  await page.keyboard.press("Space");
  for (const criterionId of activity.evaluation.requiredCriterionIds) {
    await page.getByTestId(`criterion-${criterionId}`).check();
  }
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("finish-lesson").click();
  await expect(page.getByTestId("result-screen")).toBeVisible();

  const progress = await page.evaluate(
    () =>
      new Promise<unknown>((resolve, reject) => {
        const request = indexedDB.open("literacydojo");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const read = db
            .transaction("progress", "readonly")
            .objectStore("progress")
            .get("learner-progress");
          read.onerror = () => reject(read.error);
          read.onsuccess = () => resolve(read.result);
        };
      }),
  );
  expect(progress).toMatchObject({
    onboarding: {
      completed: true,
      goal: "save_time",
      context: "work",
      confidence: "low",
      taskCategory: "news_research",
    },
  });
  expect(JSON.stringify(progress)).not.toContain("freeText");
  expect(externalRequests).toEqual([]);
});

import { expect, test } from "@playwright/test";
import { isValidEvidenceRecord } from "../src/domain/evidence";
import {
  activity,
  answerRight,
  completeOnboarding,
  mapInitial,
  readEvidence,
  readProgress,
  wrongOutput,
} from "./support";

test("readiness literacy-retry: Mapa Inicial encaminha erro, dica e nova tentativa para a rota guiada", async ({
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

test("readiness literacy-happy-path and literacy-resume: acerto de primeira encaminha para a rota intermediária", async ({
  page,
}) => {
  await completeOnboarding(page);
  await answerRight(page);

  await expect(page.getByTestId("route-explanation")).toContainText("logo de primeira");
  await page.getByTestId("next-lesson").click();
  await expect(
    page.getByRole("heading", { name: "O que a IA faz bem e onde costuma falhar" }),
  ).toBeVisible({ timeout: 15_000 });
  await page.reload();
  // resumeSession retoma a lição in_progress no intro persistido (ver LessonScreen + useCases).
  await expect(page.getByTestId("lesson-intro")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "O que a IA faz bem e onde costuma falhar" }),
  ).toBeVisible();
  const progress = await readProgress(page);
  expect(progress?.lessonStatus?.l02).toBe("completed");
  expect(progress?.currentLessonId).toBe("l03");

  const records = await readEvidence(page);
  expect(records).toHaveLength(1);
  expect(records.every(isValidEvidenceRecord)).toBe(true);
});

test("Mapa Inicial continua utilizável em viewport compacto", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== "http://localhost:4173")
      externalRequests.push(request.url());
  });
  await page.goto("/");

  await expect(page.getByTestId("assistant-welcome")).toBeVisible();
  await page.getByTestId("onboarding-next").click();
  const goalOption = page.getByTestId("onboarding-option-save_time");
  await goalOption.focus();
  await expect(goalOption).toBeFocused();
  const focusOutline = await goalOption.locator("..").evaluate((element) => {
    const style = getComputedStyle(element);
    return { color: style.outlineColor, style: style.outlineStyle };
  });
  expect(focusOutline).toEqual({ color: "rgb(73, 56, 199)", style: "solid" });
  await goalOption.check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-work").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-low").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-news_research").check();
  await page.getByTestId("onboarding-next").click();

  await expect(page.getByTestId("map-screen")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mapa da Vila Lume" })).toBeFocused();
  await expect(page.getByTestId("vila-lume-scene")).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  const mapLayout = await page.locator(".app-shell").evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(mapLayout.scrollWidth).toBeLessThanOrEqual(mapLayout.clientWidth);

  await page.getByTestId(`map-start-${mapInitial.id}`).click();
  await expect(page.getByTestId("village-request")).toBeVisible();
  await expect(page.getByTestId("task-context")).toContainText("pesquisar uma notícia");
  await expect(page.getByTestId("confidence-support")).toBeVisible();
  const lessonLayout = await page.locator(".app-shell").evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(lessonLayout.scrollWidth).toBeLessThanOrEqual(lessonLayout.clientWidth);
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

  const progress = await readProgress(page);
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

// AID-271: a missão hospedada recebe do shell do host menos que a viewport
// (iframe interior ~298px com viewport de 320px). Reflow (WCAG 1.4.10) exige
// que nenhuma largura de documento exceda a largura entregue ao iframe.
for (const width of [320, 298]) {
  test(`Reflow: sem scroll horizontal essencial na geometria de iframe @${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 640 });
    await page.goto("/");

    const measure = () =>
      page.evaluate(() => ({
        innerW: window.innerWidth,
        docScrollW: document.scrollingElement.scrollWidth,
      }));
    const expectNoHorizontalOverflow = (
      stage: string,
      m: { innerW: number; docScrollW: number },
    ) => {
      expect(
        m.docScrollW,
        `${stage}@${width}: docScrollW ${m.docScrollW} excede innerW ${m.innerW}`,
      ).toBeLessThanOrEqual(m.innerW);
    };

    await expect(page.getByTestId("assistant-welcome")).toBeVisible();
    expectNoHorizontalOverflow("onboarding", await measure());

    await completeOnboarding(page);
    expectNoHorizontalOverflow("lesson", await measure());

    await answerRight(page);
    await expect(page.getByTestId("result-screen")).toBeVisible();
    expectNoHorizontalOverflow("result", await measure());

    const shell = await page.locator(".app-shell").evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }));
    expect(shell.scrollWidth).toBeLessThanOrEqual(shell.clientWidth);
  });
}

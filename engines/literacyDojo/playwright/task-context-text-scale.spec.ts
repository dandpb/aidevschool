import { expect, test } from "@playwright/test";
import { answerRight } from "./support";

async function fits(page: import("@playwright/test").Page) {
  const dimensions = await page.getByTestId("task-context").evaluate((card) => {
    const text = card.querySelector("div");
    if (!text) throw new Error("texto ausente");
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      textRight: text.getBoundingClientRect().right,
      cardRight: card.getBoundingClientRect().right,
    };
  });
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  expect(dimensions.textRight).toBeLessThanOrEqual(dimensions.cardRight);
}

test("contexto escolhido cabe na introdução e no resultado com texto ampliado", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await page.getByTestId("onboarding-next").click();
  for (const value of ["save_time", "work", "low", "scheduling"]) {
    await page.getByTestId(`onboarding-option-${value}`).check();
    await page.getByTestId("onboarding-next").click();
  }
  await page.getByTestId("map-start-l02").click();
  await expect(page.getByTestId("lesson-intro")).toBeVisible();
  await fits(page);
  const request = page.getByTestId("village-request");
  const lessonContent = await request.evaluate((card) => {
    const caption = card.querySelector("figcaption");
    const heading = card.querySelector("h2");
    if (!caption || !heading) throw new Error("conteúdo da missão ausente");
    const decoration = getComputedStyle(card, "::after");
    return {
      captionRight: caption.getBoundingClientRect().right,
      cardRight: card.getBoundingClientRect().right,
      headingPadding: Number.parseFloat(getComputedStyle(heading).paddingRight),
      decorationInset: Number.parseFloat(decoration.right) + Number.parseFloat(decoration.width),
    };
  });
  expect(lessonContent.captionRight).toBeLessThanOrEqual(lessonContent.cardRight);
  expect(lessonContent.headingPadding).toBeGreaterThanOrEqual(lessonContent.decorationInset);
  await page.getByTestId("start-lesson").click();
  await answerRight(page);
  await expect(page.getByTestId("result-screen")).toBeVisible();
  const resultCard = page.getByTestId("result-task-context");
  await expect(resultCard).toContainText("organizar um agendamento");
  const dimensions = await resultCard.evaluate((card) => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    textRight: card.querySelector("div")?.getBoundingClientRect().right ?? Number.POSITIVE_INFINITY,
    cardRight: card.getBoundingClientRect().right,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  expect(dimensions.textRight).toBeLessThanOrEqual(dimensions.cardRight);
});

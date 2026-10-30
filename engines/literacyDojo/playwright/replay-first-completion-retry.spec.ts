import { expect, test } from "@playwright/test";
import { answerRemainingRight, completeOnboarding, mapInitial, readProgress } from "./support";

test("primeira conclusão após erro pós-commit mantém apresentação de primeira sessão", async ({
  page,
}) => {
  await completeOnboarding(page);
  await answerRemainingRight(page, mapInitial.activities);
  await page.evaluate(() => {
    const original = console.info;
    console.info = (...args) => {
      if (args[0] === "[analytics]" && args[1] === "lesson_completed") {
        console.info = original;
        throw new Error("falha simulada após gravação");
      }
      original(...args);
    };
  });
  await page.getByTestId("finish-lesson").click();
  await expect(page.getByRole("alert")).toContainText("Não foi possível confirmar a conclusão");
  expect((await readProgress(page))?.lessonStatus?.l02).toBe("completed");
  await page.getByTestId("finish-lesson").click();
  await expect(page.getByTestId("result-screen")).toBeVisible();
  await expect(page.getByTestId("next-lesson")).toBeVisible();
  await expect(page.getByTestId("route-explanation")).toBeVisible();
  await expect(page.getByTestId("go-home")).toHaveCount(0);
});

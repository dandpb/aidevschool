import { expect, test } from "@playwright/test";
import { answerRemainingRight, completeOnboarding, mapInitial, readProgress } from "./support";

test("falha ao concluir mantém feedback e permite tentativa deliberada", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await completeOnboarding(page);
  await answerRemainingRight(page, mapInitial.activities);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = () => {
      IDBObjectStore.prototype.put = original;
      throw new DOMException("falha simulada", "QuotaExceededError");
    };
  });
  await page.getByTestId("finish-lesson").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alert")).toContainText("Não foi possível confirmar a conclusão");
  await expect(page.getByTestId("feedback-panel")).toBeVisible();
  await expect(page.getByTestId("finish-lesson")).toBeEnabled();
  await expect(page.getByTestId("finish-lesson")).toBeFocused();
  await expect(page.getByTestId("result-screen")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result-screen")).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("resultado incerto após gravação pode ser conferido ao recarregar", async ({ page }) => {
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
  await expect(page.getByRole("alert")).toContainText("respostas desta sessão serão perdidas");
  expect((await readProgress(page))?.lessonStatus?.l02).toBe("completed");
  await expect(page.getByTestId("result-screen")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("home-screen")).toBeVisible();
  expect((await readProgress(page))?.lessonStatus?.l02).toBe("completed");
  await page.getByTestId("open-map").click();
  await expect(page.getByTestId("map-lesson-l02")).toContainText("Concluída");
});

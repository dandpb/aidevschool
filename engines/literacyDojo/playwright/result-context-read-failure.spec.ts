import { expect, test } from "@playwright/test";
import { answerRemainingRight, completeOnboarding, mapInitial } from "./support";

test("resultado mantém aplicação escolhida sem reler o estado após conclusão", async ({ page }) => {
  await completeOnboarding(page);
  await answerRemainingRight(page, mapInitial.activities);
  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put;
    const originalGet = IDBObjectStore.prototype.get;
    let completedWriteStarted = false;
    Object.assign(window, { resultReadFailures: 0 });
    IDBObjectStore.prototype.put = function (...args) {
      completedWriteStarted = true;
      return originalPut.apply(this, args);
    };
    IDBObjectStore.prototype.get = function (...args) {
      if (completedWriteStarted) {
        (window as unknown as { resultReadFailures: number }).resultReadFailures++;
        throw new Error("LEITURA_RESULTADO_SIMULADA");
      }
      return originalGet.apply(this, args);
    };
  });
  await page.getByTestId("finish-lesson").click();
  await expect(page.getByTestId("result-screen")).toBeVisible();
  await expect(page.getByTestId("result-task-context")).toContainText("organizar um agendamento");
  expect(
    await page.evaluate(
      () => (window as unknown as { resultReadFailures: number }).resultReadFailures,
    ),
  ).toBe(0);
});

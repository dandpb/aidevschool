import { expect, test } from "@playwright/test";
import { seedCorridorProgress } from "./support";

async function openFailedSort(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l01", "l02", "l03"] });
  await page.reload();
  await page.getByTestId("continue-button").click();
  await page.getByTestId("start-checkpoint").click();
  await page.getByTestId("sort-up-passo-uso").click();
  await page.getByTestId("submit-attempt").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
}

for (const viewport of [
  { width: 360, height: 740 },
  { width: 1280, height: 800 },
]) {
  test(`reverificação incorreta apresenta o novo resumo ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openFailedSort(page);
    for (let i = 0; i < 3; i++) await page.getByTestId("sort-down-passo-tarefa").click();
    await page.getByTestId("submit-attempt").focus();
    await page.keyboard.press("Enter");
    const feedback = page.getByTestId("feedback-panel");
    await expect(feedback).toHaveClass(/feedback-fail/);
    await expect(feedback).toBeFocused();
    const rect = await feedback.locator(".feedback-summary").evaluate((node) => {
      const box = node.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom };
    });
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.bottom).toBeLessThanOrEqual(viewport.height);
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("submit-attempt")).toBeFocused();
  });
}

test("rolagem deliberada durante sucesso não é revertida", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openFailedSort(page);
  await page.getByTestId("sort-down-passo-uso").click();
  await page.evaluate(() => {
    const original = IDBTransaction.prototype.addEventListener;
    IDBTransaction.prototype.addEventListener = function (type, listener, options) {
      if (this.mode === "readwrite" && type === "complete" && typeof listener === "function") {
        IDBTransaction.prototype.addEventListener = original;
        return original.call(
          this,
          type,
          (event) => {
            Object.assign(window, { releaseCheckpointScroll: () => listener.call(this, event) });
          },
          options,
        );
      }
      return original.call(this, type, listener, options);
    };
  });
  await page.getByTestId("submit-attempt").focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { releaseCheckpointScroll?: () => void })
        .releaseCheckpointScroll === "function",
  );
  await page.mouse.wheel(0, -10000);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.evaluate(() =>
    (window as unknown as { releaseCheckpointScroll: () => void }).releaseCheckpointScroll(),
  );
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  await expect(page.getByTestId("next-activity")).not.toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

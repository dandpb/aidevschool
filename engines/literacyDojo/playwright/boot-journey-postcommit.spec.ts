import { expect, test } from "@playwright/test";
import { readProgress, seedCorridorProgress } from "./support";

test("troca Dev notificada como falha após commit reconcilia a jornada salva", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l02"], currentLessonId: "l03" });
  await page.addInitScript(() => {
    let puts = 0;
    const originalPut = IDBObjectStore.prototype.put;
    const originalListen = IDBTransaction.prototype.addEventListener;
    Object.assign(window, { testBootPuts: () => puts });
    IDBObjectStore.prototype.put = function (...args) {
      puts++;
      return originalPut.apply(this, args);
    };
    IDBTransaction.prototype.addEventListener = function (type, listener, options) {
      if (this.mode === "readwrite" && type === "complete" && typeof listener === "function") {
        IDBTransaction.prototype.addEventListener = originalListen;
        return originalListen.call(
          this,
          type,
          () => this.dispatchEvent(new Event("error")),
          options,
        );
      }
      return originalListen.call(this, type, listener, options);
    };
  });
  await page.goto("/?journey=dev");
  await expect(page.getByTestId("home-screen")).toBeVisible();
  await expect(page.getByTestId("journey-switch-dev")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("alert")).toContainText("troca de jornada");
  expect((await readProgress(page))?.journeys).toMatchObject({ active: "dev" });
  expect(
    await page.evaluate(() => (window as unknown as { testBootPuts: () => number }).testBootPuts()),
  ).toBe(1);
});

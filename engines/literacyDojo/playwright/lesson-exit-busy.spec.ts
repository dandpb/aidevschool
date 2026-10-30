import { expect, test } from "@playwright/test";
import { completeOnboarding, wrongOutput } from "./support";

test("saída interna espera gravação e volta a funcionar depois", async ({ page }) => {
  await completeOnboarding(page);
  await page.getByTestId(`output-${wrongOutput.id}`).check();
  await page.evaluate(() => {
    const original = IDBTransaction.prototype.addEventListener;
    IDBTransaction.prototype.addEventListener = function (type, listener, options) {
      if (this.mode === "readwrite" && type === "complete" && typeof listener === "function") {
        IDBTransaction.prototype.addEventListener = original;
        return original.call(
          this,
          type,
          (event) => {
            Object.assign(window, { releaseLesson: () => listener.call(this, event) });
          },
          options,
        );
      }
      return original.call(this, type, listener, options);
    };
  });
  await page.getByTestId("submit-attempt").click();
  await page.waitForFunction(
    () => typeof (window as unknown as { releaseLesson?: () => void }).releaseLesson === "function",
  );
  const exit = page.getByRole("button", { name: "Sair da lição" });
  await expect(exit).toHaveAttribute("aria-disabled", "true");
  await exit.focus();
  await page.keyboard.press("Enter");
  await expect(exit).toBeFocused();
  await expect(page.getByTestId("lesson-player")).toBeVisible();
  await page.evaluate(() => (window as unknown as { releaseLesson: () => void }).releaseLesson());
  await expect(page.getByTestId("feedback-panel")).toBeVisible();
  await expect(exit).toHaveAttribute("aria-disabled", "false");
  await exit.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("map-screen")).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { completeOnboarding, wrongOutput } from "./support";

for (const choice of ["exit", "empty", "none"] as const) {
  test(`feedback respeita interação durante a espera: ${choice}`, async ({ page }) => {
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
              Object.assign(window, { releaseAnswer: () => listener.call(this, event) });
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
        typeof (window as unknown as { releaseAnswer?: () => void }).releaseAnswer === "function",
    );
    const exit = page.getByRole("button", { name: "Sair da lição" });
    if (choice === "exit") await exit.focus();
    if (choice === "empty") await page.mouse.click(3, 3);
    await page.evaluate(() => (window as unknown as { releaseAnswer: () => void }).releaseAnswer());
    await expect(page.getByTestId("feedback-panel")).toBeVisible();
    if (choice === "exit") await expect(exit).toBeFocused();
    if (choice === "empty") await expect(page.locator("body")).toBeFocused();
    if (choice === "none") await expect(page.locator("#activity-heading")).toBeFocused();
  });
}

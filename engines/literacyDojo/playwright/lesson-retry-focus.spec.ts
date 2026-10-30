import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./support";

for (const interaction of ["focus", "wheel", "none"] as const) {
  test(`retry atrasado respeita interação posterior: ${interaction}`, async ({ page }) => {
    await completeOnboarding(page);
    await page.getByTestId("output-out-a").check();
    await page.getByTestId("submit-attempt").click();
    await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
    await page.evaluate(() => {
      const original = IDBTransaction.prototype.addEventListener;
      IDBTransaction.prototype.addEventListener = function (type, listener, options) {
        if (this.mode === "readwrite" && type === "complete" && typeof listener === "function") {
          IDBTransaction.prototype.addEventListener = original;
          return original.call(
            this,
            type,
            (event) => {
              Object.assign(window, { releaseRetry: () => listener.call(this, event) });
            },
            options,
          );
        }
        return original.call(this, type, listener, options);
      };
    });
    await page.getByTestId("retry-activity").focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => typeof (window as unknown as { releaseRetry?: () => void }).releaseRetry === "function",
    );
    const exit = page.getByRole("button", { name: "Sair da lição" });
    if (interaction === "focus") await exit.focus();
    if (interaction === "wheel") {
      const beforeWheel = await page.evaluate(() => window.scrollY);
      await page.mouse.wheel(0, -250);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(beforeWheel);
    }
    const scroll = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => (window as unknown as { releaseRetry: () => void }).releaseRetry());
    await expect(page.getByTestId("feedback-panel")).toHaveCount(0);
    if (interaction === "focus") await expect(exit).toBeFocused();
    if (interaction === "wheel") {
      // O feedback removido encurta a página; o navegador pode limitar a rolagem.
      const after = await page.evaluate(() => window.scrollY);
      expect(after).toBeGreaterThan(0);
      expect(after).toBeLessThanOrEqual(scroll);
      await expect(page.locator("#activity-heading")).not.toBeFocused();
    }
    if (interaction === "none") await expect(page.locator("#activity-heading")).toBeFocused();
  });
}

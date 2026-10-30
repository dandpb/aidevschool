import { expect, test } from "@playwright/test";
import { completeOnboarding, wrongOutput } from "./support";

for (const viewport of [
  { width: 360, height: 740 },
  { width: 1280, height: 800 },
]) {
  test(`reverificação incorreta mostra novo resumo ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await completeOnboarding(page);
    await page.getByTestId(`output-${wrongOutput.id}`).check();
    await page.getByTestId("submit-attempt").click();
    await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
    await page.getByTestId("criterion-c-confianca").check();
    await page.getByTestId("submit-attempt").focus();
    await page.keyboard.press("Enter");
    const feedback = page.getByTestId("feedback-panel");
    await expect(feedback).toContainText("0%");
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

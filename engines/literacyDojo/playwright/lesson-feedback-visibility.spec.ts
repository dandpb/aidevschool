import { expect, test } from "@playwright/test";
import { completeOnboarding, wrongOutput } from "./support";

for (const viewport of [
  { width: 360, height: 740 },
  { width: 1280, height: 800 },
]) {
  test(`feedback inicial aparece no viewport ${viewport.width} após verificar`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await completeOnboarding(page);
    await page.getByTestId(`output-${wrongOutput.id}`).check();
    await page.getByTestId("submit-attempt").click();
    const feedback = page.getByTestId("feedback-panel");
    await expect(feedback).toHaveClass(/feedback-fail/);
    await expect(feedback).toBeFocused();
    const rect = await feedback.evaluate((node) => {
      const box = node.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom };
    });
    expect(rect.top).toBeLessThan(viewport.height);
    expect(rect.bottom).toBeGreaterThan(0);
    const summary = await feedback.locator(".feedback-summary").boundingBox();
    expect(summary).not.toBeNull();
    if (!summary) throw new Error("resumo ausente");
    expect(summary.y).toBeGreaterThanOrEqual(0);
    expect(summary.y + summary.height).toBeLessThanOrEqual(viewport.height);
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("submit-attempt")).toBeFocused();
  });
}

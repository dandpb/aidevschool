import { expect, test } from "@playwright/test";
import { activity, completeOnboarding, wrongOutput } from "./support";

test("dica solicitada antes da resposta aparece e permanece após feedback", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await completeOnboarding(page);
  const hint = activity.hints[0];
  expect(hint).toBeTruthy();
  await page.getByTestId("hint-button").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("hints-list")).toContainText(hint);
  await expect(page.getByTestId("feedback-panel")).toHaveCount(0);
  for (const [index, nextHint] of activity.hints.entries()) {
    if (index === 0) continue;
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("hints-list")).toContainText(nextHint);
  }
  await expect(page.getByTestId("hint-button")).toBeFocused();
  await expect(page.getByTestId("hint-button")).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("hints-list").locator("li")).toHaveCount(activity.hints.length);
  await page.getByTestId(`output-${wrongOutput.id}`).check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toBeVisible();
  await expect(page.getByTestId("hints-list")).toHaveCount(1);
  await expect(page.getByTestId("hints-list")).toContainText(hint);
});

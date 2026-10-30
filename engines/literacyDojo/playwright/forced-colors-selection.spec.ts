import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./support";

test("opções mostram seleção e foco em cores forçadas", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await completeOnboarding(page);
  const answer = page.getByTestId("output-out-b");
  const criterion = page.getByTestId("criterion-c-fontes");
  const other = page.getByTestId("criterion-c-limites");
  await expect(answer).toHaveCSS("opacity", "1");
  await expect(criterion).toHaveCSS("opacity", "1");
  expect((await criterion.boundingBox())?.width).toBeGreaterThanOrEqual(16);
  await answer.focus();
  await page.keyboard.press("Space");
  await criterion.focus();
  await page.keyboard.press("Space");
  await other.focus();
  await expect(criterion).toBeChecked();
  await expect(other).not.toBeChecked();
  await expect(other).toBeFocused();
  await expect(other.locator("..")).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Space");
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  await expect(criterion).toBeDisabled();
  await expect(criterion).toBeChecked();
  await expect(criterion).toHaveCSS("opacity", "1");
});

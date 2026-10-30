import { expect, test } from "@playwright/test";
import { answerRight, completeOnboarding } from "./support";

test("progresso distingue conquistas obtidas das ainda pendentes", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await completeOnboarding(page);
  await answerRight(page);
  await page.getByTestId("go-map").click();
  await page.getByTestId("map-back").click();
  await page.getByTestId("open-progress").click();
  const earned = page.getByTestId("achievement-first_lesson");
  const pending = page.getByTestId("achievement-track_complete");
  await expect(earned).toContainText("Conquistada");
  await expect(pending).toContainText("Ainda não conquistada");
  expect(await earned.ariaSnapshot()).toContain("Conquistada");
  expect(await pending.ariaSnapshot()).toContain("Ainda não conquistada");
});

import { expect, test } from "@playwright/test";
import { answerRight, completeOnboarding, readLearnerState, readProgress } from "./support";

test("resultado de repetição mostra pontuação sem prometer XP novo", async ({ page }) => {
  await completeOnboarding(page);
  await answerRight(page);
  await expect(page.getByTestId("result-screen")).toBeVisible();
  const first = await readProgress(page);
  if (!first) throw new Error("progresso ausente");
  const firstState = await readLearnerState(page);
  await expect(page.locator(".result-score")).toContainText("100% de pontuação");
  await expect(page.locator(".result-score")).not.toContainText("XP conquistado");
  await page.getByTestId("go-map").click();
  await page.getByTestId("map-start-l02").click();
  await page.getByTestId("start-lesson").click();
  await answerRight(page);
  await expect(page.getByTestId("result-screen")).toBeVisible();
  const repeated = await readProgress(page);
  expect(repeated?.xp).toBe(first.xp);
  expect((await readLearnerState(page))?.xpLedger).toEqual(firstState?.xpLedger);
  await expect(page.locator(".result-score")).toContainText("100% de pontuação");
  await expect(page.locator(".result-score")).not.toContainText("XP conquistado");
});

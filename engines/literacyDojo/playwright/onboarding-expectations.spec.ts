import { expect, test } from "@playwright/test";
import { readProgress } from "./support";

test("onboarding explica como as escolhas são usadas", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("onboarding-next").click();
  await expect(page.getByTestId("onboarding-screen")).toContainText(
    "Esta escolha não muda os exercícios",
  );
  await page.getByTestId("onboarding-option-save_time").check();
  await page.getByTestId("onboarding-next").click();
  await expect(page.getByTestId("onboarding-screen")).toContainText(
    "Esta escolha não muda os exercícios",
  );
  await page.getByTestId("onboarding-option-work").check();
  await page.getByTestId("onboarding-next").click();
  await expect(page.getByTestId("onboarding-screen")).toContainText("pode mudar a dica inicial");
  await page.getByTestId("onboarding-option-low").check();
  await page.getByTestId("onboarding-next").click();
  await expect(page.getByTestId("onboarding-screen")).toContainText(
    "aplicação sugerida na primeira missão",
  );
  await page.getByTestId("onboarding-option-scheduling").check();
  await page.getByTestId("onboarding-next").click();
  await expect(page.getByTestId("map-screen")).toBeVisible();
  const progress = await readProgress(page);
  expect(progress?.onboarding).toMatchObject({
    goal: "save_time",
    context: "work",
    confidence: "low",
    taskCategory: "scheduling",
  });
  await page.getByTestId("map-start-l02").click();
  await expect(page.getByTestId("task-context")).toContainText("organizar um agendamento");
  await expect(page.getByTestId("confidence-support")).toContainText("Dica de partida");
});

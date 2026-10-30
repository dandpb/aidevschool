import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./support";

test("aviso aparece antes de salvar as escolhas iniciais", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("onboarding-next").click();
  for (const value of ["save_time", "work", "medium"]) {
    await page.getByTestId(`onboarding-option-${value}`).check();
    await page.getByTestId("onboarding-next").click();
  }
  await expect(page.getByTestId("tab-safety-notice")).toContainText("podem sobrescrever");
  await page.getByTestId("onboarding-option-scheduling").check();
  await page.getByTestId("onboarding-next").click();
  await expect(page.getByTestId("map-screen")).toBeVisible();
});

test("informa o risco de usar abas simultâneas antes de continuar", async ({ page }) => {
  await completeOnboarding(page);
  await page.getByRole("button", { name: "Sair da lição" }).click();
  await expect(page.getByTestId("tab-safety-notice")).toContainText("podem sobrescrever");
  await page.getByTestId("map-back").click();
  await expect(page.getByTestId("tab-safety-notice")).toContainText(/use apenas uma aba/i);
  await page.getByTestId("open-progress").click();
  await expect(page.getByTestId("tab-safety-notice")).toContainText("podem sobrescrever");
  await page.getByTestId("progress-back").click();
  await page.getByTestId("open-map").click();
  await page.getByTestId("map-start-l02").click();
  await expect(page.getByTestId("tab-safety-notice")).toContainText(/use apenas uma aba/i);
  await expect(page.getByTestId("tab-safety-notice")).toContainText("podem sobrescrever");
});

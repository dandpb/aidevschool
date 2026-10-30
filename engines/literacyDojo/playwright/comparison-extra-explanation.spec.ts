import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./support";

test("feedback explica que a avaliação rejeitou motivo extra", async ({ page }) => {
  await completeOnboarding(page);
  await page.getByTestId("output-out-b").check();
  await page.getByTestId("criterion-c-fontes").check();
  await page.getByTestId("criterion-c-limites").check();
  await page.getByTestId("criterion-c-confianca").check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
  await expect(page.getByTestId("feedback-check-noExtraCriteria")).toContainText(
    "critérios exigidos",
  );
  await page.getByTestId("criterion-c-confianca").uncheck();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
});

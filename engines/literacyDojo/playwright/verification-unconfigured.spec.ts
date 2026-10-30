import { expect, test } from "@playwright/test";
import { answerRight, completeOnboarding } from "./support";

test("resultado não oferece retry impossível quando verificação não está configurada", async ({
  page,
}) => {
  await completeOnboarding(page);
  await answerRight(page);
  const status = page.getByTestId("verification-status");
  await expect(status).toContainText("Verificação independente ainda não está configurada");
  await expect(page.getByTestId("retry-verification")).toHaveCount(0);
  await expect(page.getByTestId("completion-distinction")).toContainText("competência verificada");
  await expect(page.getByTestId("next-lesson")).toBeVisible();
  await page.getByTestId("next-lesson").click();
  await expect(page.getByTestId("lesson-intro")).toBeVisible();
});

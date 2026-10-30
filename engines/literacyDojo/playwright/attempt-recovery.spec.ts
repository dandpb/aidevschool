import { expect, test } from "@playwright/test";
import { completeOnboarding, wrongOutput } from "./support";

test("falha de gravação informa o aprendiz e conserva a resposta para nova tentativa", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await completeOnboarding(page);
  await page.getByTestId(`output-${wrongOutput.id}`).check();
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = () => {
      IDBObjectStore.prototype.put = original;
      throw new DOMException("falha simulada", "QuotaExceededError");
    };
  });
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByRole("alert")).toContainText("Não foi possível confirmar");
  await expect(page.getByRole("alert")).toContainText("pode já ter sido registrada");
  await expect(page.getByTestId(`output-${wrongOutput.id}`)).toBeChecked();
  await expect(page.getByTestId("submit-attempt")).toBeEnabled();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

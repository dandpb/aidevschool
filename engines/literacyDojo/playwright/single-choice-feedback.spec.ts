import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./support";

test("em escolha única, a alternativa não escolhida não é marcada como errada", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active" });
  await completeOnboarding(page);
  await page.getByTestId("output-out-b").check();
  await page.getByTestId("criterion-c-fontes").check();
  await page.getByTestId("criterion-c-limites").check();
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("next-activity").click();
  const wrong = page.getByTestId("option-opt-confia-no-especifico");
  const correct = page.getByTestId("option-opt-verifica-na-fonte");
  await wrong.check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
  await expect(wrong).toHaveAttribute("aria-invalid", "true");
  await expect(correct).not.toHaveAttribute("aria-invalid", "true");
  await expect(correct.locator("..")).not.toHaveClass(/is-invalid/);
  await correct.focus();
  await page.keyboard.press("Space");
  await expect(wrong).not.toHaveAttribute("aria-invalid", "true");
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
});

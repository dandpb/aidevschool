import { expect, test } from "@playwright/test";

test("cada pergunta informa a escolha obrigatória e funciona por teclado", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.getByTestId("onboarding-next").click();
  for (const option of ["save_time", "work", "medium", "scheduling"]) {
    const group = page.getByRole("radiogroup");
    await expect(group).toHaveAttribute("aria-required", "true");
    await expect(group).toHaveAccessibleDescription("Escolha uma opção para continuar.");
    await expect(page.getByText("Escolha uma opção para continuar.")).toBeVisible();
    const next = page.getByTestId("onboarding-next");
    await expect(next).toBeDisabled();
    const radio = page.getByTestId(`onboarding-option-${option}`);
    await radio.focus();
    await page.keyboard.press("Space");
    await expect(radio).toBeChecked();
    await expect(next).toBeEnabled();
    await next.focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("map-screen")).toBeVisible();
});

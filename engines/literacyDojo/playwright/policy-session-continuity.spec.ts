import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./support";

test("boas-vindas informa que os documentos abrem em nova aba", async ({ page }) => {
  await page.goto("/");
  const welcome = page.getByTestId("onboarding-screen");
  for (const name of ["aviso de privacidade", "termos do piloto"]) {
    const link = welcome.getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAccessibleDescription("Abre em nova aba");
    const [policy] = await Promise.all([page.waitForEvent("popup"), link.click()]);
    await expect(policy.locator("nav")).toContainText(/feche esta aba para voltar à jornada/i);
    await policy.close();
  }
  await expect(page.getByTestId("onboarding-next")).toBeVisible();
});

for (const name of ["Privacidade", "Termos do piloto"]) {
  test(`${name} pode ser consultado sem perder a resposta em andamento`, async ({ page }) => {
    await completeOnboarding(page);
    await page.getByTestId("output-out-b").check();
    const link = page.getByRole("contentinfo").getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAccessibleDescription("Abre em nova aba");
    const [policy] = await Promise.all([page.waitForEvent("popup"), link.click()]);
    await expect(policy.locator("nav")).toContainText(/feche esta aba para voltar à jornada/i);
    await expect(page.getByTestId("output-out-b")).toBeChecked();
    await expect(page.getByTestId("lesson-player")).toBeVisible();
    await policy.close();
    await expect(page.getByTestId("output-out-b")).toBeChecked();
  });
}

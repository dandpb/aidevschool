import { expect, test } from "@playwright/test";

test("acesso negado ao armazenamento não é descrito como formato inválido", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => {
    indexedDB.open = () => {
      throw new DOMException("Access to the database is denied", "SecurityError");
    };
  });
  await page.goto("/");
  const recovery = page.getByTestId("error-recovery-screen");
  await expect(recovery).toContainText("Não foi possível acessar o armazenamento deste navegador");
  await expect(recovery).not.toContainText("formato não reconhecido");
  await expect(recovery).not.toContainText("dados estão preservados");
  await expect(recovery).not.toContainText("Access to the database is denied");
  await expect(recovery.getByRole("button", { name: "Recarregar página" })).toBeVisible();
});

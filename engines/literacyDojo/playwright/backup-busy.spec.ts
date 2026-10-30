import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./support";

test("restauração pendente bloqueia ações concorrentes e mantém o foco", async ({ page }) => {
  await completeOnboarding(page);
  await page.getByRole("button", { name: "Sair da lição" }).click();
  await page.getByTestId("map-back").click();
  await page.getByTestId("open-progress").click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-progress").click(),
  ]);
  const path = await download.path();
  if (!path) throw new Error("backup download missing");
  await page.evaluate(() => {
    const original = File.prototype.text;
    Object.assign(window, {
      releaseBackup: () => {},
    });
    File.prototype.text = function () {
      return new Promise((resolve, reject) => {
        Object.assign(window, { releaseBackup: () => original.call(this).then(resolve, reject) });
      });
    };
  });
  const importButton = page.getByTestId("import-progress");
  await importButton.focus();
  await page.getByTestId("import-progress-file").setInputFiles(path);
  await expect(page.getByText("Restaurando backup… aguarde antes de continuar.")).toBeVisible();
  await expect(importButton).toHaveAttribute("aria-disabled", "true");
  await expect(importButton).toBeFocused();
  await page.getByTestId("progress-back").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("progress-screen")).toBeVisible();
  await page.evaluate(() => (window as unknown as { releaseBackup: () => void }).releaseBackup());
  await expect(page.getByTestId("backup-status")).toContainText("Backup restaurado");
  await expect(page.getByTestId("progress-back")).toHaveAttribute("aria-disabled", "false");
  await page.getByTestId("progress-back").click();
  await expect(page.getByTestId("home-screen")).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./support";

test("backup explica conclusão e competência em linguagem acessível", async ({ page }) => {
  await completeOnboarding(page);
  await page.getByRole("button", { name: "Sair da lição" }).click();
  await page.getByTestId("map-back").click();
  await page.getByTestId("open-progress").click();
  const backup = page.getByTestId("progress-backup");
  await expect(backup).toContainText("Concluir uma lição não comprova competência");
  await expect(backup).not.toContainText(/completed|mastered|mastery/);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-progress").click(),
  ]);
  await expect(page.getByTestId("backup-status")).toContainText("não comprova competência");
  const path = await download.path();
  if (!path) throw new Error("backup ausente");
  await page.getByTestId("import-progress-file").setInputFiles(path);
  await expect(page.getByTestId("backup-status")).toContainText("não comprova competência");
  await expect(page.getByTestId("backup-status")).not.toContainText(/completed|mastered|mastery/);
});

import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./support";

test("solicitação de backup não garante que o arquivo foi salvo", async ({ browser }) => {
  const context = await browser.newContext({ acceptDownloads: false });
  try {
    const page = await context.newPage();
    await completeOnboarding(page);
    await page.getByRole("button", { name: "Sair da lição" }).click();
    await page.getByTestId("map-back").click();
    await page.getByTestId("open-progress").click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("export-progress").click(),
    ]);
    expect(await download.failure()).not.toBeNull();
    const status = page.getByTestId("backup-status");
    await expect(status).toContainText("Download solicitado");
    await expect(status).toContainText("Confira se o arquivo foi salvo");
    await expect(status).not.toContainText("Backup baixado");
  } finally {
    await context.close();
  }
});

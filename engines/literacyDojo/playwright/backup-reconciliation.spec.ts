import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { answerRight, completeOnboarding, readProgress } from "./support";

test("erro após restauração atualiza a tela sem afirmar que o arquivo foi aplicado", async ({
  page,
  browser,
}) => {
  await completeOnboarding(page);
  await answerRight(page);
  await page.getByTestId("go-map").click();
  await page.getByTestId("map-back").click();
  await page.getByTestId("open-progress").click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-progress").click(),
  ]);
  const path = await download.path();
  if (!path) throw new Error("backup ausente");
  const buffer = await readFile(path);
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  try {
    const other = await context.newPage();
    await completeOnboarding(other);
    await other.getByRole("button", { name: "Sair da lição" }).click();
    await other.getByTestId("map-back").click();
    await other.getByTestId("open-progress").click();
    await expect(other.getByTestId("progress-xp")).toContainText("0 XP");
    await other.evaluate(() => {
      const original = IDBTransaction.prototype.addEventListener;
      IDBTransaction.prototype.addEventListener = function (type, listener, options) {
        if (this.mode === "readwrite" && type === "complete") {
          IDBTransaction.prototype.addEventListener = original;
          return original.call(this, type, () => this.dispatchEvent(new Event("error")), options);
        }
        return original.call(this, type, listener, options);
      };
    });
    await other.getByTestId("import-progress-file").setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer,
    });
    await expect(other.getByTestId("backup-status")).toContainText("pode já ter ocorrido");
    expect((await readProgress(other))?.xp).toBe(55);
    await expect(other.getByTestId("progress-xp")).toContainText("55 XP");
    await expect(other.getByTestId("backup-status")).not.toContainText("Backup restaurado");
    await other.getByTestId("progress-back").click();
    await expect(other.locator(".product-stats")).toContainText("55 XP");
  } finally {
    await context.close();
  }
});

import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { answerRight, completeOnboarding, readProgress } from "./support";

test("falha de leitura do arquivo permite nova tentativa sem iniciar restauração", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await completeOnboarding(page);
  await page.getByRole("button", { name: "Sair da lição" }).click();
  await page.getByTestId("map-back").click();
  await page.getByTestId("open-progress").click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-progress").click(),
  ]);
  const path = await download.path();
  if (!path) throw new Error("backup ausente");
  const before = await readProgress(page);
  await page.evaluate(() => {
    const original = File.prototype.text;
    Object.assign(window, {
      restoreFileRead: () => {
        File.prototype.text = original;
      },
    });
    File.prototype.text = async () => {
      throw new Error("FALHA_ARQUIVO_SIMULADA");
    };
  });
  const button = page.getByTestId("import-progress");
  await button.focus();
  await page.getByTestId("import-progress-file").setInputFiles(path);
  const status = page.getByTestId("backup-status");
  await expect(status).toContainText("Nenhuma restauração foi iniciada nesta tentativa");
  await expect(status).not.toContainText("FALHA_ARQUIVO_SIMULADA");
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute("aria-disabled", "false");
  expect(await readProgress(page)).toEqual(before);
  await page.evaluate(() =>
    (window as unknown as { restoreFileRead: () => void }).restoreFileRead(),
  );
  await page.getByTestId("import-progress-file").setInputFiles(path);
  await expect(status).toContainText("Backup restaurado");
});

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

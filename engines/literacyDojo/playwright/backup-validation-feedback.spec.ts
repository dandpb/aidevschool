import { expect, test } from "@playwright/test";
import { seedCorridorProgress } from "./support";

test("backup inválido e formato incompatível explicam rejeição antes da escrita", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l02"], currentLessonId: "l03" });
  await page.reload();
  await page.getByTestId("open-progress").click();
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    Object.assign(window, { backupPuts: 0 });
    IDBObjectStore.prototype.put = function (...args) {
      (window as unknown as { backupPuts: number }).backupPuts++;
      return original.apply(this, args);
    };
  });
  const input = page.getByTestId("import-progress-file");
  await input.setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{"),
  });
  const status = page.getByTestId("backup-status");
  await expect(status).toContainText("inválido ou incompleto");
  await expect(status).toContainText("não gravou");
  await input.setInputFiles({
    name: "unsupported.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":5}'),
  });
  await expect(status).toContainText("não é compatível");
  await expect(status).toContainText("não gravou");
  expect(await page.evaluate(() => (window as unknown as { backupPuts: number }).backupPuts)).toBe(
    0,
  );
});

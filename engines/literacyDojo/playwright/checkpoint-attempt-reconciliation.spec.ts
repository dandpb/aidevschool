import { expect, test } from "@playwright/test";
import { readProgress, seedCorridorProgress } from "./support";

test("tentativa incerta no desafio reconcilia progresso sem repetir", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l01", "l02", "l03"] });
  await page.reload();
  await page.getByTestId("continue-button").click();
  await page.getByTestId("start-checkpoint").click();
  await page.evaluate(() => {
    const original = console.info;
    console.info = (...args) => {
      if (args[0] === "[literacy-evidence]") {
        console.info = original;
        throw new Error("falha simulada após gravação");
      }
      original(...args);
    };
  });
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByRole("alert")).toContainText("pode já ter sido registrada");
  await expect(page.locator(".product-stats")).toContainText("10 XP");
  expect((await readProgress(page))?.counters.attempts).toBe(1);
  await page.getByRole("button", { name: "Sair do desafio" }).click();
  await expect(page.getByTestId("map-screen")).toContainText("10 XP");
});

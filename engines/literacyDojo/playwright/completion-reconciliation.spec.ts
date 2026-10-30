import { expect, test } from "@playwright/test";
import { answerRemainingRight, completeOnboarding, mapInitial, readProgress } from "./support";

test("conclusão incerta mostra o progresso salvo sem inventar resultado", async ({ page }) => {
  await completeOnboarding(page);
  await answerRemainingRight(page, mapInitial.activities);
  await page.evaluate(() => {
    const original = console.info;
    console.info = (...args) => {
      if (args[0] === "[analytics]" && args[1] === "lesson_completed") {
        console.info = original;
        throw new Error("falha simulada após gravação");
      }
      original(...args);
    };
  });
  await page.getByTestId("finish-lesson").click();
  await expect(page.getByRole("alert")).toContainText("pode já ter sido registrada");
  await expect(page.locator(".product-stats")).toContainText("55 XP");
  expect((await readProgress(page))?.lessonStatus?.l02).toBe("completed");
  await expect(page.getByTestId("result-screen")).toHaveCount(0);
  await page.getByRole("button", { name: "Sair da lição" }).click();
  await expect(page.getByTestId("map-lesson-l02")).toContainText("Concluída");
  await expect(page.getByTestId("map-lesson-l03")).toContainText("Disponível");
});

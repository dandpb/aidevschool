import { expect, test } from "@playwright/test";
import { answerRight, readProgress, seedCorridorProgress } from "./support";

test("refazer lição antiga preserva retomada da missão em andamento", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, {
    completedLessonIds: ["l02", "l03"],
    currentLessonId: "l04",
    inProgressLessonId: "l04",
    route: "intermediate",
    completedCheckpointModuleIds: ["mod-01"],
  });
  await page.reload();
  await expect(page.getByTestId("lesson-intro")).toContainText("Dê um objetivo claro");
  await page.getByRole("button", { name: "Sair da lição" }).click();
  await page.getByTestId("map-start-l02").click();
  await expect(page.getByTestId("lesson-intro")).toContainText("IA não é uma fonte de verdade");
  expect((await readProgress(page))?.currentLessonId).toBe("l04");
  await page.reload();
  await expect(page.getByTestId("lesson-intro")).toContainText("Dê um objetivo claro");
  await page.getByRole("button", { name: "Sair da lição" }).click();
  await page.getByTestId("map-start-l02").click();
  await page.getByTestId("start-lesson").click();
  await answerRight(page);
  await expect(page.getByTestId("result-screen")).toBeVisible();
  expect((await readProgress(page))?.currentLessonId).toBe("l04");
  await expect(page.getByTestId("next-lesson")).toHaveCount(0);
  await expect(page.getByTestId("go-home")).toBeVisible();
  await expect(page.getByTestId("route-explanation")).toHaveCount(0);
  await page.getByTestId("go-home").click();
  await expect(page.getByTestId("mission-title")).toHaveText("Dê um objetivo claro");
  await page.getByTestId("continue-button").click();
  await expect(page.getByTestId("lesson-intro")).toContainText("Dê um objetivo claro");
});

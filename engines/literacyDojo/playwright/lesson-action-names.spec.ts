import { expect, test } from "@playwright/test";
import { getLesson } from "../src/adapters/generatedContentRepository";
import { readProgress, seedCorridorProgress, writeProgressDoc } from "./support";

test("ações no mapa e progresso identificam a lição de destino", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l02", "l03"], currentLessonId: "l04" });
  const progress = await readProgress(page);
  if (!progress?.lessonStatus) throw new Error("progresso ausente");
  progress.lessonStatus.l04 = "available";
  progress.lessonStatus.l05 = "available";
  await writeProgressDoc(page, progress);
  await page.reload();
  await page.getByTestId("open-map").click();
  await expect(page.getByTestId("map-start-l02")).toHaveAccessibleName(
    `Refazer ${getLesson("l02")?.title}`,
  );
  await expect(page.getByTestId("map-start-l03")).toHaveAccessibleName(
    `Refazer ${getLesson("l03")?.title}`,
  );
  await expect(page.getByTestId("map-start-l04")).toHaveAccessibleName(
    `Começar ${getLesson("l04")?.title}`,
  );
  await page.getByTestId("map-back").click();
  await page.getByTestId("open-progress").click();
  await expect(page.getByTestId("progress-start-l04")).toHaveAccessibleName(
    `Começar ${getLesson("l04")?.title}`,
  );
  await expect(page.getByTestId("progress-start-l05")).toHaveAccessibleName(
    `Começar ${getLesson("l05")?.title}`,
  );
  await page.getByTestId("progress-start-l05").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("lesson-intro")).toContainText(getLesson("l05")?.title ?? "");
});

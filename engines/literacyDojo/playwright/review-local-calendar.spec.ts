import { expect, test } from "@playwright/test";
import { readProgress, seedCorridorProgress, writeProgressDoc } from "./support";

test.use({ timezoneId: "America/New_York" });
test("revisão de ontem continua atrasada após mudança de horário", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-03-09T15:00:00.000Z"));
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l02"], currentLessonId: "l03" });
  const progress = await readProgress(page);
  if (!progress?.lessonStatus) throw new Error("progresso ausente");
  progress.lessonStatus.l03 = "available";
  progress.skills = {
    entender: {
      skillId: "entender",
      attempts: 1,
      passes: 1,
      lastScore: 1,
      lastPracticedAt: "2026-03-01T15:00:00.000Z",
      nextReviewAt: "2026-03-08T15:00:00.000Z",
    },
  } as typeof progress.skills;
  await writeProgressDoc(page, progress);
  await page.reload();
  await expect(page.getByTestId("review-button")).toBeVisible();
  await expect(page.getByTestId("hud-review-due")).toContainText("atrasada 1 dia");
});

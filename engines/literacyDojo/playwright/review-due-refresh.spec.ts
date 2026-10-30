import { expect, test } from "@playwright/test";
import { readProgress, seedCorridorProgress, writeProgressDoc } from "./support";

test("revisão aparece quando vence com a Home aberta", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-30T12:00:00Z") });
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
      lastPracticedAt: "2026-10-29T12:00:00Z",
      nextReviewAt: "2026-10-30T12:01:00Z",
    },
  } as typeof progress.skills;
  await writeProgressDoc(page, progress);
  await page.reload();
  await expect(page.getByTestId("review-button")).toHaveCount(0);
  await page.clock.runFor(60_100);
  await expect(page.getByTestId("review-button")).toBeVisible();
  await expect(page.getByTestId("hud-review-due")).toContainText("devida hoje");
  await expect(page.getByTestId("hud-live-region")).toContainText("1 revisão devida");
  expect((await readProgress(page))?.skills).toEqual(progress.skills);
});

test("data de revisão inválida é informada sem aparecer na agenda", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l02"], currentLessonId: "l03" });
  const progress = await readProgress(page);
  if (!progress) throw new Error("progresso ausente");
  progress.skills = {
    entender: {
      skillId: "entender",
      attempts: 1,
      passes: 1,
      lastScore: 1,
      lastPracticedAt: "2026-10-29T12:00:00Z",
      nextReviewAt: "2026-02-31T12:00:00Z",
    },
  } as typeof progress.skills;
  await writeProgressDoc(page, progress);
  await page.reload();
  await page.getByTestId("open-progress").click();
  const screen = page.getByTestId("progress-screen");
  await expect(screen).toContainText("Algumas datas de revisão estão indisponíveis");
  await expect(screen).toContainText("próxima revisão em data indisponível");
  await expect(screen).not.toContainText("Invalid Date");
  await expect(page.getByTestId("reviews-due")).toHaveCount(0);
  expect((await readProgress(page))?.skills).toEqual(progress.skills);
});

import { expect, test } from "@playwright/test";
import { readProgress, seedCorridorProgress, writeProgressDoc } from "./support";

test.use({ timezoneId: "America/New_York" });
test("a sequência muda ao virar o dia com a tela aberta", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-30T03:59:00Z") });
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: [], currentLessonId: "l02" });
  const progress = await readProgress(page);
  if (!progress?.lessonStatus) throw new Error("progresso ausente");
  progress.lessonStatus.l01 = "locked";
  progress.lessonStatus.l02 = "available";
  progress.streak = { current: 5, longest: 9, lastActivityDate: "2026-10-28" };
  await writeProgressDoc(page, progress);
  await page.reload();
  await expect(page.getByTestId("hud-streak")).toContainText("Sequência: 5 dias");
  await page.clock.fastForward("02:00");
  await expect(page.getByTestId("hud-streak")).toContainText("Sequência: 0 dias");
  await expect(page.locator(".product-stats")).toContainText("🔥 0");
  expect((await readProgress(page))?.streak).toEqual(progress.streak);
});

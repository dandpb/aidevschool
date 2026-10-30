import { expect, test } from "@playwright/test";
import { readProgress, seedCorridorProgress, writeProgressDoc } from "./support";

test.use({ timezoneId: "America/New_York" });
test("uma sequência interrompida não é exibida como atual", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-30T16:00:00Z"));
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: [], currentLessonId: "l02" });
  const progress = await readProgress(page);
  if (!progress?.lessonStatus) throw new Error("progresso ausente");
  progress.lessonStatus.l01 = "locked";
  progress.lessonStatus.l02 = "available";
  progress.streak = { current: 5, longest: 9, lastActivityDate: "2026-10-26" };
  await writeProgressDoc(page, progress);
  await page.reload();
  await expect(page.getByTestId("hud-streak")).toContainText("Sequência: 0 dias");
  await expect(page.getByTestId("hud-live-region")).toContainText("Sequência: 0 dias");
  await expect(page.locator(".product-stats")).toContainText("🔥 0");
  await page.getByTestId("open-map").click();
  await expect(page.locator(".map-summary")).toContainText("0 dias de sequência");
  await page.getByTestId("map-back").click();
  await page.getByTestId("open-progress").click();
  await expect(page.getByTestId("progress-xp")).toContainText(
    "sequência atual de 0 dias (recorde: 9)",
  );
  expect((await readProgress(page))?.streak).toEqual(progress.streak);
  const uncertain = await readProgress(page);
  if (!uncertain) throw new Error("progresso ausente");
  uncertain.streak.lastActivityDate = "2026-11-01";
  await writeProgressDoc(page, uncertain);
  await page.reload();
  await expect(page.getByTestId("hud-streak")).toContainText("Sequência atual indisponível");
  await expect(page.locator(".product-stats")).toContainText("🔥 —");
  await expect(page.getByTestId("hud-live-region")).toContainText("Sequência atual indisponível");
});

import { expect, test } from "@playwright/test";
import { readProgress, seedCorridorProgress, writeProgressDoc } from "./support";

test.use({ timezoneId: "America/New_York" });

test("uma atividade no dia seguinte mantém a sequência depois da mudança de horário", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-03-09T04:30:00Z"));
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: [], currentLessonId: "l02" });
  const progress = await readProgress(page);
  if (!progress?.lessonStatus) throw new Error("progresso ausente");
  progress.lessonStatus.l01 = "locked";
  progress.lessonStatus.l02 = "available";
  progress.streak = { current: 5, longest: 5, lastActivityDate: "2026-03-08" };
  await writeProgressDoc(page, progress);
  await page.reload();
  await page.getByTestId("continue-button").click();
  await page.getByTestId("start-lesson").click();
  await page.getByTestId("output-out-b").check();
  await page.getByTestId("criterion-c-fontes").check();
  await page.getByTestId("criterion-c-limites").check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("next-activity")).toBeVisible();
  expect((await readProgress(page))?.streak).toEqual({
    current: 6,
    longest: 6,
    lastActivityDate: "2026-03-09",
  });
  await page.reload();
  await expect(page.getByTestId("lesson-intro")).toBeVisible();
  await page.getByRole("button", { name: "Sair da lição" }).click();
  await page.getByTestId("map-back").click();
  await expect(page.getByTestId("home-screen")).toContainText("Sequência: 6 dias");
});

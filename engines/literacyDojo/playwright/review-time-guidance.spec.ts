import { expect, test } from "@playwright/test";
import { readProgress, seedCorridorProgress, writeProgressDoc } from "./support";

test.use({ timezoneId: "America/New_York" });

for (const example of [
  {
    now: "2026-10-30T12:00:00Z",
    due: "2026-10-30T12:01:00.123Z",
    date: "30/10/2026",
    text: "08:01 (hora local, UTC-04:00)",
    wait: 60_250,
    displayedMinute: 60_000,
  },
  {
    now: "2026-11-01T05:15:00Z",
    due: "2026-11-01T05:30:00Z",
    date: "01/11/2026",
    text: "01:30 (hora local, UTC-04:00)",
    wait: 900_100,
  },
  {
    now: "2026-11-01T06:15:00Z",
    due: "2026-11-01T06:30:00Z",
    date: "01/11/2026",
    text: "01:30 (hora local, UTC-05:00)",
    wait: 900_100,
  },
  {
    now: "2026-11-01T01:29:00Z",
    due: "2026-11-01T01:30:00Z",
    date: "31/10/2026",
    text: "21:30 (hora local, UTC-04:00)",
    wait: 60_100,
  },
]) {
  test(`a agenda informa o horário local aproximado: ${example.text}`, async ({ page }) => {
    await page.clock.install({ time: new Date(example.now) });
    await page.clock.pauseAt(new Date(example.now));
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
        nextReviewAt: example.due,
      },
    } as typeof progress.skills;
    await writeProgressDoc(page, progress);
    await page.reload();
    await page.getByTestId("open-progress").click();
    await expect(page.getByTestId("reviews-upcoming")).toContainText(example.date);
    await expect(page.getByTestId("reviews-upcoming")).toContainText(example.text);
    await expect(page.getByTestId("reviews-upcoming")).toContainText("por volta de");
    await expect(page.getByTestId("reviews-due")).toHaveCount(0);
    if (example.displayedMinute !== undefined) {
      await page.clock.runFor(example.displayedMinute);
      await expect(page.getByTestId("reviews-due")).toHaveCount(0);
      await page.clock.runFor(example.wait - example.displayedMinute);
    } else {
      await page.clock.runFor(example.wait);
    }
    await expect(page.getByTestId("reviews-due")).toBeVisible();
    expect((await readProgress(page))?.skills).toEqual(progress.skills);
  });
}

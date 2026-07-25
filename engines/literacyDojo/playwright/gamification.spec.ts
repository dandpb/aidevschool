import { expect, test } from "@playwright/test";
import { isValidEvidenceRecord } from "../src/domain/evidence";
import { DAILY_GOAL_XP, MAP_INITIAL_LESSON_ID } from "../src/domain/progress";
import {
  answerRight,
  backdateReviews,
  completeOnboarding,
  readEvidence,
  readProgress,
} from "./support";

test("engajamento após a primeira lição: XP, meta diária, sequência e conquista", async ({
  page,
}) => {
  await completeOnboarding(page);
  await expect(page.locator('[data-testid^="voxel-skill-"]')).toBeVisible();
  await answerRight(page);

  await expect(page.getByTestId("new-achievements")).toContainText("Primeira lição");
  await expect(page.locator('[data-testid^="voxel-skill-"]')).toBeVisible();

  await page.getByTestId("go-map").click();
  await page.getByTestId("map-back").click();

  await expect(page.getByTestId("xp-value")).toContainText("35 XP");
  await expect(page.getByTestId("streak-value")).toContainText("1 dia");
  await expect(page.getByTestId("daily-goal")).toContainText(`/${DAILY_GOAL_XP} XP ✅`);
  await expect(page.getByTestId("track-progress")).toContainText("1 de");

  await page.getByTestId("open-progress").click();
  await expect(page.getByTestId("achievement-first_lesson")).toContainText("🏆");
  await expect(page.getByTestId("achievement-track_complete")).toContainText("🔒");
  await expect(page.getByTestId("skill-list")).toContainText("tentativa");
  await expect(page.getByTestId("reviews-upcoming")).toBeVisible();
});

test("revisão espaçada vencida: refaz a lição, emite evidência de revisão e não muda a trilha", async ({
  page,
}) => {
  await completeOnboarding(page);
  await answerRight(page);
  await page.getByTestId("go-map").click();
  await page.getByTestId("map-back").click();

  await backdateReviews(page);
  await page.reload();
  await expect(page.getByTestId("review-button")).toBeVisible();
  await page.getByTestId("review-button").click();

  await expect(page.getByTestId("lesson-intro")).toContainText("Revisão:");
  await page.getByTestId("start-lesson").click();
  await answerRight(page);
  await expect(page.getByTestId("result-screen")).toBeVisible();

  const records = await readEvidence(page);
  expect(records.every(isValidEvidenceRecord)).toBe(true);
  expect(records.map((record) => record.context)).toEqual(["initial", "review"]);

  const progress = await readProgress(page);
  expect(progress).toMatchObject({
    lessonStatus: { [MAP_INITIAL_LESSON_ID]: "completed" },
  });
  // A revisão concede XP de atividade, mas não XP de conclusão de lição (25).
  expect(progress?.xp).toBe(45);
});

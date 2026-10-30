import { expect, test } from "@playwright/test";
import { getSkillTitle } from "../src/adapters/generatedContentRepository";
import { readProgress, seedCorridorProgress, writeProgressDoc } from "./support";

test("revisão da jornada ativa continua acessível quando outra jornada vence primeiro", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, {
    completedLessonIds: ["l02", "l15"],
    currentLessonId: "l03",
    route: "guided",
  });
  const seeded = await readProgress(page);
  if (!seeded || !seeded.lessonStatus) throw new Error("progresso ausente");
  seeded.lessonStatus.l03 = "available";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const skill = (skillId: string, nextReviewAt: string) => ({
    skillId,
    attempts: 1,
    passes: 1,
    lastScore: 1,
    lastPracticedAt: "2020-01-01T00:00:00.000Z",
    nextReviewAt,
  });
  seeded.skills = {
    decidir: skill("decidir", "2020-01-01T00:00:00.000Z"),
    entender: skill("entender", today.toISOString()),
  };
  await writeProgressDoc(page, seeded);
  await page.reload();
  const review = page.getByTestId("review-button");
  await expect(review).toBeVisible();
  await expect(page.getByTestId("hud-review-due")).toContainText("devida hoje");
  const card = page.locator(".card-review");
  await expect(card).toContainText(getSkillTitle("entender"));
  await expect(card).not.toContainText(getSkillTitle("decidir"));
  await review.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("lesson-intro")).toContainText("IA não é uma fonte de verdade");
});

import { expect, test } from "@playwright/test";
import { getSkillTitle } from "../src/adapters/generatedContentRepository";
import { readProgress, seedCorridorProgress, writeProgressDoc } from "./support";

test("revisões no progresso identificam seu destino para teclado e tecnologia assistiva", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l02", "l12"], currentLessonId: "l03" });
  const progress = await readProgress(page);
  if (!progress?.lessonStatus) throw new Error("progresso ausente");
  progress.lessonStatus.l03 = "available";
  const skill = (skillId: string) => ({
    skillId,
    attempts: 1,
    passes: 1,
    lastScore: 1,
    lastPracticedAt: "2020-01-01T00:00:00Z",
    nextReviewAt: "2020-01-02T00:00:00Z",
  });
  progress.skills = {
    entender: skill("entender"),
    proteger: skill("proteger"),
  } as typeof progress.skills;
  await writeProgressDoc(page, progress);
  await page.reload();
  await page.getByTestId("open-progress").click();
  const first = page.getByTestId("progress-review-l02");
  const second = page.getByTestId("progress-review-l12");
  await expect(first).toHaveAccessibleName(
    `Revisar ${getSkillTitle("entender")}: IA não é uma fonte de verdade`,
  );
  await expect(second).toHaveAccessibleName(
    `Revisar ${getSkillTitle("proteger")}: Proteja suas informações`,
  );
  await second.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("lesson-intro")).toContainText("Proteja suas informações");
});

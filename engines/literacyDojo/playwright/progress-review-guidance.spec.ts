import { expect, test } from "@playwright/test";
import { getSkillTitle } from "../src/adapters/generatedContentRepository";
import { readProgress, seedCorridorProgress, writeProgressDoc } from "./support";

test("orientação leva à revisão da outra jornada sem prometer revisão órfã", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, {
    completedLessonIds: ["l02", "l15"],
    currentLessonId: "l03",
    route: "guided",
  });
  const progress = await readProgress(page);
  if (!progress || !progress.lessonStatus) throw new Error("progresso ausente");
  const skill = (skillId: string) => ({
    skillId,
    attempts: 1,
    passes: 1,
    lastScore: 1,
    lastPracticedAt: "2020-01-01T00:00:00.000Z",
    nextReviewAt: "2020-01-02T00:00:00.000Z",
  });
  progress.skills = {
    decidir: skill("decidir"),
    aplicar: skill("aplicar"),
    entender: skill("entender"),
  };
  await writeProgressDoc(page, progress);
  await page.reload();
  await page.getByTestId("open-progress").click();
  const due = page.getByTestId("reviews-due");
  const devRow = due.locator("li").filter({ hasText: getSkillTitle("decidir") });
  await expect(devRow).toContainText("Volte ao início, escolha Jornada Dev");
  await expect(devRow.getByRole("button", { name: "Revisar" })).toHaveCount(0);
  await expect(due.locator("li").filter({ hasText: getSkillTitle("aplicar") })).toContainText(
    "Nenhuma lição concluída disponível",
  );
  await page.getByTestId("progress-back").focus();
  await page.keyboard.press("Enter");
  await page.getByTestId("journey-switch-dev").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("map-back")).toBeVisible();
  await page.getByTestId("map-back").focus();
  await page.keyboard.press("Enter");
  await page.getByTestId("open-progress").focus();
  await page.keyboard.press("Enter");
  await page.getByTestId("progress-review-l15").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("lesson-intro")).toContainText("Quando usar IA e quando não usar");
});

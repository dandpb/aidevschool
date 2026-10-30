import { expect, test } from "@playwright/test";
import { lessons } from "../src/data/generated/lessons";
import { CHECKPOINT_SELECTION } from "../src/domain/checkpoints";
import { readProgress, seedCorridorProgress, solveCheckpointRight } from "./support";

test("cartão concluído não promete revisão quando nenhuma está agendada", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, {
    completedLessonIds: ["l01", "l02", "l03"],
    completedCheckpointModuleIds: ["mod-01"],
    currentLessonId: "l04",
  });
  await page.reload();
  await page.getByTestId("open-progress").click();
  await expect(page.getByTestId("progress-screen")).toContainText("Nenhuma revisão agendada ainda");
  await page.getByTestId("progress-back").click();
  await page.getByTestId("open-map").click();
  await expect(page.getByTestId("checkpoint-cp-01")).not.toContainText(
    "Sua próxima revisão já está agendada",
  );
});

test("resultado do terceiro desafio não promete revisão amanhã sem consultar prazo", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-30T12:00:00Z"));
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, {
    completedLessonIds: [
      "l01",
      "l02",
      "l03",
      "l04",
      "l05",
      "l06",
      "l07",
      "l08",
      "l09",
      "l10",
      "l11",
    ],
    completedCheckpointModuleIds: ["mod-01", "mod-02"],
  });
  await page.reload();
  await page.getByTestId("continue-button").click();
  await page.getByTestId("start-checkpoint").click();
  const checkpoint = CHECKPOINT_SELECTION.find((entry) => entry.id === "cp-03");
  if (!checkpoint) throw new Error("desafio ausente");
  const activities = checkpoint.activityRefs.map((ref) => {
    const activity = lessons
      .find((lesson) => lesson.id === ref.lessonId)
      ?.activities.find((item) => item.id === ref.activityId);
    if (!activity) throw new Error("atividade ausente");
    return activity;
  });
  await solveCheckpointRight(page, activities);
  const scheduled = Object.values((await readProgress(page))?.skills ?? {})
    .map((skill) => skill.nextReviewAt)
    .filter(Boolean);
  expect(scheduled.length).toBeGreaterThan(0);
  expect(
    scheduled.every((date) => Date.parse(date as string) > Date.parse("2026-10-31T23:59:59Z")),
  ).toBe(true);
  await expect(page.getByTestId("checkpoint-result")).not.toContainText(
    "volte amanhã para sua revisão",
  );
  await expect(page.getByTestId("checkpoint-result")).toContainText(
    "Confira suas revisões em Progresso",
  );
});

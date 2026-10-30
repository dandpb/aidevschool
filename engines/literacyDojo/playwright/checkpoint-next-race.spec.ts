import { expect, test } from "@playwright/test";
import { lessons } from "../src/data/generated/lessons";
import { CHECKPOINT_SELECTION } from "../src/domain/checkpoints";
import { answerCheckpointActivityRight, seedCorridorProgress } from "./support";

test("duas ativações no mesmo evento não pulam uma atividade do desafio", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l01", "l02", "l03"], route: "guided" });
  await page.reload();
  await page.getByTestId("continue-button").click();
  await page.getByTestId("start-checkpoint").click();
  const refs = CHECKPOINT_SELECTION.find((entry) => entry.id === "cp-01")?.activityRefs;
  const ref = refs?.[0];
  const first = lessons
    .find((lesson) => lesson.id === ref?.lessonId)
    ?.activities.find((item) => item.id === ref?.activityId);
  if (!first || !refs?.[1]) throw new Error("desafio ausente");
  await answerCheckpointActivityRight(page, first);
  await page.getByTestId("submit-attempt").click();
  const next = page.getByTestId("next-activity");
  await expect(next).toBeVisible();
  await next.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  const second = lessons
    .find((lesson) => lesson.id === refs[1].lessonId)
    ?.activities.find((item) => item.id === refs[1].activityId);
  if (!second) throw new Error("segunda atividade ausente");
  await expect(page.getByRole("heading", { name: second.instruction })).toBeVisible();
  await answerCheckpointActivityRight(page, second);
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("next-activity").click();
  const third = lessons
    .find((lesson) => lesson.id === refs[2].lessonId)
    ?.activities.find((item) => item.id === refs[2].activityId);
  if (!third) throw new Error("terceira atividade ausente");
  await expect(page.getByRole("heading", { name: third.instruction })).toBeVisible();
  await answerCheckpointActivityRight(page, third);
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("finish-checkpoint").click();
  await expect(page.getByTestId("checkpoint-result")).toBeVisible();
  await expect(page.getByTestId("checkpoint-next-lesson")).toBeVisible();
});

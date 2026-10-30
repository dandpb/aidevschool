import { expect, test } from "@playwright/test";
import { lessons } from "../src/data/generated/lessons";
import { CHECKPOINT_SELECTION } from "../src/domain/checkpoints";
import { answerCheckpointActivityRight, readLearnerState, seedCorridorProgress } from "./support";

test("retry depois de conclusão gravada preserva estado e mantém próximo passo", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-30T12:00:00Z") });
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l01", "l02", "l03"] });
  await page.reload();
  await page.getByTestId("continue-button").click();
  await page.getByTestId("start-checkpoint").click();
  const checkpoint = CHECKPOINT_SELECTION.find((entry) => entry.id === "cp-01");
  if (!checkpoint) throw new Error("desafio ausente");
  for (const [index, ref] of checkpoint.activityRefs.entries()) {
    const activity = lessons
      .find((lesson) => lesson.id === ref.lessonId)
      ?.activities.find((item) => item.id === ref.activityId);
    if (!activity) throw new Error("atividade ausente");
    if (index) await page.getByTestId("next-activity").click();
    await answerCheckpointActivityRight(page, activity);
    await page.getByTestId("submit-attempt").click();
    await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  }
  await page.evaluate(() => {
    const original = IDBTransaction.prototype.addEventListener;
    IDBTransaction.prototype.addEventListener = function (type, listener, options) {
      if (this.mode === "readwrite" && type === "complete") {
        IDBTransaction.prototype.addEventListener = original;
        return original.call(this, type, () => this.dispatchEvent(new Event("error")), options);
      }
      return original.call(this, type, listener, options);
    };
  });
  await page.getByTestId("finish-checkpoint").click();
  await expect(page.getByText(/Não foi possível confirmar a conclusão/)).toBeVisible();
  await expect(page.getByTestId("finish-checkpoint")).toHaveAttribute("aria-disabled", "false");
  const before = await readLearnerState(page);
  await page.clock.runFor(2_000);
  await page.getByTestId("finish-checkpoint").click();
  await expect(page.getByTestId("checkpoint-result")).toBeVisible();
  await expect(page.getByTestId("checkpoint-next-lesson")).toBeVisible();
  expect(await readLearnerState(page)).toEqual(before);
  await page.getByTestId("checkpoint-next-lesson").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("lesson-intro")).toContainText("Dê um objetivo claro");
});

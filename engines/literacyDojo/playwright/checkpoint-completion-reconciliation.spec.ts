import { expect, test } from "@playwright/test";
import { lessons } from "../src/data/generated/lessons";
import { CHECKPOINT_SELECTION } from "../src/domain/checkpoints";
import { answerCheckpointActivityRight, readProgress, seedCorridorProgress } from "./support";

test("conclusão incerta do desafio atualiza o mapa sem inventar resultado", async ({ page }) => {
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
  await expect(page.getByRole("alert")).toContainText("pode já ter sido registrada");
  expect((await readProgress(page))?.moduleCheckpoints?.["mod-01"]?.status).toBe("completed");
  await expect(page.getByTestId("checkpoint-result")).toHaveCount(0);
  await page.getByRole("button", { name: "Sair do desafio" }).click();
  await expect(page.getByTestId("map-lesson-l04")).toContainText("Disponível");
  await expect(page.getByTestId("checkpoint-cp-01")).toContainText("concluído");
});

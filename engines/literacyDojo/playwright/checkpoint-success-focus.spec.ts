import { expect, test } from "@playwright/test";
import { lessons } from "../src/data/generated/lessons";
import { CHECKPOINT_SELECTION } from "../src/domain/checkpoints";
import { answerCheckpointActivityRight, seedCorridorProgress } from "./support";

test("após resposta correta o teclado encontra a próxima ação", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l01", "l02", "l03"], route: "guided" });
  await page.reload();
  await expect(page.getByTestId("home-screen")).toBeVisible();
  await expect(page.getByTestId("checkpoint-mission")).toBeVisible();
  await page.getByTestId("continue-button").click();
  await page.getByTestId("start-checkpoint").click();
  const checkpoint = CHECKPOINT_SELECTION.find((entry) => entry.id === "cp-01");
  if (!checkpoint) throw new Error("desafio ausente");
  for (const [index, ref] of checkpoint.activityRefs.entries()) {
    const activity = lessons
      .find((lesson) => lesson.id === ref.lessonId)
      ?.activities.find((item) => item.id === ref.activityId);
    if (!activity) throw new Error("atividade ausente");
    await answerCheckpointActivityRight(page, activity);
    await page.getByTestId("submit-attempt").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
    const next = page.getByTestId(
      index === checkpoint.activityRefs.length - 1 ? "finish-checkpoint" : "next-activity",
    );
    await expect(next).toBeFocused();
    if (index !== checkpoint.activityRefs.length - 1) await page.keyboard.press("Enter");
  }
});

for (const choice of ["heading", "empty"] as const) {
  test(`respeita foco escolhido durante verificação pendente: ${choice}`, async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".product-bar")).toBeVisible();
    await seedCorridorProgress(page, {
      completedLessonIds: ["l01", "l02", "l03"],
      route: "guided",
    });
    await page.reload();
    await page.getByTestId("continue-button").click();
    await page.getByTestId("start-checkpoint").click();
    await expect(page.getByTestId("checkpoint-player")).toBeVisible();
    const ref = CHECKPOINT_SELECTION.find((entry) => entry.id === "cp-01")?.activityRefs[0];
    const activity = lessons
      .find((lesson) => lesson.id === ref?.lessonId)
      ?.activities.find((item) => item.id === ref?.activityId);
    if (!activity) throw new Error("atividade ausente");
    await answerCheckpointActivityRight(page, activity);
    await page.evaluate(() => {
      const original = IDBTransaction.prototype.addEventListener;
      IDBTransaction.prototype.addEventListener = function (type, listener, options) {
        if (this.mode === "readwrite" && type === "complete" && typeof listener === "function") {
          IDBTransaction.prototype.addEventListener = original;
          return original.call(
            this,
            type,
            (event) => {
              Object.assign(window, { releaseCheckpoint: () => listener.call(this, event) });
            },
            options,
          );
        }
        return original.call(this, type, listener, options);
      };
    });
    await page.getByTestId("submit-attempt").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Registrando progresso…")).toBeVisible();
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { releaseCheckpoint?: () => void }).releaseCheckpoint ===
        "function",
    );
    const heading = page.locator("#activity-heading");
    if (choice === "heading") {
      await heading.focus();
      await expect(heading).toBeFocused();
    } else {
      await page.mouse.click(3, 3);
      await expect(page.locator("body")).toBeFocused();
    }
    await page.evaluate(() =>
      (window as unknown as { releaseCheckpoint: () => void }).releaseCheckpoint(),
    );
    await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
    await expect(choice === "heading" ? heading : page.locator("body")).toBeFocused();
  });
}

import { expect, test } from "@playwright/test";
import { lessons } from "../src/data/generated/lessons";
import { CHECKPOINT_SELECTION } from "../src/domain/checkpoints";
import { answerCheckpointActivityWrong, seedCorridorProgress } from "./support";

test("reordenar no limite mantém foco e anuncia a nova posição", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l01", "l02", "l03"], route: "guided" });
  await page.reload();
  await expect(page.getByTestId("checkpoint-mission")).toBeVisible();
  await page.getByTestId("continue-button").click();
  await page.getByTestId("start-checkpoint").click();
  await expect(page.getByTestId("checkpoint-player")).toBeVisible();
  const ref = CHECKPOINT_SELECTION.find((entry) => entry.id === "cp-01")?.activityRefs[0];
  const activity = lessons
    .find((lesson) => lesson.id === ref?.lessonId)
    ?.activities.find((item) => item.id === ref?.activityId);
  if (!activity || activity.type !== "sort") throw new Error("ordenação esperada ausente");
  const item = activity.data.items[1];
  const up = page.getByTestId(`sort-up-${item.id}`);
  await up.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".sort-list > li").first()).toHaveAttribute(
    "data-testid",
    `sort-item-${item.id}`,
  );
  await expect(up).toBeFocused();
  await expect(up).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByTestId("sort-move-status")).toHaveAttribute("aria-live", "polite");
  await expect(page.getByTestId("sort-move-status")).toContainText(
    `posição 1 de ${activity.data.items.length}`,
  );
  await page.keyboard.press("Enter");
  await expect(page.locator(".sort-list > li").first()).toHaveAttribute(
    "data-testid",
    `sort-item-${item.id}`,
  );
  const down = page.getByTestId(`sort-down-${item.id}`);
  await down.focus();
  for (let index = 1; index < activity.data.items.length; index += 1) {
    await page.keyboard.press("Enter");
  }
  await expect(page.locator(".sort-list > li").last()).toHaveAttribute(
    "data-testid",
    `sort-item-${item.id}`,
  );
  await expect(down).toBeFocused();
  await expect(down).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByTestId("sort-move-status")).toContainText(
    `posição ${activity.data.items.length} de ${activity.data.items.length}`,
  );
  await page.keyboard.press("Enter");
  await expect(page.locator(".sort-list > li").last()).toHaveAttribute(
    "data-testid",
    `sort-item-${item.id}`,
  );
  await answerCheckpointActivityWrong(page, activity);
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
  await page.getByTestId("retry-activity").click();
  await expect(page.getByTestId("sort-move-status")).toBeEmpty();
});

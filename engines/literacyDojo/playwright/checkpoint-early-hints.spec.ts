import { expect, test } from "@playwright/test";
import { lessons } from "../src/data/generated/lessons";
import { CHECKPOINT_SELECTION } from "../src/domain/checkpoints";
import { answerCheckpointActivityWrong, seedCorridorProgress } from "./support";

test("dicas do desafio aparecem antes da primeira resposta e mantêm foco ao acabar", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l01", "l02", "l03"], route: "guided" });
  await page.reload();
  await page.getByTestId("continue-button").click();
  await page.getByTestId("start-checkpoint").click();
  const hint = page.getByTestId("hint-button");
  await hint.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("hints-list").locator("li")).toHaveCount(1);
  await expect(page.getByTestId("hints-list").locator("li").first()).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("hints-list").locator("li")).toHaveCount(2);
  await expect(hint).toHaveAttribute("aria-disabled", "true");
  await expect(hint).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("hints-list").locator("li")).toHaveCount(2);
  const checkpoint = CHECKPOINT_SELECTION.find((entry) => entry.id === "cp-01");
  const first = checkpoint?.activityRefs[0];
  const activity = lessons
    .find((lesson) => lesson.id === first?.lessonId)
    ?.activities.find((item) => item.id === first?.activityId);
  if (!activity) throw new Error("atividade de desafio ausente");
  await answerCheckpointActivityWrong(page, activity);
  await page.getByTestId("submit-attempt").click();
  await expect(
    page.getByTestId("feedback-panel").getByTestId("hints-list").locator("li"),
  ).toHaveCount(2);
  await page.getByTestId("retry-activity").click();
  await expect(page.getByTestId("hints-list")).toHaveCount(0);
  await expect(hint).toHaveAttribute("aria-disabled", "false");
});

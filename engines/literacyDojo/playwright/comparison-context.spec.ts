import { expect, test } from "@playwright/test";
import { lessons } from "../src/data/generated/lessons";
import { answerCheckpointActivityRight, seedCorridorProgress } from "./support";

for (const lessonId of ["l02", "l08", "l18"]) {
  test(`comparação segue a instrução da atividade em ${lessonId}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".product-bar")).toBeVisible();
    await seedCorridorProgress(page, {
      completedLessonIds:
        lessonId === "l02" ? [] : ["l01", "l02", "l03", "l04", "l05", "l06", "l07"],
      inProgressLessonId: lessonId,
      completedCheckpointModuleIds: lessonId === "l02" ? [] : ["mod-01", "mod-02"],
      route: "guided",
    });
    await page.reload();
    await page.getByTestId("start-lesson").click();
    const lesson = lessons.find((item) => item.id === lessonId);
    if (lessonId === "l18") {
      const first = lesson?.activities[0];
      if (!first) throw new Error("primeira atividade ausente");
      await answerCheckpointActivityRight(page, first);
      await page.getByTestId("submit-attempt").click();
      await page.getByTestId("next-activity").click();
    }
    const activity = lesson?.activities[lessonId === "l18" ? 1 : 0];
    if (!activity || activity.type !== "output_comparison") throw new Error("fixture ausente");
    await expect(page.getByRole("heading", { name: activity.instruction })).toBeVisible();
    const group = page.getByRole("group", {
      name: "Escolha uma opção conforme a instrução da atividade",
    });
    await expect(group).toBeVisible();
    await expect(group.getByRole("radio").first()).toHaveAccessibleName(/Opção A/);
    await group.getByRole("radio").first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(group.getByRole("radio").nth(1)).toBeChecked();
    await expect(group.getByRole("radio").nth(1)).toBeFocused();
    if (lessonId === "l18") {
      await answerCheckpointActivityRight(page, activity);
      await page.getByTestId("output-out-b").check();
      await page.getByTestId("submit-attempt").click();
      await expect(page.getByTestId("feedback-panel")).toContainText("saída A");
    }
    await answerCheckpointActivityRight(page, activity);
    await page.getByTestId("submit-attempt").click();
    await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  });
}

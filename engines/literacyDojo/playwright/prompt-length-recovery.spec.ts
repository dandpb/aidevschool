import { expect, test } from "@playwright/test";
import { lessons } from "../src/data/generated/lessons";
import { answerCheckpointActivityRight, readProgress, seedCorridorProgress } from "./support";

test("texto longo demais é mantido para edição sem gravar tentativa", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, {
    completedLessonIds: ["l01", "l02", "l03", "l04"],
    inProgressLessonId: "l05",
    completedCheckpointModuleIds: ["mod-01"],
    route: "guided",
  });
  await page.reload();
  await page.getByTestId("start-lesson").click();
  const activity = lessons.find((item) => item.id === "l05")?.activities[0];
  if (!activity || activity.type !== "prompt_builder") throw new Error("atividade ausente");
  await answerCheckpointActivityRight(page, activity);
  const field = page.getByTestId(`field-${activity.data.fields[0].id}`);
  const before = await readProgress(page);
  await field.fill("x".repeat(2001));
  await expect(field).toHaveValue("x".repeat(2001));
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(field).toHaveAccessibleDescription(/Este campo está longo demais/);
  await expect(page.getByTestId("submit-attempt")).toBeDisabled();
  expect(await readProgress(page)).toEqual(before);
  await field.fill("x".repeat(2000));
  await expect(page.getByTestId("submit-attempt")).toBeEnabled();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toBeVisible();
  expect((await readProgress(page))?.counters.attempts).toBe((before?.counters.attempts ?? 0) + 1);
});

import { expect, test } from "@playwright/test";
import { answerRight, readProgress, seedCorridorProgress } from "./support";

test("refazer o mapa inicial com dica preserva rota intermediária já escolhida", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, {
    completedLessonIds: ["l02", "l03"],
    currentLessonId: "l04",
    inProgressLessonId: "l04",
    route: "intermediate",
    completedCheckpointModuleIds: ["mod-01"],
  });
  await page.reload();
  await expect(page.getByTestId("lesson-intro")).toBeVisible();
  const before = await readProgress(page);
  await page.getByRole("button", { name: "Sair da lição" }).click();
  await page.getByTestId("map-start-l02").click();
  await page.getByTestId("start-lesson").click();
  await page.getByTestId("hint-button").click();
  await answerRight(page);
  await expect(page.getByTestId("result-screen")).toBeVisible();
  const after = await readProgress(page);
  expect(after?.onboarding).toMatchObject({ route: "intermediate" });
  expect(after?.lessonStatus?.l01).toBe("locked");
  expect(after?.lessonStatus?.l04).toBe("in_progress");
  expect((after?.onboarding as { mapInitial?: unknown }).mapInitial).toEqual(
    (before?.onboarding as { mapInitial?: unknown }).mapInitial,
  );
});

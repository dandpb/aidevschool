import { expect, test } from "@playwright/test";
import { readProgress, seedCorridorProgress, writeProgressDoc } from "./support";

test("um cursor bloqueado não impede abrir uma lição disponível", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: [], currentLessonId: "l03" });
  const progress = await readProgress(page);
  if (!progress?.lessonStatus) throw new Error("progresso ausente");
  progress.lessonStatus.l01 = "locked";
  progress.lessonStatus.l02 = "available";
  progress.lessonStatus.l03 = "locked";
  await writeProgressDoc(page, progress);
  await page.reload();
  await page.getByTestId("continue-button").click();
  await expect(page.getByTestId("lesson-intro")).toBeVisible();
  await expect(page.getByTestId("start-lesson")).toBeVisible();
  expect((await readProgress(page))?.currentLessonId).toBe("l02");
});

test("nenhuma lição disponível não é apresentada como conclusão da jornada", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: [], currentLessonId: "l03" });
  const progress = await readProgress(page);
  if (!progress?.lessonStatus) throw new Error("progresso ausente");
  for (const lessonId of Object.keys(progress.lessonStatus))
    progress.lessonStatus[lessonId] = "locked";
  await writeProgressDoc(page, progress);
  await page.reload();
  await expect(page.getByTestId("mission-unavailable")).toBeVisible();
  await expect(page.getByTestId("mission-done")).toHaveCount(0);
  await page.getByTestId("open-map").click();
  await expect(page.getByTestId("map-screen")).toBeVisible();
});

test("desafio pendente tem prioridade e conclusão real continua visível", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: [] });
  const progress = await readProgress(page);
  if (!progress?.lessonStatus) throw new Error("progresso ausente");
  for (const lessonId of Object.keys(progress.lessonStatus))
    progress.lessonStatus[lessonId] = "completed";
  await writeProgressDoc(page, progress);
  await page.reload();
  await expect(page.getByTestId("checkpoint-mission")).toBeVisible();
  await expect(page.getByTestId("mission-done")).toHaveCount(0);
  const current = await readProgress(page);
  if (!current) throw new Error("progresso ausente");
  for (const moduleId of ["mod-01", "mod-02", "mod-03"]) {
    current.moduleCheckpoints[moduleId] = { status: "completed", bestScore: 1, attempts: 1 };
  }
  await writeProgressDoc(page, current);
  await page.reload();
  await expect(page.getByTestId("mission-done")).toBeVisible();
});

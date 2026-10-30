import { expect, test } from "@playwright/test";
import { readProgress, seedCorridorProgress, writeProgressDoc } from "./support";

test("o desafio não afirma bloquear bairro já disponível", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, {
    completedLessonIds: ["l01", "l02", "l03"],
    currentLessonId: "l04",
  });
  const progress = await readProgress(page);
  if (!progress?.lessonStatus) throw new Error("progresso ausente");
  progress.lessonStatus.l04 = "available";
  await writeProgressDoc(page, progress);
  await page.reload();
  await expect(page.getByTestId("home-screen")).not.toContainText(
    "Complete para desbloquear a primeira missão do próximo bairro",
  );
  await page.getByTestId("open-map").click();
  await expect(page.getByTestId("map-start-l04")).toBeVisible();
  await expect(page.getByTestId("checkpoint-cp-01")).toBeVisible();
  await expect(page.getByTestId("checkpoint-gate-cp-01")).toHaveCount(0);
});

test("gate explica a primeira missão sem afirmar que todo o bairro está fechado", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, {
    completedLessonIds: ["l01", "l02", "l03"],
    currentLessonId: "l05",
  });
  const progress = await readProgress(page);
  if (!progress?.lessonStatus) throw new Error("progresso ausente");
  progress.lessonStatus.l04 = "locked";
  progress.lessonStatus.l05 = "available";
  await writeProgressDoc(page, progress);
  await page.reload();
  await expect(page.getByTestId("home-screen")).toContainText(
    "desbloquear a primeira missão do próximo bairro",
  );
  await page.getByTestId("open-map").click();
  await expect(page.getByTestId("checkpoint-gate-cp-01")).toContainText(
    "desbloquear a primeira missão do próximo bairro",
  );
  await expect(page.getByTestId("map-start-l05")).toBeVisible();
});

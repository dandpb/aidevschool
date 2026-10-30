import { expect, test } from "@playwright/test";
import { readEvidence, readProgress, seedCorridorProgress, writeProgressDoc } from "./support";

test("aprovação parcial alerta para classificação incorreta sem mudar a progressão", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l02"], currentLessonId: "l12" });
  const progress = await readProgress(page);
  if (!progress?.lessonStatus) throw new Error("progresso ausente");
  progress.lessonStatus.l12 = "available";
  await writeProgressDoc(page, progress);
  await page.reload();
  await page.getByTestId("open-map").click();
  await page.getByTestId("map-start-l12").click();
  await page.getByTestId("start-lesson").click();
  for (const id of ["i-senha", "i-site", "i-vaga", "i-legenda"]) {
    await page.getByTestId(`item-${id}-safe`).check();
  }
  for (const id of ["i-planilha", "i-cartao", "i-ata"]) {
    await page.getByTestId(`item-${id}-sensitive`).check();
  }
  await page.getByTestId("submit-attempt").click();
  const feedback = page.getByTestId("feedback-panel");
  await expect(feedback).toHaveClass(/feedback-pass/);
  await expect(feedback.locator(".feedback-summary")).toContainText("pontos para revisar");
  await expect(page.getByTestId("feedback-check-i-senha")).toContainText(
    "Senhas e credenciais nunca",
  );
  const evidence = await readEvidence(page);
  expect(evidence.at(-1)).toMatchObject({ pass: true, deterministicChecks: { "i-senha": false } });
  await expect(page.getByTestId("item-i-senha-safe")).toBeDisabled();
  await page.getByTestId("next-activity").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("item-i-relato-safe")).toBeVisible();
  for (const id of ["i-relato", "i-pergunta"]) await page.getByTestId(`item-${id}-safe`).check();
  for (const id of ["i-print", "i-protocolo", "i-assinatura"])
    await page.getByTestId(`item-${id}-sensitive`).check();
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("next-activity").click();
  await page.getByTestId("option-opt-reduz-e-anonimiza").check();
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("finish-lesson").click();
  await expect(page.getByTestId("result-screen")).toContainText("pontos para revisar");
  await expect(page.getByTestId("result-review-points")).toContainText(
    "Senhas e credenciais nunca",
  );
  await expect(page.getByTestId("result-review-points")).toContainText(
    "Para cada informação abaixo",
  );
  expect((await readProgress(page))?.lessonStatus?.l12).toBe("completed");
});

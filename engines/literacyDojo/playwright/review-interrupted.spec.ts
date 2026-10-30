import { expect, test } from "@playwright/test";
import { answerRight, completeOnboarding, readProgress, writeProgressDoc } from "./support";

test("revisão interrompida após uma resposta continua devida", async ({ page }) => {
  await completeOnboarding(page);
  await answerRight(page);
  await expect(page.getByTestId("result-screen")).toBeVisible();
  const seeded = await readProgress(page);
  if (!seeded) throw new Error("progresso ausente");
  for (const skill of Object.values(seeded.skills)) {
    skill.nextReviewAt = "2020-01-01T00:00:00.000Z";
    (skill as { reviewStage?: number }).reviewStage = 0;
  }
  await writeProgressDoc(page, seeded);
  await page.reload();
  await page.getByTestId("review-button").click();
  await page.getByTestId("start-lesson").click();
  await page.getByTestId("output-out-b").check();
  await page.getByTestId("criterion-c-fontes").check();
  await page.getByTestId("criterion-c-limites").check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("next-activity")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("home-screen")).toBeVisible();
  await expect(page.getByTestId("review-button")).toBeVisible();
  const after = await readProgress(page);
  for (const skill of Object.values(after?.skills ?? {})) {
    expect(skill.nextReviewAt).toBe("2020-01-01T00:00:00.000Z");
    expect((skill as { reviewStage?: number }).reviewStage).toBe(0);
  }
  await page.getByTestId("review-button").click();
  await page.getByTestId("start-lesson").click();
  await answerRight(page);
  await expect(page.getByTestId("result-screen")).toContainText("Revisão concluída");
  const completed = await readProgress(page);
  for (const skill of Object.values(completed?.skills ?? {})) {
    expect(skill.nextReviewAt).not.toBe("2020-01-01T00:00:00.000Z");
    expect((skill as { reviewStage?: number }).reviewStage).toBe(1);
  }
});

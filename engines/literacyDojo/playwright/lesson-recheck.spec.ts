import { expect, test } from "@playwright/test";
import { XP_PER_ACTIVITY_PASS, XP_PER_LESSON_COMPLETE } from "../src/domain/progress";
import {
  answerRight,
  completeOnboarding,
  readEvidence,
  readProgress,
  writeProgressDoc,
  wrongOutput,
} from "./support";

test("corrigir a resposta e verificar de novo atualiza feedback e permite avançar", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.getByTestId(`output-${wrongOutput.id}`).check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
  await page.getByTestId("output-out-b").check();
  await page.getByTestId("criterion-c-fontes").check();
  await page.getByTestId("criterion-c-limites").check();
  await page.getByTestId("submit-attempt").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  await expect(page.getByTestId("next-activity")).toBeFocused();
  const progress = await readProgress(page);
  expect(progress?.counters.attempts).toBe(2);
  expect(progress?.xp).toBe(XP_PER_ACTIVITY_PASS);
  const evidence = await readEvidence(page);
  expect(evidence).toHaveLength(2);
  expect(evidence[1]?.pass).toBe(true);
  await page.keyboard.press("Enter");
  await page.getByTestId("option-opt-verifica-na-fonte").check();
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("next-activity").click();
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("finish-lesson").click();
  await expect(page.getByTestId("result-screen")).toBeVisible();
  const completed = await readProgress(page);
  expect(completed?.lessonStatus?.l02).toBe("completed");
  expect(completed?.xp).toBe(3 * XP_PER_ACTIVITY_PASS + XP_PER_LESSON_COMPLETE);
});

test("reverificação ainda incorreta atualiza o feedback e conserva foco", async ({ page }) => {
  await completeOnboarding(page);
  await page.getByTestId(`output-${wrongOutput.id}`).check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
  await page.getByTestId("criterion-c-confianca").check();
  const submit = page.getByTestId("submit-attempt");
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("feedback-panel")).toContainText("0%");
  await expect(submit).toBeFocused();
  expect((await readProgress(page))?.counters.attempts).toBe(2);
});

test("reverificação respeita foco escolhido enquanto aguarda gravação", async ({ page }) => {
  await completeOnboarding(page);
  await page.getByTestId(`output-${wrongOutput.id}`).check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
  await page.getByTestId("output-out-b").check();
  await page.getByTestId("criterion-c-fontes").check();
  await page.getByTestId("criterion-c-limites").check();
  await page.evaluate(() => {
    const original = IDBTransaction.prototype.addEventListener;
    IDBTransaction.prototype.addEventListener = function (type, listener, options) {
      if (this.mode === "readwrite" && type === "complete" && typeof listener === "function") {
        IDBTransaction.prototype.addEventListener = original;
        return original.call(
          this,
          type,
          (event) => {
            Object.assign(window, { releaseRecheck: () => listener.call(this, event) });
          },
          options,
        );
      }
      return original.call(this, type, listener, options);
    };
  });
  await page.getByTestId("submit-attempt").focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { releaseRecheck?: () => void }).releaseRecheck === "function",
  );
  const exit = page.getByRole("button", { name: "Sair da lição" });
  await exit.focus();
  await page.evaluate(() => (window as unknown as { releaseRecheck: () => void }).releaseRecheck());
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  await expect(exit).toBeFocused();
});

test("reverificação durante revisão mantém agendamento até terminar a sessão", async ({ page }) => {
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
  const before = (await readProgress(page))?.counters.attempts ?? 0;
  await page.getByTestId(`output-${wrongOutput.id}`).check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
  await page.getByTestId("output-out-b").check();
  await page.getByTestId("criterion-c-fontes").check();
  await page.getByTestId("criterion-c-limites").check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  await expect(page.getByTestId("next-activity")).toBeVisible();
  const current = await readProgress(page);
  expect(current?.counters.attempts).toBe(before + 2);
  for (const skill of Object.values(current?.skills ?? {})) {
    expect(skill.nextReviewAt).toBe("2020-01-01T00:00:00.000Z");
    expect((skill as { reviewStage?: number }).reviewStage).toBe(0);
  }
  const evidence = await readEvidence(page);
  expect(evidence.at(-1)).toMatchObject({ context: "review", pass: true });
});

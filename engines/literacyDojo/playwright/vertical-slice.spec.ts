import { type Page, expect, test } from "@playwright/test";
import type {
  ActivityDefinition,
  OutputComparisonActivity,
  PromptBuilderActivity,
  SafetyClassificationActivity,
} from "../src/data/generated/lessons";
import { lessons, modules } from "../src/data/generated/lessons";
import { isValidEvidenceRecord } from "../src/domain/evidence";

/**
 * Fluxo completo da vertical slice (plano seções 10 e 17):
 * onboarding → as 3 lições piloto → resultado, com reload + retomada do ponto
 * salvo e validação do envelope de evidência emitido. O teste é 100% dirigido
 * pelo read model gerado — nenhuma resposta é hardcoded.
 */

const readyEntries = modules
  .flatMap((module) => module.lessons)
  .filter((entry) => entry.hasContent);
const plannedCount = modules
  .flatMap((module) => module.lessons)
  .filter((entry) => !entry.hasContent).length;

const pilotLessons = readyEntries.map((entry) => {
  const lesson = lessons.find((item) => item.id === entry.id);
  if (!lesson) throw new Error(`lição ${entry.id} ausente do read model`);
  return lesson;
});

function rightAnswer(activity: ActivityDefinition) {
  if (activity.type === "output_comparison") {
    return {
      outputId: activity.evaluation.betterOutputId,
      criterionIds: [...activity.evaluation.requiredCriterionIds],
    };
  }
  if (activity.type === "prompt_builder") {
    const values: Record<string, string> = {};
    for (const field of activity.data.fields) {
      const rules = activity.evaluation.fields[field.id] ?? {};
      values[field.id] =
        `${rules.mustIncludeAny?.[0] ?? "texto"} ${"x".repeat(rules.minLength ?? 1)}`;
    }
    return { values };
  }
  if (activity.type === "safety_classification") {
    return { labels: { ...activity.evaluation.classification } };
  }
  throw new Error(`tipo sem helper: ${activity.type}`);
}

async function answerWrong(page: Page, activity: ActivityDefinition) {
  if (activity.type === "output_comparison") {
    const typed = activity as OutputComparisonActivity;
    const wrong = typed.data.outputs.find(
      (output) => output.id !== typed.evaluation.betterOutputId,
    );
    if (!wrong) throw new Error("conteúdo sem segunda saída");
    await page.getByTestId(`output-${wrong.id}`).check();
    return;
  }
  if (activity.type === "prompt_builder") {
    const typed = activity as PromptBuilderActivity;
    for (const field of typed.data.fields) {
      await page.getByTestId(`field-${field.id}`).fill("nada");
    }
    return;
  }
  if (activity.type === "safety_classification") {
    const typed = activity as SafetyClassificationActivity;
    for (const item of typed.data.items) {
      const expected = typed.evaluation.classification[item.id];
      const flipped = expected === "safe" ? "sensitive" : "safe";
      await page.getByTestId(`item-${item.id}-${flipped}`).check();
    }
    return;
  }
  throw new Error(`tipo sem helper: ${activity.type}`);
}

async function answerRight(page: Page, activity: ActivityDefinition) {
  const answer = rightAnswer(activity);
  if (activity.type === "output_comparison") {
    const typed = answer as { outputId: string; criterionIds: string[] };
    await page.getByTestId(`output-${typed.outputId}`).check();
    for (const criterionId of typed.criterionIds) {
      await page.getByTestId(`criterion-${criterionId}`).check();
    }
    return;
  }
  if (activity.type === "prompt_builder") {
    const typed = answer as { values: Record<string, string> };
    for (const [fieldId, value] of Object.entries(typed.values)) {
      await page.getByTestId(`field-${fieldId}`).fill(value);
    }
    return;
  }
  if (activity.type === "safety_classification") {
    const typed = answer as { labels: Record<string, "safe" | "sensitive"> };
    for (const [itemId, value] of Object.entries(typed.labels)) {
      await page.getByTestId(`item-${itemId}-${value}`).check();
    }
    return;
  }
  throw new Error(`tipo sem helper: ${activity.type}`);
}

test("vertical slice: onboarding → 3 lições → resultado, com reload/retomada e evidência válida", async ({
  page,
}) => {
  // --- Onboarding em 3 telas, sem cadastro ---
  await page.goto("/");
  await expect(page.getByTestId("onboarding-screen")).toBeVisible();
  await page.getByTestId("onboarding-option-verify_answers").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-work").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-medium").check();
  await page.getByTestId("onboarding-next").click();

  // --- Lição 1 (output_comparison): erro → dica → retry → acerto → resultado ---
  const [lesson1, lesson2, lesson3] = pilotLessons;
  await expect(page.getByTestId("lesson-intro")).toBeVisible();
  await expect(page.getByRole("heading", { name: lesson1.title })).toBeVisible();
  await page.getByTestId("start-lesson").click();

  const activity1 = lesson1.activities[0];
  await answerWrong(page, activity1);
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toContainText(activity1.feedback.onFailure);

  await page.getByTestId("hint-button").click();
  await expect(page.getByTestId("hints-list")).toContainText(activity1.hints?.[0] ?? "");

  await page.getByTestId("retry-activity").click();
  await answerRight(page, activity1);
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toContainText(
    activity1.feedback.onSuccess ?? "Muito bem!",
  );
  await page.getByTestId("finish-lesson").click();

  await expect(page.getByTestId("result-screen")).toBeVisible();
  await expect(page.getByTestId("result-screen")).toContainText("Lição concluída");
  await expect(page.getByTestId("completion-distinction")).toContainText("competência verificada");

  // --- Reload: retoma na home com a próxima lição pronta para continuar ---
  await page.reload();
  await expect(page.getByTestId("home-screen")).toBeVisible();
  await expect(page.getByTestId("mission-title")).toHaveText(lesson2.title);
  await expect(page.getByTestId("track-progress")).toContainText(
    `1 de ${readyEntries.length} lições concluídas`,
  );

  // --- Lição 2 (prompt_builder) + reload no meio: retoma direto na lição ---
  await page.getByTestId("continue-button").click();
  await expect(page.getByTestId("lesson-intro")).toBeVisible();
  await page.getByTestId("start-lesson").click();

  await page.reload();
  await expect(page.getByTestId("lesson-intro")).toBeVisible();
  await expect(page.getByRole("heading", { name: lesson2.title })).toBeVisible();
  await page.getByTestId("start-lesson").click();

  const activity2 = lesson2.activities[0];
  await answerWrong(page, activity2);
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toContainText(activity2.feedback.onFailure);

  await page.getByTestId("retry-activity").click();
  await answerRight(page, activity2);
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("finish-lesson").click();
  await expect(page.getByTestId("result-screen")).toContainText("Lição concluída");

  // --- Lição 3 (safety_classification) ---
  await page.getByTestId("next-lesson").click();
  await expect(page.getByRole("heading", { name: lesson3.title })).toBeVisible();
  await page.getByTestId("start-lesson").click();

  const activity3 = lesson3.activities[0];
  await answerWrong(page, activity3);
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toContainText(activity3.feedback.onFailure);

  await page.getByTestId("retry-activity").click();
  await answerRight(page, activity3);
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("finish-lesson").click();
  await expect(page.getByTestId("result-screen")).toContainText("Lição concluída");

  // --- Mapa: 3 concluídas + 11 "em breve" ---
  await page.getByTestId("go-map").click();
  await expect(page.getByTestId("map-screen")).toBeVisible();
  await expect(page.getByText("Em breve")).toHaveCount(plannedCount);
  await expect(page.getByText("Concluída")).toHaveCount(readyEntries.length);

  // --- Evidência: envelope validado contra o evidence-contract ---
  // A ponte dev-only espelha os registros em sessionStorage (sobrevive a reloads).
  const records = await page.evaluate(() =>
    JSON.parse(window.sessionStorage.getItem("literacydojo:evidence") ?? "[]"),
  );
  expect(records.length).toBeGreaterThanOrEqual(6);
  for (const record of records) {
    expect(isValidEvidenceRecord(record)).toBe(true);
  }
  const byActivity = new Map<string, { pass: boolean }[]>();
  for (const record of records) {
    const typed = record as { activityId: string; pass: boolean };
    byActivity.set(typed.activityId, [...(byActivity.get(typed.activityId) ?? []), typed]);
  }
  for (const lesson of pilotLessons) {
    const activity = lesson.activities[0];
    const attempts = byActivity.get(activity.id) ?? [];
    expect(attempts.some((attempt) => attempt.pass)).toBe(true);
    expect(attempts.some((attempt) => !attempt.pass)).toBe(true);
  }
});

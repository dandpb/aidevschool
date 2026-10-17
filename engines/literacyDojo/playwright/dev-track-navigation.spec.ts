import { type Page, expect, test } from "@playwright/test";
import { lessons } from "../src/data/generated/lessons";
import { MAP_INITIAL_LESSON_ID } from "../src/domain/progress";
import { answerRight, completeOnboarding, readProgress } from "./support";

/**
 * AID-3584 — Jornada Dev opcional no app standalone (opt-in explícito).
 * Fluxo real fresh/returning: escolher Dev, jogar lição, feedback/concluir,
 * alternar IA/Dev, dois cursores/retomada e reload, idempotência e
 * pré-requisitos negativos — sempre pela UI, sem seeding de storage.
 */

const devLesson = lessons.find((lesson) => lesson.id === "l15");
if (!devLesson) throw new Error("l15 ausente do read model");

type Answerable =
  | { type: "choice"; evaluation: { correctOptionIds: string[] } }
  | {
      type: "output_comparison";
      evaluation: { betterOutputId: string; requiredCriterionIds: string[] };
    }
  | { type: "missing_context"; evaluation: { requiredContextIds: string[] } };

/** Responde corretamente uma atividade de l15 (choice/output_comparison/missing_context). */
async function answerRightOn(page: Page, activity: Answerable) {
  if (activity.type === "choice") {
    for (const optionId of activity.evaluation.correctOptionIds) {
      await page.getByTestId(`option-${optionId}`).check();
    }
    return;
  }
  if (activity.type === "output_comparison") {
    await page.getByTestId(`output-${activity.evaluation.betterOutputId}`).check();
    for (const criterionId of activity.evaluation.requiredCriterionIds) {
      await page.getByTestId(`criterion-${criterionId}`).check();
    }
    return;
  }
  // missing_context: exatamente os contextos exigidos (extras falham no check noExtraContext).
  for (const contextId of activity.evaluation.requiredContextIds) {
    await page.getByTestId(`context-${contextId}`).check();
  }
}

/** Conclui a primeira lição Dev (l15) acertando todas as atividades obrigatórias. */
async function playDevLessonRight(page: Page) {
  await page.getByTestId("start-lesson").click();
  for (const activity of devLesson.activities) {
    await answerRightOn(page, activity as unknown as Answerable);
    await page.getByTestId("submit-attempt").click();
    await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
    if ((await page.getByTestId("next-activity").count()) > 0) {
      await page.getByTestId("next-activity").click();
    }
  }
  await page.getByTestId("finish-lesson").click();
}

/** Onboarding + Mapa Inicial concluídos (returning na IA) + Home visível. */
async function returningLearnerAtHome(page: Page) {
  await completeOnboarding(page);
  await answerRight(page);
  await page.getByTestId("go-map").click();
  await page.getByTestId("map-back").click();
  await expect(page.getByTestId("home-screen")).toBeVisible();
}

async function goHomeFromMap(page: Page) {
  await page.getByTestId("map-back").click();
  await expect(page.getByTestId("home-screen")).toBeVisible();
}

test("fresh: returning IA → opt-in Dev (teclado) → joga l15 → feedback → resultado", async ({
  page,
}) => {
  await returningLearnerAtHome(page);

  // IA é default: card de jornadas presente, Dev não ativo.
  await expect(page.getByTestId("journey-card")).toBeVisible();
  await expect(page.getByTestId("journey-switch-ia_pratica")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Escolha explícita operável por teclado (foco visível + Enter ativa).
  await page.getByTestId("journey-switch-dev").focus();
  await expect(page.getByTestId("journey-switch-dev")).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("map-screen")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mapa da Jornada Dev" })).toBeVisible();
  await expect(page.getByTestId("map-start-l15")).toBeVisible();
  await expect(page.getByTestId("map-lesson-l16")).toContainText("Bloqueada");
  await expect(page.getByTestId("map-start-l01")).toHaveCount(0);

  await page.getByTestId("map-start-l15").click();
  await playDevLessonRight(page);

  await expect(page.getByTestId("result-screen")).toBeVisible();
  await expect(page.getByTestId("result-screen")).toContainText(devLesson.title);

  // Estado persistido: l15 concluída, l16 desbloqueada, IA preservada.
  const progress = await readProgress(page);
  expect(progress?.lessonStatus?.l15).toBe("completed");
  expect(progress?.lessonStatus?.l16).toBe("available");
  expect(progress?.journeys?.active).toBe("dev");
  expect(progress?.lessonStatus?.[MAP_INITIAL_LESSON_ID]).toBe("completed");
});

test("alternar IA/Dev preserva os dois cursores e os statuses de cada trilha", async ({ page }) => {
  await returningLearnerAtHome(page);
  await page.getByTestId("journey-switch-dev").click();
  await expect(page.getByTestId("map-screen")).toBeVisible();

  // Voltar para IA: mapa IA sem lições Dev, cursor IA preservado.
  await goHomeFromMap(page);
  await page.getByTestId("journey-switch-ia_pratica").click();
  await expect(page.getByRole("heading", { name: "Mapa da Vila Lume" })).toBeVisible();
  await expect(page.getByTestId("map-lesson-l15")).toHaveCount(0);

  const afterIa = await readProgress(page);
  expect(afterIa?.journeys?.active).toBe("ia_pratica");
  expect(afterIa?.journeys?.current?.dev).toBe("l15");
  // Rota intermediate (Mapa Inicial de primeira, sem dica): cursor IA em l03.
  expect(afterIa?.currentLessonId).toBe("l03");

  // Dev novamente: cursor Dev retomado, statuses IA intactos.
  await goHomeFromMap(page);
  await page.getByTestId("journey-switch-dev").click();
  await expect(page.getByTestId("map-start-l15")).toBeVisible();

  const afterDev = await readProgress(page);
  expect(afterDev?.lessonStatus?.l15).toBe("available");
  expect(afterDev?.lessonStatus?.[MAP_INITIAL_LESSON_ID]).toBe("completed");
});

test("idempotência: ativação dupla rápida da escolha Dev não duplica nem corrompe estado", async ({
  page,
}) => {
  await returningLearnerAtHome(page);
  const before = await readProgress(page);

  // Duplo clique rápido antes do primeiro switch assentar: a escolha repetida
  // é idempotente (statuses só preenchidos se ausentes; cursores estáveis).
  await page.getByTestId("journey-switch-dev").dblclick();
  await expect(page.getByTestId("map-screen")).toBeVisible();

  const after = await readProgress(page);
  expect(after?.journeys?.active).toBe("dev");
  expect(after?.lessonStatus?.l15).toBe("available");
  for (const id of ["l16", "l17", "l21", "l22", "l23", "l27", "l28", "l29"]) {
    expect(after?.lessonStatus?.[id]).toBe("locked");
  }
  // Nenhum status IA existente mudou de valor.
  for (const [id, status] of Object.entries(before?.lessonStatus ?? {})) {
    expect(after?.lessonStatus?.[id]).toBe(status);
  }
  expect(after?.journeys?.current?.ia_pratica).toBe(before?.currentLessonId);
});

test("retomada: reload com Dev ativa e lição em andamento volta direto ao player", async ({
  page,
}) => {
  await returningLearnerAtHome(page);
  await page.getByTestId("journey-switch-dev").click();
  await page.getByTestId("map-start-l15").click();
  await page.getByTestId("start-lesson").click();
  await expect(page.getByTestId("lesson-player")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("lesson-intro")).toBeVisible();
  await expect(page.getByRole("heading", { name: devLesson.title })).toBeVisible();
});

test("pré-requisitos negativos: só l15 nasce disponível; demais Dev locked", async ({ page }) => {
  await returningLearnerAtHome(page);
  await page.getByTestId("journey-switch-dev").click();

  await expect(page.getByTestId("map-start-l15")).toBeVisible();
  for (const id of ["l16", "l17", "l21", "l22", "l23", "l27", "l28", "l29"]) {
    await expect(page.getByTestId(`map-lesson-${id}`)).toContainText("Bloqueada");
    await expect(page.getByTestId(`map-start-${id}`)).toHaveCount(0);
  }
});

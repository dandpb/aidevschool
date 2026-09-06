import { expect, test } from "@playwright/test";
import { type ActivityDefinition, lessons } from "../src/data/generated/lessons";
import { CHECKPOINT_SELECTION, type CheckpointDefinition } from "../src/domain/checkpoints";
import { isValidEvidenceRecord } from "../src/domain/evidence";
import {
  answerCheckpointActivityRight,
  answerCheckpointActivityWrong,
  answerRight,
  completeOnboarding,
  readEvidence,
  readProgress,
  seedCorridorProgress,
  solveCheckpointRight,
  writeProgressDoc,
} from "./support";

/**
 * Corredor literacy mod-01→03 contínuo (spec AID-915 §5.2, ordem AID-910/E =
 * AID-916): 5 cenários do use case `literacy-standalone-corridor-mod01-03`.
 * Estados de retorno são semeados direto no IndexedDB do canal de teste
 * (harness §4.4 — manipulação de storage só aqui, nunca em produção).
 */

function checkpointActivities(checkpointId: string): ActivityDefinition[] {
  const checkpoint: CheckpointDefinition | undefined = CHECKPOINT_SELECTION.find(
    (entry) => entry.id === checkpointId,
  );
  if (!checkpoint) throw new Error(`checkpoint ausente: ${checkpointId}`);
  return checkpoint.activityRefs.flatMap((ref) => {
    const lesson = lessons.find((entry) => entry.id === ref.lessonId);
    const activity = lesson?.activities.find((item) => item.id === ref.activityId);
    return activity ? [activity] : [];
  });
}

function lessonTitle(lessonId: string): string {
  const lesson = lessons.find((entry) => entry.id === lessonId);
  if (!lesson) throw new Error(`lição ausente do read model: ${lessonId}`);
  return lesson.title;
}

/** Semeia o estado e recarrega esperando a home (perfil novo: onboarding → seed → reload). */
async function seedAndReloadHome(
  page: import("@playwright/test").Page,
  options: Parameters<typeof seedCorridorProgress>[1],
) {
  await page.goto("/");
  // Qualquer superfície bootada serve (onboarding/home/lição retomada): o
  // seeding reescreve o estado inteiro e o reload leva à home.
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, options);
  await page.reload();
  await expect(page.getByTestId("home-screen")).toBeVisible();
}

test("literacy-corridor-happy-path: corredor completo l01→l11 com os 3 desafios, gate e próxima ação", async ({
  page,
}) => {
  await seedAndReloadHome(page, { completedLessonIds: ["l01", "l02", "l03"], route: "guided" });

  // Missão do Home vira o desafio pendente (§3.2).
  await expect(page.getByTestId("checkpoint-mission")).toContainText(
    "Continuar: Desafio do Módulo 1",
  );
  await page.getByTestId("continue-button").click();
  await expect(page.getByTestId("checkpoint-intro")).toBeVisible();
  await page.getByTestId("start-checkpoint").click();
  await solveCheckpointRight(page, checkpointActivities("cp-01"));
  await expect(page.getByTestId("checkpoint-result")).toContainText("Bairro 1 completo!");
  await page.getByTestId("checkpoint-next-lesson").click();
  await expect(page.getByRole("heading", { name: lessonTitle("l04") })).toBeVisible();
  const afterCp01 = await readProgress(page);
  // startLesson marcou l04 em andamento — o gate liberou a entrada do módulo 2.
  expect(afterCp01?.lessonStatus?.l04).toBe("in_progress");
  expect(afterCp01?.moduleCheckpoints?.["mod-01"]?.status).toBe("completed");

  // Módulo 2 concluído (seeding) → desafio 2.
  await seedAndReloadHome(page, {
    completedLessonIds: ["l01", "l02", "l03", "l04", "l05", "l06", "l07"],
    completedCheckpointModuleIds: ["mod-01"],
    route: "guided",
  });
  await expect(page.getByTestId("checkpoint-mission")).toContainText(
    "Continuar: Desafio do Módulo 2",
  );
  await page.getByTestId("continue-button").click();
  await page.getByTestId("start-checkpoint").click();
  await solveCheckpointRight(page, checkpointActivities("cp-02"));
  await expect(page.getByTestId("checkpoint-result")).toContainText("Bairro 2 completo!");
  const afterCp02 = await readProgress(page);
  expect(afterCp02?.lessonStatus?.l08).toBe("available");

  // Módulo 3 concluído (seeding) → desafio 3 = corredor completo (§3.5).
  await seedAndReloadHome(page, {
    completedLessonIds: [
      "l01",
      "l02",
      "l03",
      "l04",
      "l05",
      "l06",
      "l07",
      "l08",
      "l09",
      "l10",
      "l11",
    ],
    completedCheckpointModuleIds: ["mod-01", "mod-02"],
    route: "guided",
  });
  await expect(page.getByTestId("checkpoint-mission")).toContainText(
    "Continuar: Desafio do Módulo 3",
  );
  await page.getByTestId("continue-button").click();
  await page.getByTestId("start-checkpoint").click();
  await solveCheckpointRight(page, checkpointActivities("cp-03"));
  await expect(page.getByTestId("checkpoint-celebration")).toContainText(
    "três primeiros bairros da Vila Lume",
  );
  await page.getByTestId("checkpoint-next-lesson").click();
  await expect(page.getByRole("heading", { name: lessonTitle("l12") })).toBeVisible();

  // Evidência: tentativas de desafio emitem context:"review" com o lessonId
  // ORIGINAL da atividade (schema intacto, §2) — resultado é local-completion.
  const records = await readEvidence(page);
  const reviewRecords = records.filter((record) => record.context === "review");
  expect(reviewRecords.length).toBeGreaterThanOrEqual(11);
  expect(records.every(isValidEvidenceRecord)).toBe(true);
  const final = await readProgress(page);
  expect(final?.moduleCheckpoints?.["mod-03"]?.status).toBe("completed");
  expect(JSON.stringify(final)).not.toContain("mastered");
});

test("literacy-corridor-gate-retry: falha no desafio oferece feedback, dica e retry sem perder conclusões", async ({
  page,
}) => {
  await seedAndReloadHome(page, { completedLessonIds: ["l01", "l02", "l03"], route: "guided" });
  await page.getByTestId("continue-button").click();
  await page.getByTestId("start-checkpoint").click();

  // Erro na 1ª atividade (sort l01-a2): feedback formativo + dica + retry.
  const first = checkpointActivities("cp-01")[0];
  await answerCheckpointActivityWrong(page, first);
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-fail/);
  await page.getByTestId("hint-button").click();
  await expect(page.getByTestId("hints-list")).toBeVisible();
  await page.getByTestId("retry-activity").click();
  await answerCheckpointActivityRight(page, first);
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);

  // Módulo seguinte permanece locked durante o desafio em andamento.
  const mid = await readProgress(page);
  expect(mid?.lessonStatus?.l04).toBe("locked");
  expect(mid?.lessonStatus?.l03).toBe("completed");

  const rest = checkpointActivities("cp-01").slice(1);
  for (const act of rest) {
    await page.getByTestId("next-activity").click();
    await answerCheckpointActivityRight(page, act);
    await page.getByTestId("submit-attempt").click();
    await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  }
  await page.getByTestId("finish-checkpoint").click();
  await expect(page.getByTestId("checkpoint-result")).toContainText("Desafio concluído");
  const after = await readProgress(page);
  expect(after?.lessonStatus?.l04).toBe("available");
  expect(after?.lessonStatus?.l01).toBe("completed");
});

test("literacy-corridor-review-window: janelas [1,7,21] observáveis no storage com tamper controlado (§4.4)", async ({
  page,
}) => {
  await completeOnboarding(page);
  await answerRight(page); // l02 (Mapa Inicial) concluída em D+0
  await expect(page.getByTestId("result-screen")).toBeVisible();

  // D+0 → próxima revisão ≈ agora + 1 dia.
  const dayMs = 86_400_000;
  const stage0 = await readProgress(page);
  const next0 = Date.parse((stage0?.skills?.entender?.nextReviewAt as string | undefined) ?? "");
  expect(next0 - Date.now()).toBeGreaterThan(dayMs * 0.9);
  expect(next0 - Date.now()).toBeLessThan(dayMs * 1.1);

  // Hop 1: tamper → passado → reload → card de revisão → revisão → +7d.
  const skills0 = stage0?.skills ?? {};
  for (const skill of Object.values(skills0)) skill.nextReviewAt = new Date().toISOString();
  if (!stage0) throw new Error("progresso ausente");
  await writeProgressDoc(page, stage0);
  await page.reload();
  await expect(page.getByTestId("home-screen")).toBeVisible();
  await expect(page.getByTestId("review-button")).toBeVisible();
  await page.getByTestId("review-button").click();
  await expect(page.getByTestId("lesson-intro")).toContainText("Revisão");
  await page.getByTestId("start-lesson").click();
  const mapInitial = lessons.find((lesson) => lesson.id === "l02");
  if (!mapInitial) throw new Error("l02 ausente");
  for (const [index, act] of mapInitial.activities.entries()) {
    if (index > 0) await page.getByTestId("next-activity").click();
    await answerCheckpointActivityRight(page, act);
    await page.getByTestId("submit-attempt").click();
    await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  }
  await page.getByTestId("finish-lesson").click();
  await expect(page.getByTestId("result-screen")).toBeVisible();
  const stage1 = await readProgress(page);
  const next1 = Date.parse((stage1?.skills?.entender?.nextReviewAt as string | undefined) ?? "");
  expect(next1 - Date.now()).toBeGreaterThan(dayMs * 6.5);
  expect(next1 - Date.now()).toBeLessThan(dayMs * 7.5);

  // Evidência de revisão emitida com contexto "review".
  const records = await readEvidence(page);
  const reviewRecords = records.filter((record) => record.context === "review");
  expect(reviewRecords.length).toBeGreaterThanOrEqual(3);
  expect(reviewRecords.every(isValidEvidenceRecord)).toBe(true);

  // Hop 2: tamper → revisão → +21d e clamp no último estágio.
  if (!stage1) throw new Error("progresso ausente");
  const skills1 = stage1.skills ?? {};
  for (const skill of Object.values(skills1)) skill.nextReviewAt = new Date().toISOString();
  await writeProgressDoc(page, stage1);
  await page.reload();
  await expect(page.getByTestId("home-screen")).toBeVisible();
  await page.getByTestId("review-button").click();
  await page.getByTestId("start-lesson").click();
  for (const [index, act] of mapInitial.activities.entries()) {
    if (index > 0) await page.getByTestId("next-activity").click();
    await answerCheckpointActivityRight(page, act);
    await page.getByTestId("submit-attempt").click();
    await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  }
  await page.getByTestId("finish-lesson").click();
  await expect(page.getByTestId("result-screen")).toBeVisible();
  const stage2 = await readProgress(page);
  const next2 = Date.parse((stage2?.skills?.entender?.nextReviewAt as string | undefined) ?? "");
  expect(next2 - Date.now()).toBeGreaterThan(dayMs * 20.5);
  expect(next2 - Date.now()).toBeLessThan(dayMs * 21.5);
});

test("literacy-corridor-grandfathered-return: progresso pré-bump preservado, desafios opcionais, revisões devidas", async ({
  page,
}) => {
  await seedAndReloadHome(page, {
    completedLessonIds: ["l01", "l02", "l03", "l04", "l05"],
    route: "guided",
    preBump: true,
    skillsPracticed: true,
  });

  // Nenhum status re-bloqueado/resetado (grandfathering, §3.4). O doc
  // persistido continua schema 3 — a migração v4 roda na LEITURA (memória)
  // e é gravada na próxima gravação; o comportamento observável é o contrato.
  const current = await readProgress(page);
  for (const id of ["l01", "l02", "l03", "l04", "l05"]) {
    expect(current?.lessonStatus?.[id]).toBe("completed");
  }

  // cp-01 aparece como opcional (disponível, não concluído); nada derivado.
  expect(current?.moduleCheckpoints?.["mod-01"]).toBeUndefined();
  await page.getByTestId("open-map").click();
  await expect(page.getByTestId("checkpoint-cp-01")).toBeVisible();
  await expect(page.getByTestId("checkpoint-start-cp-01")).toBeVisible();

  // Regra da migração: revisão devida no 1º retorno pós-bump (§6.4).
  await page.getByTestId("map-back").click();
  await expect(page.getByTestId("review-button")).toBeVisible();
});

test("literacy-corridor-resume-mid-module: retoma lição em andamento e preserva o resumo do módulo", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("assistant-welcome")).toBeVisible();
  await seedCorridorProgress(page, {
    completedLessonIds: ["l01", "l02", "l03", "l04", "l05"],
    inProgressLessonId: "l06",
    completedCheckpointModuleIds: ["mod-01"],
    route: "guided",
  });
  await page.reload();

  // resumeSession leva direto à lição em andamento (l06).
  await expect(page.getByTestId("lesson-intro")).toBeVisible();
  await expect(page.getByRole("heading", { name: lessonTitle("l06") })).toBeVisible();

  // Resumo do módulo preservado + desafio do módulo anterior concluído.
  const current = await readProgress(page);
  expect(current?.lessonStatus?.l04).toBe("completed");
  expect(current?.moduleCheckpoints?.["mod-01"]?.status).toBe("completed");
});

test("literacy-corridor rota intermediate: cp-01 abre sem l01 (risco R1 §8) e libera l04", async ({
  page,
}) => {
  await seedAndReloadHome(page, {
    completedLessonIds: ["l02", "l03"],
    route: "intermediate",
  });
  await expect(page.getByTestId("checkpoint-mission")).toContainText(
    "Continuar: Desafio do Módulo 1",
  );
  await page.getByTestId("continue-button").click();
  await page.getByTestId("start-checkpoint").click();
  await solveCheckpointRight(page, checkpointActivities("cp-01"));
  await expect(page.getByTestId("checkpoint-result")).toContainText("Bairro 1 completo!");
  const after = await readProgress(page);
  expect(after?.lessonStatus?.l01).toBe("locked"); // rota intermediate pula l01
  expect(after?.lessonStatus?.l04).toBe("available");
});

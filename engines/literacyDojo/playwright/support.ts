import { type Frame, type Locator, type Page, expect } from "@playwright/test";
import {
  DB_NAME,
  EVIDENCE_SESSION_KEY,
  PROGRESS_KEY,
  STORE_NAME,
} from "../src/adapters/storageKeys";
import { type ActivityDefinition, lessons } from "../src/data/generated/lessons";
import type { LiteracyEvidenceRecord } from "../src/domain/evidence";
import { MAP_INITIAL_LESSON_ID } from "../src/domain/progress";

const IDB = { name: DB_NAME, store: STORE_NAME, key: PROGRESS_KEY };

type ProgressDoc = Record<string, unknown> & {
  skills: Record<string, { nextReviewAt?: string }>;
  lessonStatus?: Record<string, unknown>;
  moduleCheckpoints?: Record<string, { status?: string }>;
  schemaVersion?: number;
};

/** Fixtures compartilhadas entre os specs: o Mapa Inicial é a porta de entrada de todos os fluxos. */
const found = lessons.find((lesson) => lesson.id === MAP_INITIAL_LESSON_ID);
if (!found || found.activities[0]?.type !== "output_comparison") {
  throw new Error("Mapa Inicial precisa ser uma comparação de respostas");
}
export const mapInitial = found;
export const activity = found.activities[0];

const incorrect = activity.data.outputs.find(
  (output) => output.id !== activity.evaluation.betterOutputId,
);
if (!incorrect) throw new Error("Mapa Inicial sem alternativa incorreta");
export const wrongOutput = incorrect;

export async function completeOnboarding(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("assistant-welcome")).toBeVisible();
  await expect(page.getByTestId("dev-track-teaser")).toContainText("Abrir no OS");
  await expect(page.getByTestId("dev-track-teaser")).toHaveAttribute(
    "href",
    "https://aidevschool-codexdojo-os.netlify.app/?track=dev",
  );
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-save_time").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-work").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-medium").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-scheduling").check();
  await page.getByTestId("onboarding-next").click();
  // O onboarding entrega o mapa da trilha; a lição começa pelo nó do Mapa Inicial.
  await expect(page.getByTestId("map-screen")).toBeVisible();
  await page.getByTestId(`map-start-${MAP_INITIAL_LESSON_ID}`).click();
  await expect(page.getByRole("heading", { name: mapInitial.title })).toBeVisible();
  await page.getByTestId("start-lesson").click();
}

/** Alvo com testids: página standalone ou iframe de missão hospedada. */
type TestTarget = { getByTestId(id: string): Locator };

/**
 * Responde corretamente uma atividade qualquer do Mapa Inicial pelo DOM,
 * dirigido pelo conteúdo gerado (pós-retrofit O3-C1: 3 atividades).
 */
async function answerRightOn(target: TestTarget, act: ActivityDefinition) {
  if (act.type === "output_comparison") {
    await target.getByTestId(`output-${act.evaluation.betterOutputId}`).check();
    for (const criterionId of act.evaluation.requiredCriterionIds) {
      await target.getByTestId(`criterion-${criterionId}`).check();
    }
    return;
  }
  if (act.type === "choice") {
    const correct = new Set(act.evaluation.correctOptionIds);
    for (const option of act.data.options) {
      if (!correct.has(option.id)) continue;
      await target.getByTestId(`option-${option.id}`).check();
      if (!act.data.multiSelect) return;
    }
    return;
  }
  if (act.type === "sort") {
    const order = act.data.items.map((item) => item.id);
    for (const [index, target2] of act.evaluation.expectedOrder.entries()) {
      let position = order.indexOf(target2);
      while (position > index) {
        await target.getByTestId(`sort-up-${target2}`).click();
        order.splice(position - 1, 0, order.splice(position, 1)[0]);
        position -= 1;
      }
    }
    return;
  }
  throw new Error(`tipo sem helper e2e: ${act.type}`);
}

/**
 * Percorre as atividades de `from` em diante acertando cada uma (com
 * next-activity entre elas) — a lição só conclui com o conjunto completo.
 */
export async function answerRemainingRight(
  target: TestTarget,
  activities: ActivityDefinition[],
  from = 0,
) {
  for (const [index, act] of activities.entries()) {
    if (index < from) continue;
    // Avança da atividade anterior (sempre, exceto quando `from` já é a primeira).
    if (index > 0) await target.getByTestId("next-activity").click();
    await answerRightOn(target, act);
    await target.getByTestId("submit-attempt").click();
    await expect(target.getByTestId("feedback-panel")).toContainText(act.feedback.onSuccess ?? "");
  }
}

/** Responde corretamente TODAS as atividades do Mapa Inicial e conclui a lição. */
export async function answerRight(page: Page) {
  await answerRemainingRight(page, mapInitial.activities);
  await page.getByTestId("finish-lesson").click();
}

/** Operação única no object store de progresso (get/put), sem repetir o boilerplate do IndexedDB. */
function idbProgress<T>(page: Page, op: "get" | "put", doc?: ProgressDoc): Promise<T> {
  return page.evaluate(
    ({ name, store, key, op, doc }) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open(name);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const objectStore = open.result
            .transaction(store, op === "get" ? "readonly" : "readwrite")
            .objectStore(store);
          const request = op === "get" ? objectStore.get(key) : objectStore.put(doc, key);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(op === "get" ? request.result : undefined);
        };
      }),
    { ...IDB, op, doc },
  ) as Promise<T>;
}

/** Lê o LearnerProgress persistido no IndexedDB do navegador. */
export function readProgress(page: Page): Promise<ProgressDoc | undefined> {
  return idbProgress(page, "get");
}

/**
 * Escreve o LearnerProgress no IndexedDB (harness de teste do corredor,
 * spec AID-915 §5.2): seeding de estados de retorno sem dirigir a UI toda.
 * Manipulação de storage SOMENTE aqui — nunca em código de produção.
 */
export function writeProgressDoc(page: Page, progress: ProgressDoc): Promise<void> {
  return idbProgress(page, "put", progress);
}

function writeProgress(page: Page, progress: ProgressDoc): Promise<void> {
  return idbProgress(page, "put", progress);
}

/**
 * Antecipa todas as revisões agendadas para o passado — é a única forma de
 * exercitar a revisão espaçada em e2e sem viajar no tempo do sistema.
 */
export async function backdateReviews(page: Page): Promise<void> {
  const progress = await readProgress(page);
  if (!progress) throw new Error("Sem progresso persistido para antecipar revisões");
  const past = new Date(Date.now() - 86_400_000).toISOString();
  for (const skill of Object.values(progress.skills)) {
    if (skill.nextReviewAt) skill.nextReviewAt = past;
  }
  await writeProgress(page, progress);
}

/** Evidência emitida na sessão (espelho dev do EvidenceSink). */
export function readEvidence(page: Page): Promise<LiteracyEvidenceRecord[]> {
  return page.evaluate(
    (key) => JSON.parse(window.sessionStorage.getItem(key) ?? "[]"),
    EVIDENCE_SESSION_KEY,
  );
}

// ---------------------------------------------------------------------------
// Corredor literacy mod-01→03 (spec AID-915): helpers de desafio e seeding.
// ---------------------------------------------------------------------------

/** Responde CORRETAMENTE qualquer atividade dos Desafios de Módulo. */
export async function answerCheckpointActivityRight(target: TestTarget, act: ActivityDefinition) {
  if (act.type === "prompt_builder") {
    for (const field of act.data.fields) {
      const rules = act.evaluation.fields[field.id] ?? {};
      const seed = rules.mustIncludeAny?.[0] ?? field.hint;
      let value = `${seed} com contexto do público e do formato desejado para o trabalho`;
      const minLength = rules.minLength ?? 0;
      while (value.length < minLength) value = `${value} detalhado`;
      await target.getByTestId(`field-${field.id}`).fill(value.slice(0, rules.maxLength));
    }
    return;
  }
  if (act.type === "rubric_review") {
    for (const criterion of act.data.criteria) {
      const verdict = act.evaluation.expectedVerdicts[criterion.id];
      await target.getByTestId(`rubric-${criterion.id}-${verdict}`).check();
    }
    return;
  }
  if (act.type === "sort" || act.type === "choice" || act.type === "output_comparison") {
    await answerRightOn(target, act);
    return;
  }
  throw new Error(`tipo sem helper e2e de acerto: ${act.type}`);
}

/** Responde ERRADAMENTE qualquer atividade dos Desafios (feedback + retry, §3.4). */
export async function answerCheckpointActivityWrong(target: TestTarget, act: ActivityDefinition) {
  if (act.type === "output_comparison") {
    const incorrect = act.data.outputs.find(
      (output) => output.id !== act.evaluation.betterOutputId,
    );
    if (!incorrect) throw new Error("atividade sem alternativa incorreta");
    await target.getByTestId(`output-${incorrect.id}`).check();
    return;
  }
  if (act.type === "choice") {
    const wrongOption = act.data.options.find(
      (option) => !act.evaluation.correctOptionIds.includes(option.id),
    );
    if (!wrongOption) throw new Error("choice sem alternativa incorreta");
    await target.getByTestId(`option-${wrongOption.id}`).check();
    return;
  }
  if (act.type === "sort") {
    // Submete a ordem exibida sem mexer (a ordem inicial só é correta se
    // coincidir com a esperada — nesse caso move o último item para cima).
    const initial = act.data.items.map((item) => item.id);
    const matches = act.evaluation.expectedOrder.every((id, index) => id === initial[index]);
    if (matches) await target.getByTestId(`sort-up-${initial[initial.length - 1]}`).click();
    return;
  }
  if (act.type === "prompt_builder") {
    for (const field of act.data.fields) {
      await target.getByTestId(`field-${field.id}`).fill("x");
    }
    return;
  }
  if (act.type === "rubric_review") {
    for (const criterion of act.data.criteria) {
      const expected = act.evaluation.expectedVerdicts[criterion.id];
      const wrong = expected === "met" ? "not_met" : "met";
      await target.getByTestId(`rubric-${criterion.id}-${wrong}`).check();
    }
    return;
  }
  throw new Error(`tipo sem helper e2e de erro: ${act.type}`);
}

/**
 * Percorre uma sessão inteira de Desafio de Módulo acertando todas as
 * atividades (com next-activity entre elas) e conclui o desafio.
 */
export async function solveCheckpointRight(
  page: Page,
  activities: ActivityDefinition[],
): Promise<void> {
  for (const [index, act] of activities.entries()) {
    if (index > 0) await page.getByTestId("next-activity").click();
    await answerCheckpointActivityRight(page, act);
    await page.getByTestId("submit-attempt").click();
    await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  }
  await page.getByTestId("finish-checkpoint").click();
}

/** Estado do corredor para seeding: progresso inicial + lições concluídas. */
export async function seedCorridorProgress(
  page: Page,
  options: {
    completedLessonIds: string[];
    currentLessonId?: string;
    inProgressLessonId?: string;
    route?: "guided" | "intermediate";
    completedCheckpointModuleIds?: string[];
    /** Coloca o doc como pré-bump (schema 3, contentVersion antiga). */
    preBump?: boolean;
    skillsPracticed?: boolean;
  },
): Promise<void> {
  const modules = (await import("../src/data/generated/lessons")).modules.filter(
    (module) => module.journey === "ia_pratica",
  );
  const { createInitialProgress } = await import("../src/domain/progress");
  const { contentVersion } = await import("../src/data/generated/lessons");
  const progress = createInitialProgress(modules, contentVersion) as unknown as ProgressDoc;
  progress.onboarding = {
    ...(progress.onboarding as object),
    completed: true,
    route: options.route ?? "guided",
  };
  const lessonStatus = progress.lessonStatus as Record<string, unknown>;
  for (const id of options.completedLessonIds) {
    lessonStatus[id] = "completed";
  }
  if (options.inProgressLessonId) {
    lessonStatus[options.inProgressLessonId] = "in_progress";
  }
  if ((options.route ?? "guided") === "intermediate") {
    lessonStatus.l01 = "locked"; // a rota intermediária pula l01 para sempre
  }
  progress.currentLessonId =
    options.currentLessonId ??
    options.inProgressLessonId ??
    options.completedLessonIds[options.completedLessonIds.length - 1] ??
    "l01";
  if (options.skillsPracticed) {
    (progress as { skills?: Record<string, unknown> }).skills = {
      entender: {
        skillId: "entender",
        attempts: 1,
        passes: 1,
        lastScore: 1,
        lastPracticedAt: new Date().toISOString(),
        nextReviewAt: new Date(Date.now() + 86_400_000).toISOString(),
      },
    } as unknown as ProgressDoc["skills"];
  }
  if (options.completedCheckpointModuleIds?.length) {
    const checkpoints =
      (progress as { moduleCheckpoints?: Record<string, unknown> }).moduleCheckpoints ?? {};
    for (const moduleId of options.completedCheckpointModuleIds) {
      checkpoints[moduleId] = {
        status: "completed",
        bestScore: 1,
        attempts: 1,
        completedAt: new Date().toISOString(),
      };
    }
    (progress as { moduleCheckpoints?: Record<string, unknown> }).moduleCheckpoints = checkpoints;
  }
  if (options.preBump) {
    delete (progress as { moduleCheckpoints?: Record<string, unknown> }).moduleCheckpoints;
    progress.schemaVersion = 3;
    progress.contentVersion = "2026-09-04.1";
  }
  await writeProgressDoc(page, progress);
}

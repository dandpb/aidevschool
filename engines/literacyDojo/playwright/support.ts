import { type Page, expect } from "@playwright/test";
import {
  DB_NAME,
  EVIDENCE_SESSION_KEY,
  PROGRESS_KEY,
  STORE_NAME,
} from "../src/adapters/storageKeys";
import { lessons } from "../src/data/generated/lessons";
import type { LiteracyEvidenceRecord } from "../src/domain/evidence";
import { MAP_INITIAL_LESSON_ID } from "../src/domain/progress";

const IDB = { name: DB_NAME, store: STORE_NAME, key: PROGRESS_KEY };

type ProgressDoc = Record<string, unknown> & {
  skills: Record<string, { nextReviewAt?: string }>;
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
  await expect(page.getByTestId("dev-track-teaser")).toHaveAttribute("href", "https://aidevschool-codexdojo-os.netlify.app/?track=dev");
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

/** Responde corretamente a atividade do Mapa Inicial e conclui a lição. */
export async function answerRight(page: Page) {
  await page.getByTestId(`output-${activity.evaluation.betterOutputId}`).check();
  for (const criterionId of activity.evaluation.requiredCriterionIds) {
    await page.getByTestId(`criterion-${criterionId}`).check();
  }
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toContainText(activity.feedback.onSuccess ?? "");
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

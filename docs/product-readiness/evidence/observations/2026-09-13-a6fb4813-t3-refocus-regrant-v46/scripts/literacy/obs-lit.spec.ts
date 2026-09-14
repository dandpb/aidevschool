// QA AID-1763 — walk de observação independente LITERACY (re-grant v46, T3)
// Superfície: http://localhost:4190 (vite dev @ branch
// aid-r7a/t3-refocus-progress-checkpoint-error, a6fb4813).
// Estações mapeiam as assertions "observation" dos cenários readiness
// literacy-standalone-first-lesson e literacy-standalone-corridor-mod01-03.
// Bônus T3 (AID-1755): registra first-hand o contrato de refocus/anúncio —
// live region 'Atividade N de M' no Desafio e foco no h1 do Progresso —
// em superfície real (não só via specs de teste).
import { expect, test } from "@playwright/test";
import {
  answerRemainingRight,
  backdateReviews,
  mapInitial,
  seedCorridorProgress,
} from "../playwright/support";
import { writeFileSync } from "node:fs";

const SHOTS = "/tmp/opencode/aid1763/shots-lit";
const LOG: Record<string, unknown> = {
  base: "http://localhost:4190 (vite dev @ branch aid-r7a/t3-refocus-progress-checkpoint-error)",
  gitPin: "a6fb4813",
};

test("obs 1-3: fronteira de dispositivo, retry sem jargão, próxima-lição nomeável (+T3 progresso)", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("assistant-welcome")).toBeVisible();
  const footerText = await page.locator("footer").innerText();
  LOG.footerDeviceBoundary = footerText;
  expect(footerText).toContain("Seu progresso fica somente neste navegador");
  await page.screenshot({ path: `${SHOTS}/qa1763-litobs-01-welcome-footer.png`, fullPage: true });

  // onboarding manual até o mapa
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-save_time").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-work").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-medium").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-scheduling").check();
  await page.getByTestId("onboarding-next").click();
  await expect(page.getByTestId("map-screen")).toBeVisible();
  await page.getByTestId(`map-start-${mapInitial.id}`).click();
  await expect(page.getByRole("heading", { name: mapInitial.title })).toBeVisible();
  await page.getByTestId("start-lesson").click();

  // estação retry: erro (output errada, sem critérios) → feedback + dica → retry na própria UI
  const a1 = mapInitial.activities[0];
  const wrong = a1.data.outputs.find((o) => o.id !== a1.evaluation.betterOutputId);
  if (!wrong) throw new Error("output errada ausente");
  await page.getByTestId(`output-${wrong.id}`).check();
  await page.getByTestId("submit-attempt").click();
  LOG.wrongAttemptFeedback = await page.getByTestId("feedback-panel").innerText();
  const jargon = /stack trace|exception|localStorage|schemaVersion|undefined|null/i;
  expect(String(LOG.wrongAttemptFeedback)).not.toMatch(jargon);
  await page.getByTestId("hint-button").click();
  await page.screenshot({ path: `${SHOTS}/qa1763-litobs-02-wrong-hint-retry.png`, fullPage: false });
  const retryBtn = page.getByTestId("retry-activity");
  await expect(retryBtn).toBeVisible();
  LOG.retryLabel = await retryBtn.innerText();
  await retryBtn.click();

  // estação happy-path: conclusão → resultado nomeia a próxima ação na linguagem do aprendiz
  await answerRemainingRight(page, mapInitial.activities, 0);
  await page.getByTestId("finish-lesson").click();
  await expect(page.getByTestId("result-screen")).toBeVisible();
  LOG.resultNextAction = await page.getByTestId("result-screen").innerText();
  await page.screenshot({ path: `${SHOTS}/qa1763-litobs-03-result-next.png`, fullPage: true });
  writeFileSync("/tmp/opencode/aid1763/walk-log-lit.json", JSON.stringify(LOG, null, 2));
});

test("obs 4-6: desafio com retry sem linguagem interna (+T3 live region), pós-cp-03 próxima ação, revisão distinta", async ({
  page,
}) => {
  // estação gate-retry no Desafio do Módulo 1 + T3 live region 'Atividade N de M'
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l01", "l02", "l03"], route: "guided" });
  await page.reload();
  await expect(page.getByTestId("home-screen")).toBeVisible();

  // T3 first-hand (AID-1755): tela de Progresso — foco cai no h1 na troca de rota SPA
  await page.getByTestId("open-progress").click();
  await expect(page.getByTestId("progress-screen")).toBeVisible();
  LOG.t3ProgressActiveElement = await page.evaluate(() => document.activeElement?.id);
  LOG.t3ProgressTabindex = await page.locator("#progress-title").getAttribute("tabindex");
  expect(LOG.t3ProgressActiveElement).toBe("progress-title");
  expect(LOG.t3ProgressTabindex).toBe("-1");
  await page.screenshot({ path: `${SHOTS}/qa1763-litobs-04-progress-refocus.png`, fullPage: false });
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });

  await page.getByTestId("continue-button").click();
  await expect(page.getByTestId("checkpoint-intro")).toBeVisible();
  await page.getByTestId("start-checkpoint").click();
  await expect(page.getByTestId("checkpoint-player")).toBeVisible();

  // T3 first-hand: transição de atividade → foco no h1 + status 'Atividade 1 de 3'
  LOG.t3CheckpointActiveElement1 = await page.evaluate(() => document.activeElement?.id);
  LOG.t3CheckpointStatus1 = await page.getByRole("status").innerText();
  expect(LOG.t3CheckpointActiveElement1).toBe("activity-heading");
  expect(LOG.t3CheckpointStatus1).toBe("Atividade 1 de 3");
  await page.screenshot({ path: `${SHOTS}/qa1763-litobs-05-checkpoint-status.png`, fullPage: false });

  // resposta errada na atividade 1 (sort) → feedback formativo + dica, sem linguagem interna
  const { answerCheckpointActivityWrong } = await import("../playwright/support");
  const { lessons } = await import("../src/data/generated/lessons");
  const cp1a1 = lessons
    .find((l) => l.id === "l01")
    ?.activities.find((a) => a.id === "l01-a2");
  if (!cp1a1) throw new Error("l01-a2 ausente");
  await answerCheckpointActivityWrong(page, cp1a1);
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toBeVisible();
  LOG.gateRetryFeedback = await page.getByTestId("feedback-panel").innerText();
  expect(String(LOG.gateRetryFeedback)).not.toMatch(
    /stack trace|exception|localStorage|schemaVersion|undefined|null/i,
  );
  const cpRetry = page.getByTestId("retry-activity");
  await expect(cpRetry).toBeVisible();
  LOG.gateRetryLabel = await cpRetry.innerText();
  await page.screenshot({ path: `${SHOTS}/qa1763-litobs-06-gate-retry.png`, fullPage: false });
  await cpRetry.click();

  // acerta 1 → avança: T3 de novo — status vira 'Atividade 2 de 3' com foco no h1
  const { answerCheckpointActivityRight } = await import("../playwright/support");
  await answerCheckpointActivityRight(page, cp1a1);
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  await page.getByTestId("next-activity").click();
  LOG.t3CheckpointActiveElement2 = await page.evaluate(() => document.activeElement?.id);
  LOG.t3CheckpointStatus2 = await page.getByRole("status").innerText();
  expect(LOG.t3CheckpointActiveElement2).toBe("activity-heading");
  expect(LOG.t3CheckpointStatus2).toBe("Atividade 2 de 3");
  await page.screenshot({ path: `${SHOTS}/qa1763-litobs-07-checkpoint-activity2.png`, fullPage: false });

  // estação pós-cp-03: home/mapa nomeiam a próxima ação após fechar o corredor
  const mod13 = (
    await import("../src/data/generated/lessons")
  ).modules.filter((m) => m.journey === "ia_pratica" && ["mod-01", "mod-02", "mod-03"].includes(m.id ?? ""));
  const corridorIds = mod13.flatMap((m) => m.lessons.map((l) => l.id));
  await seedCorridorProgress(page, {
    completedLessonIds: corridorIds,
    completedCheckpointModuleIds: ["mod-01", "mod-02", "mod-03"],
  });
  await page.reload();
  await expect(page.getByTestId("home-screen")).toBeVisible();
  LOG.postCp03Home = await page.getByTestId("home-screen").innerText();
  await page.screenshot({ path: `${SHOTS}/qa1763-litobs-08-postcp03-home.png`, fullPage: true });
  await page.getByTestId("open-map").click();
  await expect(page.getByTestId("map-screen")).toBeVisible();
  LOG.postCp03MapNextModule = (await page.getByTestId("map-screen").innerText()).slice(0, 900);
  await page.screenshot({ path: `${SHOTS}/qa1763-litobs-09-postcp03-map.png`, fullPage: true });

  // estação janela de revisão: l02 concluída, revisão vencida — distinguível de conteúdo novo
  await seedCorridorProgress(page, { completedLessonIds: ["l02"], skillsPracticed: true });
  await backdateReviews(page);
  await page.reload();
  await expect(page.getByTestId("home-screen")).toBeVisible();
  const reviewBtn = page.getByTestId("review-button");
  await expect(reviewBtn).toBeVisible({ timeout: 10_000 });
  LOG.reviewEntryLabel = await reviewBtn.innerText();
  await reviewBtn.click();
  await expect(page.getByTestId("lesson-intro")).toContainText("Revisão");
  LOG.reviewIntroHeading = await page.getByTestId("lesson-intro").innerText();
  await page.screenshot({ path: `${SHOTS}/qa1763-litobs-10-review-distinct.png`, fullPage: false });
  writeFileSync("/tmp/opencode/aid1763/walk-log-lit2.json", JSON.stringify(LOG, null, 2));
});

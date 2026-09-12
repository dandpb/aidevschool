// QA AID-1428 — walk de observação independente LITERACY (re-anchor v45)
// Superfície: http://localhost:4190 (vite @ branch aid-1425/f1-activation-build, bf00756a).
// Estações mapeiam as assertions "observation" dos cenários readiness
// literacy-standalone-first-lesson e literacy-standalone-corridor-mod01-03.
// Bônus F1 (AID-1425): registra first-hand o bloco first-touch da intro e o
// framing de índice 0 (countersign §3.1/§3.3 em superfície real).
import { expect, test } from "@playwright/test";
import {
  answerRemainingRight,
  backdateReviews,
  mapInitial,
  readProgress,
  seedCorridorProgress,
  writeProgressDoc,
} from "../playwright/support";
import { modules } from "../src/data/generated/lessons";
import { writeFileSync } from "node:fs";

const MAP_INITIAL_LESSON_ID = mapInitial.id;

const SHOTS = "/tmp/opencode/aid1428/shots-lit";
const LOG: Record<string, unknown> = {
  base: "http://localhost:4190 (vite @ branch aid-1425/f1-activation-build)",
  gitPin: "bf00756a",
};
const mod13 = modules.filter((m) => m.journey === "ia_pratica" && ["mod-01", "mod-02", "mod-03"].includes(m.id ?? ""));
const corridorIds = mod13.flatMap((m) => m.lessons.map((l) => l.id));

test("obs 1-3: fronteira de dispositivo, retry sem jargão, próxima-lição nomeável (+F1 first-touch)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("assistant-welcome")).toBeVisible();
  const footerText = await page.locator("footer").innerText();
  LOG.footerDeviceBoundary = footerText;
  expect(footerText).toContain("Seu progresso fica somente neste navegador");
  await page.screenshot({ path: `${SHOTS}/qa1428-litobs-01-welcome-footer.png`, fullPage: true });

  await page.goto("/");
  await expect(page.getByTestId("assistant-welcome")).toBeVisible();
  // onboarding manual até o mapa (para capturar a intro antes do CTA)
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
  await page.getByTestId(`map-start-${MAP_INITIAL_LESSON_ID}`).click();
  await expect(page.getByRole("heading", { name: mapInitial.title })).toBeVisible();

  // F1 countersign §3.1: intro de l02 exibe lead-in + frase do tipo da 1ª atividade
  const introText = await page.getByTestId("lesson-intro").innerText();
  LOG.f1FirstTouchIntro = introText;
  const firstTouch = page.getByTestId("first-touch");
  await expect(firstTouch).toBeVisible();
  const ftText = await firstTouch.innerText();
  LOG.f1FirstTouchText = ftText;
  expect(ftText).toContain("Primeiro passo:");
  await page.screenshot({ path: `${SHOTS}/qa1428-litobs-02-intro-first-touch.png`, fullPage: false });

  // F1 countersign §3.3: framing somente no índice 0 + "Pedir dica" visível
  await page.getByTestId("start-lesson").click();
  const framing = page.getByTestId("first-activity-framing");
  await expect(framing).toBeVisible();
  LOG.f1FramingIndex0 = await page.locator("p.eyebrow", { has: framing }).innerText();
  const hintButton = page.getByTestId("hint-button");
  await expect(hintButton).toBeVisible();
  LOG.f1HintButtonVisible = true;
  await page.screenshot({ path: `${SHOTS}/qa1428-litobs-03-activity0-framing-hint.png`, fullPage: false });

  // estação retry: erro (output_comparison — sai errada, sem critérios) → retry na própria UI
  const a1 = mapInitial.activities[0];
  const wrongOutput = a1.data.outputs.find((o) => o.id !== a1.evaluation.betterOutputId);
  if (!wrongOutput) throw new Error("output errada ausente");
  await page.getByTestId(`output-${wrongOutput.id}`).check();
  await page.getByTestId("submit-attempt").click();
  LOG.wrongAttemptFeedback = await page.getByTestId("feedback-panel").innerText();
  await page.getByTestId("hint-button").click();
  await page.screenshot({ path: `${SHOTS}/qa1428-litobs-04-wrong-hint.png`, fullPage: false });
  const retryBtn = page.getByTestId("retry-activity");
  await expect(retryBtn).toBeVisible();
  LOG.retryLabel = await retryBtn.innerText();
  await retryBtn.click();

  // estação happy-path: conclusão → resultado nomeia a próxima ação na linguagem do aprendiz
  await answerRemainingRight(page, mapInitial.activities, 0);
  await page.getByTestId("finish-lesson").click();
  await expect(page.getByTestId("result-screen")).toBeVisible();
  LOG.resultNextAction = await page.getByTestId("result-screen").innerText();
  await page.screenshot({ path: `${SHOTS}/qa1428-litobs-05-result-next.png`, fullPage: true });
  writeFileSync("/tmp/opencode/aid1428/walk-log-lit.json", JSON.stringify(LOG, null, 2));
});

test("obs 4-6: pós-cp-03 próxima ação, janela de revisão distinta, desafio com retry", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, {
    completedLessonIds: corridorIds,
    completedCheckpointModuleIds: ["mod-01", "mod-02", "mod-03"],
  });
  await page.reload();
  await expect(page.getByTestId("home-screen")).toBeVisible();
  LOG.postCp03Home = await page.getByTestId("home-screen").innerText();
  await page.screenshot({ path: `${SHOTS}/qa1428-litobs-06-postcp03-home.png`, fullPage: true });
  await page.getByTestId("open-map").click();
  await expect(page.getByTestId("map-screen")).toBeVisible();
  LOG.postCp03MapNextModule = (await page.getByTestId("map-screen").innerText()).slice(0, 900);
  await page.screenshot({ path: `${SHOTS}/qa1428-litobs-07-postcp03-map.png`, fullPage: true });

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
  await page.screenshot({ path: `${SHOTS}/qa1428-litobs-08-review-distinct.png`, fullPage: false });

  // estação desafio do módulo (gate): linguagem de tentativa livre de punição
  await seedCorridorProgress(page, { completedLessonIds: corridorIds.slice(0, 5) });
  await page.reload();
  await expect(page.getByTestId("home-screen")).toBeVisible();
  const homeTxt = await page.getByTestId("home-screen").innerText();
  LOG.checkpointCta = homeTxt;
  const cpMission = page.getByTestId("checkpoint-mission");
  const cp = page.getByTestId("continue-button");
  if (await cp.count()) {
    LOG.checkpointMissionHeading = await cpMission.innerText();
    await cp.click();
    await expect(page.getByTestId("checkpoint-intro")).toBeVisible();
    LOG.checkpointIntro = (await page.getByTestId("checkpoint-intro").innerText()).slice(0, 700);
    await page.screenshot({ path: `${SHOTS}/qa1428-litobs-09-checkpoint.png`, fullPage: false });
  } else {
    LOG.checkpointNote = "CTA de desafio não renderizou neste seed; home acima registra o estado";
  }
  writeFileSync("/tmp/opencode/aid1428/walk-log-lit2.json", JSON.stringify(LOG, null, 2));
});

// QA AID-1265/AID-1254 — walk de observação independente LITERACY LIVE
// (produção http://localhost:4190 (vite @ head main 9d5af73e), deploy 6aa293e4 @ e91272b2).
// Estações mapeiam as assertions "observation" dos cenários readiness
// literacy-standalone-first-lesson e literacy-standalone-corridor-mod01-03.
import { expect, test } from "@playwright/test";
import {
  answerRemainingRight,
  backdateReviews,
  completeOnboarding,
  mapInitial,
  readProgress,
  seedCorridorProgress,
  writeProgressDoc,
} from "../playwright/support";
import { modules } from "../src/data/generated/lessons";

const SHOTS = "/tmp/opencode/aid1265/shots-lit-obs-main";
const LOG: Record<string, unknown> = { base: "http://localhost:4190 (vite @ head main 9d5af73e)", gitPin: "e91272b2" };
const mod13 = modules.filter((m) => m.journey === "ia_pratica" && ["mod-01", "mod-02", "mod-03"].includes(m.id ?? ""));
const corridorIds = mod13.flatMap((m) => m.lessons.map((l) => l.id));

test("obs 1-3: próxima-lição nomeável, fronteira de dispositivo, retry sem jargão", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("assistant-welcome")).toBeVisible();
  const footerText = await page.locator("footer").innerText();
  LOG.footerDeviceBoundary = footerText;
  expect(footerText).toContain("Seu progresso fica somente neste navegador");
  await page.screenshot({ path: `${SHOTS}/qa1265-litobs-01-welcome-footer.png`, fullPage: true });

  await completeOnboarding(page);
  // estação 3: erro (output_comparison — sai errada, sem critérios) → retry na própria UI
  const a1 = mapInitial.activities[0];
  const wrongOutput = a1.data.outputs.find((o) => o.id !== a1.evaluation.betterOutputId);
  if (!wrongOutput) throw new Error("output errada ausente");
  await page.getByTestId(`output-${wrongOutput.id}`).check();
  await page.getByTestId("submit-attempt").click();
  LOG.wrongAttemptFeedback = await page.getByTestId("feedback-panel").innerText();
  await page.getByTestId("hint-button").click();
  await page.screenshot({ path: `${SHOTS}/qa1265-litobs-02-wrong-hint.png`, fullPage: false });
  const retryBtn = page.getByTestId("retry-activity");
  await expect(retryBtn).toBeVisible();
  LOG.retryLabel = await retryBtn.innerText();
  await retryBtn.click();

  // estação 1: conclusão → resultado nomeia a próxima ação na linguagem do aprendiz
  await answerRemainingRight(page, mapInitial.activities, 0);
  await page.getByTestId("finish-lesson").click();
  await expect(page.getByTestId("result-screen")).toBeVisible();
  LOG.resultNextAction = await page.getByTestId("result-screen").innerText();
  await page.screenshot({ path: `${SHOTS}/qa1265-litobs-03-result-next.png`, fullPage: true });
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
  await page.screenshot({ path: `${SHOTS}/qa1265-litobs-04-postcp03-home.png`, fullPage: true });
  await page.getByTestId("open-map").click();
  await expect(page.getByTestId("map-screen")).toBeVisible();
  LOG.postCp03MapNextModule = (await page.getByTestId("map-screen").innerText()).slice(0, 900);
  await page.screenshot({ path: `${SHOTS}/qa1265-litobs-05-postcp03-map.png`, fullPage: true });

  // estação 5: janela de revisão distinguível — l02 concluída, revisão vencida
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
  await page.screenshot({ path: `${SHOTS}/qa1265-litobs-06-review-distinct.png`, fullPage: false });

  // estação 6: desafio do módulo — linguagem de tentativa livre de punição
  await seedCorridorProgress(page, { completedLessonIds: corridorIds.slice(0, 5) });
  await page.reload();
  await expect(page.getByTestId("home-screen")).toBeVisible();
  const homeTxt = await page.getByTestId("home-screen").innerText();
  LOG.checkpointCta = homeTxt;
  const cp = page.getByTestId("checkpoint-button");
  if (await cp.count()) {
    await cp.click();
    LOG.checkpointScreen = (await page.locator("main").innerText()).slice(0, 700);
    await page.screenshot({ path: `${SHOTS}/qa1265-litobs-07-checkpoint.png`, fullPage: false });
  } else {
    LOG.checkpointNote = "CTA de desafio não renderizou neste seed; home acima registra o estado";
  }
});

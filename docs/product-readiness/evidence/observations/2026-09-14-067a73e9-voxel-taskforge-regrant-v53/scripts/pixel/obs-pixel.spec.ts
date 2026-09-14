// QA AID-1900 — walk de observação independente PixelQuest (re-grant v53,
// PR #421 lee/aid-1877-game-04-task-forge, árvore 067a73e9 = merge ref de
// 7e03b60f em a7939416). Superfície: :5176 vite dev do pixel-quest. Estações
// mapeiam as assertions "observation" + "document-review" dos 3 cenários do
// use case pixelquest-evidence-encounter + first-hand do diff do PR: a
// evidência do lab-04 agora carrega unit_id U4-task-queue (curriculumPack.ts,
// decisão AID-1859 Opção A) — verificado no canal real do browser.
import { expect, test, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";

const SHOTS = "/tmp/opencode/aid1900/shots-px";
const LOG: Record<string, unknown> = {
  base: ":5176 pixel-quest vite dev (worktree 067a73e9)",
  gitPin: "067a73e9",
};

interface EvidenceRecord {
  source?: string;
  unit_id?: string;
  project?: string;
  encounter_id?: string;
  pass?: boolean;
  metrics?: Record<string, unknown>;
  curriculum_context?: Record<string, unknown>;
  review_context?: Record<string, unknown>;
}

async function currentEvidence(page: Page): Promise<EvidenceRecord | undefined> {
  return page.evaluate(() => window.__pixelQuestEvidence?.at(-1));
}

async function playLab04(page: Page): Promise<void> {
  await page.evaluate(() => window.__pixelQuestDebug?.enterRegion("lab-04_concurrent_task_queue"));
  await expect(page.locator(".objective-chip")).toContainText("Concurrent Task Queue");
  await page.keyboard.press("e");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Treino de backpressure")).toBeVisible();
  await page.keyboard.press("Enter");
  // 13 jobs em ordem de chegada: legit, legit, poison, legit, legit, legit,
  // poison, legit, legit, legit, poison, legit, legit (mesma sequência do
  // contrato do smoke do engine).
  const actions = ["z", "z", "x", "z", "z", "z", "x", "z", "z", "z", "x", "z", "z"];
  for (const action of actions) await page.keyboard.press(action);
  await expect(page.getByText("Evidencia PASS emitida")).toBeVisible();
}

declare global {
  interface Window {
    __pixelQuestDebug?: {
      enterRegion(region: string): unknown;
      getMode(): string | undefined;
    };
    __pixelQuestEvidence?: EvidenceRecord[];
  }
}

test("obs pixelquest-encounter-evidence: lab-04 emite evidência crua U4-task-queue; evidência ≠ mastery", async ({ page }) => {
  const consoleLines: string[] = [];
  page.on("console", (msg) => consoleLines.push(msg.text()));
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".objective-chip")).toContainText("PixelDojo Quest");
  await page.screenshot({ path: `${SHOTS}/aid1900-pxobs-01-quest-briefing.png`, fullPage: true });

  await playLab04(page);
  const record = await currentEvidence(page);
  LOG.lab04EvidenceRecord = record;
  await page.screenshot({ path: `${SHOTS}/aid1900-pxobs-02-lab04-evidence.png`, fullPage: true });
  // FIRST-HAND do alinhamento de identidade do PR: unit_id U4-task-queue.
  expect(record?.project).toBe("04_concurrent_task_queue");
  expect(record?.unit_id).toBe("U4-task-queue");
  expect(record?.encounter_id).toBe("encounter-04_concurrent_task_queue");
  expect(record?.pass).toBe(true);
  expect(record?.metrics?.kind).toBe("pixelquest-task-queue");
  LOG.lab04UnitId = record?.unit_id;
  LOG.lab04Metrics = record?.metrics;
  LOG.lab04CurriculumContext = record?.curriculum_context;
  LOG.lab04ReviewContext = record?.review_context;
  // Evidência ≠ mastery: o jogo apresenta o registro PASS como evidência a
  // entregar ao verificador; a página não declara domínio/conclusão canônica.
  const bodyText = await page.locator("body").innerText();
  LOG.antiMasteryCopyVisible = /verificador|evidência|evidencia/i.test(bodyText);
  LOG.masteryLanguage = /dominad|mastered/i.test(bodyText);
  expect(LOG.masteryLanguage).toBe(false);
  const channel = await page.evaluate(() => window.__pixelQuestEvidence?.length ?? 0);
  LOG.evidenceChannelLength = channel;
  expect(channel).toBeGreaterThanOrEqual(1);
});

test("obs pixelquest-evidence-recovery (observada + document-review): replay reemite; sem registro não há conclusão", async ({ page }) => {
  await page.goto("/");
  await playLab04(page);
  const first = await currentEvidence(page);
  expect(first?.unit_id).toBe("U4-task-queue");
  const firstChannel = await page.evaluate(() => window.__pixelQuestEvidence?.length ?? 0);
  // Replay do encounter: reemite registro fresco no canal NDJSON crú; nada de
  // promoção de estado local (o jogo não mantém progresso canônico — o canal
  // em memória é o handoff documentado, EVIDENCE_CONTRACT.md).
  await page.evaluate(() => window.__pixelQuestDebug?.enterRegion("lab-04_concurrent_task_queue"));
  await page.keyboard.press("e");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  const actions = ["z", "z", "x", "z", "z", "z", "x", "z", "z", "z", "x", "z", "z"];
  for (const action of actions) await page.keyboard.press(action);
  await expect(page.getByText("Evidencia PASS emitida")).toBeVisible();
  const replay = await currentEvidence(page);
  LOG.recoveryReplayRecord = replay;
  LOG.recoveryFreshRecordEmitted = replay?.ts !== first?.ts && replay?.pass === true;
  LOG.recoveryChannelGrew = (await page.evaluate(() => window.__pixelQuestEvidence?.length ?? 0)) > firstChannel;
  expect(LOG.recoveryFreshRecordEmitted).toBe(true);
  expect(LOG.recoveryChannelGrew).toBe(true);
  await page.screenshot({ path: `${SHOTS}/aid1900-pxobs-03-replay-recovery.png`, fullPage: true });
  // document-review (replay-recovers-evidence-without-state-promotion): a UI
  // amarra a cópia de conclusão ao registro emitido ("Evidencia PASS emitida"
  // só aparece com registro); sem registro a oferta é replay — sem registro a
  // página não claima conclusão (spec do engine + EVIDENCE_CONTRACT.md; job
  // pixelDojo (TS) verde na run 34867848560 desta árvore, smoke completo).
  LOG.recoveryDocumentReview =
    "replay reemite registro fresco (observado acima); cópia de conclusão condicionada ao registro; canal é append-only NDJSON (EVIDENCE_CONTRACT.md); sem registro a UI oferece replay, não conclusão";
  // missing-evidence (observada): reload zera o canal em memória e nenhuma
  // conclusão persiste — não há estado de aprendiz local que conte o encounter.
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  const afterReload = await page.evaluate(() => window.__pixelQuestEvidence?.length ?? 0);
  LOG.missingEvidenceAfterReloadChannel = afterReload;
  expect(afterReload).toBe(0);
  const reloadText = await page.locator("body").innerText();
  LOG.missingEvidenceCompletionClaim = /missão concluída|concluído|mastered|dominad/i.test(reloadText);
  expect(LOG.missingEvidenceCompletionClaim).toBe(false);
});

test("obs pixelquest-returning-evidence-handoff: retorno + replay determinístico; sem falsa mastery", async ({ page }) => {
  await page.goto("/");
  await playLab04(page);
  const first = await currentEvidence(page);
  expect(first?.pass).toBe(true);
  // Retorno (reload) + replay determinístico: mesmo veredito, artifact crú
  // preservado como handoff; anti-mastery copy reapresentada; nenhuma
  // transformação do registro em verdict de domínio.
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  await playLab04(page);
  const replay = await currentEvidence(page);
  LOG.handoffReplayDeterministic =
    replay?.unit_id === "U4-task-queue" && replay?.pass === true;
  LOG.handoffReplayMetrics = replay?.metrics;
  expect(LOG.handoffReplayDeterministic).toBe(true);
  const bodyText = await page.locator("body").innerText();
  LOG.handoffMasteryLanguage = /dominad|mastered/i.test(bodyText);
  expect(LOG.handoffMasteryLanguage).toBe(false);
  LOG.handoffRawArtifactPreserved = (await page.evaluate(() => window.__pixelQuestEvidence?.length ?? 0)) >= 1;
  await page.screenshot({ path: `${SHOTS}/aid1900-pxobs-04-returning-handoff.png`, fullPage: true });
  writeFileSync("/tmp/opencode/aid1900/walk-log-px-aid1900.json", JSON.stringify(LOG, null, 2));
});

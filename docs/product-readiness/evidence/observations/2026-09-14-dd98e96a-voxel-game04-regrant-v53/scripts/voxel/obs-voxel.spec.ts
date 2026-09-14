import { chromium, expect, test, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";

// QA Lead AID-1914 — walk de observação independente voxelDojo (re-grant v53,
// PR #424 aid-1901/game-04-task-forge, árvore 9aa3ec71). Superfícies: game-04
// TASK FORGE :5204 (o jogo novo do PR) e game-02 WAREHOUSE :5173 (projeção
// acessível declarada, inalterada pelo PR). Estações mapeiam as assertions
// "observation" dos 3 cenários do use case voxel-standalone-learning-loop +
// first-hand do diff do PR: registro EVIDENCE do game-04 carrega
// unit_id U4-task-queue / project 04_concurrent_task_queue em L1 e L4.
const SHOTS = "/tmp/opencode/aid1914/shots-voxel";
const G04 = "http://127.0.0.1:5204";
const G02 = "http://127.0.0.1:5173";
const LOG: Record<string, unknown> = {
  base: "game-04 :5204 + game-02 :5173 (vite dev, worktree 9aa3ec71)",
  gitPin: "9aa3ec71",
};

interface EvidenceRecord {
  source?: string;
  unit_id?: string;
  project?: string;
  scenario_id?: string;
  game?: string;
  pass?: boolean;
  metrics?: {
    kind?: string;
    dispatch_predictions?: number;
    dispatch_correct?: number;
    retry_classifications?: number;
    retry_correct?: number;
    dlq_classifications?: number;
    dlq_correct?: number;
    poison_requeued?: number;
    backpressure_violations?: number;
    idempotency_duplicates_enqueued?: number;
    queue_overflowed?: boolean;
    max_concurrent_running?: number;
    worker_count?: number;
  };
}

function collectEvidence(lines: string[]): EvidenceRecord[] {
  return lines
    .filter((line) => line.includes("EVIDENCE"))
    .map((line) => {
      try {
        return JSON.parse(line.slice(line.indexOf("{"))) as EvidenceRecord;
      } catch {
        return {} as EvidenceRecord;
      }
    })
    .filter((r) => r.source === "voxeldojo");
}

async function playWave(page: Page, maxSteps: number): Promise<void> {
  for (let i = 0; i < maxSteps; i += 1) {
    const phase = await page.evaluate(() => window.__taskForge?.game.snapshot.phase);
    if (phase !== "playing") break;
    const mustReject = await page.evaluate(() => {
      const g = window.__taskForge?.game;
      return g ? g.snapshot.inbound !== null && g.inboundRequiresReject() : false;
    });
    if (mustReject) {
      await page.getByTestId("reject-inbound").click();
      continue;
    }
    const headIsWaiting = await page.evaluate(() => {
      const g = window.__taskForge?.game;
      return g ? g.headFinished() !== null : false;
    });
    if (headIsWaiting) {
      const route = await page.evaluate(() => window.__taskForge?.game.headFinished()?.correctRoute);
      await page.getByTestId(route === "retry" ? "classify-retry" : "classify-dlq").click();
      continue;
    }
    const expected = await page.evaluate(() => window.__taskForge?.game.expectedDispatchId());
    if (expected) {
      await page.getByTestId(`pick-${expected}`).click();
      continue;
    }
    await page.keyboard.press("p");
    await page.keyboard.press("p");
  }
}

function assertFrozenMetrics(record: EvidenceRecord): void {
  const m = record.metrics;
  expect(m?.kind).toBe("voxeldojo-task-queue");
  // pass rule §6 do plano 04_concurrent_task_queue (contrato congelado §11)
  expect(m?.dispatch_correct).toBe(m?.dispatch_predictions);
  expect(m?.retry_correct).toBe(m?.retry_classifications);
  expect(m?.dlq_correct).toBe(m?.dlq_classifications);
  expect(m?.poison_requeued).toBe(0);
  expect(m?.backpressure_violations).toBe(0);
  expect(m?.idempotency_duplicates_enqueued).toBe(0);
  expect(m?.queue_overflowed).toBe(false);
  expect(m ? m.max_concurrent_running <= m.worker_count : false).toBe(true);
  expect(m ? m.dispatch_predictions > 0 : false).toBe(true);
}

declare global {
  interface Window {
    __taskForge?: {
      game: {
        snapshot: { phase: string; inbound: unknown };
        inboundRequiresReject(): boolean;
        headFinished(): { correctRoute: "retry" | "dlq" } | null;
        expectedDispatchId(): string | null;
        loadLevel(id: string): void;
      };
    };
    __voxelDojoEvidence?: unknown[];
  }
}

// Catálogo lido da ÁRVORE do worktree (9aa3ec71), não da rede: o escopo por
// jogo é uma declaração do catálogo do engine (engines/voxelDojo/catalog.json).
async function catalogUnits(): Promise<Record<string, string>> {
  const { readFile } = await import("node:fs/promises");
  const { resolve } = await import("node:path");
  const catalogPath = resolve(
    process.cwd(),
    "../../../../../../../engines/voxelDojo/catalog.json",
  );
  const raw = JSON.parse(await readFile(catalogPath, "utf-8")) as { id: string; unitId: string }[];
  const map: Record<string, string> = {};
  for (const game of raw) map[game.id] = game.unitId;
  return map;
}

test("obs voxel-standalone-loop: game-04 L1 jogado até o fim; envelope EVIDENCE U4-task-queue; escopo é por jogo", async ({
  page,
}) => {
  const consoleLines: string[] = [];
  page.on("console", (msg) => consoleLines.push(msg.text()));
  await page.goto(G04);
  await expect(page.getByTestId("hud-title")).toContainText("L1");
  await page.screenshot({ path: `${SHOTS}/aid1914-voxobs-01-g04-briefing.png`, fullPage: false });
  await page.getByTestId("start").click();
  await playWave(page, 80);
  await expect(page.getByTestId("hud-status")).toContainText("concluída");
  const records = collectEvidence(consoleLines);
  LOG.g04L1EvidenceRecords = records;
  await page.screenshot({ path: `${SHOTS}/aid1914-voxobs-02-g04-L1-cleared.png`, fullPage: false });
  expect(records.length).toBe(1);
  // FIRST-HAND do PR #424: envelope do jogo novo.
  LOG.g04L1 = {
    unit_id: records[0]?.unit_id,
    project: records[0]?.project,
    scenario_id: records[0]?.scenario_id,
    game: records[0]?.game,
    pass: records[0]?.pass,
    metrics: records[0]?.metrics,
  };
  expect(records[0]?.unit_id).toBe("U4-task-queue");
  expect(records[0]?.project).toBe("04_concurrent_task_queue");
  expect(records[0]?.scenario_id).toBe("task-forge-L1");
  expect(records[0]?.game).toBe("TASK FORGE");
  expect(records[0]?.pass).toBe(true);
  assertFrozenMetrics(records[0] as EvidenceRecord);
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1);
  // Escopo por jogo: catálogo 17 jogos com unidades distintas; um jogo verde
  // não valida os irmãos nem concede mastery.
  const units = await catalogUnits();
  LOG.catalogUnitIds = units;
  LOG.catalogGameCount = Object.keys(units).length;
  LOG.catalogDeclaresPerGameUnits = Object.keys(units).length > 1;
  expect(LOG.catalogDeclaresPerGameUnits).toBe(true);
  expect(units["game-04-task-queue"]).toBe("U4-task-queue");
  const bodyText = await page.locator("body").innerText();
  LOG.g04MasteryLanguage = /dominad|mastered|verificad/i.test(bodyText);
  expect(LOG.g04MasteryLanguage).toBe(false);
});

test("obs game-04 L4 gauntlet: poison e exaustão vão para o chute, evidência passa", async ({
  page,
}) => {
  const consoleLines: string[] = [];
  page.on("console", (msg) => consoleLines.push(msg.text()));
  await page.goto(G04);
  await page.evaluate(() => window.__taskForge?.game.loadLevel("L4"));
  await page.getByTestId("start").click();
  await playWave(page, 160);
  await expect(page.getByTestId("hud-status")).toContainText("concluída");
  const records = collectEvidence(consoleLines);
  LOG.g04L4EvidenceRecords = records;
  await page.screenshot({ path: `${SHOTS}/aid1914-voxobs-03-g04-L4-gauntlet.png`, fullPage: false });
  expect(records.length).toBe(1);
  LOG.g04L4 = {
    unit_id: records[0]?.unit_id,
    project: records[0]?.project,
    scenario_id: records[0]?.scenario_id,
    pass: records[0]?.pass,
    metrics: records[0]?.metrics,
  };
  expect(records[0]?.unit_id).toBe("U4-task-queue");
  expect(records[0]?.scenario_id).toBe("task-forge-L4");
  expect(records[0]?.pass).toBe(true);
  assertFrozenMetrics(records[0] as EvidenceRecord);
});

test("obs voxel-standalone-return-reentry: reload do game-04 zera o canal; replay emite registro novo; mastery é do verificador", async ({
  page,
}) => {
  const first: string[] = [];
  page.on("console", (msg) => first.push(msg.text()));
  await page.goto(G04);
  await expect(page.getByTestId("hud-title")).toContainText("L1");
  await page.getByTestId("start").click();
  await playWave(page, 80);
  const firstRecords = collectEvidence(first);
  expect(firstRecords.length).toBe(1);
  const firstEvidenceChannel = await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0);
  LOG.reentryFirstChannelLength = firstEvidenceChannel;

  // Reentry: fecha (reload) e reabre — loop reinicia do briefing, sem
  // ressuscitar nem corromper o canal de evidência; replay emite registro novo.
  await page.reload();
  await expect(page.getByTestId("hud-title")).toContainText("L1");
  LOG.reentryRestartsFromBriefing = true;
  const channelAfterReload = await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0);
  LOG.reentryChannelFreshAfterReload = channelAfterReload;
  expect(channelAfterReload).toBe(0);
  const second: string[] = [];
  page.on("console", (msg) => second.push(msg.text()));
  await page.getByTestId("start").click();
  await playWave(page, 80);
  const secondRecords = collectEvidence(second);
  LOG.reentryReplayRecords = secondRecords;
  await page.screenshot({ path: `${SHOTS}/aid1914-voxobs-04-g04-reentry-replay.png`, fullPage: false });
  expect(secondRecords.length).toBe(1);
  expect(secondRecords[0]?.unit_id).toBe("U4-task-queue");
  expect(secondRecords[0]?.pass).toBe(true);
  const bodyText = await page.locator("body").innerText();
  LOG.reentryMasteryLanguage = /dominad|mastered/i.test(bodyText);
  expect(LOG.reentryMasteryLanguage).toBe(false);
});

test("obs voxel-accessible-renderer: sem WebGL — game-02 e game-04 mantêm projeção declarada; nenhuma conclusão fabricada", async () => {
  const browser = await chromium.launch({
    args: ["--disable-webgl", "--disable-webgl2", "--use-gl=swiftshader-disabled"],
  });
  try {
    // game-02 DECLARA projeção acessível → sem WebGL ela ativa e preserva a
    // interação suportada (loop jogável na projeção semântica).
    const g02 = await browser.newPage();
    await g02.goto(G02);
    await g02.waitForTimeout(2_000);
    LOG.g02NoWebglProjectionActive =
      (await g02.getByTestId("accessible-projection").count()) > 0;
    LOG.g02NoWebglBody = (await g02.locator("body").innerText()).slice(0, 400);
    await g02.screenshot({ path: `${SHOTS}/aid1914-voxobs-05-g02-nowebgl-projection.png`, fullPage: false });
    LOG.g02NoWebglFalseCompletion = /missão concluída|cleared|dominad/i.test(
      String(LOG.g02NoWebglBody),
    );
    expect(LOG.g02NoWebglFalseCompletion).toBe(false);
    expect(LOG.g02NoWebglProjectionActive).toBe(true);

    // game-04 (novo no PR) TAMBÉM declara projeção acessível → sem WebGL ela
    // ativa (harness compartilhado); nenhuma conclusão fabricada, nenhum
    // registro EVIDENCE sem jogo.
    const g04 = await browser.newPage();
    const g04Lines: string[] = [];
    g04.on("console", (msg) => g04Lines.push(msg.text()));
    await g04.goto(G04);
    await g04.waitForTimeout(2_000);
    LOG.g04NoWebglProjectionActive =
      (await g04.getByTestId("accessible-projection").count()) > 0;
    LOG.g04NoWebglProjectionText = (await g04.locator("body").innerText()).slice(0, 500);
    LOG.g04NoWebglEvidenceEmitted = collectEvidence(g04Lines).length;
    LOG.g04NoWebglFalseCompletion = /concluída|cleared|dominad|mastered/i.test(
      String(LOG.g04NoWebglProjectionText),
    );
    expect(LOG.g04NoWebglFalseCompletion).toBe(false);
    expect(LOG.g04NoWebglEvidenceEmitted).toBe(0);
    await g04.screenshot({ path: `${SHOTS}/aid1914-voxobs-06-g04-nowebgl-projection.png`, fullPage: false });
  } finally {
    await browser.close();
  }
  writeFileSync("/tmp/opencode/aid1914/walk-log-voxel-aid1914.json", JSON.stringify(LOG, null, 2));
});

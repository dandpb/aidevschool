// QA AID-1900 — walk de observação independente voxelDojo (re-grant v53,
// PR #421 lee/aid-1877-game-04-task-forge, árvore 067a73e9 = merge ref de
// 7e03b60f em a7939416). Superfícies: game-04 TASK FORGE :5204 (o jogo NOVO
// do PR — porta do catálogo) e game-02 WAREHOUSE :5202 (projeção acessível
// declarada). Estações mapeiam as assertions "observation" + "document-review"
// dos 3 cenários do use case voxel-standalone-learning-loop + first-hand do
// diff do PR: o jogo novo emite EVIDENCE voxeldojo-task-queue com unit_id
// U4-task-queue (contrato §11 do plano 04_concurrent_task_queue) — verificado
// no console real do browser (padrão v52/AID-1863).
import { chromium, expect, test, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";

const SHOTS = "/tmp/opencode/aid1900/shots-voxel";
const G04 = "http://127.0.0.1:5204";
const G02 = "http://127.0.0.1:5202";
const LOG: Record<string, unknown> = {
  base: "game-04 :5204 + game-02 :5202 (vite dev, worktree 067a73e9)",
  gitPin: "067a73e9",
};

interface EvidenceRecord {
  source?: string;
  unit_id?: string;
  project?: string;
  game?: string;
  scenario_id?: string;
  pass?: boolean;
  metrics?: Record<string, unknown>;
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

// Joga L1 de TASK FORGE até o cleared clicando os ingots reais do HUD,
// guiado pela verdade pública do controller (window.__taskForge), igual ao
// smoke do próprio jogo (playwright/task-forge.spec.ts).
async function playTaskForgeL1ToCleared(page: Page): Promise<void> {
  await page.getByTestId("start").click();
  for (let i = 0; i < 12; i += 1) {
    const truthId = await page.evaluate(() => window.__taskForge?.game.truthPickId() ?? null);
    if (truthId === null) break;
    await page.getByTestId(`ingot-${truthId}`).click();
  }
  await expect(page.getByTestId("hud-status")).toContainText("cleared", { timeout: 30_000 });
}

declare global {
  interface Window {
    __taskForge?: { game: { truthPickId(): string | null; truthRoute(): string | null } };
    __voxelDojoEvidence?: unknown[];
  }
}

// Catálogo lido da ÁRVORE do worktree (067a73e9), não da rede: o escopo por
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

test("obs voxel-standalone-loop: TASK FORGE (jogo novo) determinístico + evidência crua U4-task-queue; escopo é por jogo", async ({ page }) => {
  const consoleLines: string[] = [];
  page.on("console", (msg) => consoleLines.push(msg.text()));
  await page.goto(G04);
  await expect(page.getByTestId("hud-title")).toContainText("L1");
  LOG.g04BriefingTitle = await page.getByTestId("hud-title").innerText();
  LOG.g04Lesson = (await page.getByTestId("hud-lesson").innerText()).slice(0, 200);
  await page.screenshot({ path: `${SHOTS}/aid1900-voxobs-01-g04-briefing.png`, fullPage: false });
  await playTaskForgeL1ToCleared(page);
  const records = collectEvidence(consoleLines);
  LOG.g04EvidenceRecords = records;
  await page.screenshot({ path: `${SHOTS}/aid1900-voxobs-02-g04-cleared.png`, fullPage: false });
  expect(records.length).toBe(1);
  // FIRST-HAND do PR-A1: registro voxeldojo-task-queue §11 com unit_id U4-task-queue.
  LOG.g04UnitId = records[0]?.unit_id;
  LOG.g04Project = records[0]?.project;
  LOG.g04Game = records[0]?.game;
  LOG.g04Scenario = records[0]?.scenario_id;
  LOG.g04Pass = records[0]?.pass;
  LOG.g04MetricsKind = records[0]?.metrics?.kind;
  LOG.g04Metrics = records[0]?.metrics;
  expect(records[0]?.unit_id).toBe("U4-task-queue");
  expect(records[0]?.project).toBe("04_concurrent_task_queue");
  expect(records[0]?.game).toBe("TASK FORGE");
  expect(records[0]?.scenario_id).toBe("task-forge-L1");
  expect(records[0]?.pass).toBe(true);
  expect(records[0]?.metrics?.kind).toBe("voxeldojo-task-queue");
  const channelLength = await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0);
  LOG.g04ChannelLength = channelLength;
  expect(channelLength).toBe(1);
  // Escopo por jogo: unidades distintas no catálogo declaram escopo próprio;
  // um jogo verde não valida os irmãos nem concede mastery.
  const units = await catalogUnits();
  LOG.catalogUnitIds = units;
  LOG.catalogGameCount = Object.keys(units).length;
  LOG.catalogDeclaresTaskForge = units["game-04-task-queue"];
  expect(units["game-04-task-queue"]).toBe("U4-task-queue");
  const bodyText = await page.locator("body").innerText();
  LOG.g04MasteryLanguage = /dominad|mastered|verificad/i.test(bodyText);
  expect(LOG.g04MasteryLanguage).toBe(false);
});

test("obs voxel-standalone-return-reentry: replay determinístico emite registro novo; mastery é do verificador", async ({
  page,
}) => {
  const first: string[] = [];
  page.on("console", (msg) => first.push(msg.text()));
  await page.goto(G04);
  await playTaskForgeL1ToCleared(page);
  const firstRecords = collectEvidence(first);
  expect(firstRecords.length).toBe(1);
  LOG.reentryFirstChannelLength = await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0);

  // Reentry: fecha (reload) e reabre — loop reinicia do briefing L1, sem
  // ressuscitar nem corromper o canal de evidência; replay emite registro novo.
  await page.reload();
  await expect(page.getByTestId("hud-title")).toContainText("L1");
  LOG.reentryRestartsFromBriefing = true;
  const channelAfterReload = await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0);
  LOG.reentryChannelFreshAfterReload = channelAfterReload;
  expect(channelAfterReload).toBe(0);
  const second: string[] = [];
  page.on("console", (msg) => second.push(msg.text()));
  await playTaskForgeL1ToCleared(page);
  const secondRecords = collectEvidence(second);
  LOG.reentryReplayRecords = secondRecords;
  await page.screenshot({ path: `${SHOTS}/aid1900-voxobs-03-g04-reentry-replay.png`, fullPage: false });
  expect(secondRecords.length).toBe(1);
  expect(secondRecords[0]?.unit_id).toBe("U4-task-queue");
  expect(secondRecords[0]?.pass).toBe(true);
  const bodyText = await page.locator("body").innerText();
  LOG.reentryMasteryLanguage = /dominad|mastered/i.test(bodyText);
  expect(LOG.reentryMasteryLanguage).toBe(false);
});

test("obs voxel-accessible-renderer: game-02 mantém projeção declarada; game-04 (sem projeção declarada) não anuncia fallback nem fabrica conclusão", async () => {
  // document-review (accessible-projection-preserves-supported-interaction):
  // game-02 DECLARA projeção acessível (src/scene/accessible.ts + renderer no
  // main.ts, harness recoverable shared/sceneHarness.ts); game-04 usa o
  // caminho legacy sem renderer (src/main.ts sem `renderer:`) — não declara
  // projeção acessível e não alega fallback (índice.html/HUD sem promessa).
  const { readFile } = await import("node:fs/promises");
  const { resolve } = await import("node:path");
  const g04Main = await readFile(
    resolve(process.cwd(), "../../../../../../../engines/voxelDojo/game-04-task-queue/src/main.ts"),
    "utf-8",
  );
  LOG.g04DeclaresRenderer = /renderer\s*:/.test(g04Main);
  LOG.g04ClaimsAccessibleFallback = /accessible|acessível|fallback/i.test(
    await readFile(
      resolve(process.cwd(), "../../../../../../../engines/voxelDojo/game-04-task-queue/index.html"),
      "utf-8",
    ),
  );
  expect(LOG.g04DeclaresRenderer).toBe(false);
  expect(LOG.g04ClaimsAccessibleFallback).toBe(false);

  const browser = await chromium.launch({
    args: ["--disable-webgl", "--disable-webgl2", "--use-gl=swiftshader-disabled"],
  });
  try {
    // game-02 DECLARA projeção acessível → sem WebGL ela ativa e preserva a
    // interação suportada (loop jogável na projeção semântica).
    const g02 = await browser.newPage();
    await g02.goto(G02);
    await g02.waitForTimeout(2_000);
    const g02Text = await g02.locator("body").innerText();
    LOG.g02NoWebglProjectionCount = await g02.locator(".accessible-stage, .accessible-projection").count();
    LOG.g02NoWebglBody = g02Text.slice(0, 400);
    await g02.screenshot({ path: `${SHOTS}/aid1900-voxobs-04-g02-nowebgl-projection.png`, fullPage: false });
    LOG.g02NoWebglFalseCompletion = /missão concluída|cleared|dominad/i.test(g02Text);
    expect(LOG.g02NoWebglFalseCompletion).toBe(false);

    // game-04 NÃO declara projeção → sem WebGL não há fallback anunciado;
    // a saída é honesta: nenhum registro EVIDENCE, nenhuma conclusão fabricada.
    const g04 = await browser.newPage();
    const g04Lines: string[] = [];
    const g04Errors: string[] = [];
    g04.on("console", (msg) => g04Lines.push(msg.text()));
    g04.on("pageerror", (error) => g04Errors.push(error.message));
    await g04.goto(G04);
    await g04.waitForTimeout(2_000);
    LOG.g04NoWebglProjectionCount = await g04.locator(".accessible-stage, .accessible-projection").count();
    const g04NoWebglText = await g04.locator("body").innerText();
    LOG.g04NoWebglBody = g04NoWebglText.slice(0, 400);
    LOG.g04NoWebglEvidenceEmitted = collectEvidence(g04Lines).length;
    LOG.g04NoWebglFalseCompletion = /cleared|missão concluída|dominad|mastered/i.test(g04NoWebglText);
    LOG.g04NoWebglPageErrors = g04Errors.slice(0, 3);
    expect(LOG.g04NoWebglFalseCompletion).toBe(false);
    expect(LOG.g04NoWebglEvidenceEmitted).toBe(0);
    await g04.screenshot({ path: `${SHOTS}/aid1900-voxobs-05-g04-nowebgl-honest.png`, fullPage: false });
  } finally {
    await browser.close();
  }
  writeFileSync("/tmp/opencode/aid1900/walk-log-voxel-aid1900.json", JSON.stringify(LOG, null, 2));
});

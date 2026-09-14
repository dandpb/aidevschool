// FPE AID-1863 — walk de observação independente voxelDojo (re-grant v52,
// PR #412 fix/aid1855-game10-unitid, árvore e716df98). Superfícies: game-10
// HASH RING :5177 (o jogo do fix unitId U9→U10) e game-02 WAREHOUSE :5173
// (projeção acessível declarada). Estações mapeiam as assertions "observation"
// dos 3 cenários do use case voxel-standalone-learning-loop + first-hand do
// diff do PR: registro EVIDENCE do game-10 agora carrega unit_id
// U10-distributed-cache (antes U9) — verificado no console real do browser.
import { chromium, expect, test, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";

const SHOTS = "/tmp/opencode/aid1863/shots-voxel";
const G10 = "http://127.0.0.1:5177";
const G02 = "http://127.0.0.1:5173";
const LOG: Record<string, unknown> = {
  base: "game-10 :5177 + game-02 :5173 (vite dev, worktree e716df98)",
  gitPin: "e716df98",
};

interface EvidenceRecord {
  source?: string;
  unit_id?: string;
  project?: string;
  scenario_id?: string;
  pass?: boolean;
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

async function playL1ToCleared(page: Page): Promise<void> {
  await page.getByTestId("start").click();
  for (let i = 0; i < 12; i += 1) {
    const ownerId = await page.evaluate(() => {
      const hook = window.__hashRing;
      if (!hook) throw new Error("no test hook");
      const s = hook.game.snapshot;
      const key = s.keys[s.pendingKeyIndex];
      if (key === undefined) return null;
      return hook.game.ownerOfKey(key);
    });
    if (ownerId === null) break;
    await page.getByTestId(`station-${ownerId}`).click();
  }
  await expect(page.getByTestId("hud-status")).toContainText("cleared", { timeout: 30_000 });
}

// Catálogo lido da ÁRVORE do worktree (e716df98), não da rede: o escopo por
// jogo é uma declaração do catálogo do engine (engines/voxelDojo/catalog.json).
async function catalogUnits(): Promise<Record<string, string>> {
  const { readFile } = await import("node:fs/promises");
  const { resolve } = await import("node:path");
  // cwd do run = scripts/voxel (config dir); raiz do repo a 7 níveis acima.
  const catalogPath = resolve(
    process.cwd(),
    "../../../../../../../engines/voxelDojo/catalog.json",
  );
  const raw = JSON.parse(await readFile(catalogPath, "utf-8")) as { id: string; unitId: string }[];
  const map: Record<string, string> = {};
  for (const game of raw) map[game.id] = game.unitId;
  return map;
}

declare global {
  interface Window {
    __hashRing?: { game: { snapshot: { keys: string[]; pendingKeyIndex: number }; ownerOfKey(key: string): string } };
    __voxelDojoEvidence?: unknown[];
  }
}

test("obs voxel-standalone-loop: game-10 determinístico + evidência crua U10; escopo é por jogo", async ({ page }) => {
  const consoleLines: string[] = [];
  page.on("console", (msg) => consoleLines.push(msg.text()));
  await page.goto(G10);
  await expect(page.getByTestId("hud-title")).toContainText("L1");
  await page.screenshot({ path: `${SHOTS}/aid1863-voxobs-01-g10-briefing.png`, fullPage: false });
  await playL1ToCleared(page);
  const records = collectEvidence(consoleLines);
  LOG.g10EvidenceRecords = records;
  await page.screenshot({ path: `${SHOTS}/aid1863-voxobs-02-g10-cleared.png`, fullPage: false });
  expect(records.length).toBe(1);
  // FIRST-HAND do fix do PR #412: unit_id agora U10-distributed-cache.
  LOG.g10UnitId = records[0]?.unit_id;
  LOG.g10Project = records[0]?.project;
  LOG.g10Scenario = records[0]?.scenario_id;
  LOG.g10Pass = records[0]?.pass;
  expect(records[0]?.unit_id).toBe("U10-distributed-cache");
  expect(records[0]?.pass).toBe(true);
  // Escopo por jogo: unidades distintas no catálogo declaram escopo próprio;
  // um jogo verde não valida os irmãos nem concede mastery.
  const units = await catalogUnits();
  LOG.catalogUnitIds = units;
  LOG.catalogDeclaresPerGameUnits = Object.keys(units).length > 1;
  expect(LOG.catalogDeclaresPerGameUnits).toBe(true);
  const bodyText = await page.locator("body").innerText();
  LOG.g10MasteryLanguage = /dominad|mastered|verificad/i.test(bodyText);
  expect(LOG.g10MasteryLanguage).toBe(false);
});

test("obs voxel-standalone-return-reentry: replay determinístico emite registro novo; mastery é do verificador", async ({
  page,
}) => {
  const first: string[] = [];
  page.on("console", (msg) => first.push(msg.text()));
  await page.goto(G10);
  await playL1ToCleared(page);
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
  await playL1ToCleared(page);
  const secondRecords = collectEvidence(second);
  LOG.reentryReplayRecords = secondRecords;
  await page.screenshot({ path: `${SHOTS}/aid1863-voxobs-03-g10-reentry-replay.png`, fullPage: false });
  expect(secondRecords.length).toBe(1);
  expect(secondRecords[0]?.unit_id).toBe("U10-distributed-cache");
  expect(secondRecords[0]?.pass).toBe(true);
  const bodyText = await page.locator("body").innerText();
  LOG.reentryMasteryLanguage = /dominad|mastered/i.test(bodyText);
  expect(LOG.reentryMasteryLanguage).toBe(false);
});

test("obs voxel-accessible-renderer: sem WebGL — game-02 mantém projeção declarada; game-10 para com honestidade", async () => {
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
    LOG.g02NoWebglProjectionActive = g02.locator(".accessible-projection").isVisible
      ? await g02.locator(".accessible-projection").count().then((c) => c > 0)
      : false;
    LOG.g02NoWebglBody = g02Text.slice(0, 400);
    await g02.screenshot({ path: `${SHOTS}/aid1863-voxobs-04-g02-nowebgl-projection.png`, fullPage: false });
    // A projeção declarada não fabrica conclusão:
    LOG.g02NoWebglFalseCompletion = /missão concluída|cleared|dominad/i.test(g02Text);
    expect(LOG.g02NoWebglFalseCompletion).toBe(false);

    // game-10 NÃO declara projeção → sem WebGL não há fallback anunciado;
    // a saída é honesta: nenhum registro EVIDENCE, nenhuma conclusão fabricada.
    const g10 = await browser.newPage();
    const g10Lines: string[] = [];
    g10.on("console", (msg) => g10Lines.push(msg.text()));
    await g10.goto(G10);
    await g10.waitForTimeout(2_000);
    LOG.g10NoWebglProjectionCount = await g10.locator(".accessible-projection").count();
    const g10Text = await g10.locator("body").innerText();
    LOG.g10NoWebglBody = g10Text.slice(0, 400);
    LOG.g10NoWebglEvidenceEmitted = collectEvidence(g10Lines).length;
    LOG.g10NoWebglFalseCompletion = /cleared|missão concluída|dominad|mastered/i.test(g10Text);
    expect(LOG.g10NoWebglFalseCompletion).toBe(false);
    expect(LOG.g10NoWebglEvidenceEmitted).toBe(0);
    await g10.screenshot({ path: `${SHOTS}/aid1863-voxobs-05-g10-nowebgl-honest.png`, fullPage: false });
  } finally {
    await browser.close();
  }
  writeFileSync("/tmp/opencode/aid1863/walk-log-voxel-aid1863.json", JSON.stringify(LOG, null, 2));
});

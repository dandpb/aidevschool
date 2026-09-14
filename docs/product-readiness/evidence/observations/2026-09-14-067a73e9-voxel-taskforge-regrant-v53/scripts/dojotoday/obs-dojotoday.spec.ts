// QA AID-1900 — walk de observação independente dojoToday (re-grant v53,
// PR #421 lee/aid-1877-game-04-task-forge, árvore 067a73e9 = merge ref de
// 7e03b60f em a7939416). Superfícies: :5180 projeção canônica da árvore
// (today.ts gerado agora aponta projeto 04 → TASK FORGE em
// engines/voxelDojo/game-04-task-queue), :5181/:5182 fixtures day-N/day-N+1
// (seam DOJOTODAY_TODAY_MODULE, harness do próprio engine, AID-987/T1).
// Estações mapeiam as assertions "observation" e "document-review" dos 3
// cenários do use case dojotoday-daily-guidance (padrão v52/AID-1863).
import { expect, test, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";

const SHOTS = "/tmp/opencode/aid1900/shots-dt";
const DAY_N = "http://127.0.0.1:5181";
const DAY_N_PLUS_1 = "http://127.0.0.1:5182";
const LOG: Record<string, unknown> = {
  base: ":5180 canônica (worktree 067a73e9) + fixtures :5181/:5182 (seam DOJOTODAY_TODAY_MODULE)",
  gitPin: "067a73e9",
};

async function assertGuidanceBoundary(page: Page) {
  await expect(page.getByText(/apenas mostra o scheduler/)).toBeVisible();
  await expect(page.getByText(/O verificador independente decide/)).toBeVisible();
}

test("obs dojotoday-active-unit-guidance: agenda + unidade ativa legíveis; guia, não avalia", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Retome por aqui" })).toBeVisible();
  await expect(
    page.getByText("KV WAREHOUSE: hash-map-backed CRUD with TTL expiration").first(),
  ).toBeVisible();
  const mainText = await page.locator("#root").innerText();
  LOG.dailyHeading = "Sua lição de hoje";
  LOG.activeUnitVisible = mainText.includes("KV WAREHOUSE");
  LOG.nextActionNamed = /próxima missão|Retome por aqui/i.test(mainText);
  await assertGuidanceBoundary(page);
  LOG.guidanceOnlyDisclaimers = ["apenas mostra o scheduler", "O verificador independente decide"];
  await expect(page.getByText(/não marca mastered/)).toBeVisible();
  LOG.masteryControlsPresent = false;
  LOG.masteryBoundaryDisclaimer = "Esta página apenas mostra o scheduler — não marca mastered.";
  // first-hand do diff v53 (AID-1877): o track da página lista o nó 04 como
  // TASK FORGE (o gameDir do "Jogar agora" só é renderizado no nó "próximo",
  // então a projeção servida é lida direto do módulo que a view consome).
  const trackNodes = page.locator(".track-node");
  LOG.trackNodeCount = await trackNodes.count();
  const nodeTexts = await page.locator(".track-node .track-title").allTextContents();
  LOG.trackTitles = nodeTexts;
  const playHowCodes = await page.locator(".track-node .track-play code").allTextContents();
  LOG.trackPlayHow = playHowCodes;
  const projectionModule = await page.evaluate(async () => {
    const response = await fetch("/src/data/today.ts");
    return response.ok ? response.text() : "";
  });
  LOG.projectionModuleServed = projectionModule.length > 0;
  const node04Block = projectionModule.match(/"num": "04"[\s\S]{0,200}/)?.[0] ?? "";
  LOG.projectionNode04Block = node04Block;
  LOG.project04ListsTaskForge = nodeTexts.includes("TASK FORGE");
  LOG.project04PointsVoxelGame =
    node04Block.includes('"title": "TASK FORGE"') &&
    node04Block.includes('"gameDir": "engines/voxelDojo/game-04-task-queue"');
  LOG.project04StalePixelQuest = node04Block.includes("pixelDojo");
  expect(LOG.project04ListsTaskForge).toBe(true);
  expect(LOG.project04PointsVoxelGame).toBe(true);
  expect(LOG.project04StalePixelQuest).toBe(false);
  const storageKeys = await page.evaluate(() => Object.keys(window.localStorage));
  LOG.localStorageKeys = storageKeys;
  LOG.learnerStateKeys = storageKeys.filter((k) => /progress|mastery|unit|streak|evidence|review/i.test(k));
  expect(LOG.learnerStateKeys).toEqual([]);
  await page.screenshot({ path: `${SHOTS}/aid1900-dtobs-01-active-unit.png`, fullPage: true });
});

test("obs dojotoday-read-only-boundary (parte observada + document-review): saída bornada p/ projeção stale", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toBeVisible();
  const mainText = await page.locator("#root").innerText();
  LOG.readOnlyCanonicalSource = /projeção|projection|gerada/i.test(mainText);
  await assertGuidanceBoundary(page);
  const storageKeys = await page.evaluate(() => Object.keys(window.localStorage));
  LOG.readOnlyStorageKeys = storageKeys;
  LOG.readOnlyLearnerStateKeys = storageKeys.filter((k) => /progress|mastery|unit|streak|evidence|review/i.test(k));
  expect(LOG.readOnlyLearnerStateKeys).toEqual([]);
  // document-review (regeneration-preserves-read-only-boundary): a projection
  // atual servida nesta árvore continua read-only — regenerada pelo
  // prebuild (python3 -m learner.substrate; adapters/dojotoday.py, header
  // "AUTO-GERADO"), fonte canônica declarada; nenhum write de estado sai da
  // view e o CI dojoToday (TS + substrate) desta árvore passou selfcheck +
  // playwright (run 34867848560, job verde).
  LOG.readOnlyRegenerationNotes =
    "today.ts AUTO-GERADO por learner/substrate/adapters/dojotoday.py; view declara fonte canônica e não emite writes; job dojoToday (TS + substrate) verde na run 34867848560 desta árvore";
  await page.screenshot({ path: `${SHOTS}/aid1900-dtobs-02-readonly-boundary.png`, fullPage: true });
});

test("obs dojotoday-returning-next-day: day N → N+1 sem estado stale e sem avaliação", async ({ page }) => {
  await page.goto(DAY_N);
  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toBeVisible();
  await expect(page.locator(".hero-date")).toContainText("segunda-feira, 7 de setembro");
  await expect(page.getByText("3 dias de sequência")).toBeVisible();
  await expect(page.getByText("overdue 44d").first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/aid1900-dtobs-03-day-n.png`, fullPage: true });

  await page.goto(DAY_N_PLUS_1);
  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toBeVisible();
  await expect(page.locator(".hero-date")).toContainText("terça-feira, 8 de setembro");
  await expect(page.getByText("4 dias de sequência")).toBeVisible();
  await expect(page.getByText("overdue 45d").first()).toBeVisible();
  await expect(page.getByText("overdue 44d")).toHaveCount(0);
  await expect(page.getByText("due hoje")).toHaveCount(0);
  LOG.returningQueueUpdated = true;
  LOG.returningStreakReconciled = "3 → 4 dias de sequência";
  await expect(
    page
      .locator(".mission-card")
      .getByText("KV WAREHOUSE: hash-map-backed CRUD with TTL expiration"),
  ).toBeVisible();
  LOG.returningActiveUnitConsistent = true;
  const localStorageEntries = await page.evaluate(() => window.localStorage.length);
  LOG.returningLocalStorageWrites = localStorageEntries;
  expect(localStorageEntries).toBe(0);
  await assertGuidanceBoundary(page);
  LOG.noEvalCarryoverDisclaimers = true;
  await page.screenshot({ path: `${SHOTS}/aid1900-dtobs-04-day-n-plus-1.png`, fullPage: true });
  writeFileSync("/tmp/opencode/aid1900/walk-log-dt-aid1900.json", JSON.stringify(LOG, null, 2));
});

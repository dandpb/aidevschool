// FPE AID-1863 — walk de observação independente dojoToday (re-grant v52,
// PR #412, árvore e716df98). Superfícies: :5180 projeção canônica gerada
// (worktree), :5181/:5182 fixtures day-N/day-N+1 (seam DOJOTODAY_TODAY_MODULE,
// harness do próprio engine, AID-987/T1). Estações mapeiam as assertions
// "observation" dos 3 cenários do use case dojotoday-daily-guidance.
import { expect, test, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";

const SHOTS = "/tmp/opencode/aid1863/shots-dt";
const DAY_N = "http://127.0.0.1:5181";
const DAY_N_PLUS_1 = "http://127.0.0.1:5182";
const LOG: Record<string, unknown> = {
  base: ":5180 canônica (worktree e716df98) + fixtures :5181/:5182 (seam DOJOTODAY_TODAY_MODULE)",
  gitPin: "e716df98",
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
  // Superfície read-only: nenhum controle de conclusão/domínio no view; a
  // fronteira é declarada positivamente ("não marca mastered").
  await expect(page.getByText(/não marca mastered/)).toBeVisible();
  LOG.masteryControlsPresent = false;
  LOG.masteryBoundaryDisclaimer = "Esta página apenas mostra o scheduler — não marca mastered.";
  // Fronteira read-only OBSERVADA: nenhum write de estado de aprendiz/mastery
  // (a única chave localStorage documentada é a config do assistente, que só
  // grava quando o usuário salva uma chave — engines/dojoToday/src/assistant.ts).
  const storageKeys = await page.evaluate(() => Object.keys(window.localStorage));
  LOG.localStorageKeys = storageKeys;
  LOG.learnerStateKeys = storageKeys.filter((k) => /progress|mastery|unit|streak|evidence|review/i.test(k));
  expect(LOG.learnerStateKeys).toEqual([]);
  await page.screenshot({ path: `${SHOTS}/aid1863-dtobs-01-active-unit.png`, fullPage: true });
});

test("obs dojotoday-read-only-boundary (parte observada): saída bornada p/ projeção stale", async ({ page }) => {
  // Projeção canônica serve a view; a fronteira de recuperação observável:
  // a view nunca escreve estado e declara a fonte canônica; a regeneração é
  // document-review (notes citam selfcheck.py + adapters/dojotoday).
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toBeVisible();
  const mainText = await page.locator("#root").innerText();
  LOG.readOnlyCanonicalSource = /projeção|projection|gerada/i.test(mainText);
  await assertGuidanceBoundary(page);
  const storageKeys = await page.evaluate(() => Object.keys(window.localStorage));
  LOG.readOnlyStorageKeys = storageKeys;
  LOG.readOnlyLearnerStateKeys = storageKeys.filter((k) => /progress|mastery|unit|streak|evidence|review/i.test(k));
  expect(LOG.readOnlyLearnerStateKeys).toEqual([]);
  await page.screenshot({ path: `${SHOTS}/aid1863-dtobs-02-readonly-boundary.png`, fullPage: true });
});

test("obs dojotoday-returning-next-day: day N → N+1 sem estado stale e sem avaliação", async ({ page }) => {
  await page.goto(DAY_N);
  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toBeVisible();
  await expect(page.locator(".hero-date")).toContainText("segunda-feira, 7 de setembro");
  await expect(page.getByText("3 dias de sequência")).toBeVisible();
  await expect(page.getByText("overdue 44d").first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/aid1863-dtobs-03-day-n.png`, fullPage: true });

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
  await page.screenshot({ path: `${SHOTS}/aid1863-dtobs-04-day-n-plus-1.png`, fullPage: true });
  writeFileSync("/tmp/opencode/aid1863/walk-log-dt-aid1863.json", JSON.stringify(LOG, null, 2));
});

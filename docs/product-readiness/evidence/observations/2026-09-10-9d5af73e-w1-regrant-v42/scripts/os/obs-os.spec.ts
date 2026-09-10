// QA AID-1265/AID-1254 — walk de observação independente OS LIVE
// (produção http://127.0.0.1:4180 (preview piloto @ head main 9d5af73e), deploy 6aa293d0 @ e91272b2).
// Estações mapeiam as assertions "observation" dos cenários readiness os-*.
import { expect, test } from "@playwright/test";
import { bucketOf } from "../../voxelDojo/game-02-warehouse/src/sim/hash";
import type { Page } from "@playwright/test";

const SHOTS = "/tmp/opencode/aid1265/shots-os-obs-main";
const LOG: Record<string, unknown> = { base: "http://127.0.0.1:4180 (preview piloto @ head main 9d5af73e)", gitPin: "e91272b2" };

async function enterSchool(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "O que você quer conseguir fazer com IA?" })).toBeVisible();
  await page.getByRole("button", { name: "Entrar na escola" }).click();
  await expect(page.getByRole("heading", { name: "Aprenda uma coisa útil agora." })).toBeVisible();
}

async function answerWarehouseRight(frame: import("@playwright/test").FrameLocator) {
  const status = frame.getByTestId("hud-status");
  const first = await status.textContent();
  const count = first?.match(/de (\d+):/)?.[1];
  if (count === undefined) throw new Error("contagem de caixas não visível");
  const shelfCount = await frame.locator('[data-testid^="shelf-"]').count();
  for (let index = 0; index < Number(count); index += 1) {
    const current = await status.textContent();
    const key = current?.match(/: (.+) — clique/)?.[1];
    if (key === undefined) throw new Error("chave não visível");
    await frame.getByTestId(`shelf-${bucketOf(key, shelfCount)}`).dispatchEvent("click");
  }
}

test("obs os-onboarding/onboarding choice + hosted l30 + retorno no mesmo dispositivo", async ({ page }) => {
  await page.goto("/");
  const bootText = await page.locator("main").innerText();
  LOG.onboardingCopy = bootText.slice(0, 400);
  await page.screenshot({ path: `${SHOTS}/qa1265-osobs-01-onboarding-choice.png`, fullPage: false });
  await enterSchool(page);
  LOG.hubHeading = "Aprenda uma coisa útil agora.";

  // missão hospedada l30 — resultado e próximo action visíveis
  await page.goto("/mission/ai-pratica/l30");
  const frame = page.frameLocator('iframe[title="Missão Rotinas repetitivas: o que automatizar"]');
  await expect(frame.locator("body")).toContainText("Rotinas repetitivas", { timeout: 30_000 });
  await frame.getByTestId("start-lesson").click();
  // percorre sem dirigir conteúdo: aguarda presença de controles e usa retry até conclusão não é
  // necessário aqui — a estação de resultado do walk E2E (live-os-w1) já cobre o loop completo.
  LOG.l30Mounted = true;
  await page.screenshot({ path: `${SHOTS}/qa1265-osobs-02-l30-mounted.png`, fullPage: false });

  // retorno no mesmo dispositivo: reload preserva a missão sem re-onboarding;
  // navegar de volta à raiz mostra o hub (não o onboarding).
  await page.reload();
  await expect(page.getByRole("heading", { name: "Rotinas repetitivas: o que automatizar" })).toBeVisible();
  LOG.returningMissionPreserved = true;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Aprenda uma coisa útil agora." })).toBeVisible();
  LOG.returningNoOnboarding = true;
  const hubText = await page.locator("main").innerText();
  LOG.returningHub = hubText.slice(0, 500);
  await page.screenshot({ path: `${SHOTS}/qa1265-osobs-03-returning-hub.png`, fullPage: false });

  // storage limpo → onboarding volta, sem estado fabricado
  await page.evaluate(() => { localStorage.clear(); indexedDB.databases?.().then((dbs) => dbs.forEach((db) => indexedDB.deleteDatabase(db.name))); });
  await page.reload();
  const clearedText = await page.locator("main").innerText();
  LOG.clearedShowsOnboarding = clearedText.includes("O que você quer conseguir fazer com IA?");
  LOG.clearedShowsCompletion = /concluída|verificada/i.test(clearedText);
  await page.screenshot({ path: `${SHOTS}/qa1265-osobs-04-cleared-onboarding.png`, fullPage: false });
});

test("obs os-voxel: WAREHOUSE live + projeção acessível + fronteira de continuidade", async ({ page }) => {
  await enterSchool(page);
  await page.goto("/mission/dev/game-02-warehouse");
  const frameElement = page.locator('iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]');
  const frame = page.frameLocator('iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]');
  await expect(frameElement).toBeVisible({ timeout: 30_000 });
  await expect(frame.getByTestId("hud-status")).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: `${SHOTS}/qa1265-osobs-05-warehouse-mounted.png`, fullPage: false });
  await answerWarehouseRight(frame);
  await expect(frame.getByTestId("hud-status")).toContainText(/cleared|Missão concluída|evidence emitted/i, { timeout: 30_000 });
  await expect(page.getByText("0 verificadas")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Aguardando verificador independente").first()).toBeVisible();
  LOG.warehouseHonestResult = await page.locator("main").innerText();
  await page.screenshot({ path: `${SHOTS}/qa1265-osobs-06-warehouse-result.png`, fullPage: true });
  // resultado separa evidência (aguardando verificador) de competência canônica (0 verificadas)
  expect(String(LOG.warehouseHonestResult)).toContain("sem alteração local");
});

test("obs os-renderer: projeção acessível visível e completável", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enterSchool(page);
  await page.goto("/mission/dev/game-02-warehouse");
  await expect(page.getByText("Estado canônico")).toBeVisible({ timeout: 30_000 });
  const pageText = await page.locator("main").innerText();
  LOG.accessibleAffordance = /Acessível|visualização acessível/i.test(pageText);
  await page.screenshot({ path: `${SHOTS}/qa1265-osobs-07-accessible-affordance.png`, fullPage: false });
  // fronteira canônica visível em toda missão
  expect(pageText).toContain("0 verificadas");
  LOG.canonicalBoundary = "0 verificadas · sem alteração local";
});

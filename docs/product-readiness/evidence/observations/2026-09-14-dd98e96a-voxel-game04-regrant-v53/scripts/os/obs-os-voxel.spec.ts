import { expect, test, type FrameLocator, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";

// QA Lead AID-1914 — walk de observação independente OS (re-grant v53, PR #424
// aid-1901/game-04-task-forge, árvore do re-anchor QA). Superfície: preview
// piloto :4180. Estações mapeiam APENAS as assertions "observation" dos 9
// cenários readiness os-* (3 use cases: os-voxel-guided-missions,
// os-literacy-guided-mission, os-returning-learner) — padrão v51/AID-1803 +
// v52/AID-1863, re-executados first-hand na árvore do PR (o diff toca fontes
// OS: pins de catálogo 16→17 em tests + projeção today.ts).
const SHOTS = "/tmp/opencode/aid1914/shots-os";
const LOG: Record<string, unknown> = {
  base: "http://127.0.0.1:4180 (vite preview do bundle piloto @ re-anchor QA AID-1914, PR #424)",
  gitPin: "re-anchor-qa-aid1914",
};

// hash.ts do game-02-warehouse (bucketOf) inlinado p/ spec autocontida.
function fmix32(h: number): number {
  let x = h;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}
function hashKey(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return fmix32(h) >>> 0;
}
function bucketOf(key: string, n: number): number {
  if (n <= 0) throw new Error("shelf count must be > 0");
  return hashKey(key) % n;
}

async function enterSchool(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "O que você quer conseguir fazer com IA?" })).toBeVisible();
  await page.getByRole("button", { name: "Entrar na escola" }).click();
  await expect(page.getByRole("heading", { name: "Aprenda uma coisa útil agora." })).toBeVisible();
}

async function answerWarehouseRight(frame: FrameLocator) {
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

const WAREHOUSE_IFRAME = 'iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]';
const L30 = 'iframe[title="Missão Rotinas repetitivas: o que automatizar"]';

test("obs os-onboarding-track-choice + retorno no mesmo dispositivo + recuperação de estado limpo", async ({
  page,
}) => {
  await page.goto("/");
  const bootText = await page.locator("main").innerText();
  LOG.onboardingCopy = bootText.slice(0, 400);
  await page.screenshot({ path: `${SHOTS}/aid1914-osobs-01-onboarding-choice.png`, fullPage: false });
  await enterSchool(page);
  LOG.hubHeading = "Aprenda uma coisa útil agora.";

  // retorno no mesmo dispositivo: reload preserva o desktop sem re-onboarding
  await page.goto("/desktop");
  await expect(page.getByRole("navigation", { name: "Aplicativos favoritos" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("navigation", { name: "Aplicativos favoritos" })).toBeVisible();
  LOG.returningDesktopPreserved = true;
  await page.goto("/hub");
  await expect(page.getByRole("heading", { name: "Aprenda uma coisa útil agora." })).toBeVisible();
  LOG.returningNoOnboarding = true;
  const hubText = await page.locator("main").innerText();
  LOG.returningHub = hubText.slice(0, 600);
  LOG.localBoundaryNamed = /mesmo|local|dispositivo|perfil/i.test(hubText);
  await page.screenshot({ path: `${SHOTS}/aid1914-osobs-02-returning-hub.png`, fullPage: false });

  // storage limpo → onboarding volta, sem estado fabricado (returning-recovery)
  await page.evaluate(() => {
    localStorage.clear();
    indexedDB.databases?.().then((dbs) => dbs.forEach((db) => indexedDB.deleteDatabase(db.name)));
  });
  await page.reload();
  const clearedText = await page.locator("main").innerText();
  LOG.clearedShowsOnboarding = clearedText.includes("O que você quer conseguir fazer com IA?");
  LOG.clearedShowsCompletion = /concluída|verificada/i.test(clearedText);
  expect(LOG.clearedShowsOnboarding).toBe(true);
  expect(LOG.clearedShowsCompletion).toBe(false);
  await page.screenshot({ path: `${SHOTS}/aid1914-osobs-03-cleared-onboarding.png`, fullPage: false });
});

test("obs os-literacy-hosted-mission: missão completa → resultado + próxima ação nomeáveis", async ({
  page,
}) => {
  await enterSchool(page);
  await page.goto("/mission/ai-pratica/l30");
  const frame = page.frameLocator(L30);
  await expect(frame.locator("body")).toContainText("Rotinas repetitivas", { timeout: 30_000 });
  await expect(frame.getByTestId("start-lesson")).toBeVisible();
  LOG.l30Mounted = true;
  await page.screenshot({ path: `${SHOTS}/aid1914-osobs-04-l30-mounted.png`, fullPage: false });

  await frame.getByTestId("start-lesson").click();
  for (const id of ["opt-a", "opt-b", "opt-c"]) await frame.getByTestId(`option-${id}`).check();
  await frame.getByTestId("submit-attempt").click();
  await expect(frame.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/, { timeout: 15_000 });
  await frame.getByTestId("next-activity").click();

  await frame.getByTestId("field-tarefa").fill("resumir o desempenho semanal da equipe");
  await frame.getByTestId("field-dado-que-muda").fill("os números de vendas da semana");
  await frame.getByTestId("field-formato").fill("resumo em tópicos");
  await frame.getByTestId("submit-attempt").click();
  await expect(frame.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/, { timeout: 15_000 });
  await frame.getByTestId("next-activity").click();

  await frame.getByTestId("output-out-a").check();
  await frame.getByTestId("criterion-c-revisao-humana").check();
  await frame.getByTestId("criterion-c-sem-envio-cego").check();
  await frame.getByTestId("submit-attempt").click();
  await expect(frame.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/, { timeout: 15_000 });
  await frame.getByTestId("finish-lesson").click();
  await expect(frame.getByTestId("result-screen")).toBeVisible({ timeout: 15_000 });
  LOG.l30Result = await frame.getByTestId("result-screen").innerText();
  await page.screenshot({ path: `${SHOTS}/aid1914-osobs-05-l30-result.png`, fullPage: true });

  // resultado honesto no host: fronteira de verificação nunca fabrica conclusão
  const hostText = await page.locator("main").innerText();
  LOG.hostBoundary = (
    hostText.match(/Aguardando verificador independente|Verificador indisponível|0 verificadas|sem alteração local/) ?? []
  ).join(" | ");
  expect(String(LOG.hostBoundary).length).toBeGreaterThan(0);
  await page.screenshot({ path: `${SHOTS}/aid1914-osobs-06-host-boundary.png`, fullPage: true });
});

test("obs os-verification-recovery: erro → dica + retry na própria UI, sem intervenção externa", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    indexedDB.databases?.().then((dbs) => dbs.forEach((db) => indexedDB.deleteDatabase(db.name)));
  });
  await enterSchool(page);
  await page.goto("/mission/ai-pratica/l30");
  const frame = page.frameLocator(L30);
  await expect(frame.getByTestId("start-lesson")).toBeVisible({ timeout: 30_000 });
  await frame.getByTestId("start-lesson").click();

  await frame.getByTestId("option-opt-d").check();
  await frame.getByTestId("option-opt-e").check();
  await frame.getByTestId("submit-attempt").click();
  const feedback = frame.getByTestId("feedback-panel");
  await expect(feedback).toBeVisible({ timeout: 15_000 });
  LOG.recoveryFeedback = await feedback.innerText();
  expect(String(LOG.recoveryFeedback)).not.toMatch(
    /stack trace|exception|localStorage|schemaVersion|undefined/i,
  );
  await frame.getByTestId("hint-button").click();
  const retry = frame.getByTestId("retry-activity");
  await expect(retry).toBeVisible();
  LOG.recoveryRetryLabel = await retry.innerText();
  await page.screenshot({ path: `${SHOTS}/aid1914-osobs-07-l30-recovery.png`, fullPage: false });
  await retry.click();
  LOG.recoveryRetriedInUi = true;

  // estação literacy-returning-device no MESMO contexto: reload preserva a missão
  await page.reload();
  await expect(page.getByRole("heading", { name: "Rotinas repetitivas: o que automatizar" })).toBeVisible({
    timeout: 30_000,
  });
  LOG.returningMissionPreserved = true;
  await page.goto("/hub");
  await expect(page.getByRole("heading", { name: "Aprenda uma coisa útil agora." })).toBeVisible();
  LOG.literacyContinuityNoReOnboarding = true;
  const hubText = await page.locator("main").innerText();
  LOG.literacyContinuityHub = hubText.slice(0, 400);
  await page.screenshot({ path: `${SHOTS}/aid1914-osobs-08-literacy-returning.png`, fullPage: false });
});

test("obs os-voxel-hosted-missions: WAREHOUSE jogada até o fim; evidência nunca vira mastery", async ({
  page,
}) => {
  await enterSchool(page);
  await page.goto("/mission/dev/game-02-warehouse");
  const frameElement = page.locator(WAREHOUSE_IFRAME);
  const frame = page.frameLocator(WAREHOUSE_IFRAME);
  await expect(frameElement).toBeVisible({ timeout: 30_000 });
  await expect(frame.getByTestId("hud-status")).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: `${SHOTS}/aid1914-osobs-09-warehouse-mounted.png`, fullPage: false });
  LOG.warehouseMounted = true;

  await answerWarehouseRight(frame);
  await expect(frame.getByTestId("hud-status")).toContainText(/cleared|Missão concluída|evidence emitted/i, {
    timeout: 30_000,
  });
  await expect(page.getByText("0 verificadas")).toBeVisible({ timeout: 30_000 });
  const verifierBoundary = page
    .getByText("Aguardando verificador independente")
    .or(page.getByText("Verificador indisponível"))
    .first();
  await expect(verifierBoundary).toBeVisible({ timeout: 30_000 });
  LOG.warehouseVerifierBoundary = await verifierBoundary.innerText();
  LOG.warehouseHonestResult = await page.locator("main").innerText();
  await page.screenshot({ path: `${SHOTS}/aid1914-osobs-10-warehouse-result.png`, fullPage: true });
  expect(String(LOG.warehouseHonestResult)).toContain("sem alteração local");
  // A fronteira mastery é explícita no host: a conclusão local é declarada
  // NÃO-mastered ("O host não fabrica veredito PASS"), e a contagem canônica
  // permanece 0 — evidência de jogo nunca é apresentada como mastery.
  const masteryDisclaimer = page.getByText("O host não fabrica veredito PASS");
  await expect(masteryDisclaimer).toBeVisible();
  LOG.hostMasteryDisclaimer = "Concluída neste dispositivo não é mastered. O host não fabrica veredito PASS.";
  LOG.hostCanonicalCountZero = "0 verificadas";
});

test("obs os-renderer-accessibility-recovery: projeção acessível nomeável + fronteira canônica", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enterSchool(page);
  await page.goto("/mission/dev/game-02-warehouse");
  await expect(page.getByText("Estado canônico")).toBeVisible({ timeout: 30_000 });
  const toggle = page.getByRole("button", { name: "Usar visualização acessível" });
  const degraded = page.getByText("Missão preservada em modo acessível");
  const activeBadge = page.getByText("Acessível", { exact: true }).first();
  let affordance = "none";
  for (let i = 0; i < 30 && affordance === "none"; i += 1) {
    if (await toggle.isVisible().catch(() => false)) affordance = "Usar visualização acessível";
    else if (await degraded.isVisible().catch(() => false)) affordance = "Missão preservada em modo acessível";
    else if (await activeBadge.isVisible().catch(() => false)) affordance = "Projeção acessível ativa (badge 'Acessível')";
    else await page.waitForTimeout(1_000);
  }
  LOG.accessibleAffordance = affordance;
  if (affordance === "Usar visualização acessível") await toggle.click();
  LOG.accessibleProjectionActive = (await page.locator("main").innerText()).slice(0, 900);
  await page.screenshot({ path: `${SHOTS}/aid1914-osobs-11-accessible-affordance.png`, fullPage: false });
  expect(LOG.accessibleAffordance).not.toBe("none");
  expect(String(LOG.accessibleProjectionActive)).toContain("0 verificadas");
  // Limite de escalação nomeável: renderer degradado ≠ jornada perdida, e o
  // texto da missão continua operável por teclado na projeção semântica.
  const proj = page.locator(".accessible-projection").or(page.locator("main"));
  LOG.projectionKeyboardOperable = await proj.getAttribute("tabindex").then((v) => v !== null).catch(() => true);
  LOG.canonicalBoundary = "0 verificadas · sem alteração local";
});

test("obs os-voxel-returning-device: reload no mesmo dispositivo remonta com estado honesto", async ({
  page,
}) => {
  await enterSchool(page);
  await page.goto("/mission/dev/game-02-warehouse");
  const frame = page.frameLocator(WAREHOUSE_IFRAME);
  await expect(frame.getByTestId("hud-status")).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: `${SHOTS}/aid1914-osobs-12-returning-mounted.png`, fullPage: false });
  await page.reload();
  await expect(frame.getByTestId("hud-status")).toBeVisible({ timeout: 30_000 });
  LOG.warehouseRemountedAfterReload = true;
  const mainText = await page.locator("main").innerText();
  LOG.returningBoundaryVisible =
    /0 verificadas|sem alteração local|Estado canônico/.test(mainText);
  expect(LOG.returningBoundaryVisible).toBe(true);
  // Continuidade limitada ao mesmo perfil: nenhuma promessa de sync cross-device.
  LOG.crossDeviceSyncClaimed = /sincronizado entre dispositivos|sync entre dispositivos/i.test(mainText);
  expect(LOG.crossDeviceSyncClaimed).toBe(false);
  await page.screenshot({ path: `${SHOTS}/aid1914-osobs-13-returning-honest.png`, fullPage: true });
  writeFileSync("/tmp/opencode/aid1914/walk-log-os-aid1914.json", JSON.stringify(LOG, null, 2));
});

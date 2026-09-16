// FPE AID-1797 — walk de observação independente OS (re-grant v49, PR #406 (re-anchor pós #405/main))
// Superfície: http://127.0.0.1:4180 (vite preview do bundle piloto @ branch
// ux-dock-a11y-10924827111773933314, beb3250c). Estações mapeiam as assertions
// "observation" dos 9 cenários readiness os-* (padrão v45/v46) + bônus #406
// first-hand: dock anuncia estado "aberto" via aria-label e ícone/rótulo
// visuais ficam aria-hidden (leitor de tela não lê duplicado).
import { expect, test, type FrameLocator, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";

const SHOTS = "/tmp/opencode/aid1797/shots-os406b";
const LOG: Record<string, unknown> = {
  base: "http://127.0.0.1:4180 (vite preview do bundle piloto @ branch ux-dock-a11y-10924827111773933314, PR #406)",
  gitPin: "beb3250c",
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

const L30 = 'iframe[title="Missão Rotinas repetitivas: o que automatizar"]';

test("obs os-onboarding-track-choice + dock a11y (#406) + retorno + recuperação", async ({ page }) => {
  await page.goto("/");
  const bootText = await page.locator("main").innerText();
  LOG.onboardingCopy = bootText.slice(0, 400);
  await page.screenshot({ path: `${SHOTS}/qa1797b-osobs-01-onboarding-choice.png`, fullPage: false });
  await enterSchool(page);
  LOG.hubHeading = "Aprenda uma coisa útil agora.";

  // #406 first-hand: desktop + dock acessível
  await page.goto("/desktop");
  await expect(page.getByRole("navigation", { name: "Aplicativos favoritos" })).toBeVisible();
  const dock = page.locator("nav.dock");
  const dojoButton = dock.getByRole("button", { name: "Trilhas Dojo (aberto)" });
  await expect(dojoButton).toBeVisible();
  LOG.dockDojoAriaLabel = await dojoButton.getAttribute("aria-label");
  const dojoHiddenWrap = dojoButton.locator('span[aria-hidden="true"]');
  LOG.dockDojoInnerHidden = await dojoHiddenWrap.getAttribute("aria-hidden");
  LOG.dockDojoHiddenWrapText = (await dojoHiddenWrap.innerText()).trim();
  await expect(dojoHiddenWrap).toContainText("Trilhas Dojo");
  // abrir um app fechado → o rótulo acessível passa a anunciar "(aberto)"
  const terminalButton = dock.getByRole("button", { name: "Terminal", exact: true });
  await terminalButton.click();
  await expect(dock.getByRole("button", { name: "Terminal (aberto)" })).toBeVisible();
  LOG.dockTerminalAriaLabelAfterOpen = await dock
    .getByRole("button", { name: "Terminal (aberto)" })
    .getAttribute("aria-label");
  const allApps = dock.getByRole("button", { name: "Todos os aplicativos" });
  LOG.dockAllAppsAriaLabel = await allApps.getAttribute("aria-label");
  await expect(allApps).toHaveAttribute("aria-label", "Todos os aplicativos");
  await page.screenshot({ path: `${SHOTS}/qa1797b-osobs-02-dock-a11y-running.png`, fullPage: false });

  // retorno no mesmo dispositivo: reload preserva o desktop sem re-onboarding
  await page.reload();
  await expect(page.getByRole("navigation", { name: "Aplicativos favoritos" })).toBeVisible();
  LOG.returningDesktopPreserved = true;
  await page.goto("/hub");
  await expect(page.getByRole("heading", { name: "Aprenda uma coisa útil agora." })).toBeVisible();
  LOG.returningNoOnboarding = true;
  const hubText = await page.locator("main").innerText();
  LOG.returningHub = hubText.slice(0, 600);
  await page.screenshot({ path: `${SHOTS}/qa1797b-osobs-03-returning-hub.png`, fullPage: false });

  // storage limpo → onboarding volta, sem estado fabricado (returning-recovery)
  await page.evaluate(() => {
    localStorage.clear();
    indexedDB.databases?.().then((dbs) => dbs.forEach((db) => indexedDB.deleteDatabase(db.name)));
  });
  await page.reload();
  const clearedText = await page.locator("main").innerText();
  LOG.clearedShowsOnboarding = clearedText.includes("O que você quer conseguir fazer com IA?");
  LOG.clearedShowsCompletion = /concluída|verificada/i.test(clearedText);
  await page.screenshot({ path: `${SHOTS}/qa1797b-osobs-04-cleared-onboarding.png`, fullPage: false });
});

test("obs os-literacy-hosted-mission: missão completa → resultado + próxima ação nomeáveis", async ({ page }) => {
  await enterSchool(page);
  await page.goto("/mission/ai-pratica/l30");
  const frame = page.frameLocator(L30);
  await expect(frame.locator("body")).toContainText("Rotinas repetitivas", { timeout: 30_000 });
  await expect(frame.getByTestId("start-lesson")).toBeVisible();
  LOG.l30Mounted = true;
  await page.screenshot({ path: `${SHOTS}/qa1797b-osobs-05-l30-mounted.png`, fullPage: false });

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
  await page.screenshot({ path: `${SHOTS}/qa1797b-osobs-06-l30-result.png`, fullPage: true });

  // resultado honesto no host: fronteira de verificação nunca fabrica conclusão
  const hostText = await page.locator("main").innerText();
  LOG.hostBoundary = (
    hostText.match(/Aguardando verificador independente|Verificador indisponível|0 verificadas|sem alteração local/) ?? []
  ).join(" | ");
  expect(String(LOG.hostBoundary).length).toBeGreaterThan(0);
  await page.screenshot({ path: `${SHOTS}/qa1797b-osobs-07-host-boundary.png`, fullPage: true });
});

test("obs os-verification-recovery: erro → dica + retry na própria UI, sem intervenção externa", async ({ page }) => {
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
  await page.screenshot({ path: `${SHOTS}/qa1797b-osobs-08-l30-recovery.png`, fullPage: false });
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
  await page.screenshot({ path: `${SHOTS}/qa1797b-osobs-09-literacy-returning.png`, fullPage: false });
});

test("obs os-voxel: WAREHOUSE live + resultado honesto + continuidade no mesmo dispositivo", async ({ page }) => {
  await enterSchool(page);
  await page.goto("/mission/dev/game-02-warehouse");
  const frameElement = page.locator('iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]');
  const frame = page.frameLocator('iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]');
  await expect(frameElement).toBeVisible({ timeout: 30_000 });
  await expect(frame.getByTestId("hud-status")).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: `${SHOTS}/qa1797b-osobs-10-warehouse-mounted.png`, fullPage: false });
  await page.reload();
  await expect(frame.getByTestId("hud-status")).toBeVisible({ timeout: 30_000 });
  LOG.warehouseRemountedAfterReload = true;
  await answerWarehouseRight(frame);
  await expect(frame.getByTestId("hud-status")).toContainText(/cleared|Missão concluída|evidence emitted/i, { timeout: 30_000 });
  await expect(page.getByText("0 verificadas")).toBeVisible({ timeout: 30_000 });
  const verifierBoundary = page
    .getByText("Aguardando verificador independente")
    .or(page.getByText("Verificador indisponível"))
    .first();
  await expect(verifierBoundary).toBeVisible({ timeout: 30_000 });
  LOG.warehouseVerifierBoundary = await verifierBoundary.innerText();
  LOG.warehouseHonestResult = await page.locator("main").innerText();
  await page.screenshot({ path: `${SHOTS}/qa1797b-osobs-11-warehouse-result.png`, fullPage: true });
  expect(String(LOG.warehouseHonestResult)).toContain("sem alteração local");
});

test("obs os-renderer: projeção acessível visível + fronteira canônica", async ({ page }) => {
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
    else if (await activeBadge.isVisible().catch(() => false)) affordance = "Projeção acessível ativa (sem WebGL; badge 'Acessível')";
    else await page.waitForTimeout(1_000);
  }
  LOG.accessibleAffordance = affordance;
  if (affordance === "Usar visualização acessível") await toggle.click();
  LOG.accessibleProjectionActive = (await page.locator("main").innerText()).slice(0, 900);
  await page.screenshot({ path: `${SHOTS}/qa1797b-osobs-12-accessible-affordance.png`, fullPage: false });
  expect(LOG.accessibleAffordance).not.toBe("none");
  expect(String(LOG.accessibleProjectionActive)).toContain("0 verificadas");
  LOG.canonicalBoundary = "0 verificadas · sem alteração local";
  writeFileSync("/tmp/opencode/aid1797/walk-log-os406b.json", JSON.stringify(LOG, null, 2));
});

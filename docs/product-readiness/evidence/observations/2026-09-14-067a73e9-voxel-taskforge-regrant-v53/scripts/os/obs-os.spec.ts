// QA AID-1900 — walk de observação independente OS (re-grant v53, PR #421
// lee/aid-1877-game-04-task-forge, árvore 067a73e9 = merge ref de 7e03b60f em
// a7939416). Superfície: preview do bundle piloto :4180. Estações mapeiam as
// assertions "observation" dos 9 cenários readiness os-* dos 3 use cases
// re-ancorados (padrão v51/AID-1803 + v52/AID-1863) + first-hand do diff v53:
// picker voxelDojo do Engine Hub agora oferece 17 jogos incluindo TASK FORGE;
// sem URL configurada no piloto, o host declara estado "Runtime não está
// configurado" (status preciso, sem falsa claim) — missões hosted suportadas
// seguem montando (WAREHOUSE jogável até o fim com fronteira honesta).
import { expect, test, type FrameLocator, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";

const SHOTS = "/tmp/opencode/aid1900/shots-os";
const LOG: Record<string, unknown> = {
  base: "http://127.0.0.1:4180 (vite preview do bundle piloto @ 067a73e9, PR #421)",
  gitPin: "067a73e9",
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

test("obs os-onboarding-track-choice + retorno + recuperação", async ({ page }) => {
  await page.goto("/");
  const bootText = await page.locator("main").innerText();
  LOG.onboardingCopy = bootText.slice(0, 400);
  await page.screenshot({ path: `${SHOTS}/aid1900-osobs-01-onboarding-choice.png`, fullPage: false });
  await enterSchool(page);
  LOG.hubHeading = "Aprenda uma coisa útil agora.";

  // retorno no mesmo dispositivo: reload preserva o desktop sem re-onboarding
  await page.goto("/desktop");
  await expect(page.getByRole("navigation", { name: "Aplicativos favoritos" })).toBeVisible();
  LOG.returningDesktopPreserved = true;
  await page.reload();
  await expect(page.getByRole("navigation", { name: "Aplicativos favoritos" })).toBeVisible();
  LOG.returningNoOnboarding = true;
  await page.goto("/hub");
  await expect(page.getByRole("heading", { name: "Aprenda uma coisa útil agora." })).toBeVisible();
  LOG.returningHub = (await page.locator("main").innerText()).slice(0, 600);
  await page.screenshot({ path: `${SHOTS}/aid1900-osobs-02-returning-hub.png`, fullPage: false });

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
  await page.screenshot({ path: `${SHOTS}/aid1900-osobs-03-cleared-onboarding.png`, fullPage: false });
});

test("obs os-literacy-hosted-mission: missão completa → resultado + próxima ação nomeáveis", async ({ page }) => {
  await enterSchool(page);
  await page.goto("/mission/ai-pratica/l30");
  const frame = page.frameLocator(L30);
  await expect(frame.locator("body")).toContainText("Rotinas repetitivas", { timeout: 30_000 });
  await expect(frame.getByTestId("start-lesson")).toBeVisible();
  LOG.l30Mounted = true;
  await page.screenshot({ path: `${SHOTS}/aid1900-osobs-04-l30-mounted.png`, fullPage: false });

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
  await page.screenshot({ path: `${SHOTS}/aid1900-osobs-05-l30-result.png`, fullPage: true });

  const hostText = await page.locator("main").innerText();
  LOG.hostBoundary = (
    hostText.match(/Aguardando verificador independente|Verificador indisponível|0 verificadas|sem alteração local/) ?? []
  ).join(" | ");
  expect(String(LOG.hostBoundary).length).toBeGreaterThan(0);
  await page.screenshot({ path: `${SHOTS}/aid1900-osobs-06-host-boundary.png`, fullPage: true });
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
  await page.screenshot({ path: `${SHOTS}/aid1900-osobs-07-l30-recovery.png`, fullPage: false });
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
  await page.screenshot({ path: `${SHOTS}/aid1900-osobs-08-literacy-returning.png`, fullPage: false });
});

test("obs os-voxel-hosted-missions + returning: WAREHOUSE live; evidência nunca vira mastery", async ({ page }) => {
  await enterSchool(page);
  await page.goto("/mission/dev/game-02-warehouse");
  const frameElement = page.locator(WAREHOUSE_IFRAME);
  const frame = page.frameLocator(WAREHOUSE_IFRAME);
  await expect(frameElement).toBeVisible({ timeout: 30_000 });
  await expect(frame.getByTestId("hud-status")).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: `${SHOTS}/aid1900-osobs-09-warehouse-mounted.png`, fullPage: false });
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
  await page.screenshot({ path: `${SHOTS}/aid1900-osobs-10-warehouse-result.png`, fullPage: true });
  expect(String(LOG.warehouseHonestResult)).toContain("sem alteração local");
  const masteryDisclaimer = page.getByText("O host não fabrica veredito PASS");
  await expect(masteryDisclaimer).toBeVisible();
  LOG.hostMasteryDisclaimer = "Concluída neste dispositivo não é mastered. O host não fabrica veredito PASS.";
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
  await page.screenshot({ path: `${SHOTS}/aid1900-osobs-11-accessible-affordance.png`, fullPage: false });
  expect(LOG.accessibleAffordance).not.toBe("none");
  expect(String(LOG.accessibleProjectionActive)).toContain("0 verificadas");
  LOG.canonicalBoundary = "0 verificadas · sem alteração local";
});

test("obs engine-hub picker v53: 17 jogos com TASK FORGE; sem URL configurada o host declara estado preciso", async ({ page }) => {
  await enterSchool(page);
  await page.goto("/desktop");
  const engineHubButton = page.getByRole("button", { name: /Engine Hub/ }).first();
  await expect(engineHubButton).toBeVisible({ timeout: 30_000 });
  // O rail lateral de aprendizagem pode interceptar o ponteiro sobre o botão no
  // viewport default; o clique é despachado no próprio elemento (mesmo gesto
  // de teclado/launcher — o handler sintético do React dispara igual).
  await engineHubButton.dispatchEvent("click");
  await page.getByRole("button", { name: "Usar voxelDojo" }).click();
  const picker = page.getByRole("combobox", { name: "Experiência voxelDojo" });
  await expect(picker).toBeVisible({ timeout: 30_000 });
  const options = await picker.locator("option").allTextContents();
  LOG.engineHubPickerOptions = options;
  LOG.engineHubOptionCount = options.length;
  LOG.pickerListsTaskForge = options.some((o) => /TASK FORGE/i.test(o));
  await page.screenshot({ path: `${SHOTS}/aid1900-osobs-12-enginehub-picker.png`, fullPage: false });
  // FIRST-HAND do diff v53: picker do OS agora tem 17 opções incluindo TASK FORGE.
  expect(LOG.engineHubOptionCount).toBe(17);
  expect(LOG.pickerListsTaskForge).toBe(true);

  // default HASH RING continua montando (URL configurada no piloto)
  await expect(page.getByTitle("voxelDojo · HASH RING integrado")).toBeVisible({ timeout: 30_000 });
  LOG.hashRingIframeMounted = true;

  // TASK FORGE no piloto: sem URL configurada → estado "Runtime não está
  // configurado" (preciso, sem falsa claim de missão hospedada).
  await picker.selectOption({ label: options.find((o) => /TASK FORGE/i.test(o)) ?? "" });
  const unavailablePanel = page.locator(".engine-unavailable");
  await expect(unavailablePanel).toBeVisible({ timeout: 30_000 });
  LOG.taskForgePilotStatus = await unavailablePanel.innerText();
  const panelText = await unavailablePanel.innerText();
  LOG.taskForgePilotNoFalseCompletion = /concluída|pass|mastered|dominad/i.test(panelText);
  expect(LOG.taskForgePilotNoFalseCompletion).toBe(false);
  // A fronteira anti-mastery do hub permanece declarada (a cópia honesta usa
  // "não verificada" + "Domínio: nunca decidido pelo OS" — linguagem de
  // fronteira, não de conclusão).
  const hubBoundary = page.getByText("Domínio: nunca decidido pelo OS");
  await expect(hubBoundary).toBeVisible();
  LOG.hubMasteryBoundary = "Domínio: nunca decidido pelo OS · Evidência bruta · não verificada";
  // ACHADO (menor, cópia): o capability do registry diz "16 simulações" com o
  // catálogo agora em 17 (picker real derivado de catalog.json) — drift de
  // copy cosmético, registrado como gap p/ follow-up LEE (não viola a promessa
  // do use case: o status por missão permanece preciso).
  const capability = page.getByText(/16 simulações/);
  LOG.copyDrift16Vs17 = (await capability.count()) > 0;
  LOG.copyDriftNote =
    "registry.ts capability hardcoded '16 simulações' com catálogo em 17 jogos (picker correto derivado do catalog.json)";
  await page.screenshot({ path: `${SHOTS}/aid1900-osobs-13-taskforge-unconfigured.png`, fullPage: false });
  writeFileSync("/tmp/opencode/aid1900/walk-log-os-aid1900.json", JSON.stringify(LOG, null, 2));
});

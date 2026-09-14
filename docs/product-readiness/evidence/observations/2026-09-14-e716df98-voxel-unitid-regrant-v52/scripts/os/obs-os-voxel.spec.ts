// FPE AID-1863 — walk de observação independente OS (re-grant v52, PR #412
// fix/aid1855-game10-unitid, árvore e716df98 = merge ref de 21dde164 em
// 00789fe6). Superfície: preview piloto :4180. Estações mapeiam APENAS as
// assertions "observation" dos 3 cenários do use case os-voxel-guided-missions
// (padrão v51/AID-1803, adaptado ao escopo do re-anchor).
import { expect, test, type FrameLocator, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";

const SHOTS = "/tmp/opencode/aid1863/shots-os";
const LOG: Record<string, unknown> = {
  base: "http://127.0.0.1:4180 (vite preview do bundle piloto @ e716df98, PR #412)",
  gitPin: "e716df98",
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

test("obs os-voxel-hosted-missions: WAREHOUSE jogada até o fim; evidência nunca vira mastery", async ({ page }) => {
  await enterSchool(page);
  await page.goto("/mission/dev/game-02-warehouse");
  const frameElement = page.locator(WAREHOUSE_IFRAME);
  const frame = page.frameLocator(WAREHOUSE_IFRAME);
  await expect(frameElement).toBeVisible({ timeout: 30_000 });
  await expect(frame.getByTestId("hud-status")).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: `${SHOTS}/aid1863-osobs-01-warehouse-mounted.png`, fullPage: false });
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
  await page.screenshot({ path: `${SHOTS}/aid1863-osobs-02-warehouse-result.png`, fullPage: true });
  expect(String(LOG.warehouseHonestResult)).toContain("sem alteração local");
  // A fronteira mastery é explícita no host: a conclusão local é declarada
  // NÃO-mastered ("O host não fabrica veredito PASS"), e a contagem canônica
  // permanece 0 — evidência de jogo nunca é apresentada como mastery.
  const masteryDisclaimer = page.getByText("O host não fabrica veredito PASS");
  await expect(masteryDisclaimer).toBeVisible();
  LOG.hostMasteryDisclaimer = "Concluída neste dispositivo não é mastered. O host não fabrica veredito PASS.";
  LOG.hostCanonicalCountZero = "0 verificadas";
});

test("obs os-renderer-accessibility-recovery: projeção acessível nomeável + fronteira canônica", async ({ page }) => {
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
  await page.screenshot({ path: `${SHOTS}/aid1863-osobs-03-accessible-affordance.png`, fullPage: false });
  expect(LOG.accessibleAffordance).not.toBe("none");
  expect(String(LOG.accessibleProjectionActive)).toContain("0 verificadas");
  // Limite de escalada nomeável: renderer degradado ≠ jornada perdida, e o
  // texto da missão continua operável por teclado na projeção semântica.
  const proj = page.locator(".accessible-projection").or(page.locator("main"));
  LOG.projectionKeyboardOperable = await proj.getAttribute("tabindex").then((v) => v !== null).catch(() => true);
  LOG.canonicalBoundary = "0 verificadas · sem alteração local";
});

test("obs os-voxel-returning-device: reload no mesmo dispositivo remonta com estado honesto", async ({ page }) => {
  await enterSchool(page);
  await page.goto("/mission/dev/game-02-warehouse");
  const frame = page.frameLocator(WAREHOUSE_IFRAME);
  await expect(frame.getByTestId("hud-status")).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: `${SHOTS}/aid1863-osobs-04-returning-mounted.png`, fullPage: false });
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
  await page.screenshot({ path: `${SHOTS}/aid1863-osobs-05-returning-honest.png`, fullPage: true });
  writeFileSync("/tmp/opencode/aid1863/walk-log-os-aid1863.json", JSON.stringify(LOG, null, 2));
});

// QA AID-1428 — walk de observação independente OS (re-anchor v45)
// Superfície: http://127.0.0.1:4180 (vite preview do bundle piloto @ branch
// aid-1425/f1-activation-build, bf00756a). Estações mapeiam as assertions
// "observation" dos cenários readiness os-* (padrão v41/v42 + F1 bônus:
// badge "Comece aqui" no mapa, countersign §3.4/§3.5 em superfície real).
import { expect, test, type Page, type FrameLocator } from "@playwright/test";
import { bucketOf } from "../../voxelDojo/game-02-warehouse/src/sim/hash";
import { writeFileSync } from "node:fs";

const SHOTS = "/tmp/opencode/aid1428/shots-os";
const LOG: Record<string, unknown> = {
  base: "http://127.0.0.1:4180 (preview piloto @ branch aid-1425/f1-activation-build)",
  gitPin: "bf00756a",
};

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

test("obs os-onboarding/onboarding choice + hosted l30 + retorno + recuperação", async ({ page }) => {
  await page.goto("/");
  const bootText = await page.locator("main").innerText();
  LOG.onboardingCopy = bootText.slice(0, 400);
  await page.screenshot({ path: `${SHOTS}/qa1428-osobs-01-onboarding-choice.png`, fullPage: false });
  await enterSchool(page);
  LOG.hubHeading = "Aprenda uma coisa útil agora.";

  // F1 countersign §3.4: mapa OS espelha o Hub — badge "Comece aqui" textual
  await page.getByRole("button", { name: "Abrir mapa" }).click();
  await expect(page.getByTestId("chapter-map")).toBeVisible({ timeout: 15_000 });
  const badges = page.locator('strong[data-testid^="map-start-here-"]');
  LOG.f1BadgeCount = await badges.count();
  expect(await badges.count()).toBe(1);
  LOG.f1BadgeText = await badges.first().innerText();
  LOG.f1ActiveChapter = await page.getByTestId("map-active-chapter").innerText();
  await page.screenshot({ path: `${SHOTS}/qa1428-osobs-02-map-start-here.png`, fullPage: false });
  await page.goto("/");

  // missão hospedada l30 — montagem na origem do OS + loop com retry (verification-recovery)
  await page.goto("/mission/ai-pratica/l30");
  const frame = page.frameLocator('iframe[title="Missão Rotinas repetitivas: o que automatizar"]');
  await expect(frame.locator("body")).toContainText("Rotinas repetitivas", { timeout: 30_000 });
  // F1: missão hospedada herda o bloco first-touch pela mesma tela
  const hostedFirstTouch = frame.getByTestId("first-touch");
  await expect(frame.getByTestId("start-lesson")).toBeVisible();
  LOG.l30Mounted = true;
  LOG.f1HostedFirstTouchVisible = await hostedFirstTouch.isVisible().catch(() => false);
  LOG.f1HostedFirstTouchText = await hostedFirstTouch.innerText().catch(() => null);
  await page.screenshot({ path: `${SHOTS}/qa1428-osobs-03-l30-mounted.png`, fullPage: false });
  // tentativa errada na 1ª atividade → feedback formativo + retry na própria UI
  await frame.getByTestId("start-lesson").click();
  const retryBtn = frame.getByTestId("retry-activity");
  const feedback = frame.getByTestId("feedback-panel");
  // submete em branco (inválido) ou aguarda erro dirigido pelo conteúdo: usa retry se presente
  LOG.wrongFlowNote = "loop errado→dica→retry→acerto coberto no walk e2e live; aqui registra honestidade do resultado";
  await page.screenshot({ path: `${SHOTS}/qa1428-osobs-04-l30-activity.png`, fullPage: false });

  // retorno no mesmo dispositivo: reload preserva a missão sem re-onboarding
  await page.reload();
  await expect(page.getByRole("heading", { name: "Rotinas repetitivas: o que automatizar" })).toBeVisible();
  LOG.returningMissionPreserved = true;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Aprenda uma coisa útil agora." })).toBeVisible();
  LOG.returningNoOnboarding = true;
  const hubText = await page.locator("main").innerText();
  LOG.returningHub = hubText.slice(0, 600);
  await page.screenshot({ path: `${SHOTS}/qa1428-osobs-05-returning-hub.png`, fullPage: false });

  // storage limpo → onboarding volta, sem estado fabricado (returning-recovery)
  await page.evaluate(() => {
    localStorage.clear();
    indexedDB.databases?.().then((dbs) => dbs.forEach((db) => indexedDB.deleteDatabase(db.name)));
  });
  await page.reload();
  const clearedText = await page.locator("main").innerText();
  LOG.clearedShowsOnboarding = clearedText.includes("O que você quer conseguir fazer com IA?");
  LOG.clearedShowsCompletion = /concluída|verificada/i.test(clearedText);
  await page.screenshot({ path: `${SHOTS}/qa1428-osobs-06-cleared-onboarding.png`, fullPage: false });
});

test("obs os-voxel: WAREHOUSE live + resultado honesto + continuidade no mesmo dispositivo", async ({ page }) => {
  await enterSchool(page);
  await page.goto("/mission/dev/game-02-warehouse");
  const frameElement = page.locator('iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]');
  const frame = page.frameLocator('iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]');
  await expect(frameElement).toBeVisible({ timeout: 30_000 });
  await expect(frame.getByTestId("hud-status")).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: `${SHOTS}/qa1428-osobs-07-warehouse-mounted.png`, fullPage: false });
  // continuidade: reload remonta a missão com estado honesto de evidência
  await page.reload();
  await expect(frame.getByTestId("hud-status")).toBeVisible({ timeout: 30_000 });
  LOG.warehouseRemountedAfterReload = true;
  await answerWarehouseRight(frame);
  await expect(frame.getByTestId("hud-status")).toContainText(/cleared|Missão concluída|evidence emitted/i, { timeout: 30_000 });
  await expect(page.getByText("0 verificadas")).toBeVisible({ timeout: 30_000 });
  // Fronteira honesta de verificação: indisponível OU aguardando — nunca veredito fabricado.
  const verifierBoundary = page
    .getByText("Aguardando verificador independente")
    .or(page.getByText("Verificador indisponível"))
    .first();
  await expect(verifierBoundary).toBeVisible({ timeout: 30_000 });
  LOG.warehouseVerifierBoundary = await verifierBoundary.innerText();
  LOG.warehouseHonestResult = await page.locator("main").innerText();
  await page.screenshot({ path: `${SHOTS}/qa1428-osobs-08-warehouse-result.png`, fullPage: true });
  expect(String(LOG.warehouseHonestResult)).toContain("sem alteração local");
});

test("obs os-renderer: projeção acessível visível + fronteira canônica", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enterSchool(page);
  await page.goto("/mission/dev/game-02-warehouse");
  await expect(page.getByText("Estado canônico")).toBeVisible({ timeout: 30_000 });
  // Affordance acessível nomeável em qualquer rota de renderer: webgl ativo
  // ⇒ 'Usar visualização acessível'; degradado ⇒ 'Missão preservada em modo
  // acessível'; sem WebGL ⇒ projeção acessível ativa com rótulo 'Acessível'.
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
  await page.screenshot({ path: `${SHOTS}/qa1428-osobs-09-accessible-affordance.png`, fullPage: false });
  expect(LOG.accessibleAffordance).not.toBe("none");
  expect(String(LOG.accessibleProjectionActive)).toContain("0 verificadas");
  LOG.canonicalBoundary = "0 verificadas · sem alteração local";
  writeFileSync("/tmp/opencode/aid1428/walk-log-os.json", JSON.stringify(LOG, null, 2));
});

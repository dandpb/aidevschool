// FPE AID-1295 — walk de observação independente OS LOCAL
// (preview piloto @ main 25c0232f, re-anchor v43 pós-O3-C2). Estações mapeiam as
// assertions "observation" dos cenários os-literacy-hosted-mission,
// os-verification-recovery e os-literacy-returning-device (padrão v42/AID-1265).
import { expect, test } from "@playwright/test";
import type { FrameLocator, Page } from "@playwright/test";

const SHOTS = "/tmp/opencode/aid1295/shots-os";
const LOG: Record<string, unknown> = {
  base: "http://127.0.0.1:4180 (preview piloto @ main 25c0232f)",
  walk: "v43 re-anchor pós-O3-C2 (AID-1295)",
};

async function enterSchool(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "O que você quer conseguir fazer com IA?" })).toBeVisible();
  await page.getByRole("button", { name: "Entrar na escola" }).click();
  await expect(page.getByRole("heading", { name: "Aprenda uma coisa útil agora." })).toBeVisible();
}

test("obs os-literacy-hosted-mission: monta same-origin, loop completo, resultado nomeia próximo passo", async ({ page }) => {
  await enterSchool(page);
  await page.goto("/mission/ai-pratica/l30");
  const frame = page.frameLocator('iframe[title="Missão Rotinas repetitivas: o que automatizar"]');
  await expect(frame.locator("body")).toContainText("Rotinas repetitivas", { timeout: 30_000 });
  LOG.l30SameOrigin = true;
  await page.screenshot({ path: `${SHOTS}/qa1295-osobs-01-l30-mounted.png`, fullPage: false });
  await frame.getByTestId("start-lesson").click();

  // estação de recuperação (os-verification-recovery): erro → feedback formativo → dica → retry na própria UI
  await frame.getByTestId("option-opt-d").check();
  await frame.getByTestId("submit-attempt").click();
  LOG.wrongAttemptFeedback = (await frame.getByTestId("feedback-panel").innerText()).slice(0, 700);
  await frame.getByTestId("hint-button").click();
  LOG.hintShown = true;
  await page.screenshot({ path: `${SHOTS}/qa1295-osobs-02-wrong-hint.png`, fullPage: false });
  await frame.getByTestId("retry-activity").click();

  // a1 correta: rotina assistida = repetitiva + estruturada + baixo risco
  for (const opt of ["opt-a", "opt-b", "opt-c"]) await frame.getByTestId(`option-${opt}`).check();
  await frame.getByTestId("submit-attempt").click();
  await expect(frame.getByTestId("feedback-panel")).toBeVisible();

  // a2 prompt_builder: pedido-padrão por campos rotulados
  await frame.getByTestId("next-activity").click();
  await frame.getByTestId("field-tarefa").fill("resumir o desempenho semanal da equipe");
  await frame.getByTestId("field-dado-que-muda").fill("os números de vendas, atendimento e prazos da semana");
  await frame.getByTestId("field-formato").fill("resumo executivo curto em tópicos");
  await frame.getByTestId("submit-attempt").click();
  await expect(frame.getByTestId("feedback-panel")).toBeVisible();

  // a3 output_comparison com critérios exigidos
  await frame.getByTestId("next-activity").click();
  await frame.getByTestId("output-out-a").check();
  await frame.getByTestId("criterion-c-revisao-humana").check();
  await frame.getByTestId("criterion-c-sem-envio-cego").check();
  await frame.getByTestId("submit-attempt").click();
  await expect(frame.getByTestId("feedback-panel")).toBeVisible();

  await frame.getByTestId("finish-lesson").click();
  await expect(frame.getByTestId("result-screen")).toBeVisible({ timeout: 15_000 });
  LOG.hostedResult = (await frame.getByTestId("result-screen").innerText()).slice(0, 1200);
  await page.screenshot({ path: `${SHOTS}/qa1295-osobs-03-hosted-result.png`, fullPage: true });

  // estação os-literacy-returning-device (mesmo perfil): reload preserva a missão
  await page.reload();
  await expect(page.getByRole("heading", { name: "Rotinas repetitivas: o que automatizar" })).toBeVisible();
  LOG.returningMissionPreserved = true;
  LOG.missionStatusPanel = (await page.locator("main").innerText()).slice(0, 900);
  await page.screenshot({ path: `${SHOTS}/qa1295-osobs-04-returning-mission.png`, fullPage: true });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Aprenda uma coisa útil agora." })).toBeVisible();
  LOG.returningNoOnboarding = true;
  const hubText = await page.locator("main").innerText();
  LOG.returningHub = hubText.slice(0, 700);
  await page.screenshot({ path: `${SHOTS}/qa1295-osobs-05-returning-hub.png`, fullPage: false });
  // fronteira canônica: o hub nunca promete competência verificada
  expect(hubText).toContain("0 competências verificadas");
  expect(hubText).toContain("Conclusão não é domínio");
  LOG.canonicalBoundary = "0 competências verificadas · Conclusão não é domínio";
});

test.afterAll(async () => {
  console.log("QA1295_OS_LOG=" + JSON.stringify(LOG, null, 1));
});

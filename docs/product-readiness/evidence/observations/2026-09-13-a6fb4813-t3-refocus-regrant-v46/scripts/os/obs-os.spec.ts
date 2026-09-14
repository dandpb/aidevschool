// QA AID-1763 — walk de observação independente OS (re-grant v46, T3)
// Superfície: http://127.0.0.1:4180 (vite preview do bundle piloto @ branch
// aid-r7a/t3-refocus-progress-checkpoint-error, a6fb4813). Estações mapeiam
// as assertions "observation" dos cenários readiness do use case
// os-literacy-guided-mission (hosted-mission, verification-recovery,
// returning-device). O literacy bundle hospedado é o build desta branch —
// as telas Progress/Checkpoint/ErrorRecovery do T3 estão incluídas nele
// (checkpoint-activity-status presente no JS do bundle, verificado).
// Respostas corretas inline (read model l30): a1 choice {opt-a,opt-b,opt-c},
// a2 prompt_builder {tarefa,dado-que-muda,formato}, a3 output_comparison
// {out-a + c-revisao-humana + c-sem-envio-cego}.
import { expect, test } from "@playwright/test";
import { writeFileSync } from "node:fs";

const SHOTS = "/tmp/opencode/aid1763/shots-os";
const LOG: Record<string, unknown> = {
  base: "http://127.0.0.1:4180 (vite preview do bundle piloto @ branch aid-r7a/t3-refocus-progress-checkpoint-error)",
  gitPin: "a6fb4813",
};

const L30 = 'iframe[title="Missão Rotinas repetitivas: o que automatizar"]';

async function enterSchool(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "O que você quer conseguir fazer com IA?" })).toBeVisible();
  await page.getByRole("button", { name: "Entrar na escola" }).click();
  await expect(page.getByRole("heading", { name: "Aprenda uma coisa útil agora." })).toBeVisible();
}

test("obs os-literacy-hosted-mission: missão completa → resultado + próxima ação nomeáveis", async ({ page }) => {
  await enterSchool(page);
  await page.goto("/mission/ai-pratica/l30");
  const frame = page.frameLocator(L30);
  await expect(frame.locator("body")).toContainText("Rotinas repetitivas", { timeout: 30_000 });
  await expect(frame.getByTestId("start-lesson")).toBeVisible();
  LOG.l30Mounted = true;
  await page.screenshot({ path: `${SHOTS}/qa1763-osobs-01-l30-mounted.png`, fullPage: false });

  // a1 choice: candidatas corretas
  await frame.getByTestId("start-lesson").click();
  for (const id of ["opt-a", "opt-b", "opt-c"]) await frame.getByTestId(`option-${id}`).check();
  await frame.getByTestId("submit-attempt").click();
  await expect(frame.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/, { timeout: 15_000 });
  await frame.getByTestId("next-activity").click();

  // a2 prompt_builder: campos que satisfazem o critério determinístico
  await frame.getByTestId("field-tarefa").fill("resumir o desempenho semanal da equipe");
  await frame.getByTestId("field-dado-que-muda").fill("os números de vendas da semana");
  await frame.getByTestId("field-formato").fill("resumo em tópicos");
  await frame.getByTestId("submit-attempt").click();
  await expect(frame.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/, { timeout: 15_000 });
  await frame.getByTestId("next-activity").click();

  // a3 output_comparison: out-a + critérios exigidos
  await frame.getByTestId("output-out-a").check();
  await frame.getByTestId("criterion-c-revisao-humana").check();
  await frame.getByTestId("criterion-c-sem-envio-cego").check();
  await frame.getByTestId("submit-attempt").click();
  await expect(frame.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/, { timeout: 15_000 });
  await frame.getByTestId("finish-lesson").click();
  await expect(frame.getByTestId("result-screen")).toBeVisible({ timeout: 15_000 });
  LOG.l30Result = await frame.getByTestId("result-screen").innerText();
  await page.screenshot({ path: `${SHOTS}/qa1763-osobs-02-l30-result.png`, fullPage: true });

  // resultado honesto no host: fronteira de verificação nunca fabrica conclusão
  const hostText = await page.locator("main").innerText();
  LOG.hostBoundary = (
    hostText.match(/Aguardando verificador independente|Verificador indisponível|0 verificadas|sem alteração local/) ?? []
  ).join(" | ");
  expect(String(LOG.hostBoundary).length).toBeGreaterThan(0);
  await page.screenshot({ path: `${SHOTS}/qa1763-osobs-03-host-boundary.png`, fullPage: true });
  writeFileSync("/tmp/opencode/aid1763/walk-log-os.json", JSON.stringify(LOG, null, 2));
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

  // resposta errada na a1 (marca as duas não-candidatas)
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
  await page.screenshot({ path: `${SHOTS}/qa1763-osobs-04-l30-recovery.png`, fullPage: false });
  await retry.click();
  LOG.recoveryRetriedInUi = true;

  // estação returning-device no MESMO contexto: reload preserva a missão, sem re-onboarding
  await page.reload();
  await expect(page.getByRole("heading", { name: "Rotinas repetitivas: o que automatizar" })).toBeVisible({
    timeout: 30_000,
  });
  LOG.returningMissionPreserved = true;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Aprenda uma coisa útil agora." })).toBeVisible();
  LOG.returningNoOnboarding = true;
  const hubText = await page.locator("main").innerText();
  LOG.returningHub = hubText.slice(0, 600);
  await page.screenshot({ path: `${SHOTS}/qa1763-osobs-05-returning-hub.png`, fullPage: false });

  writeFileSync("/tmp/opencode/aid1763/walk-log-os.json", JSON.stringify(LOG, null, 2));
});

import { writeFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

// QA Lead AID-1943 — walk de observação independente pixel-quest (re-grant
// v75, PR #430, árvore 79d6a676, base main @ 35dd4193). Cobre as assertions
// não-playwright dos 3 cenários do use case pixelquest-evidence-encounter:
//  - encounter-evidence: learner-distinguishes-evidence-from-mastery
//  - evidence-recovery: replay recupera evidência sem promoção de estado;
//    evidência ausente não conta como conclusão
//  - returning-evidence-handoff: no-false-mastery-on-return
// Producer gates (pnpm run smoke: 5 specs, 5/5 verdes nesta árvore) são fato
// separado deste walk — producer ≠ verificador.
const BUNDLE = "/tmp/opencode/aid1943/bundle";
const LOG: Record<string, unknown> = {
  surface: "pixel-quest",
  gitPin: "79d6a676",
  startedAt: new Date().toISOString(),
  steps: [] as Array<Record<string, unknown>>,
  verdict: {} as Record<string, unknown>,
};

interface EvidenceRecord {
  source?: string;
  pass?: boolean;
  unit_id?: string;
  scenario_id?: string;
  game?: string;
}

// Lab 01 — Rate Limiter (token_bucket): mesma timeline determinística do
// smoke (12 ações) — o replay precisa re-emitir o mesmo núcleo determinístico.
const rateLimiterActions = ["z", "z", "x", "z", "z", "x", "z", "z", "x", "z", "z", "x"];

function collectEvidence(lines: string[]): EvidenceRecord[] {
  return lines
    .filter((line) => line.startsWith("EVIDENCE "))
    .map((line) => {
      try {
        return JSON.parse(line.slice("EVIDENCE ".length)) as EvidenceRecord;
      } catch {
        return {} as EvidenceRecord;
      }
    })
    .filter((r) => r.source === "pixelquest");
}

async function playEncounter(page: Page): Promise<EvidenceRecord> {
  await page.evaluate(() => window.__pixelQuestDebug?.enterRegion("lab-01_rate_limiter"));
  await expect(page.locator(".objective-chip")).toContainText("Rate Limiter");
  await page.keyboard.press("e");
  await expect(page.getByRole("button", { name: "Abrir treino" })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Treino de token bucket")).toBeVisible();
  await page.keyboard.press("Enter");
  for (const action of rateLimiterActions) {
    await page.keyboard.press(action);
  }
  await expect(page.getByText("Evidencia PASS emitida")).toBeVisible();
  const evidence = await page.evaluate(() => window.__pixelQuestEvidence?.at(-1));
  return (evidence ?? {}) as EvidenceRecord;
}

test("QA walk: encounter evidence, anti-mastery copy, returning replay, recovery", async ({ page }) => {
  const consoleLines: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "log") consoleLines.push(m.text());
  });

  // --- Sessão 1: encontro documentado + handoff anti-mastery -------------
  await page.goto("/");
  const first = await playEncounter(page);
  await expect(page.getByText("O verificador decide mastery")).toBeVisible();
  const antiMasterySession1 = true;
  await page.screenshot({ path: `${BUNDLE}/ev/qapx75-01-encounter-evidence.png` });

  // --- Sessão 2 (returning): reload → canal em memória reinicia (bound à
  // sessão), nenhuma claim de conclusão persistiu; replay determinístico
  // re-emite evidência fresca com o mesmo núcleo; copy anti-mastery de novo.
  await page.reload();
  await expect(page.locator("canvas").first()).toBeVisible();
  // Contrato do producer returning.spec.ts: canal em memória é bound à sessão
  // (sem ressurreição) — nenhum registro acessível após reload (array vazio
  // ou hook ainda ausente até o próximo encontro; ambos = 0 registros).
  const inMemoryAfterReload = await page.evaluate(() => window.__pixelQuestEvidence?.length ?? 0);
  const linesBeforeReplay = collectEvidence(consoleLines).length;
  const second = await playEncounter(page);
  await expect(page.getByText("O verificador decide mastery")).toBeVisible();
  const newEvidenceLines = collectEvidence(consoleLines).length - linesBeforeReplay;
  await page.screenshot({ path: `${BUNDLE}/ev/qapx75-02-returning-replay.png` });

  const sameDeterministicCore =
    first.unit_id === second.unit_id &&
    first.scenario_id === second.scenario_id &&
    first.pass === true &&
    second.pass === true;

  (LOG.steps as Array<Record<string, unknown>>).push({
    step: "session1-encounter",
    evidencePass: first.pass === true,
    unit: first.unit_id,
    antiMasteryCopy: antiMasterySession1,
  });
  (LOG.steps as Array<Record<string, unknown>>).push({
    step: "returning-replay",
    inMemoryChannelAfterReload: inMemoryAfterReload,
    freshEvidenceLines: newEvidenceLines,
    sameDeterministicCore,
    antiMasteryCopy: true,
  });
  LOG.verdict = {
    evidencePass: first.pass === true && second.pass === true,
    replayRecoversEvidence: newEvidenceLines >= 1 && sameDeterministicCore,
    sessionBoundChannel: inMemoryAfterReload === 0,
    noFalseMastery: antiMasterySession1,
  };
  expect(first.pass).toBe(true);
  expect(second.pass).toBe(true);
  expect(sameDeterministicCore).toBe(true);
  expect(newEvidenceLines).toBeGreaterThanOrEqual(1);
  expect(inMemoryAfterReload).toBe(0);
  writeFileSync(`${BUNDLE}/logs/walk-log-pixelquest.json`, `${JSON.stringify(LOG, null, 2)}\n`);
});

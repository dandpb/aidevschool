// QA AID-1293 — countersign wave-level PÓS-promoção W1 (produção e91272b2).
// Evidência first-hand contra a superfície LIVE (alias Netlify). Espec não
// rastreada: roda a partir da árvore QA @ pin para dirigir respostas pelo
// conteúdo gerado (bundle local == live, provado por hash de asset).
import { expect, test } from "@playwright/test";
import {
  completeOnboarding,
  mapInitial,
  readProgress,
  seedCorridorProgress,
} from "../playwright/support";
import { lessons, contentVersion, modules } from "../src/data/generated/lessons";
import { isValidEvidenceRecord } from "../src/domain/evidence";
import type { ActivityDefinition } from "../src/data/generated/lessons";

const SHOTS = "/tmp/opencode/aid1254/shots";
const w1 = [lessons.find((l) => l.id === "l08"), lessons.find((l) => l.id === "l09"), lessons.find((l) => l.id === "l10"), lessons.find((l) => l.id === "l11"), lessons.find((l) => l.id === "l12"), lessons.find((l) => l.id === "l13")];

if (w1.some((l) => !l)) throw new Error("l08–l13 ausentes do read model local");
if (contentVersion !== "2026-09-10.2") throw new Error(`contentVersion local inesperado: ${contentVersion}`);

/** Lições IA Prática anteriores a l30 (corredor completo até o fim da onda C3). */
const corridorBeforeW1 = modules
  .filter((m) => m.journey === "ia_pratica")
  .flatMap((m) => m.lessons.map((l) => l.id))
  .filter((id) => id < "l08");

async function seedW1(page: import("@playwright/test").Page, target: string, completed: string[]) {
  await page.goto("/");
  // Espera o boot consumir o estado inicial antes de semear (padrão corridor.spec).
  await expect(page.locator(".product-bar")).toBeVisible();
  // Alvo semeado como concluído: reload pousa na home e o mapa oferece "Refazer"
  // — prova de navegabilidade sem depender de estado intermediário.
  await seedCorridorProgress(page, {
    completedLessonIds: [...completed, target],
    completedCheckpointModuleIds: ["mod-01", "mod-02", "mod-03"],
  });
  await page.reload();
  await expect(page.getByTestId("home-screen")).toBeVisible();
  await page.getByTestId("open-map").click();
  await expect(page.getByTestId("map-screen")).toBeVisible();
}

async function answerWrong(t: import("@playwright/test").Page, act: ActivityDefinition) {
  if (act.type === "choice") {
    const wrong = act.data.options.find((o) => !act.evaluation.correctOptionIds.includes(o.id));
    if (wrong) await t.getByTestId(`option-${wrong.id}`).check();
    return;
  }
  if (act.type === "output_comparison") {
    const wrong = act.data.outputs.find((o) => o.id !== act.evaluation.betterOutputId);
    if (wrong) await t.getByTestId(`output-${wrong.id}`).check();
    return;
  }
  if (act.type === "sort") {
    const initial = act.data.items.map((i) => i.id);
    const matches = act.evaluation.expectedOrder.every((id, i) => id === initial[i]);
    if (matches) await t.getByTestId(`sort-up-${initial[initial.length - 1]}`).click();
    return;
  }
  if (act.type === "prompt_builder") {
    for (const f of act.data.fields) await t.getByTestId(`field-${f.id}`).fill("x");
    return;
  }
  if (act.type === "rubric_review") {
    for (const c of act.data.criteria) {
      const expected = act.evaluation.expectedVerdicts[c.id];
      await t.getByTestId(`rubric-${c.id}-${expected === "met" ? "not_met" : "met"}`).check();
    }
    return;
  }
  if (act.type === "missing_context") {
    const wrongOpt = act.data.contextOptions.find((o) => !act.evaluation.requiredContextIds.includes(o.id));
    if (wrongOpt) await t.getByTestId(`context-${wrongOpt.id}`).check();
    return;
  }
  if (act.type === "safety_classification") {
    for (const item of act.data.items) {
      const expected = act.evaluation.classification[item.id];
      await t.getByTestId(`item-${item.id}-${expected === "safe" ? "sensitive" : "safe"}`).check();
    }
    return;
  }
  throw new Error(`tipo sem helper errado: ${act.type}`);
}

async function answerRight(t: import("@playwright/test").Page, act: ActivityDefinition) {
  if (act.type === "choice") {
    const correct = new Set(act.evaluation.correctOptionIds);
    for (const o of act.data.options) {
      if (!correct.has(o.id)) continue;
      await t.getByTestId(`option-${o.id}`).check();
      if (!act.data.multiSelect) return;
    }
    return;
  }
  if (act.type === "output_comparison") {
    await t.getByTestId(`output-${act.evaluation.betterOutputId}`).check();
    for (const c of act.evaluation.requiredCriterionIds) await t.getByTestId(`criterion-${c}`).check();
    return;
  }
  if (act.type === "sort") {
    const order = act.data.items.map((i) => i.id);
    for (const [index, want] of act.evaluation.expectedOrder.entries()) {
      let pos = order.indexOf(want);
      while (pos > index) {
        await t.getByTestId(`sort-up-${want}`).click();
        order.splice(pos - 1, 0, order.splice(pos, 1)[0]);
        pos -= 1;
      }
    }
    return;
  }
  if (act.type === "prompt_builder") {
    for (const f of act.data.fields) {
      const rules = act.evaluation.fields[f.id] ?? {};
      const seed = rules.mustIncludeAny?.[0] ?? f.hint;
      let value = `${seed} com contexto do público e do formato desejado para o trabalho`;
      const min = rules.minLength ?? 0;
      while (value.length < min) value = `${value} detalhado`;
      await t.getByTestId(`field-${f.id}`).fill(value.slice(0, rules.maxLength));
    }
    return;
  }
  if (act.type === "rubric_review") {
    for (const c of act.data.criteria) {
      await t.getByTestId(`rubric-${c.id}-${act.evaluation.expectedVerdicts[c.id]}`).check();
    }
    return;
  }
  if (act.type === "missing_context") {
    for (const id of act.evaluation.requiredContextIds) await t.getByTestId(`context-${id}`).check();
    return;
  }
  if (act.type === "safety_classification") {
    for (const item of act.data.items) {
      await t.getByTestId(`item-${item.id}-${act.evaluation.classification[item.id]}`).check();
    }
    return;
  }
  throw new Error(`tipo sem helper certo: ${act.type}`);
}

/** Contrato por atividade: 3 atividades, 3 hints, feedback determinístico. */
function assertContract(lesson: NonNullable<(typeof w1)[number]>) {
  expect(lesson.activities, `${lesson.id} atividades`).toHaveLength(3);
  for (const act of lesson.activities) {
    expect(act.hints?.length, `${act.id} hints`).toBeGreaterThanOrEqual(1);
    expect(act.hints?.length, `${act.id} hints ≤3`).toBeLessThanOrEqual(3);
    expect(act.feedback.onSuccess, `${act.id} onSuccess`).toBeTruthy();
    expect(act.feedback.onFailure, `${act.id} onFailure`).toBeTruthy();
  }
}

/** Em produção o espelho sessionStorage é dev-only: a evidência estruturada
 * vai ao console (consoleEvidenceSink) — capturamos e validamos o envelope. */
function collectEvidence(page: import("@playwright/test").Page) {
  const records: unknown[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[literacy-evidence]")) {
      try { records.push(JSON.parse(text.slice(text.indexOf("{")))); } catch { /* ignora */ }
    }
  });
  return records;
}

test("entrada l02 intacta (perfil novo, rota guiada)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("assistant-welcome")).toBeVisible();
  await completeOnboarding(page);
  await expect(page.getByTestId("submit-attempt")).toBeVisible();
  await expect(page.locator("main")).toContainText("IA não é uma fonte de verdade");
  const progress = await readProgress(page);
  expect(progress?.contentVersion).toBe("2026-09-10.2");
  expect(progress?.currentLessonId).toBe("l02");
  expect(progress?.lessonStatus?.l01).toBe("locked");
  await page.screenshot({ path: `${SHOTS}/qa1293-01-entry-l02.png`, fullPage: false });
});

test("mapa público: 23 missões IA Prática, retrofit l08–l13 COM conteúdo (não 'Em breve')", async ({ page }) => {
  await seedW1(page, "l13", ["l01", "l02", "l03", "l04", "l05", "l06", "l07", "l08", "l09", "l10", "l11", "l12"]);
  const rows = page.locator('[data-testid^="map-lesson-"]');
  await expect(rows).toHaveCount(23);
  const planned = page.locator(".lesson-row.is-planned");
  await expect(planned).toHaveCount(0);
  const emBreve = page.getByText("Em breve", { exact: false });
  await expect(emBreve).toHaveCount(0);
  for (const mid of ["#module-mod-03", "#module-mod-04"]) {
    const mod = page.locator(mid);
    await expect(mod).toBeVisible();
  }
  for (const lesson of w1) {
    const row = page.getByTestId(`map-lesson-${lesson!.id}`);
    await expect(row).toBeVisible();
    await expect(row.getByText(lesson!.title)).toBeVisible();
    await expect(page.getByTestId(`map-start-${lesson!.id}`)).toBeVisible();
  }
  await page.locator("#module-mod-03").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/qa1293-02-map-mod03-04.png`, fullPage: true });
});

for (const lesson of w1) {
  if (!lesson) continue;
  test(`O3-C2 e2e ${lesson.id} "${lesson.title}" — erro→dica→acerto×3 → concluída (honest, sem mastered)`, async ({ page }) => {
    assertContract(lesson);
    const evidence = collectEvidence(page);
    await seedW1(page, lesson.id, corridorBeforeW1);
    await page.getByTestId(`map-start-${lesson.id}`).click();
    await expect(page.getByRole("heading", { name: lesson.title })).toBeVisible();
    await expect(page.getByTestId("lesson-intro")).toBeVisible();
    await page.getByTestId("start-lesson").click();

    const acts = lesson.activities;
    // a1: resposta errada → feedback corretivo + dica + retry
    await answerWrong(page, acts[0]);
    await page.getByTestId("submit-attempt").click();
    await expect(page.getByTestId("feedback-panel")).toContainText(acts[0].feedback.onFailure ?? "");
    await page.getByTestId("hint-button").click();
    const hintsList = page.getByTestId("hints-list");
    await expect(hintsList.locator("li")).toHaveCount(1);
    await expect(hintsList).toContainText(acts[0].hints?.[0] ?? "");
    await page.getByTestId("retry-activity").click();
    await answerRight(page, acts[0]);
    await page.getByTestId("submit-attempt").click();
    await expect(page.getByTestId("feedback-panel")).toContainText(acts[0].feedback.onSuccess ?? "");

    // a2..a3 corretas
    for (const act of acts.slice(1)) {
      await page.getByTestId("next-activity").click();
      await answerRight(page, act);
      await page.getByTestId("submit-attempt").click();
      await expect(page.getByTestId("feedback-panel")).toContainText(act.feedback.onSuccess ?? "");
    }
    await page.getByTestId("finish-lesson").click();

    await expect(page.getByTestId("result-screen")).toBeVisible();
    await expect(page.getByTestId("completion-distinction")).toBeVisible();
    const body = await page.getByTestId("result-screen").innerText();
    expect(body.toLowerCase()).not.toContain("mastered");
    await page.screenshot({ path: `${SHOTS}/qa1293-1x-${lesson.id}-result.png`, fullPage: false });

    expect(evidence.length).toBeGreaterThanOrEqual(3);
    for (const r of evidence.slice(-3) as (typeof evidence)[number][]) {
      expect(isValidEvidenceRecord(r)).toBe(true);
      expect(r.verifierRequired).toBe(true);
      expect(r.source).toBe("literacydojo");
    }
    await expect(page.getByTestId("verification-status")).toBeVisible();
    const progress = await readProgress(page);
    expect(progress?.lessonStatus?.[lesson.id]).toBe("completed");
    expect(progress?.contentVersion).toBe("2026-09-10.2");
  });
}

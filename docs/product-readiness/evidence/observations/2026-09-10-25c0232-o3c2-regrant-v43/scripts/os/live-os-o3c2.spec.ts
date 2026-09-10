// QA AID-1293 — navegação end-to-end interativa na superfície LIVE do
// codexdojo OS (alias Netlify, deploy promovido 6aa2c8a5 @ cb128865, onda
// O3-C2 retrofit l08–l13). Não rastreada: roda da árvore QA @ pin para
// dirigir respostas pelo conteúdo gerado local (mesmo pin do build live,
// confirmado pelo manifest sourceRevision).
import { expect, test } from "@playwright/test";
import type { FrameLocator, Page } from "@playwright/test";
import { lessons } from "../../literacyDojo/src/data/generated/lessons";
import type { ActivityDefinition } from "../../literacyDojo/src/data/generated/lessons";

const SHOTS = "/tmp/opencode/aid1293/shots-os";
const wave = ["l08", "l09", "l10", "l11", "l12", "l13"].map(
  (id) => lessons.find((l) => l.id === id),
);
if (wave.some((l) => !l)) throw new Error("l08–l13 ausentes do read model local");

async function answerRight(frame: FrameLocator, act: ActivityDefinition) {
  if (act.type === "choice") {
    const correct = new Set(act.evaluation.correctOptionIds);
    for (const o of act.data.options) {
      if (!correct.has(o.id)) continue;
      await frame.getByTestId(`option-${o.id}`).check();
      if (!act.data.multiSelect) return;
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
      await frame.getByTestId(`field-${f.id}`).fill(value.slice(0, rules.maxLength));
    }
    return;
  }
  if (act.type === "output_comparison") {
    await frame.getByTestId(`output-${act.evaluation.betterOutputId}`).check();
    for (const c of act.evaluation.requiredCriterionIds) await frame.getByTestId(`criterion-${c}`).check();
    return;
  }
  if (act.type === "sort") {
    const order = act.data.items.map((i) => i.id);
    for (const [index, want] of act.evaluation.expectedOrder.entries()) {
      let pos = order.indexOf(want);
      while (pos > index) {
        await frame.getByTestId(`sort-up-${want}`).click();
        order.splice(pos - 1, 0, order.splice(pos, 1)[0]);
        pos -= 1;
      }
    }
    return;
  }
  if (act.type === "rubric_review") {
    for (const c of act.data.criteria) {
      await frame.getByTestId(`rubric-${c.id}-${act.evaluation.expectedVerdicts[c.id]}`).check();
    }
    return;
  }
  if (act.type === "missing_context") {
    for (const id of act.evaluation.requiredContextIds) await frame.getByTestId(`context-${id}`).check();
    return;
  }
  if (act.type === "safety_classification") {
    for (const item of act.data.items) {
      await frame.getByTestId(`item-${item.id}-${act.evaluation.classification[item.id]}`).check();
    }
    return;
  }
  throw new Error(`tipo sem helper: ${act.type}`);
}

async function enterSchool(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "O que você quer conseguir fazer com IA?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Entrar na escola" }).click();
  await expect(page.getByRole("heading", { name: "Aprenda uma coisa útil agora." })).toBeVisible();
}

test("mapa live: trilho guiado intacto (entrada l01–l03 IA Prática + Dev)", async ({ page }) => {
  await enterSchool(page);
  await page.goto("/map");
  const map = page.getByTestId("chapter-map");
  await expect(map).toBeVisible();
  const iaTrack = page.locator(".chapter-track", { hasText: "Trilho guiado: l01 → l02 → l03" }).first();
  await expect(iaTrack).toBeVisible();
  await expect(iaTrack.getByText("Sua primeira conversa com uma IA")).toBeVisible();
  await expect(iaTrack.getByText("IA não é uma fonte de verdade")).toBeVisible();
  const devTrack = page.locator(".chapter-track", { hasText: "WAREHOUSE → WORMHOLE → RELAY STATION" }).first();
  await expect(devTrack).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/qa1293-os-01-map-guiado.png`, fullPage: true });
});

for (const lesson of wave) {
  if (!lesson) continue;
  test(`deep link /mission/ai-pratica/${lesson.id} live: iframe same-origin com conteúdo O3-C2`, async ({ page }) => {
    await enterSchool(page);
    await page.goto(`/mission/ai-pratica/${lesson.id}`);
    await expect(page.getByRole("heading", { name: lesson.title })).toBeVisible();
    await expect(page.getByText("0 verificadas")).toBeVisible();
    const frameElement = page.locator(`iframe[title="Missão ${lesson.title}"]`);
    const frame = page.frameLocator(`iframe[title="Missão ${lesson.title}"]`);
    await expect(frameElement).toBeVisible({ timeout: 30_000 });
    await expect(frame.locator("body")).toContainText(lesson.title, { timeout: 30_000 });
    const src = await frameElement.getAttribute("src");
    expect(src, "mission iframe tem src").toBeTruthy();
    const origin = new URL(src as string, page.url()).origin;
    expect(origin, "missão servida da origem do OS, não dev server").toBe(new URL(page.url()).origin);
  });
}

test("missão hospedada l08 live: jogável end-to-end, host honesto, canônico intacto", async ({ page }) => {
  const l08 = wave[0]!;
  await enterSchool(page);
  await page.goto("/mission/ai-pratica/l08");
  await expect(page.getByRole("heading", { name: l08.title })).toBeVisible();
  const frame = page.frameLocator(`iframe[title="Missão ${l08.title}"]`);
  await expect(frame.locator("body")).toContainText(l08.title, { timeout: 30_000 });
  await page.screenshot({ path: `${SHOTS}/qa1293-os-02-mission-l08-intro.png`, fullPage: false });

  await frame.getByTestId("start-lesson").click();
  const acts = l08.activities;
  for (const [index, act] of acts.entries()) {
    if (index > 0) await frame.getByTestId("next-activity").click();
    await answerRight(frame, act);
    await frame.getByTestId("submit-attempt").click();
    await expect(frame.getByTestId("feedback-panel")).toContainText(act.feedback.onSuccess ?? "");
  }
  await frame.getByTestId("finish-lesson").click();
  await expect(frame.getByTestId("result-screen")).toBeVisible();
  const body = await frame.getByTestId("result-screen").innerText();
  expect(body.toLowerCase()).not.toContain("mastered");
  await page.screenshot({ path: `${SHOTS}/qa1293-os-03-mission-l08-result.png`, fullPage: true });

  await expect(page.getByText("Veredito PASS").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Prática concluída neste dispositivo")).toBeVisible();
  await expect(page.getByText("0 verificadas")).toBeVisible();
  await expect(
    page.getByText("A recompensa local celebra a prática. Evidência, veredito independente e competência canônica continuam registros diferentes."),
  ).toBeVisible();
});

test("missão hospedada l12 live (safety_classification): jogável end-to-end, host honesto", async ({ page }) => {
  const l12 = wave[4]!;
  await enterSchool(page);
  await page.goto("/mission/ai-pratica/l12");
  await expect(page.getByRole("heading", { name: l12.title })).toBeVisible();
  const frame = page.frameLocator(`iframe[title="Missão ${l12.title}"]`);
  await expect(frame.locator("body")).toContainText(l12.title, { timeout: 30_000 });

  await frame.getByTestId("start-lesson").click();
  const acts = l12.activities;
  for (const [index, act] of acts.entries()) {
    if (index > 0) await frame.getByTestId("next-activity").click();
    await answerRight(frame, act);
    await frame.getByTestId("submit-attempt").click();
    await expect(frame.getByTestId("feedback-panel")).toContainText(act.feedback.onSuccess ?? "");
  }
  await frame.getByTestId("finish-lesson").click();
  await expect(frame.getByTestId("result-screen")).toBeVisible();
  const body = await frame.getByTestId("result-screen").innerText();
  expect(body.toLowerCase()).not.toContain("mastered");
  await page.screenshot({ path: `${SHOTS}/qa1293-os-04-mission-l12-result.png`, fullPage: true });

  await expect(page.getByText("Veredito PASS").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("0 verificadas")).toBeVisible();
});

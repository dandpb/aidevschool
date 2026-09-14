import { writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// QA Lead AID-1924 — walk de observação independente miniTown (re-grant v71,
// PR #427, árvore 650bcfdc). Cobre a assertion "observation" do cenário
// minitown-explore-only: a superfície é explore-only — simulação pública avança
// sem erros e não apresenta affordance de lição/persistência/progressão/
// mastery. O producer gate (pnpm run smoke) é fato separado deste walk.
const BUNDLE = "/tmp/opencode/aid1924/bundle";
const LOG: Record<string, unknown> = {
  surface: "miniTown",
  gitPin: "650bcfdc",
  startedAt: new Date().toISOString(),
  steps: [] as Array<Record<string, unknown>>,
  verdict: {} as Record<string, unknown>,
};

test("QA walk: town renders, simulation advances, explore-only boundary holds", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") runtimeErrors.push(m.text());
  });
  page.on("pageerror", (e) => runtimeErrors.push(e.message));

  await page.goto("/");
  await expect(page).toHaveTitle("MiniTown — Engine Skeleton");
  await expect(page.locator("canvas")).toBeVisible();
  const hudText = (await page.locator("#hud-stub").textContent()) ?? "";
  await expect(page.locator("#hud-stub")).toContainText("MiniTown —");

  const simulation = await page.evaluate(() => {
    const town = window.__miniTown;
    if (!town) throw new Error("MiniTown test hook was not installed");
    const before = town.getSnapshot().simTime;
    const after = town.controller.step(1).simTime;
    return { before, after, sceneChildren: town.scene.children.length };
  });
  expect(simulation.after).toBeGreaterThan(simulation.before);
  expect(simulation.sceneChildren).toBeGreaterThan(0);
  await page.screenshot({ path: `${BUNDLE}/ev/qamt71-01-explore.png` });

  // Explore-only boundary, first-hand: the whole DOM makes no lesson,
  // persistence, progression or mastery promise (no such affordances exist).
  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  const forbidden = ["master", "mastered", "progresso salvo", "salvar progresso", "lição concluída", "concluído"];
  const present = forbidden.filter((word) => bodyText.includes(word));
  const buttons = await page.locator("button").count();

  (LOG.steps as Array<Record<string, unknown>>).push({
    step: "explore",
    hudText,
    simAdvances: simulation.after > simulation.before,
    sceneChildren: simulation.sceneChildren,
    forbiddenAffordancesFound: present,
    buttonCount: buttons,
  });
  LOG.verdict = {
    simAdvances: simulation.after > simulation.before,
    noLessonPersistence: present.length === 0,
    exploreOnly: present.length === 0 && buttons === 0,
    runtimeErrors,
  };
  expect(present).toEqual([]);
  expect(runtimeErrors).toEqual([]);
  writeFileSync(`${BUNDLE}/logs/walk-log-minitown.json`, `${JSON.stringify(LOG, null, 2)}\n`);
});

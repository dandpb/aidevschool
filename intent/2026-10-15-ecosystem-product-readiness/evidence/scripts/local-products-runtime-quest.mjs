import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  ROOT,
  serve,
  browser,
  context,
  shot,
  check,
  closeContext,
  json,
} from "./local-products-runtime.mjs";

async function campaign(r, p, label, golden) {
  const missions = await p.evaluate(() => QuestData.missions);
  await p.locator('[data-stage="0"]').click();
  await p.locator("#start-mission").click();
  await p.locator('[data-option="promise"]').click();
  await p.locator("#verify-btn").click();
  check(
    r,
    `${label} incorrect campaign answer denied`,
    !(await p.evaluate(() => !!SDLCQuest.getState().done.intent)),
  );
  await shot(r, p, `${label}-campaign-wrong`);
  for (const [mi, m] of missions.entries())
    for (const [ti, t] of m.tasks.entries()) {
      check(
        r,
        `${label} current campaign ${t.id}`,
        (await p.evaluate(() => SDLCQuest.currentTask())) === t.id,
      );
      const a = golden[t.id];
      if (["select", "diff"].includes(t.type)) {
        for (const o of t.options) {
          const el = p.locator(`[data-option="${o.id}"]`);
          if (((await el.getAttribute("aria-pressed")) === "true") !== a.includes(o.id))
            await el.click();
        }
      } else if (["choice", "patch"].includes(t.type))
        await p.locator(`[data-option="${a}"]`).click();
      else if (["classify", "gate"].includes(t.type))
        for (const [k, v] of Object.entries(a))
          await p.locator(`[data-field="${k}"]`).selectOption(v);
      else if (t.type === "order") for (const k of a) await p.locator(`[data-step="${k}"]`).click();
      else if (t.type === "incident")
        for (const k of ["diagnose", "pause", "verify", "escalate", "record"])
          await p.locator(`[data-incident="${k}"]`).click();
      else throw Error("Unhandled campaign type " + t.type);
      if (t.type !== "incident") await p.locator("#verify-btn").click();
      check(
        r,
        `${label} completed campaign ${t.id}`,
        await p.evaluate((id) => !!SDLCQuest.getState().done[id], t.id),
      );
      await p.locator("#verify-btn").click();
      if (mi === 0 && ti === 0) {
        await p.reload();
        check(
          r,
          `${label} native partial-save reload`,
          (await p.evaluate(() => SDLCQuest.getStats().done)) === 1,
        );
        await p.locator("#start-mission").click();
      }
      if (ti === 2) await p.locator('[data-action="advance"]').click();
    }
  check(
    r,
    `${label} all eighteen campaign challenges`,
    (await p.evaluate(() => SDLCQuest.getStats().done)) === 18,
  );
  await shot(r, p, `${label}-campaign-complete`);
  await p.keyboard.press("Escape");
}
async function workshop(r, p, label, golden) {
  const modules = await p.evaluate(() => QuestTLCData.modules);
  await p.locator("#tlc-launch").click();
  for (const [mi, m] of modules.entries()) {
    await p.locator(`[data-tlc-module="${mi}"]`).click();
    for (const t of m.tasks) {
      const a = golden[t.id];
      check(
        r,
        `${label} current TLC ${t.id}`,
        (await p.evaluate(() => SDLCQuestTLC.currentTask())) === t.id,
      );
      if (t.id === "tlc-situation") {
        await p.locator('[data-tlc-option="stack"]').click();
        await p.locator("#tlc-submit").click();
        check(
          r,
          `${label} wrong TLC answer denied`,
          !(await p.evaluate(() => !!SDLCQuest.getState().tlc.done["tlc-situation"])),
        );
      }
      if (t.type === "choice") await p.locator(`[data-tlc-option="${a}"]`).click();
      else if (["select", "reviewlab"].includes(t.type)) {
        const want = t.type === "reviewlab" ? a.findings : a;
        for (const o of t.options) {
          const el = p.locator(`[data-tlc-option="${o.id}"]`);
          if (((await el.getAttribute("aria-pressed")) === "true") !== want.includes(o.id))
            await el.click();
        }
        if (t.type === "reviewlab") await p.locator("#tlc-verdict").selectOption(a.verdict);
      } else if (["classify", "prooflab"].includes(t.type))
        for (const [k, v] of Object.entries(a))
          await p.locator(`[data-tlc-field="${k}"]`).selectOption(v);
      else throw Error("Unhandled TLC type " + t.type);
      await p.locator("#tlc-submit").click();
      check(
        r,
        `${label} completed TLC ${t.id}`,
        await p.evaluate((id) => !!SDLCQuest.getState().tlc.done[id], t.id),
      );
      await p.locator("#tlc-next").click();
    }
    await p.locator(".tlc-back").click();
  }
  check(
    r,
    `${label} all sixteen TLC challenges`,
    (await p.evaluate(() => SDLCQuestTLC.getStats().done)) === 16,
  );
  await shot(r, p, `${label}-tlc-complete`);
  await p.keyboard.press("Escape");
}
async function execute(p, selector = "#h-execute") {
  const seq = await p.evaluate(() => SDLCQuestHarness.getState().sequence);
  await p.locator(selector).click();
  await p.waitForFunction((n) => SDLCQuestHarness.getState().sequence > n, seq);
  await p.waitForFunction(() => !document.querySelector("#h-execute")?.disabled);
}
async function lab(r, p, label) {
  await p.locator("#harness-launch").click();
  await execute(p, "#h-declare");
  check(
    r,
    `${label} lab self-declaration denied`,
    (await p.evaluate(() => SDLCQuestHarness.getState().log.at(-1).outcome)) === "rejected",
  );
  const fields = {
    0: { intent: "complete" },
    1: { plan: "traceable" },
    2: { patch: "scoped" },
    3: { suite: "contract" },
    4: { review: "current" },
    5: {},
  };
  for (let i = 0; i < 6; i++) {
    await p.locator(`#h-step-${i}`).click();
    for (const [k, v] of Object.entries(fields[i]))
      await p.locator(`#h-field-${k}`).selectOption(v);
    await execute(p);
  }
  check(
    r,
    `${label} lab six current local receipts`,
    (await p.evaluate(() => SDLCQuestHarness.getReport().summary.currentSteps)) === 6,
  );
  check(r, `${label} lab package download enabled`, await p.locator("#h-package").isEnabled());
  const dp = p.waitForEvent("download");
  await p.locator("#h-package").click();
  const dl = await dp;
  const file = path.join(r.mediaDir, `${label}-lab-package.json`);
  await dl.saveAs(file);
  const packet = await json(file);
  check(
    r,
    `${label} lab package disclaims authority`,
    packet.summary.productionAuthorized === false &&
      packet.summary.independentReviewerExecuted === false,
  );
  await shot(r, p, `${label}-lab-package`);
  await p.keyboard.press("Escape");
}
export async function observe(r) {
  const pw = await browser(r, "school-entry"),
    owned = [];
  let ctx;
  try {
    const server = await serve(r, "sdlc-quest", (p) => [
      "node",
      "tools/serve.cjs",
      "--port",
      String(p),
    ]);
    owned.push(server);
    const golden = await json(
        path.join(ROOT, "engines/sdlc-quest/tests/fixtures/accepted-decisions.json"),
      ),
      tlc = await json(path.join(ROOT, "engines/sdlc-quest/tests/fixtures/tlc-decisions.json"));
    const fileUrl = pathToFileURL(path.join(ROOT, "engines/sdlc-quest/sdlc-quest.html")).href;
    for (const [mode, url] of [
      ["http", server.origin],
      ["native-file", fileUrl],
    ])
      for (const lang of ["pt-BR", "en"]) {
        const label = `${mode}-${lang}`;
        ctx = await context(r, pw, label);
        let p = ctx.p;
        await p.goto(url);
        await p.locator("#start-mission").waitFor();
        check(
          r,
          `${label} native entry zero progress`,
          (await p.evaluate(() => SDLCQuest.getStats().done)) === 0,
          { url: p.url(), title: await p.title() },
        );
        if (lang === "en") await p.locator("#lang-btn").click();
        check(
          r,
          `${label} offered language selected`,
          (await p.locator("html").getAttribute("lang")) === lang,
        );
        await shot(r, p, `${label}-entry`);
        await campaign(r, p, label, golden);
        await workshop(r, p, label, tlc);
        await lab(r, p, label);
        await p.locator("#settings-btn").click();
        const dlPromise = p.waitForEvent("download");
        await p.locator('[data-info="backup"]').click();
        const dl = await dlPromise;
        const backup = path.join(r.mediaDir, `${label}-backup.json`);
        await dl.saveAs(backup);
        await p.keyboard.press("Escape");
        await p.reload();
        check(
          r,
          `${label} native return persists campaign and TLC`,
          await p.evaluate(
            () => SDLCQuest.getStats().done === 18 && SDLCQuestTLC.getStats().done === 16,
          ),
        );
        await p.locator("#harness-launch").click();
        check(
          r,
          `${label} lab reload drops approvals`,
          (await p.evaluate(() => Object.keys(SDLCQuestHarness.getState().receipts).length)) === 0,
        );
        await p.keyboard.press("Escape");
        await closeContext(ctx);
        ctx = await context(r, pw, `${label}-import`);
        p = ctx.p;
        await p.goto(url);
        await p.locator("#start-mission").waitFor();
        if (lang === "en") await p.locator("#lang-btn").click();
        await p.locator("#settings-btn").click();
        await p.locator("#import-file").setInputFiles(backup);
        await p.locator('[data-info="confirm-import"]').waitFor();
        const preview = await p.locator("#info-content").innerText();
        check(
          r,
          `${label} import preview describes replace and unapproved lab`,
          /18\/18/.test(preview) &&
            /16\/16/.test(preview) &&
            /replac|substitu/i.test(preview) &&
            /rerun|reexecute/i.test(preview),
        );
        check(
          r,
          `${label} preview does not apply progress`,
          (await p.evaluate(() => SDLCQuest.getStats().done)) === 0,
        );
        await shot(r, p, `${label}-import-preview`);
        await p.locator('[data-info="confirm-import"]').click();
        check(
          r,
          `${label} import confirms progress`,
          await p.evaluate(
            () => SDLCQuest.getStats().done === 18 && SDLCQuestTLC.getStats().done === 16,
          ),
        );
        await p.locator("#harness-launch").click();
        check(
          r,
          `${label} imported lab has inputs without approval`,
          await p.evaluate(
            () =>
              SDLCQuestHarness.getState().inputs.patch === "scoped" &&
              Object.keys(SDLCQuestHarness.getState().receipts).length === 0,
          ),
        );
        await shot(r, p, `${label}-imported`);
        await closeContext(ctx);
        ctx = null;
        r.cases.push({
          id: label,
          status: "pass",
          transport: mode,
          url,
          language: lang,
          campaignChallenges: 18,
          workshopChallenges: 16,
          labSteps: 6,
          nativeStorage: true,
          partialReload: true,
          backup,
          importPreview: true,
          importReplaces: true,
          labApprovalsDiscarded: true,
        });
      }
    check(r, "No browser page errors across HTTP and native file modes", r.errors.length === 0);
    r.limitations.push(
      "Native file validation is Chromium on this machine; no physical mobile, Safari or Firefox proof. Different HTTP ports/file origin use independent browser storage per documented origin contract.",
    );
  } catch (e) {
    if (ctx) {
      await shot(r, ctx.p, "quest-failure").catch(() => {});
      await closeContext(ctx, true);
      ctx = null;
    }
    throw e;
  } finally {
    await pw.close();
    for (const h of owned.reverse()) await h.stop();
    r.allOwnedProcessesStopped = owned.every(
      (h) => h.rec.exitCode !== null || h.rec.signal !== null,
    );
  }
}

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const ENGINE = path.join(ROOT, "engines/pixelDojo/pixel-quest");
const requireEngine = createRequire(path.join(ENGINE, "package.json"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const git = (...args) => execFileSync("rtk", ["proxy", "git", ...args], { cwd: ROOT, encoding: "utf8" }).trim();
const ref = async (filename) => ({ path: filename, sha256: sha256(await readFile(filename)) });
const json = async (filename, value) => writeFile(filename, `${JSON.stringify(value, null, 2)}\n`);
const ndjson = async (filename, records) => writeFile(filename, records.map((item) => JSON.stringify(item)).join("\n") + (records.length ? "\n" : ""));
const core = ({ unit_id, encounter_id, project, pass, metrics, curriculum_context }) => ({ unit_id, encounter_id, project, pass, metrics, curriculum_context });

async function freePort() {
  const reservation = createServer();
  await new Promise((resolve, reject) => { reservation.once("error", reject); reservation.listen(0, "127.0.0.1", resolve); });
  const port = reservation.address().port;
  await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function filesUnder(folder) {
  const result = [];
  for (const item of await readdir(folder, { withFileTypes: true })) {
    const filename = path.join(folder, item.name);
    if (item.isDirectory()) result.push(...await filesUnder(filename));
    else result.push(await ref(filename));
  }
  return result;
}

function inputsOf(encounter) {
  const items = encounter.requests ?? encounter.steps ?? encounter.checks ?? encounter.jobs;
  assert.ok(Array.isArray(items) && items.length > 0, `No offered inputs for ${encounter.project}`);
  return items.map((item) => ({
    label: item.label,
    type: item.type,
    admit: ["legit", "advance", "healthy", "allowed"].includes(item.type),
  }));
}

function checkRecord(record, encounter, pass) {
  assert.ok(record && typeof record === "object");
  assert.equal(record.source, "pixelquest");
  assert.equal(record.game, "PixelDojo Quest");
  assert.equal(record.project, encounter.project);
  assert.equal(record.encounter_id, encounter.id);
  assert.equal(record.unit_id, encounter.unit_id);
  assert.equal(record.pass, pass);
  assert.equal(record.metrics.kind, `pixelquest-${encounter.kind.replaceAll("_", "-")}`);
  assert.ok(Number.isFinite(Date.parse(record.ts)));
  assert.equal(record.review_context.scheduler_source, "learner-substrate");
  assert.equal(record.review_context.verifier_required, true);
  assert.equal(record.review_context.streak_candidate, pass);
  assert.equal(record.curriculum_context.concept, encounter.concept);
  assert.equal(record.curriculum_context.mechanic, encounter.mechanicName);
  assert.equal(record.curriculum_context.accepted_signal, encounter.goodRequestLabel);
  assert.equal(record.curriculum_context.rejected_trap, encounter.badRequestLabel);
}

async function noMastery(page) {
  const state = await page.evaluate(() => ({ published: "__pixelQuestLearningState" in window, local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
  assert.equal(state.published, false);
  for (const forbidden of ["learning_state", "units_log", "mastered"]) {
    assert.equal(state.local.includes(forbidden), false);
    assert.equal(state.session.includes(forbidden), false);
  }
  return state;
}

async function capture(page, mediaDir, logDir, name) {
  await page.screenshot({ path: path.join(mediaDir, `${name}.png`), fullPage: false });
  const snapshot = await page.evaluate(() => ({
    title: document.title, url: location.href, text: document.body.innerText,
    buttons: [...document.querySelectorAll("button")].map((button) => ({ text: button.textContent, disabled: button.disabled })),
    canvas: [...document.querySelectorAll("canvas")].map((canvas) => ({ width: canvas.width, height: canvas.height, box: canvas.getBoundingClientRect().toJSON() })),
    mode: window.__pixelQuestDebug?.getMode(), phase: window.__pixelQuestDebug?.getPhase(), tile: window.__pixelQuestDebug?.getPlayerTile(),
  }));
  await json(path.join(logDir, `${name}-dom.json`), snapshot);
  return snapshot;
}

async function playAttempt(page, expect, encounter, pass, before, actions) {
  await page.keyboard.press("e");
  await expect(page.getByRole("button", { name: "Abrir treino", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Abrir treino", exact: true }).click();
  await expect(page.getByRole("heading", { name: encounter.practiceTitle, exact: true })).toBeVisible();
  await expect(page.getByText(encounter.practiceText, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Iniciar duelo", exact: true }).click();
  await expect(page.getByRole("heading", { name: encounter.title, exact: true })).toBeVisible();
  const inputs = inputsOf(encounter);
  const mode = await page.evaluate(() => window.__pixelQuestDebug?.getMode());
  assert.equal(mode, encounter.kind === "route_health" ? "circuit-breaker" : encounter.kind === "policy_gate" ? "auth-gate" : "encounter");
  for (const [index, input] of inputs.entries()) {
    const prompt = page.locator(".request-line");
    await expect(prompt).toContainText(`Pacote ${index + 1}/${inputs.length}:`);
    if (input.label) await expect(prompt).toContainText(input.label);
    const admit = pass ? input.admit : !input.admit;
    const label = `${admit ? "Z" : "X"} ${admit ? encounter.admitActionLabel : encounter.rejectActionLabel}`;
    actions.push({ at: new Date().toISOString(), project: encounter.project, passAttempt: pass, step: index + 1, prompt: await prompt.innerText(), button: label });
    await page.getByRole("button", { name: label, exact: true }).click();
  }
  await expect(page.locator(".request-line")).toContainText(`Evidência ${pass ? "PASS" : "FAIL"} emitida`);
  if (pass) await expect(page.locator(".request-line")).toContainText("O verificador decide mastery");
  const channel = await page.evaluate(() => window.__pixelQuestEvidence ?? []);
  assert.equal(channel.length, before.length + 1, "One completed attempt appends one record");
  assert.deepEqual(channel.slice(0, -1), before, "All previous records remain byte-equivalent");
  const record = channel.at(-1);
  checkRecord(record, encounter, pass);
  if (before.length) assert.ok(Date.parse(record.ts) > Date.parse(before.at(-1).ts), "Emission timestamps increase");
  await noMastery(page);
  return { record, channel, mode };
}

async function reviewAndReturn(page, expect, pass) {
  await page.getByRole("button", { name: "Abrir diário", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Diário", exact: true })).toBeVisible();
  await expect(page.getByText(new RegExp(`Última evidência: ${pass ? "PASS" : "FAIL"}`))).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  assert.equal(await page.evaluate(() => window.__pixelQuestDebug?.getMode()), "world");
}

export async function run(caseName = "declared-use", options = {}) {
  assert.equal(caseName, "declared-use", `Unknown PixelDojo observation: ${caseName}`);
  const runId = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const logDir = path.resolve(options.artifactDir ?? path.join(ROOT, ".scratch/readiness-implementation-20261015/qa-pixel", `${caseName}-${runId}`));
  const mediaDir = path.join(ENGINE, "test-results/readiness-plan-runtime", `pixel-all18-${runId}`);
  await mkdir(logDir, { recursive: true });
  await mkdir(mediaDir, { recursive: true });
  const commonRoot = path.dirname(git("rev-parse", "--path-format=absolute", "--git-common-dir"));
  const policySource = options.sharedPolicySource ?? path.join(commonRoot, "engines/shared/playwright/base.config.ts");
  const canonicalBefore = await ref(path.join(ROOT, "learner/learning_state.yaml"));
  const sourcePaths = [".checks/product-readiness-20261015.md", "intent/2026-10-15-ecosystem-product-readiness/plan.md", "intent/2026-10-15-ecosystem-product-readiness/qualification-matrix.md", "curriculum/catalog.md", "engines/pixelDojo/EVIDENCE_CONTRACT.md", "engines/pixelDojo/pixel-quest/src/content/curriculumPack.ts", "engines/pixelDojo/pixel-quest/src/content/types.ts", "engines/pixelDojo/pixel-quest/src/app/PixelQuestApp.ts", "engines/pixelDojo/pixel-quest/src/game/evidence/evidence.ts", "engines/pixelDojo/pixel-quest/src/game/evidence/emitter.ts", "engines/pixelDojo/pixel-quest/src/ui/Hud.ts"];
  const sourceRefs = await Promise.all(sourcePaths.map((name) => ref(path.join(ROOT, name))));
  const report = {
    engineId: "pixelDojo", caseName, observedAt: new Date().toISOString(), criterion: 26,
    declaredUse: "18 offered curriculum labs: briefing/map → practice → duel → raw NDJSON → journal; fail/retry and return/replay; no canonical mastery",
    sourceCommit: git("rev-parse", "HEAD"), sourceFingerprint: sha256(JSON.stringify(sourceRefs)), sourceRefs,
    producerContext: "readiness-pixel-runtime-producer", verifierContext: null,
    invocation: { argv: process.argv, cwd: process.cwd(), pid: process.pid, caseName },
    helperSource: await ref(fileURLToPath(import.meta.url)),
    browserAvailability: "Browser plugin not available; regular installed Playwright used per frontend-testing-debugging skill",
    evidencePolicy: { source: await ref(policySource), importedOrPromoted: false, screenshot: "on", video: "on", trace: "retain-on-failure", outputDir: mediaDir, viewport: { width: 1280, height: 800 } },
    assertions: [], cases: [], evidenceRefs: [], status: "unverified", runtimeStatus: "unverified", limitations: ["Producer runtime evidence is not an independent semantic judgment. TypeSafe/Jev verification of retained media is a prerequisite; no model/API call was made.", "Return to labs 02–18 uses the existing public __pixelQuestDebug.enterRegion input after reload because progress is session-bound; duels and evidence are produced through visible native controls. No completeEncounter/auto-pass hook is used.", "This observation covers local HTTP Chromium at 1280×800, not deployment, all browsers, or mobile usability."],
  };
  const consoleLog = [], consoleEvidence = [], actions = [], network = [];
  let vite, browser, context, page, failed = false, catalog, savedMain = [];
  try {
    const { chromium, expect } = requireEngine("@playwright/test");
    const viteEntry = path.join(path.dirname(requireEngine.resolve("vite/package.json")), "dist/node/index.js");
    const { createServer: createViteServer } = await import(pathToFileURL(viteEntry).href);
    const port = await freePort();
    assert.ok(![4176, 5176].includes(port));
    vite = await createViteServer({ root: ENGINE, configFile: false, server: { host: "127.0.0.1", port, strictPort: true } });
    await vite.listen();
    const origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
    report.runtime = { kind: "real-http", origin, serverPid: process.pid, serverApi: "vite.createServer", serverOptions: { root: ENGINE, configFile: false, host: "127.0.0.1", port, strictPort: true }, reusedServer: false, node: process.version };
    const { curriculumPack } = await vite.ssrLoadModule("/src/content/curriculumPack.ts");
    const canonicalCatalog = await readFile(path.join(ROOT, "curriculum/catalog.md"), "utf8");
    const expectedProjects = [...canonicalCatalog.matchAll(/\| \*\*Slug\*\* \| `((?:0[1-9]|1[0-8])_[^`]+)` \|/g)].map((match) => match[1]);
    assert.equal(expectedProjects.length, 18);
    assert.equal(new Set(expectedProjects).size, 18);
    assert.deepEqual(curriculumPack.regions.map((region) => region.project), expectedProjects);
    assert.deepEqual(curriculumPack.encounters.map((encounter) => encounter.project), expectedProjects);
    catalog = curriculumPack.regions.map((region, index) => ({ region, encounter: curriculumPack.encounters[index] }));
    report.catalog = catalog.map(({ region, encounter }) => ({ project: region.project, regionId: region.id, title: region.name, encounterId: encounter.id, unitId: encounter.unit_id, kind: encounter.kind, inputCount: inputsOf(encounter).length }));
    await json(path.join(logDir, "catalog.json"), report.catalog);
    report.assertions.push({ name: "offered_catalog_matches_all18_numbered_curriculum_projects", passed: true, count: 18 });
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ viewport: { width: 1280, height: 800 }, baseURL: origin, recordVideo: { dir: mediaDir, size: { width: 1280, height: 800 } } });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    page = await context.newPage();
    page.setDefaultTimeout(options.timeoutMs ?? 20_000);
    page.on("console", (message) => {
      const event = { at: new Date().toISOString(), type: message.type(), text: message.text() };
      consoleLog.push(event);
      if (event.type === "log" && event.text.startsWith("EVIDENCE ")) consoleEvidence.push(JSON.parse(event.text.slice(9)));
    });
    page.on("pageerror", (error) => consoleLog.push({ at: new Date().toISOString(), type: "pageerror", text: error.message }));
    page.on("requestfailed", (request) => network.push({ url: request.url(), failure: request.failure() }));
    await page.goto(origin);
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Briefing", exact: true })).toBeVisible();
    await expect(page.locator(".objective-chip")).toContainText("18 labs");
    assert.equal(await page.title(), "PixelDojo Quest");
    assert.equal(new URL(page.url()).origin, origin);
    assert.equal(await page.locator("vite-error-overlay").count(), 0);
    const entry = await capture(page, mediaDir, logDir, "entry-briefing");
    assert.ok(entry.text.length > 200);
    await page.getByRole("button", { name: "Começar", exact: true }).click();
    for (const [index, { region, encounter }] of catalog.entries()) {
      const result = { project: region.project, regionId: region.id, encounterId: encounter.id, unitId: encounter.unit_id, kind: encounter.kind, status: "unverified", entry: index === 0 ? "briefing Começar" : "Órbita 3D → Próximo → Abrir lab", assertions: [] };
      report.cases.push(result);
      try {
        if (index > 0) {
          await page.keyboard.press("o");
          await expect(page.getByRole("button", { name: "Próximo", exact: true })).toBeVisible();
          await page.getByRole("button", { name: "Próximo", exact: true }).click();
          await expect(page.getByRole("button", { name: "Abrir lab", exact: true })).toBeEnabled();
          await page.getByRole("button", { name: "Abrir lab", exact: true }).click();
        }
        await expect(page.locator(".objective-chip")).toContainText(region.name);
        const first = await playAttempt(page, expect, encounter, false, savedMain, actions);
        await capture(page, mediaDir, logDir, `${region.project}-fail`);
        await reviewAndReturn(page, expect, false);
        const retry = await playAttempt(page, expect, encounter, true, first.channel, actions);
        await capture(page, mediaDir, logDir, `${region.project}-retry-pass`);
        await reviewAndReturn(page, expect, true);
        savedMain = retry.channel;
        result.failEvidence = first.record;
        result.passEvidence = retry.record;
        result.assertions = ["visible-entry-map", "visible-briefing-practice-duel-controls", "incorrect-actions-emit-fail", "retry-correct-actions-emit-pass", "journal-and-return-to-map", "prior-evidence-prefix-preserved", "schema-identity-and-context-bound", "no-browser-mastery-state"].map((name) => ({ name, passed: true }));
        result.runtimeStatus = "pass";
        result.status = "pass";
        await ndjson(path.join(logDir, `${region.project}-fail-retry.ndjson`), [first.record, retry.record]);
        await ndjson(path.join(logDir, "session-one-append-only.ndjson"), savedMain);
        options.onProgress?.({ phase: "main", project: region.project, status: "pass", recordCount: savedMain.length });
      } catch (error) {
        failed = true;
        result.status = "blocked";
        result.error = { message: String(error), stack: error?.stack };
        await capture(page, mediaDir, logDir, `${region.project}-failure`).catch(() => {});
        options.onProgress?.({ phase: "main", project: region.project, status: "blocked", error: String(error) });
        // Preserve the remaining promised variants as explicit gaps rather than
        // interpreting an unreachable next entry as a successful observation.
        for (const remaining of catalog.slice(index + 1)) report.cases.push({ project: remaining.region.project, regionId: remaining.region.id, encounterId: remaining.encounter.id, kind: remaining.encounter.kind, status: "unverified", limitation: `Main entry sequence stopped at ${region.project}; no input was fabricated.` });
        break;
      }
    }
    const mainArtifact = await ref(path.join(logDir, "session-one-append-only.ndjson"));
    report.handoff = { ...mainArtifact, count: savedMain.length, format: "NDJSON", consumer: "learner/gate (not invoked; separate verifier receipt required)", recordsProducedInBrowser: true, untouchedByReplay: false };
    assert.deepEqual(consoleEvidence, savedMain, "Console and in-page channels match exactly in order");
    report.assertions.push({ name: "dual_console_page_evidence_channels_match", passed: true, count: savedMain.length });
    for (const { region, encounter } of catalog) {
      const result = report.cases.find((item) => item.project === region.project);
      result.returning = { status: "unverified", entry: "reload → fresh briefing → public enterRegion input → visible practice/duel controls" };
      try {
        await page.reload();
        await expect(page.getByRole("heading", { name: "Briefing", exact: true })).toBeVisible();
        assert.equal(await page.evaluate(() => window.__pixelQuestEvidence?.length ?? 0), 0, "Session evidence is not resurrected after reload");
        await page.evaluate((id) => window.__pixelQuestDebug.enterRegion(id), region.id);
        await expect(page.locator(".objective-chip")).toContainText(region.name);
        const replay = await playAttempt(page, expect, encounter, true, [], actions);
        const original = result.passEvidence;
        assert.ok(original, "Replay requires the original main-session PASS artifact");
        assert.deepEqual(core(replay.record), core(original), "Returning replay preserves deterministic core");
        assert.notEqual(replay.record.ts, original.ts, "Replay emits a fresh record");
        assert.equal((await ref(mainArtifact.path)).sha256, mainArtifact.sha256, "Saved NDJSON remains unchanged");
        await ndjson(path.join(logDir, `${region.project}-returning.ndjson`), [replay.record]);
        await capture(page, mediaDir, logDir, `${region.project}-returning-pass`);
        await reviewAndReturn(page, expect, true);
        result.returning = { ...result.returning, status: "pass", record: replay.record, assertions: ["fresh-session-empty-channel", "visible-replay-controls", "deterministic-core-identical", "fresh-timestamp", "saved-ndjson-sha-unchanged", "journal-return"] };
        options.onProgress?.({ phase: "returning", project: region.project, status: "pass" });
      } catch (error) {
        failed = true;
        result.returning.status = "blocked";
        result.returning.error = { message: String(error), stack: error?.stack };
        await capture(page, mediaDir, logDir, `${region.project}-returning-failure`).catch(() => {});
        options.onProgress?.({ phase: "returning", project: region.project, status: "blocked", error: String(error) });
      }
    }
    report.handoff.untouchedByReplay = (await ref(mainArtifact.path)).sha256 === mainArtifact.sha256;
    report.browserState = await noMastery(page);
    const browserErrors = consoleLog.filter((item) => ["error", "pageerror"].includes(item.type));
    assert.deepEqual(browserErrors, [], "No browser errors in positive, negative, retry, and return flows");
    assert.deepEqual(network, [], "No failed HTTP requests");
    assert.equal(await page.locator("vite-error-overlay").count(), 0);
    report.assertions.push({ name: "console_no_runtime_errors", passed: true }, { name: "no_failed_requests", passed: true }, { name: "no_framework_overlay", passed: true });
    const allObserved = report.cases.length === 18 && report.cases.every((item) => item.status === "pass" && item.returning?.status === "pass");
    report.runtimeStatus = allObserved && !failed ? "pass" : "blocked";
    report.status = failed ? "blocked" : "unverified";
    report.coverage = { offered: 18, mainPass: report.cases.filter((item) => item.status === "pass").length, returningPass: report.cases.filter((item) => item.returning?.status === "pass").length, mainRecords: savedMain.length, independentlySemanticallyVerified: 0 };
  } catch (error) {
    failed = true;
    report.status = "blocked";
    report.runtimeStatus = "blocked";
    report.error = { message: String(error), stack: error?.stack };
    if (page) await capture(page, mediaDir, logDir, "failure").catch(() => {});
    if (catalog) for (const { region, encounter } of catalog) if (!report.cases.some((item) => item.project === region.project)) report.cases.push({ project: region.project, regionId: region.id, encounterId: encounter.id, status: "unverified", limitation: "Observation stopped before this promised variant." });
  } finally {
    if (context) {
      await context.tracing.stop(failed ? { path: path.join(mediaDir, "trace.zip") } : {}).catch((error) => report.limitations.push(`Trace close failed: ${String(error)}`));
      await context.close();
    }
    if (browser) await browser.close();
    if (vite) await vite.close();
    report.cleanup = { browserClosed: Boolean(browser), ownViteServerClosed: Boolean(vite), reusedUnknownServer: false, at: new Date().toISOString() };
    report.canonicalBefore = canonicalBefore;
    report.canonicalAfter = await ref(path.join(ROOT, "learner/learning_state.yaml"));
    if (report.canonicalAfter.sha256 !== canonicalBefore.sha256) {
      report.status = "blocked";
      report.limitations.push("Canonical learner hash changed during observation; this producer did not write it.");
    }
    report.assertions.push({ name: "canonical_learner_sha256_unchanged", passed: report.canonicalAfter.sha256 === canonicalBefore.sha256 });
    await json(path.join(logDir, "browser-console.json"), consoleLog);
    await json(path.join(logDir, "ui-actions.json"), actions);
    await json(path.join(logDir, "network-failures.json"), network);
    await ndjson(path.join(logDir, "all-console-evidence.ndjson"), consoleEvidence);
    report.evidenceRefs.push(...await filesUnder(logDir), ...await filesUnder(mediaDir));
    report.finishedAt = new Date().toISOString();
  }
  const reportPath = path.join(logDir, "report.json");
  await json(reportPath, report);
  return { ...report, reportPath, reportSha256: sha256(await readFile(reportPath)) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await run(process.argv[2] ?? "declared-use", { onProgress: (event) => console.log(JSON.stringify(event)) });
  console.log(JSON.stringify({ engineId: result.engineId, status: result.status, runtimeStatus: result.runtimeStatus, coverage: result.coverage, reportPath: result.reportPath, reportSha256: result.reportSha256 }));
  if (result.status === "blocked") process.exitCode = 1;
}

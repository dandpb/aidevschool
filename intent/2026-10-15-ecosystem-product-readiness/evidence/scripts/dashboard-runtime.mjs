import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const COMMON = path.dirname(execFileSync("rtk", ["proxy", "git", "rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: ROOT, encoding: "utf8" }).trim());
const VIEWPORT = { width: 1280, height: 800 };
const RESERVED = new Set([4174, 5175, 5176, 5177, 5178, 4177, 5180, 5181, 5182, 5183, 5184, 5189, 4176, 3100]);
const STATE_PATHS = ["learning_state.yaml", "learner_profile.md", "pitfalls.md", "journal.md", "pipeline_status.yaml", "pipeline_status.md", "predictions.yaml"];
const CRITERIA = { codexDojo: "C18", dojoToday: "C20", miniTown: "C23" };
const SOURCES = {
  codexDojo: ["README.md", "AGENTS.md", "DESIGN.md", "package.json", "src/app.ts", "src/data/learner.ts", "src/data/agents.ts", "src/data/osEngine.ts", "src/render/overview.ts", "src/render/learner.ts", "src/render/agents.ts", "src/render/events.ts", "src/linuxLab/render.ts"],
  dojoToday: ["README.md", "DESIGN.md", "package.json", "vite.config.ts", "src/main.ts", "src/assistant.ts", "src/data/today.ts"],
  miniTown: ["README.md", "DESIGN.md", "package.json", "src/main.ts", "src/evidence/e2e.contract.ts", "src/game/controller.ts", "src/scene/camera.ts", "src/scene/dayNight.ts", "src/scene/sceneRoot.ts", "src/scene/state.ts", "docs/concepts/CONCEPTS.md"],
};
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const git = (...args) => execFileSync("rtk", ["proxy", "git", ...args], { cwd: ROOT, encoding: "utf8" }).trim();
const ref = async (filename) => ({ path: filename, sha256: sha256(await readFile(filename)) });
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function stateHashes(root) {
  const files = [];
  for (const name of STATE_PATHS) {
    const filename = path.join(root, "learner", name);
    try { files.push(await ref(filename)); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return { root, files, digest: sha256(JSON.stringify(files)) };
}

async function freePort() {
  for (;;) {
    const reservation = createServer();
    await new Promise((resolve, reject) => { reservation.once("error", reject); reservation.listen(0, "127.0.0.1", resolve); });
    const port = reservation.address().port;
    await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
    if (!RESERVED.has(port)) return port;
  }
}

function safeEnvironment(extra = {}) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^(VITE_|DOJOTODAY_|LLM_|OPENAI_|ANTHROPIC_|TYPESAFE_|HERMES_|CODEXDOJO_)/.test(key) || /(?:_KEY|_TOKEN|_SECRET|PASSWORD)$/i.test(key)) delete env[key];
  }
  return { ...env, ...extra };
}

async function command(report, cwd, args, extraEnv = {}, waitForExit = false) {
  const index = report.commands.length;
  const record = { executable: "rtk", argv: ["proxy", ...args], cwd, envOverrides: extraEnv, startedAt: new Date().toISOString(), pid: null, exitCode: null, signal: null };
  const child = spawn("rtk", record.argv, { cwd, env: safeEnvironment(extraEnv), detached: true, stdio: ["ignore", "pipe", "pipe"] });
  record.pid = child.pid;
  report.commands.push(record);
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (data) => { stdout += data; });
  child.stderr.on("data", (data) => { stderr += data; });
  const exited = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => { record.exitCode = code; record.signal = signal; record.endedAt = new Date().toISOString(); resolve(); });
  });
  const save = async () => {
    record.stdout = path.join(report.logDir, `command-${index}-stdout.log`);
    record.stderr = path.join(report.logDir, `command-${index}-stderr.log`);
    await writeFile(record.stdout, stdout);
    await writeFile(record.stderr, stderr);
  };
  const stop = async () => {
    if (child.exitCode === null && child.signalCode === null) {
      try { process.kill(-child.pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") throw error; }
      let timer;
      await Promise.race([exited, new Promise((resolve) => { timer = setTimeout(resolve, 6000); })]);
      clearTimeout(timer);
      if (child.exitCode === null && child.signalCode === null) {
        try { process.kill(-child.pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") throw error; }
      }
    }
    await exited;
    await save();
  };
  if (waitForExit) { await exited; await save(); assert.equal(record.exitCode, 0, `Command failed: ${args.join(" ")}`); }
  return { child, record, exited, stop, save };
}

async function startApp(report, engineId, kind = "dev", extraEnv = {}, extraArgs = [], fixedPort) {
  const engine = path.join(ROOT, "engines", engineId);
  const pm = ["codexDojo", "miniTown"].includes(engineId) ? "pnpm" : "npm";
  const port = fixedPort ?? await freePort();
  const args = [pm, "run", kind, ...(pm === "npm" ? ["--"] : []), "--host", "127.0.0.1", "--port", String(port), "--strictPort", ...extraArgs];
  const processHandle = await command(report, engine, args, extraEnv);
  const origin = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let i = 0; i < 160; i++) {
      if (processHandle.child.exitCode !== null || processHandle.child.signalCode !== null) break;
      try { const response = await fetch(origin); if (response.ok) { ready = true; break; } } catch {}
      await delay(250);
    }
    assert.ok(ready, `Own ${engineId} ${kind} server did not become ready at ${origin}`);
    return { ...processHandle, origin, port, engineId, kind };
  } catch (error) { await processHandle.stop(); throw error; }
}

async function walkFiles(folder) {
  const files = [];
  for (const item of await readdir(folder, { withFileTypes: true })) {
    const filename = path.join(folder, item.name);
    if (item.isDirectory()) files.push(...await walkFiles(filename)); else files.push(filename);
  }
  return files;
}

function literalProjection(filename, variable, requireEngine) {
  return readFile(filename, "utf8").then((source) => {
    const ts = requireEngine("typescript");
    const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
    const value = (node) => {
      if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return ts.isNumericLiteral(node) ? Number(node.text) : node.text;
      if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
      if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
      if (node.kind === ts.SyntaxKind.NullKeyword) return null;
      if (ts.isArrayLiteralExpression(node)) return node.elements.map(value);
      if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map((property) => { assert.ok(ts.isPropertyAssignment(property)); return [property.name.text, value(property.initializer)]; }));
      throw new Error(`Nonliteral projection node: ${node.kind}`);
    };
    for (const statement of tree.statements) if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) if (declaration.name.getText(tree) === variable) return value(declaration.initializer);
    throw new Error(`Projection ${variable} not found`);
  });
}

async function assertion(report, id, promiseSource, operation) {
  const entry = { id, mandatory: true, promiseSource, status: "unverified", startedAt: new Date().toISOString() };
  report.assertions.push(entry);
  try { entry.observed = await operation(); entry.status = "pass"; }
  catch (error) { entry.status = "blocked"; entry.error = { message: String(error), stack: error.stack }; }
  entry.endedAt = new Date().toISOString();
}

async function session(report, browser, name, origin, operation, options = {}) {
  const mediaDir = path.join(report.mediaDir, name);
  await mkdir(mediaDir, { recursive: true });
  const context = await browser.newContext({ viewport: VIEWPORT, baseURL: origin, recordVideo: { dir: mediaDir, size: VIEWPORT }, ...(options.permissions ? { permissions: options.permissions } : {}) });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const consoleMessages = [];
  const network = [];
  const allowedOrigins = new Set([origin, ...(options.allowedOrigins ?? [])]);
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["http:", "https:"].includes(url.protocol) && !allowedOrigins.has(url.origin)) {
      network.push({ url: url.origin + url.pathname, method: route.request().method(), blockedExternal: true });
      await route.abort("blockedbyclient");
    } else await route.continue();
  });
  context.on("page", (observed) => {
    observed.on("pageerror", (error) => consoleMessages.push({ page: observed.url(), type: "pageerror", text: String(error) }));
    observed.on("console", (message) => { if (["warning", "error"].includes(message.type())) consoleMessages.push({ page: observed.url(), type: message.type(), text: message.text() }); });
  });
  page.on("pageerror", (error) => consoleMessages.push({ page: page.url(), type: "pageerror", text: String(error) }));
  page.on("console", (message) => { if (["warning", "error"].includes(message.type())) consoleMessages.push({ page: page.url(), type: message.type(), text: message.text() }); });
  page.on("requestfailed", (request) => network.push({ url: request.url(), method: request.method(), failure: request.failure() }));
  page.on("response", (response) => { if (response.status() >= 400 || response.request().resourceType() === "document") network.push({ url: response.url(), status: response.status(), resourceType: response.request().resourceType() }); });
  const capture = async (label, target = page) => {
    const artifact = path.join(mediaDir, label);
    await target.screenshot({ path: `${artifact}.png`, fullPage: false });
    const snapshot = { url: target.url(), title: await target.title(), viewport: VIEWPORT, body: await target.locator("body").innerText(), aria: await target.locator("body").ariaSnapshot(), frameworkOverlayCount: await target.locator("vite-error-overlay, nextjs-portal, webpack-dev-server-client-overlay").count() };
    await writeFile(`${artifact}.json`, JSON.stringify(snapshot, null, 2));
    return snapshot;
  };
  let failed = false;
  const before = report.assertions.length;
  try { await operation({ page, context, capture, consoleMessages, network }); }
  catch (error) {
    failed = true;
    report.assertions.push({ id: `${name}-harness`, mandatory: true, promiseSource: report.criteriaSource, status: "blocked", error: { message: String(error), stack: error.stack } });
  } finally {
    failed ||= report.assertions.slice(before).some((entry) => entry.status === "blocked");
    if (failed) await capture("failure").catch(() => {});
    await writeFile(path.join(mediaDir, "console.json"), JSON.stringify(consoleMessages, null, 2));
    await writeFile(path.join(mediaDir, "network.json"), JSON.stringify(network, null, 2));
    await context.tracing.stop(failed ? { path: path.join(mediaDir, "trace.zip") } : {});
    await context.close();
  }
}

async function health(page, title, origin, consoleMessages) {
  assert.equal(await page.title(), title);
  assert.equal(new URL(page.url()).origin, origin);
  assert.ok((await page.locator("body").innerText()).trim().length > 20, "Blank app body");
  assert.equal(await page.locator("vite-error-overlay, nextjs-portal, webpack-dev-server-client-overlay").count(), 0);
  assert.deepEqual(consoleMessages.filter((item) => ["pageerror", "error"].includes(item.type)), []);
  return { url: page.url(), title, nonblank: true, frameworkOverlay: false, appErrors: 0, warnings: consoleMessages.filter((item) => item.type === "warning") };
}

async function codexDojo(report, browser, requireEngine) {
  const engine = path.join(ROOT, "engines/codexDojo");
  const projection = await literalProjection(path.join(engine, "src/data/learner.ts"), "learnerSnapshot", requireEngine);
  const config = await readFile(path.join(ROOT, "engines/minimaxDojo/config/dashboard.yaml"), "utf8");
  const canonicalPrompt = "Coordene a máquina de estados, isole subtarefas e só avance com evidência executável.";
  assert.ok(config.includes(canonicalPrompt), "Expected prompt must come from canonical dashboard YAML");
  let os;
  let dashboard;
  try {
    os = await startApp(report, "codexdojo-os-prototype", "dev", { VITE_LOCAL_ENGINE_BRIDGE: "false", VITE_ENGINE_LAB_ENABLED: "false" });
    dashboard = await startApp(report, "codexDojo", "dev", { VITE_CODEXDOJO_OS_URL: os.origin });
    await session(report, browser, "configured-bridge", dashboard.origin, async ({ page, context, capture, consoleMessages }) => {
      await page.goto("/");
      await assertion(report, "C18-projection-next-action", "plan.md#18; codexDojo README; generated learner projection", async () => {
        const panel = page.getByRole("region", { name: "Painel do aprendiz" });
        await panel.waitFor({ state: "visible" });
        assert.equal(await panel.locator(".learner-unit h3").innerText(), projection.activeUnit.title);
        assert.equal((await panel.locator(".state-pill").textContent()).trim(), projection.activeUnit.state);
        assert.equal(await panel.locator(".streak-current").getAttribute("aria-label"), `Sequência atual: ${projection.streak.current}`);
        assert.deepEqual(await panel.locator(".review-unit").allTextContents(), projection.nextReviews.map((item) => item.unitId));
        const nextAction = page.getByRole("button", { name: "Avançar para o próximo ciclo", exact: true });
        await nextAction.click();
        await page.getByRole("region", { name: "Ciclo operacional" }).waitFor({ state: "visible" });
        return { activeUnit: projection.activeUnit.id, reviews: projection.nextReviews.map((item) => item.unitId), nextAction: "Avançar para o próximo ciclo", destination: "Ciclo operacional", page: await capture("next-action") };
      });
      await assertion(report, "C18-real-clipboard-prompt", "qualification-matrix.md#codexDojo; minimaxDojo/config/dashboard.yaml", async () => {
        await page.locator(".nav-button[data-view='agents']").click();
        await page.locator("[data-copy-agent='maestro']").click();
        await page.getByRole("button", { name: "Prompt de MAESTRO copiado", exact: true }).waitFor({ state: "visible" });
        const copied = await page.evaluate(() => navigator.clipboard.readText());
        assert.equal(copied, canonicalPrompt);
        return { actualClipboardRead: true, mockedClipboard: false, expectedSource: "engines/minimaxDojo/config/dashboard.yaml", copiedSha256: sha256(copied), page: await capture("copied-prompt") };
      });
      await assertion(report, "C18-configured-actual-os-destination", "codexDojo/AGENTS.md#OS bridge; C18", async () => {
        await page.locator(".nav-button[data-view='linuxLab']").click();
        const launch = page.locator("[data-codexdojo-os-launch]");
        assert.equal(await launch.getAttribute("href"), os.origin);
        const [target] = await Promise.all([context.waitForEvent("page"), launch.click()]);
        await target.waitForLoadState("domcontentloaded");
        await target.getByText("Seu próximo passo", { exact: false }).first().waitFor({ state: "visible", timeout: 5000 }).catch(async () => { await target.locator("#root").waitFor({ state: "visible" }); });
        assert.equal(new URL(target.url()).origin, os.origin);
        assert.ok((await target.locator("#root").innerText()).length > 40, "Actual OS must render its React entry");
        assert.equal(await target.locator("vite-error-overlay").count(), 0);
        const osPage = await capture("actual-os-destination", target);
        await target.close();
        return { configuredOrigin: os.origin, ownOsPid: os.record.pid, noMissionExecuted: true, osPage, bridgePage: await capture("configured-bridge") };
      });
      await assertion(report, "C18-configured-page-health", "frontend-testing-debugging; C18", () => health(page, "codexDojo", dashboard.origin, consoleMessages));
    }, { permissions: ["clipboard-read", "clipboard-write"], allowedOrigins: [os.origin] });
  } finally { if (dashboard) await dashboard.stop(); if (os) await os.stop(); }

  // Unique build output avoids racing the producer's engine/dist directory.
  const buildDir = path.join(report.mediaDir, "production-no-url", "dist");
  const build = await command(report, engine, ["pnpm", "exec", "vite", "build", "--outDir", buildDir, "--emptyOutDir"], {}, true);
  assert.equal(build.record.exitCode, 0);
  let absent;
  try {
    absent = await startApp(report, "codexDojo", "preview", {}, ["--outDir", buildDir]);
    await session(report, browser, "production-no-url", absent.origin, async ({ page, capture, consoleMessages }) => {
      await page.goto("/");
      await assertion(report, "C18-absent-production-url-boundary", "codexDojo/AGENTS.md: production has no implicit remote URL; C18", async () => {
        await page.locator(".nav-button[data-view='linuxLab']").click();
        await page.getByRole("status").filter({ hasText: "VITE_CODEXDOJO_OS_URL" }).waitFor({ state: "visible" });
        assert.equal(await page.locator("[data-codexdojo-os-launch], [data-linux-app], [data-action='run-linux-lab']").count(), 0);
        return { buildMode: "production", VITE_CODEXDOJO_OS_URL: "unset in sanitized child environment", noLaunchAnchor: true, page: await capture("unconfigured-bridge"), health: await health(page, "codexDojo", absent.origin, consoleMessages) };
      });
    });
  } finally { if (absent) await absent.stop(); }
}

async function dojoToday(report, browser, requireEngine) {
  const engine = path.join(ROOT, "engines/dojoToday");
  const projection = await literalProjection(path.join(engine, "src/data/today.ts"), "today", requireEngine);
  let app;
  try {
    app = await startApp(report, "dojoToday");
    await session(report, browser, "daily-guidance", app.origin, async ({ page, capture, consoleMessages, network }) => {
      await page.goto("/");
      await page.getByRole("heading", { name: "Sua lição de hoje", exact: true }).waitFor({ state: "visible" });
      await assertion(report, "C20-readonly-projection-and-next-action", "dojoToday/README.md#Origem dos dados; C20", async () => {
        const reviews = page.locator(".lessons .lesson-card");
        assert.equal(await reviews.count(), projection.reviews.length);
        const expectedReviews = [...projection.reviews].sort((a, b) => a.reason === "overdue" ? -1 : b.reason === "overdue" ? 1 : 0);
        assert.deepEqual(await reviews.locator(".lesson-title").allTextContents(), expectedReviews.map((item) => item.title));
        assert.deepEqual(await reviews.locator(".due-in").allTextContents(), expectedReviews.map((item) => item.dueIn));
        assert.equal(await page.locator(".streak-current").innerText(), projection.streak.current === 0 ? "Quebre o gelo hoje" : `${projection.streak.current} ${projection.streak.current === 1 ? "dia" : "dias"} de sequência`);
        assert.ok((await page.locator(".mission-card").innerText()).includes(projection.activeUnit.title));
        assert.ok((await page.locator(".mission-card").innerText()).includes(projection.activeUnit.diagnosticFile));
        assert.ok((await page.locator("footer.note").innerText()).includes("não marca mastered"));
        await page.locator(".mission-card summary").click();
        return { projectionAsOf: projection.asOf, activeUnit: projection.activeUnit.id, nextProjectNum: projection.nextProjectNum, trackCount: await page.locator(".track-node").count(), readOnlyCopy: await page.locator("footer.note").innerText(), page: await capture("projection-and-action") };
      });
      await assertion(report, "C20-offline-socrates", "dojoToday/README.md#Sócrates; deterministic default", async () => {
        await page.context().setOffline(true);
        try {
          await page.getByRole("textbox", { name: "Pergunta para o Sócrates", exact: true }).fill("Como explorar um caso-limite sem receber a solução?");
          await page.getByRole("button", { name: "Perguntar", exact: true }).click();
          await page.getByTestId("feedback-panel").filter({ hasText: "Sem IA configurada" }).waitFor({ state: "visible" });
          assert.ok((await page.getByTestId("feedback-panel").innerText()).includes("Quem avalia é o verificador independente"));
          assert.equal(await page.locator("#soc-config-btn").getAttribute("aria-expanded"), "true");
          assert.equal(await page.evaluate(() => localStorage.getItem("dojoToday:aiConfig")), null);
          return { browserOffline: true, externalModelCalls: 0, page: await capture("offline-socrates") };
        } finally { await page.context().setOffline(false); }
      });
      await assertion(report, "C20-byok-empty-clear-recovery", "dojoToday/README.md#Privacidade/segurança; C20", async () => {
        await page.locator("#soc-baseurl").fill("http://127.0.0.1:1/v1");
        await page.locator("#soc-model").fill("unavailable-test-model");
        await page.locator("#soc-apikey").fill("");
        await page.getByRole("button", { name: "Salvar", exact: true }).click();
        await page.getByTestId("feedback-panel").filter({ hasText: "Salvo sem chave" }).waitFor({ state: "visible" });
        await page.getByRole("button", { name: "Perguntar", exact: true }).click();
        await page.getByTestId("feedback-panel").filter({ hasText: "Sem IA configurada" }).waitFor({ state: "visible" });
        const shape = await page.evaluate(() => { const config = JSON.parse(localStorage.getItem("dojoToday:aiConfig")); return { present: !!config, keyPresent: !!config.apiKey, model: config.model }; });
        assert.equal(shape.keyPresent, false);
        await page.getByRole("button", { name: "Limpar", exact: true }).click();
        assert.equal(await page.evaluate(() => localStorage.getItem("dojoToday:aiConfig")), null);
        await page.getByRole("button", { name: "Perguntar", exact: true }).click();
        await page.getByTestId("feedback-panel").filter({ hasText: "Sem IA configurada" }).waitFor({ state: "visible" });
        const keys = await page.evaluate(() => Object.keys(localStorage));
        assert.ok(!keys.some((key) => /conversation|chat|socrates|aiConfig/i.test(key)));
        return { blankKeyDoesNotActivate: true, clearedAiConfig: true, conversationStorageKeys: [], localStorageKeyNames: keys, page: await capture("config-cleared-recovery") };
      });
      await assertion(report, "C20-game02-real-inline-practice", "dojoToday/README.md#Jogar inline; C20", async () => {
        const play = page.getByRole("button", { name: "Jogar aqui (inline)", exact: true });
        assert.equal(await play.getAttribute("data-game"), "02");
        await play.click();
        const element = page.locator("#play-inline-frame");
        assert.equal(await element.getAttribute("src"), "/games/02/index.html");
        const frame = await element.elementHandle().then((handle) => handle.contentFrame());
        await frame.waitForLoadState("domcontentloaded");
        await capture("inline-open");
        const iframeObservation = { url: frame.url(), title: await frame.title(), body: await frame.locator("body").innerText(), canvasCount: await frame.locator("canvas").count() };
        await writeFile(path.join(report.logDir, "dojoToday-inline-frame.json"), JSON.stringify(iframeObservation, null, 2));
        assert.ok(iframeObservation.canvasCount > 0 || /WAREHOUSE/i.test(iframeObservation.title), `Advertised game02 did not render; iframe title=${iframeObservation.title}`);
        // A real control must respond; frame content/metadata alone is insufficient.
        const buttons = frame.getByRole("button");
        assert.ok(await buttons.count() > 0, "No inline game controls");
        const bodyBefore = await frame.locator("body").innerText();
        await buttons.first().click();
        assert.notEqual(await frame.locator("body").innerText(), bodyBefore, "Inline game control produced no observable state change");
        await page.getByRole("button", { name: "Recolher jogo", exact: true }).click();
        assert.equal(await element.getAttribute("src"), "about:blank");
        return { iframeObservation, actualControlInteraction: true, unloadedOnCollapse: true, page: await capture("inline-after-interaction") };
      });
      if (report.assertions.find((entry) => entry.id === "C20-game02-real-inline-practice")?.status === "blocked") report.limitations.push("The current prepared local route /games/02/index.html returned the daily landing, so inline practice is blocked in this runtime. README describes preparing a relative game bundle; no product source defect or repaired packaging is inferred, and no assets were copied to manufacture a pass.");
      // Collapse even when the independent inline assertion failed, so return/offline cases remain observable.
      if (await page.getByRole("button", { name: "Recolher jogo", exact: true }).count()) await page.getByRole("button", { name: "Recolher jogo", exact: true }).click();
      await assertion(report, "C20-return-without-conversation-or-canonical-write", "dojoToday/README.md: conversations not persisted; read-only projection", async () => {
        await page.reload();
        await page.getByRole("heading", { name: "Sua lição de hoje", exact: true }).waitFor({ state: "visible" });
        assert.equal(await page.getByTestId("feedback-panel").innerText(), "");
        assert.equal(await page.evaluate(() => localStorage.getItem("dojoToday:aiConfig")), null);
        assert.ok((await page.locator(".mission-card").innerText()).includes(projection.activeUnit.title));
        assert.equal(await page.locator("#play-inline-frame").getAttribute("src"), null);
        return { noConversationRestored: true, unchangedProjection: true, lazyFrameNotLoadedOnReturn: true, page: await capture("return") };
      });
      await assertion(report, "C20-page-health", "frontend-testing-debugging; C20", async () => {
        const errors = consoleMessages.filter((message) => message.type === "pageerror" || message.type === "error");
        assert.deepEqual(errors, []);
        assert.equal(network.filter((entry) => entry.blockedExternal).length, 0);
        return health(page, "dojoToday — sua lição de hoje", app.origin, consoleMessages);
      });
    });
  } finally { if (app) await app.stop(); }
  report.assertions.push({ id: "C20-real-byok-provider-error-and-positive", mandatory: true, promiseSource: "dojoToday/README.md#Sócrates; qualification-matrix.md#dojoToday", status: "unverified", missingPrerequisites: ["Owner-authorized endpoint/model/credential for this app", "Real unavailable-provider/error followed by configured-provider recovery"], detail: "No nonempty API-key value, real credential or external model call was used. Blank-key save/clear/offline recovery is separately observed; it cannot exercise the provider branch guarded by isConfigured()." });
  report.limitations.push("Configured BYOK provider positive/error/recovery remains unverified without app-specific credential authorization; no existing Hermes or other account credential was read or reused.");
}

async function miniTown(report, browser) {
  let app;
  try {
    app = await startApp(report, "miniTown");
    await session(report, browser, "explore-day-night-return", app.origin, async ({ page, capture, consoleMessages }) => {
      await page.goto("/");
      await assertion(report, "C23-entry-hud-exploration", "miniTown/README.md; DESIGN.md; experimental-minitown student guide", async () => {
        await page.locator("canvas").waitFor({ state: "visible" });
        await page.locator("#hud-stub").filter({ hasText: "MiniTown" }).waitFor({ state: "visible" });
        await page.waitForFunction(() => !!window.__miniTown);
        const before = await page.evaluate(() => { const rig = window.__miniTown.controller.cameraRig; return { distance: rig.distance, azimuth: rig.azimuth, polar: rig.polar, simTime: window.__miniTown.getSnapshot().simTime }; });
        await page.mouse.move(800, 500);
        await page.mouse.down();
        await page.mouse.move(1000, 550, { steps: 10 });
        await page.mouse.up();
        await page.mouse.wheel(0, -250);
        await page.waitForFunction((expected) => { const rig = window.__miniTown.controller.cameraRig; return Math.abs(rig.azimuth - expected.azimuth) > 0.1 && rig.distance < expected.distance - 1; }, before);
        const after = await page.evaluate(() => { const rig = window.__miniTown.controller.cameraRig; return { distance: rig.distance, azimuth: rig.azimuth, polar: rig.polar, simTime: window.__miniTown.getSnapshot().simTime, sceneChildren: window.__miniTown.scene.children.length, worldSnapshot: window.__miniTown.getSnapshot() }; });
        assert.ok(after.simTime > before.simTime, "Real animation loop did not tick");
        assert.ok(after.sceneChildren > 0);
        return { actualPointerDrag: true, actualWheelZoom: true, before, after, page: await capture("explored-morning") };
      });
      const contentSnapshot = await page.evaluate(() => window.__miniTown.getSnapshot());
      const populated = [contentSnapshot.zoneCount, contentSnapshot.buildingCount, contentSnapshot.residentCount, contentSnapshot.vehicleCount].every((count) => count > 0);
      report.assertions.push({ id: "C23-declared-town-content", mandatory: true, promiseSource: "miniTown/README.md; docs/product-readiness/student-guide.md#experimental-minitown (observe zones, residents and vehicles)", status: populated ? "pass" : "unverified", observed: contentSnapshot, detail: populated ? "Declared town entities are present at ordinary entry." : "Ordinary entry exposes an empty town. Camera, clock, HUD and exit behavior are observed separately; these facts do not establish the guide's described town content. No zones/residents/vehicles were injected through the test hook.", ...(populated ? {} : { missingPrerequisites: ["Independent decision whether this empty experimental entry satisfies the frozen declared-use promise", "Observation of the documented town content on the offered entry when applicable"] }) });
      if (!populated) report.limitations.push("Normal entry has zero zones, buildings, residents and vehicles; the capture shows ground only. The populated-town description in the current student guide remains unverified, without reducing the frozen promise or injecting debug content.");
      await assertion(report, "C23-day-night-public-tick-and-hud", "miniTown/README.md: 300 seconds = 24 hours; docs/concepts/CONCEPTS.md", async () => {
        const observed = await page.evaluate(() => {
          const town = window.__miniTown;
          town.controller.stop();
          const before = town.getSnapshot();
          const after = town.controller.step(175);
          return { before: { phase: before.phase, simTime: before.simTime }, after: { phase: after.phase, simTime: after.simTime }, sunIntensity: town.controller.sceneRoot.sun.intensity };
        });
        assert.ok(Math.abs(observed.after.simTime - ((observed.before.simTime + 14) % 24)) < 0.000001);
        assert.equal(observed.after.phase, "night");
        assert.equal(observed.sunIntensity, 0);
        assert.ok((await page.locator("#hud-stub").innerText()).includes("night"));
        return { ...observed, kind: "documented public observation hook manual tick; real animation loop separately observed", page: await capture("night-hud") };
      });
      await assertion(report, "C23-exit-reopen-no-persistence-promise", "inventory.yaml#minitown-explore-only; student-guide.md#experimental-minitown", async () => {
        await page.goto("about:blank");
        await page.goto(app.origin);
        await page.locator("canvas").waitFor({ state: "visible" });
        await page.waitForFunction(() => !!window.__miniTown);
        const snapshot = await page.evaluate(() => ({ simTime: window.__miniTown.getSnapshot().simTime, phase: window.__miniTown.getSnapshot().phase, localKeys: Object.keys(localStorage), sessionKeys: Object.keys(sessionStorage) }));
        assert.ok(snapshot.simTime >= 8 && snapshot.simTime < 9, "Reentry should start its observational town again");
        assert.equal(snapshot.phase, "morning");
        assert.deepEqual(snapshot.localKeys, []);
        assert.deepEqual(snapshot.sessionKeys, []);
        return { leftRouteAndReopened: true, restoredLearnerProgressClaimed: false, snapshot, page: await capture("reopened"), health: await health(page, "MiniTown — Engine Skeleton", app.origin, consoleMessages) };
      });
    });
    await session(report, browser, "renderer-unavailable-exit", app.origin, async ({ page, capture, consoleMessages }) => {
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return ["webgl", "webgl2", "experimental-webgl"].includes(kind) ? null : original.call(this, kind, ...args); };
      });
      await assertion(report, "C23-renderer-unavailable-reload-and-exit", "inventory.yaml#minitown-explore-only; facilitator-guide.md#experimental-minitown", async () => {
        await page.goto("/");
        await page.waitForFunction(() => document.readyState === "complete");
        await page.waitForTimeout(500);
        const first = { canvas: await page.locator("canvas").count(), hook: await page.evaluate(() => !!window.__miniTown), errors: consoleMessages.map((entry) => entry.text) };
        assert.equal(first.hook, false);
        assert.ok(first.errors.some((message) => /WebGL context/i.test(message)));
        await capture("renderer-unavailable");
        await page.reload();
        await page.waitForTimeout(500);
        assert.equal(await page.evaluate(() => !!window.__miniTown), false);
        await page.goto("about:blank");
        assert.equal(page.url(), "about:blank");
        return { injectedUnavailableWebGL: true, reloadAttempts: 1, unavailableRecorded: true, exitReached: "about:blank", appFallbackNotPromised: true, first };
      });
    });
    const fixedPort = app.port;
    await app.stop();
    app = null;
    await session(report, browser, "route-unavailable-recovery", `http://127.0.0.1:${fixedPort}`, async ({ page, capture }) => {
      await assertion(report, "C23-route-unavailable-one-retry-exit-and-reopen", "inventory.yaml#minitown-explore-only; facilitator-guide.md#Recover and escalate", async () => {
        const errors = [];
        for (let attempt = 0; attempt < 2; attempt++) {
          try { await page.goto(`http://127.0.0.1:${fixedPort}`, { waitUntil: "domcontentloaded", timeout: 5000 }); } catch (error) { errors.push(String(error).split("\n")[0]); }
        }
        assert.equal(errors.length, 2);
        await capture("route-unavailable");
        await page.goto("about:blank");
        app = await startApp(report, "miniTown", "dev", {}, [], fixedPort);
        await page.goto(app.origin);
        await page.locator("canvas").waitFor({ state: "visible" });
        return { routeAbsentErrors: errors, reloadAttempts: 1, exited: true, ownOriginRestored: app.origin, ownPid: app.record.pid, page: await capture("route-restored") };
      });
    });
  } finally { if (app) await app.stop(); }
  report.inapplicable = [{ promise: "persistence, lesson, assessment, progression and mastery", source: "docs/product-readiness/inventory.yaml#minitown-explore-only; miniTown/README.md#Limites", reason: "The experimental observation contract explicitly excludes these promises." }];
}

export async function run(engineId, caseName = "declared-use", options = {}) {
  assert.ok(Object.hasOwn(CRITERIA, engineId), `Unsupported dashboard engine: ${engineId}`);
  assert.equal(caseName, "declared-use", "Only the frozen declared-use observation is supported");
  const runId = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const engine = path.join(ROOT, "engines", engineId);
  const requireEngine = createRequire(path.join(engine, "package.json"));
  const { chromium } = requireEngine("@playwright/test");
  const report = {
    engineId, caseName, status: "unverified", criterion: CRITERIA[engineId], criteriaSource: ".checks/product-readiness-20261015.md",
    observedAt: new Date().toISOString(), producerContext: "readiness-dashboard-runtime-producer", verifierContext: null,
    sourceCommit: git("rev-parse", "HEAD"), sourceFingerprint: null,
    browserAvailability: "Browser plugin not available; regular installed engine Playwright per frontend-testing-debugging skill and project AGENTS",
    runtime: { node: process.version, playwright: requireEngine("@playwright/test/package.json").version, observerPid: process.pid, observerParentPid: process.ppid, kind: "fresh local strict-port processes", viewport: VIEWPORT, externalModelCalls: 0 },
    invocation: { argv: process.argv, cwd: process.cwd() },
    logDir: path.resolve(options.artifactDir ?? path.join(ROOT, ".scratch/readiness-implementation-20261015/qa-dashboards", `${engineId}-${runId}`)),
    mediaDir: path.join(engine, "test-results/readiness-plan-runtime", `${caseName}-${runId}`),
    assertions: [], commands: [], evidenceRefs: [], limitations: [],
  };
  await mkdir(report.logDir, { recursive: true });
  await mkdir(report.mediaDir, { recursive: true });
  const sourcePaths = [...SOURCES[engineId].map((name) => path.join(engine, name)), path.join(ROOT, ".checks/product-readiness-20261015.md"), path.join(ROOT, "intent/2026-10-15-ecosystem-product-readiness/plan.md"), path.join(ROOT, "intent/2026-10-15-ecosystem-product-readiness/design.md"), path.join(ROOT, "intent/2026-10-15-ecosystem-product-readiness/qualification-matrix.md"), path.join(ROOT, "docs/product-readiness/inventory.yaml"), path.join(ROOT, "docs/product-readiness/student-guide.md"), path.join(ROOT, "docs/product-readiness/facilitator-guide.md"), fileURLToPath(import.meta.url)];
  if (engineId === "codexDojo") sourcePaths.push(...["engines/minimaxDojo/config/dashboard.yaml", "engines/codexdojo-os-prototype/package.json", "engines/codexdojo-os-prototype/index.html", "engines/codexdojo-os-prototype/src/App.tsx", "engines/codexdojo-os-prototype/AGENTS.md", "engines/codexdojo-os-prototype/DESIGN.md"].map((name) => path.join(ROOT, name)));
  report.sourceFiles = await Promise.all(sourcePaths.map(ref));
  report.sourceFingerprint = sha256(JSON.stringify(report.sourceFiles));
  const sharedSource = options.sharedPolicySource ?? path.join(COMMON, "engines/shared/playwright/base.config.ts");
  report.evidencePolicy = { source: await ref(sharedSource), importedOrPromoted: false, screenshot: "on", video: "on", trace: "retain-on-failure", outputDir: report.mediaDir };
  report.stateBefore = { worktree: await stateHashes(ROOT), originalCheckout: await stateHashes(COMMON) };
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
    if (engineId === "codexDojo") await codexDojo(report, browser, requireEngine);
    if (engineId === "dojoToday") await dojoToday(report, browser, requireEngine);
    if (engineId === "miniTown") await miniTown(report, browser);
  } catch (error) {
    report.assertions.push({ id: `${CRITERIA[engineId]}-runtime-prerequisite`, mandatory: true, promiseSource: report.criteriaSource, status: "blocked", error: { message: String(error), stack: error.stack } });
  } finally {
    if (browser) await browser.close();
    report.stateAfter = { worktree: await stateHashes(ROOT), originalCheckout: await stateHashes(COMMON) };
    const unchanged = report.stateBefore.worktree.digest === report.stateAfter.worktree.digest && report.stateBefore.originalCheckout.digest === report.stateAfter.originalCheckout.digest;
    report.assertions.push({ id: `${CRITERIA[engineId]}-learner-preserved`, mandatory: true, promiseSource: "qualification-matrix.md#Protocolo comum; C18/C20/C23", status: unchanged ? "pass" : "blocked", observed: { originalCheckoutAndWorktreeCanonicalFilesUnchanged: unchanged } });
  }
  report.assertions.push({ id: `${CRITERIA[engineId]}-independent-semantic-image-judgment`, mandatory: true, promiseSource: "AGENTS.md#Browser-test evidence; engines/shared/playwright/README.md", status: "unverified", missingPrerequisites: ["Separate verifier context", "Authorized TypeSafe/Jev credential and semantic judgment receipt"], detail: "Functional observations and positive captures are producer evidence. No semantic image judgment or readiness grant is asserted." });
  report.limitations.push("No TypeSafe/Jev key was supplied. Independent semantic judgment of captured images remains an explicit prerequisite; no global engineReady claim is made.");
  report.status = report.assertions.some((entry) => entry.mandatory && entry.status === "blocked") ? "blocked" : report.assertions.some((entry) => entry.mandatory && entry.status === "unverified") ? "unverified" : "pass";
  report.endedAt = new Date().toISOString();
  for (const folder of [report.logDir, report.mediaDir]) for (const filename of await walkFiles(folder)) report.evidenceRefs.push(await ref(filename));
  const reportPath = path.join(report.logDir, "report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  return { ...report, reportPath, reportSha256: sha256(await readFile(reportPath)) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await run(process.argv[2], process.argv[3] ?? "declared-use");
  console.log(JSON.stringify({ engineId: result.engineId, status: result.status, assertions: result.assertions.map(({ id, status, error }) => ({ id, status, ...(error ? { error: error.message } : {}) })), reportPath: result.reportPath, reportSha256: result.reportSha256 }, null, 2));
  if (result.status === "blocked") process.exitCode = 1;
}

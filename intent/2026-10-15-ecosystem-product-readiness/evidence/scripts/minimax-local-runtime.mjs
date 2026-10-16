import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const ENGINE = path.join(ROOT, "engines/codexdojo-os-prototype");
const CHECK = ".checks/product-readiness-20261015.md";
const SELF = fileURLToPath(import.meta.url);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const time = () => new Date().toISOString();
const missingCycle = [
  "The existing local entry prepares a read-only briefing; it does not orchestrate the 14-agent tutor cycle.",
  "No real bootstrap/attempt, isolated Prometor/Crítico, cycle report, reflection, or Maestro retry/resume is executed here.",
  "Reference Python contracts and the static web contract demonstration cannot substitute the complete C24 cycle.",
];

async function fileRef(filename) {
  const bytes = await fs.readFile(filename);
  const ref = { path: path.relative(ROOT, filename), sha256: digest(bytes), bytes: bytes.length };
  if (filename.endsWith(".png") && bytes.length >= 24) {
    ref.dimensions = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  return ref;
}

async function filesUnder(directory) {
  const files = [];
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    if (["__pycache__", ".pytest_cache", "node_modules"].includes(item.name)) continue;
    const filename = path.join(directory, item.name);
    if (item.isDirectory()) files.push(...await filesUnder(filename));
    else if (item.isFile() && !filename.endsWith(".pyc")) files.push(filename);
  }
  return files.sort();
}

async function protectedHashes() {
  const result = {};
  for (const base of ["learner", "engines/minimaxDojo"]) {
    for (const filename of await filesUnder(path.join(ROOT, base))) {
      result[path.relative(ROOT, filename)] = digest(await fs.readFile(filename));
    }
  }
  return result;
}

async function sourceIdentity() {
  const files = [SELF, path.join(ROOT, CHECK), path.join(ENGINE, "vite.config.ts")];
  for (const relative of ["bridge", "src/engines", "src/surface", "src/apps"]) {
    files.push(...await filesUnder(path.join(ENGINE, relative)));
  }
  files.push(...await filesUnder(path.join(ROOT, "engines/minimaxDojo")));
  const refs = await Promise.all([...new Set(files)].sort().map(fileRef));
  return { files: refs, sha256: digest(JSON.stringify(refs)) };
}

function signalOwnedGroup(pid, signal) {
  try { process.kill(-pid, signal); }
  catch (error) { if (error.code !== "ESRCH") throw error; }
}

function isolatedGroup(pid) {
  // Restrict numeric diagnostics to the exact process this invocation just created.
  const value = execFileSync("ps", ["-o", "pgid=", "-p", `${pid}`], {
    encoding: "utf8", timeout: 3000, stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  assert.match(value, /^\d+$/, "Owned process group must be numeric");
  const group = Number(value);
  return group === pid ? group : null;
}

function exists(pid, group = false) {
  if (!pid) return false;
  try { process.kill(group ? -pid : pid, 0); return true; }
  catch (error) { if (error.code === "ESRCH") return false; throw error; }
}

async function bounded(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms`)), ms);
    })]);
  } finally { clearTimeout(timer); }
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function portClosed(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    let finished = false;
    const finish = (closed, result) => {
      if (finished) return;
      finished = true; socket.destroy(); resolve({ port, closed, result });
    };
    socket.setTimeout(1000);
    socket.once("connect", () => finish(false, "connected"));
    socket.once("error", (error) => finish(error.code === "ECONNREFUSED", error.code));
    socket.once("timeout", () => finish(false, "timeout"));
  });
}

function privateEnv(python) {
  const env = {};
  for (const key of ["HOME", "USER", "LOGNAME", "SHELL", "TMPDIR", "LANG", "LC_ALL"]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  env.PATH = path.dirname(python) + path.delimiter + (process.env.PATH ?? "");
  env.PYTHONPATH = ROOT;
  env.PYTHONDONTWRITEBYTECODE = "1";
  env.VITE_LOCAL_ENGINE_BRIDGE = "true";
  env.VITE_ANALYTICS_BRIDGE = "false";
  env.NODE_ENV = "development";
  return env;
}

async function choosePython(options) {
  const candidates = [options.python, process.env.READINESS_PYTHON,
    path.join(ROOT, ".venv/bin/python3"), path.join(ROOT, ".scratch/gh-375/venv/bin/python3")];
  for (const candidate of candidates.filter(Boolean)) {
    try { await fs.access(candidate); return candidate; } catch {}
  }
  return execFileSync("python3", ["-c", "import sys; print(sys.executable)"], {
    cwd: ROOT, encoding: "utf8", timeout: 10_000, stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function startServer(report, directory, env) {
  const port = await freePort();
  const initialPort = await portClosed(port);
  assert.equal(initialPort.closed, true, "Allocated loopback port must be closed before our launch");
  const vite = path.join(ENGINE, "node_modules/vite/bin/vite.js");
  const argv = [vite, "--host", "127.0.0.1", "--port", `${port}`, "--strictPort"];
  const log = await fs.open(path.join(directory, "vite.log"), "w");
  let child;
  let spawnError;
  try {
    child = spawn(process.execPath, argv, { cwd: ENGINE, env, stdio: ["ignore", log.fd, log.fd], detached: true });
    const exited = new Promise((resolve) => {
      child.once("exit", resolve);
      child.once("error", (error) => { spawnError = error; resolve(); });
    });
    report.server = { pid: child.pid ?? null, processGroupId: child.pid ?? null, cwd: ENGINE,
      argv: [process.execPath, ...argv], port, initialPort, startedAt: time() };
    let stopping;
    const stop = () => stopping ??= (async () => {
      try {
        if (child.pid && exists(child.pid, true)) {
          signalOwnedGroup(child.pid, "SIGTERM");
          await bounded(exited, 5000, "Vite shutdown").catch(() => {});
          if (exists(child.pid, true)) {
            signalOwnedGroup(child.pid, "SIGKILL");
            await bounded(exited, 5000, "Vite forced shutdown").catch(() => {});
          }
        }
      } finally {
        await log.close();
        report.server.cleanup = { at: time(), exitCode: child.exitCode, signal: child.signalCode,
          ownedPidAlive: exists(child.pid), ownedGroupAlive: exists(child.pid, true), port: await portClosed(port) };
      }
    })();
    // Ownership is recorded before startup polling. Stop also runs when polling or persistence fails.
    try {
      await fs.writeFile(path.join(directory, "server-owned.json"), JSON.stringify(report.server, null, 2) + "\n");
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        if (spawnError) throw spawnError;
        if (child.exitCode !== null || child.signalCode !== null) throw new Error("Owned Vite exited during startup");
        try {
          if ((await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(1500) })).ok) {
            return { url: `http://127.0.0.1:${port}`, stop };
          }
        } catch {}
        await pause(250);
      }
      throw new Error("Owned Vite startup exceeded 120000ms");
    } catch (error) { await stop(); throw error; }
  } catch (error) {
    if (!child) await log.close();
    throw error;
  }
}

async function browserCase(report, context, origin, media, directory, cli) {
  const page = await context.newPage();
  page.setDefaultTimeout(20_000); page.setDefaultNavigationTimeout(30_000);
  const actionPath = "/__dojo/bridge/v1/engines/minimaxDojo/actions/prepare-tutor-session";
  const check = async (name, operation) => {
    try { const detail = await operation(); report.cases.push({ name, status: "pass", detail: detail ?? null }); }
    catch (error) { report.cases.push({ name, status: "fail", error: String(error) }); throw error; }
  };
  page.on("pageerror", (error) => report.pageErrors.push(error.message));
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type())) report.console.push({ type: message.type(), text: message.text() });
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === origin && url.pathname.startsWith("/__dojo/bridge")) {
      report.requests.push({ method: response.request().method(), pathname: url.pathname, status: response.status() });
    }
  });
  await check("unauthenticated action blocked", async () => {
    const response = await fetch(origin + actionPath, { method: "POST", headers: { "content-type": "application/json" }, body: "{}", signal: AbortSignal.timeout(5000) });
    const body = await response.json(); assert.equal(response.status, 403); assert.equal(body.error, "origin-forbidden");
  });
  await check("same-origin action without token blocked", async () => {
    const response = await fetch(origin + actionPath, { method: "POST", headers: { "content-type": "application/json", origin }, body: "{}", signal: AbortSignal.timeout(5000) });
    const body = await response.json(); assert.equal(response.status, 403); assert.equal(body.error, "invalid-token");
  });
  await check("page identity and desktop", async () => {
    await page.goto(origin + "/desktop?operator=1");
    await page.getByRole("button", { name: "Atividades", exact: true }).waitFor({ state: "visible" });
    assert.equal(new URL(page.url()).origin, origin); assert.ok((await page.title()).length > 0);
    return { url: page.url(), title: await page.title() };
  });
  await check("operator opens Engine Hub", async () => {
    await page.getByRole("button", { name: "Atividades", exact: true }).click();
    const launcher = page.getByRole("dialog", { name: "Lançador de aplicativos" });
    await launcher.getByRole("textbox", { name: "Buscar aplicativos ou fundamentos" }).fill("Engine Hub");
    await launcher.getByRole("button", { name: /Engine Hub/ }).click();
    await page.getByRole("button", { name: "Usar minimaxDojo Tutor Core", exact: true }).waitFor({ state: "visible" });
    await page.screenshot({ path: path.join(media, "01-engine-hub.png"), fullPage: false });
  });
  await check("real local capability selected", async () => {
    await page.getByRole("button", { name: "Usar minimaxDojo Tutor Core", exact: true }).click();
    await page.getByRole("button", { name: "Preparar sessão de tutoria", exact: true }).waitFor({ state: "visible" });
    assert.equal(await page.getByRole("button", { name: "Avançar simulação", exact: true }).count(), 0);
    await page.screenshot({ path: path.join(media, "02-local-tutor.png"), fullPage: false });
  });
  const invoke = async () => {
    const pending = page.waitForResponse((r) => r.url() === origin + actionPath && r.request().method() === "POST");
    await page.getByRole("button", { name: "Preparar sessão de tutoria", exact: true }).click();
    const response = await pending; const body = await response.json();
    assert.equal(response.status(), 200); assert.equal(body.ok, true);
    assert.equal(body.output.trimEnd(), cli.stdout.trimEnd(), "Actual bridge must return the current actual CLI briefing");
    await page.getByRole("status").getByText("Ação concluída", { exact: true }).waitFor({ state: "visible" });
    return body;
  };
  await check("real authenticated bridge and visible briefing", async () => {
    const body = await invoke();
    const receipt = page.getByRole("status"); const text = await receipt.innerText();
    assert.ok(text.includes("minimaxDojo tutor session (read-only)"));
    assert.ok(text.includes(path.join(ROOT, "learner/learning_state.yaml")));
    assert.ok(text.includes("cannot mark mastery or write canonical learner state"));
    await fs.writeFile(path.join(directory, "bridge-response.json"), JSON.stringify(body, null, 2) + "\n");
    await receipt.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(media, "03-real-briefing.png"), fullPage: false });
    await receipt.locator("pre").hover(); await page.mouse.wheel(0, 1200); await pause(150);
    await page.screenshot({ path: path.join(media, "04-authority-after-scroll.png"), fullPage: false });
  });
  await check("repeat real local entry", invoke);
  await check("no framework overlay or runtime errors", async () => {
    assert.equal(await page.locator("vite-error-overlay").count(), 0);
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.console.filter((row) => row.type === "error"), []);
  });
}

export async function run(caseName = "declared-use", options = {}) {
  assert.equal(caseName, "declared-use", `Unknown minimaxDojo observation: ${caseName}`);
  const stamp = time().replaceAll(":", "-").replaceAll(".", "-");
  const directory = path.resolve(options.outputDir ?? path.join(ROOT, ".scratch/readiness-c11-followup-20261016/minimax-local", `current-${stamp}`));
  const media = path.join(ENGINE, "test-results/readiness-c11-followup-minimax", stamp);
  // Every invocation owns a fresh report directory; never overwrite earlier evidence.
  await fs.mkdir(path.dirname(directory), { recursive: true });
  await fs.mkdir(directory); await fs.mkdir(media, { recursive: true });
  const reportPath = path.join(directory, "report.json");
  const report = { schema: "readiness.minimax.local-runtime.v1", engineId: "minimaxDojo", caseName,
    observedAt: time(), status: "unverified", runtimeStatus: "unverified", functionalStatus: "unverified", runtimeExecuted: false,
    producerContext: { kind: "runtime-observation-producer", collectorPid: process.pid, independentVerifier: false }, verifierContext: null,
    cases: [], requests: [], console: [], pageErrors: [], missingCapabilities: missingCycle, evidenceRefs: [], limitations: [
      "This command exercises the local app selected by the user; no remote Team URL/access is required for this bounded action.",
      "A passing local entry does not settle the frozen complete C24 cycle or confer readiness/mastery.",
      "Image semantics require a distinct TypeSafe/Jev verifier; this observer makes no semantic judgment.",
    ] };
  let before, server, browserServer, browser, context, failure;
  const cleanupErrors = [];
  try {
    report.sourceCommit = execFileSync("rtk", ["proxy", "git", "rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
    report.sourceFingerprint = await sourceIdentity();
    report.currentCheckRevision = { checklist: await fileRef(path.join(ROOT, CHECK)), freeze: await fileRef(path.join(ROOT, ".checks/product-readiness-20261015.freeze.v2.json")) };
    before = await protectedHashes();
    await fs.writeFile(path.join(directory, "protected-before.json"), JSON.stringify(before, null, 2) + "\n");
    const python = await choosePython(options); const env = privateEnv(python);
    const argv = ["-m", "engines.minimaxDojo.os_adapter"];
    const stdout = execFileSync(python, argv, { cwd: ROOT, env, timeout: 30_000, encoding: "utf8", maxBuffer: 1_048_576, stdio: ["ignore", "pipe", "pipe"] });
    assert.ok(stdout.includes("minimaxDojo tutor session (read-only)"));
    assert.ok(stdout.includes("cannot mark mastery or write canonical learner state"));
    const cli = { cwd: ROOT, executable: python, argv, exitCode: 0, stdout };
    await fs.writeFile(path.join(directory, "cli.json"), JSON.stringify(cli, null, 2) + "\n");
    report.cases.push({ name: "actual local CLI", status: "pass", executable: python, argv, cwd: ROOT });
    server = await startServer(report, directory, env);
    const { chromium } = createRequire(path.join(ENGINE, "package.json"))("@playwright/test");
    browserServer = await chromium.launchServer({ headless: true, timeout: 30_000 });
    const browserPid = browserServer.process()?.pid ?? null;
    const websocketPort = Number(new URL(browserServer.wsEndpoint()).port);
    report.browser = { pid: browserPid, processGroupId: null,
      websocketPort, startedAt: time(), viewport: { width: 1280, height: 800 } };
    report.browser.processGroupId = browserPid ? isolatedGroup(browserPid) : null;
    await fs.writeFile(path.join(directory, "browser-owned.json"), JSON.stringify(report.browser, null, 2) + "\n");
    browser = await chromium.connect(browserServer.wsEndpoint(), { timeout: 30_000 });
    context = await browser.newContext({ viewport: report.browser.viewport, recordVideo: { dir: media, size: report.browser.viewport } });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
    report.runtimeExecuted = true;
    await bounded(browserCase(report, context, server.url, media, directory, cli), 180_000, "Local UI observation");
    report.runtimeStatus = "pass"; report.functionalStatus = "pass";
  } catch (error) {
    failure = error;
    report.error = { name: error.name, message: String(error), code: error.code ?? null };
    report.runtimeStatus = error.code === "ERR_ASSERTION" ? "fail" : "unverified";
    report.functionalStatus = report.runtimeStatus;
  } finally {
    if (context) {
      // A raw trace could contain the ephemeral session handshake. Keep no token-bearing trace.
      try { await bounded(context.tracing.stop(), 5000, "Trace discard"); } catch (error) { cleanupErrors.push(String(error)); }
      try { await bounded(context.close(), 10_000, "Context close"); } catch (error) { cleanupErrors.push(String(error)); }
    }
    if (browser) try { await bounded(browser.close(), 5000, "Browser disconnect"); } catch (error) { cleanupErrors.push(String(error)); }
    if (browserServer) {
      try { await bounded(browserServer.close(), 10_000, "Owned browser close"); }
      catch (error) { cleanupErrors.push(String(error)); try { await bounded(browserServer.kill(), 5000, "Owned browser kill"); } catch (killError) { cleanupErrors.push(String(killError)); } }
      if (report.browser?.processGroupId && exists(report.browser.processGroupId, true)) {
        signalOwnedGroup(report.browser.processGroupId, "SIGKILL"); await pause(100);
      }
      report.browser.cleanup = { at: time(), ownedPidAlive: exists(report.browser.pid),
        ownedGroupAlive: report.browser.processGroupId ? exists(report.browser.processGroupId, true) : null,
        port: await portClosed(report.browser.websocketPort) };
    }
    if (server) try { await server.stop(); } catch (error) { cleanupErrors.push(String(error)); }
    if (before) {
      try {
        const after = await protectedHashes();
        await fs.writeFile(path.join(directory, "protected-after.json"), JSON.stringify(after, null, 2) + "\n");
        const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((name) => before[name] !== after[name]);
        report.canonicalInvariance = { filesCompared: Object.keys(before).length, unchanged: changed.length === 0, changed };
        report.sourceFingerprintAfter = await sourceIdentity();
        report.sourceUnchangedDuringRun = report.sourceFingerprint?.sha256 === report.sourceFingerprintAfter.sha256;
      } catch (error) { cleanupErrors.push(String(error)); }
    }
    report.cleanup = { errors: cleanupErrors, allOwnedProcessesStopped: !report.browser?.cleanup?.ownedPidAlive
      && !report.browser?.cleanup?.ownedGroupAlive && !report.server?.cleanup?.ownedPidAlive && !report.server?.cleanup?.ownedGroupAlive,
      ownedPortClosed: report.server?.cleanup?.port?.closed ?? null,
      ownedBrowserPortClosed: report.browser?.cleanup?.port?.closed ?? null };
    const unsafe = cleanupErrors.length || report.canonicalInvariance?.unchanged === false || !report.cleanup.allOwnedProcessesStopped || report.cleanup.ownedPortClosed === false || report.cleanup.ownedBrowserPortClosed === false;
    report.status = report.runtimeStatus === "fail" || unsafe ? "blocked" : "unverified";
    report.tracePolicy = { retained: false, reason: "Session-token response must not enter artifacts; screenshots, video and sanitized method/path/status ledger are retained on failures too." };
    report.browserAvailability = "Repository Playwright used for native app evidence as prescribed by AGENTS.md";
    report.finishedAt = time();
    const refs = [];
    for (const filename of [...await filesUnder(directory), ...await filesUnder(media)]) if (filename !== reportPath) refs.push(await fileRef(filename));
    report.evidenceRefs = refs;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
  }
  return { engineId: report.engineId, caseName, status: report.status, runtimeStatus: report.runtimeStatus,
    functionalStatus: report.functionalStatus, runtimeExecuted: report.runtimeExecuted, reportPath,
    missingCapabilities: report.missingCapabilities, error: failure ? report.error : undefined };
}

if (process.argv[1] === SELF) {
  try {
    const result = await run(process.argv[2] ?? "declared-use");
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === "pass" ? 0 : result.status === "blocked" ? 1 : 2;
  } catch (error) {
    console.error(JSON.stringify({ engineId: "minimaxDojo", status: "unverified", error: String(error) }));
    process.exitCode = 2;
  }
}

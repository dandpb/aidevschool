import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { createConnection } from "node:net";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import functionHandler from "../../../../learner/gate/netlify-functions/literacy-verify.mjs";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const ENGINE = path.join(ROOT, "engines/literacyDojo");
const requireEngine = createRequire(path.join(ENGINE, "package.json"));
const endpointPath = "/.netlify/functions/literacy-verify";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const git = (...args) => execFileSync("rtk", ["proxy", "git", ...args], { cwd: ROOT, encoding: "utf8" }).trim();

async function fileRef(filename) {
  return { path: filename, sha256: sha256(await readFile(filename)) };
}

function evidenceDigest(record) {
  const sorted = (value) => {
    if (Array.isArray(value)) return value.map(sorted);
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]));
    }
    return value;
  };
  const { timestamp: _ignored, ...fields } = record;
  return sha256(JSON.stringify(sorted(fields)));
}

function assertReceipt(receipt, evidence) {
  assert.equal(receipt.verdict, "PASS");
  assert.equal(receipt.independent_pass, true);
  assert.equal(receipt.verifier_version, "1-netlify-l02-v4");
  assert.equal(receipt.evidence_digest, evidenceDigest(evidence));
  assert.equal(receipt.lesson_id, "l02");
  assert.equal(receipt.lesson_version, 4);
  assert.equal(receipt.activity_id, evidence.activityId);
  assert.equal(receipt.attempt_id, evidence.attemptId);
  assert.equal(receipt.producer_writes_mastered, false);
  assert.equal(receipt.max_producer_claim, "completed");
  assert.deepEqual(receipt.errors, []);
}

async function startFunction(requests, port = 0) {
  const server = createServer(async (incoming, outgoing) => {
    try {
      const chunks = [];
      for await (const chunk of incoming) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString("utf8");
      const request = new Request(`http://127.0.0.1${incoming.url}`, {
        method: incoming.method,
        headers: incoming.headers,
        ...(incoming.method !== "GET" && incoming.method !== "HEAD" ? { body } : {}),
      });
      const response = await functionHandler(request);
      const result = await response.text();
      requests.push({ at: new Date().toISOString(), method: incoming.method, path: incoming.url, status: response.status, body: body ? JSON.parse(body) : null, response: JSON.parse(result) });
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(result);
    } catch (error) {
      outgoing.writeHead(500, { "content-type": "application/json" });
      outgoing.end(JSON.stringify({ error: String(error) }));
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return { server, port: server.address().port };
}

async function stopFunction(server) {
  if (!server?.listening) return;
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function availablePort() {
  const reservation = createServer();
  await new Promise((resolve, reject) => {
    reservation.once("error", reject);
    reservation.listen(0, "127.0.0.1", resolve);
  });
  const port = reservation.address().port;
  await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function probeClosedPort(port) {
  return new Promise((resolve) => {
    const connection = createConnection({ host: "127.0.0.1", port });
    const finish = (result) => {
      connection.destroy();
      resolve({ port, ...result });
    };
    connection.setTimeout(1_000);
    connection.once("connect", () => finish({ closed: false, result: "connected" }));
    connection.once("error", (error) => finish({ closed: error.code === "ECONNREFUSED", result: error.code }));
    connection.once("timeout", () => finish({ closed: false, result: "timeout" }));
  });
}

async function readLocal(page) {
  return page.evaluate(async () => {
    const progress = await new Promise((resolve, reject) => {
      const open = indexedDB.open("literacydojo");
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const request = db.transaction("progress", "readonly").objectStore("progress").get("learner-progress");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { resolve(request.result); db.close(); };
      };
    });
    return { progress, evidence: JSON.parse(sessionStorage.getItem("literacydojo:evidence") ?? "[]") };
  });
}

async function enterLesson(page, expect) {
  await page.goto("/");
  await expect(page.getByTestId("assistant-welcome")).toBeVisible();
  await page.getByTestId("onboarding-next").click();
  for (const choice of ["save_time", "work", "medium", "scheduling"]) {
    await page.getByTestId(`onboarding-option-${choice}`).check();
    await page.getByTestId("onboarding-next").click();
  }
  await expect(page.getByTestId("map-screen")).toBeVisible();
  await page.getByTestId("map-start-l02").click();
  await expect(page.getByRole("heading", { name: "IA não é uma fonte de verdade" })).toBeVisible();
  await page.getByTestId("start-lesson").click();
}

async function passThreeActivities(page, expect) {
  // Frozen answers from the l02 v4 contract; no implementation-derived oracle.
  await page.getByTestId("output-out-b").check();
  await page.getByTestId("criterion-c-fontes").check();
  await page.getByTestId("criterion-c-limites").check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("next-activity")).toBeVisible();
  assert.equal(await page.getByTestId("finish-lesson").count(), 0);
  await page.getByTestId("next-activity").click();
  await page.getByTestId("option-opt-verifica-na-fonte").check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("next-activity")).toBeVisible();
  assert.equal(await page.getByTestId("finish-lesson").count(), 0);
  await page.getByTestId("next-activity").click();
  // Canonical l02-a3 starts in its correct five-item order.
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("finish-lesson")).toBeEnabled();
}

async function browserCase(caseName, report, mediaDir, logDir, options) {
  const { chromium, expect } = requireEngine("@playwright/test");
  const vitePath = path.join(path.dirname(requireEngine.resolve("vite/package.json")), "dist/node/index.js");
  const { createServer: createViteServer } = await import(pathToFileURL(vitePath).href);
  const canonicalBefore = await fileRef(path.join(ROOT, "learner/learning_state.yaml"));
  const requests = [];
  const consoleMessages = [];
  const network = [];
  let api;
  let vite;
  let browser;
  let context;
  let page;
  let viteHttpServer;
  let failed = false;
  try {
    api = await startFunction(requests);
    const appPort = await availablePort();
    vite = await createViteServer({
      root: ENGINE,
      configFile: path.join(ENGINE, "vite.config.ts"),
      define: { "import.meta.env.VITE_LITERACY_VERIFIER_URL": JSON.stringify(endpointPath) },
      server: { host: "127.0.0.1", port: appPort, strictPort: true, proxy: { [endpointPath]: `http://127.0.0.1:${api.port}` } },
    });
    await vite.listen();
    viteHttpServer = vite.httpServer;
    const appOrigin = `http://127.0.0.1:${vite.httpServer.address().port}`;
    report.ownPorts = { functionHttp: api.port, viteHttp: appPort };
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ viewport: { width: 360, height: 740 }, baseURL: appOrigin, recordVideo: { dir: mediaDir, size: { width: 360, height: 740 } } });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    page = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.on("console", (message) => { if (["error", "warning"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text() }); });
    page.on("pageerror", (error) => consoleMessages.push({ type: "pageerror", text: String(error) }));
    page.on("response", (response) => { if (response.url().includes(endpointPath)) network.push({ url: response.url(), status: response.status() }); });
    page.on("requestfailed", (request) => network.push({ url: request.url(), failure: request.failure() }));
    await enterLesson(page, expect);
    await passThreeActivities(page, expect);
    const attempted = await readLocal(page);
    assert.deepEqual(attempted.evidence.map((item) => item.activityId), ["l02-a1", "l02-a2", "l02-a3"]);
    assert.ok(attempted.evidence.every((item) => item.lessonVersion === 4 && item.pass === true));
    if (caseName === "verifier-outage-retry") {
      await stopFunction(api.server);
      report.transitions = [{ state: "endpoint-stopped", port: api.port }];
    }
    await page.getByTestId("finish-lesson").click();
    await expect(page.getByTestId("result-screen")).toBeVisible();
    await expect(page.getByTestId("completion-distinction")).toContainText("progresso neste aparelho");
    const completed = await readLocal(page);
    assert.equal(completed.progress.lessonStatus.l02, "completed");
    assert.equal(JSON.stringify(completed).includes('"mastered"'), false);
    if (caseName === "verifier-outage-retry") {
      await expect(page.getByTestId("retry-verification")).toBeVisible();
      await expect(page.getByTestId("verification-status")).toContainText("indisponível");
      assert.equal(requests.length, 0);
      await page.screenshot({ path: path.join(mediaDir, "endpoint-outage.png"), fullPage: true });
      await page.getByTestId("verification-status").scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(mediaDir, "endpoint-outage-viewport.png"), fullPage: false });
      const beforeRetry = await readLocal(page);
      assert.deepEqual(beforeRetry, completed);
      api = await startFunction(requests, api.port);
      report.transitions.push({ state: "endpoint-restored", port: api.port });
      await page.getByTestId("retry-verification").click();
      await expect(page.getByTestId("verification-status")).toContainText("Recibo independente: PASS");
      assert.deepEqual(await readLocal(page), beforeRetry);
      assert.equal(requests.length, 1);
      report.transitions.push({ state: "retry-bound-receipt-pass", attemptId: requests[0].body.attemptId });
    } else {
      await expect(page.getByTestId("verification-status")).toContainText("Recibo independente: PASS");
      // Dev React StrictMode may replay the mount effect. Every request must
      // bind the same actual selected evidence; the plan does not require one.
      assert.ok(requests.length >= 1);
    }
    const selected = completed.evidence.at(-1);
    assert.equal(selected.activityId, "l02-a3");
    for (const request of requests) {
      assert.deepEqual(request.body, selected);
      assertReceipt(request.response, selected);
    }
    await expect(page.getByTestId("verification-status")).toContainText(selected.attemptId);
    await page.screenshot({ path: path.join(mediaDir, "bound-receipt-pass.png"), fullPage: true });
    await page.getByTestId("verification-status").scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(mediaDir, "bound-receipt-pass-viewport.png"), fullPage: false });
    assert.equal(await page.locator("vite-error-overlay").count(), 0);
    assert.ok((await page.locator("body").innerText()).length > 300);
    assert.equal(new URL(page.url()).origin, appOrigin);
    report.page = { url: page.url(), title: await page.title(), viewport: { width: 360, height: 740 }, nonblank: true, frameworkOverlay: false };
    assert.equal(report.page.title, "LiteracyDojo — IA com confiança no trabalho");
    report.selectedEvidence = selected;
    report.receipt = requests[0].response;
    report.functionRequestCount = requests.length;
    report.localState = { lessonStatus: completed.progress.lessonStatus.l02, unchangedByVerification: true, canonicalBefore };
    report.transport = { kind: "real-http", appOrigin, functionOrigin: `http://127.0.0.1:${api.port}`, defaultHandler: "learner/gate/netlify-functions/literacy-verify.mjs", mockedResponses: false };
    report.observedLastPassingActivities = ["l02-a3"];
    report.requiredLastPassingActivities = ["l02-a3"];
    report.requiredVerifierContractActivities = ["l02-a1", "l02-a2", "l02-a3"];
    report.criteriaSource = ".checks/product-readiness-20261015.md#C11 (owner revision 2)";
    report.criterionRevision = ".checks/product-readiness-20261015.freeze.v2.json";
    report.status = "pass";
    const unexpected = consoleMessages.filter((entry) => !(caseName === "verifier-outage-retry" && entry.type === "error" && entry.text.includes("500")));
    assert.deepEqual(unexpected, [], "Unexpected browser error/warning");
  } catch (error) {
    failed = true;
    report.status = "blocked";
    report.error = { message: String(error), stack: error?.stack };
    if (page) await page.screenshot({ path: path.join(mediaDir, "failure.png"), fullPage: true }).catch(() => {});
  } finally {
    report.cleanup = { nodePid: process.pid, browserPid: null, browserPidObservation: "unknown; no browser process API or process inventory used" };
    if (context) {
      await context.tracing.stop(failed ? { path: path.join(mediaDir, "trace.zip") } : {});
      await context.close();
      report.cleanup.contextCloseAwaited = true;
    }
    if (browser) {
      await browser.close();
      report.cleanup.browser = { closeAwaited: true, isConnected: browser.isConnected() };
      assert.equal(report.cleanup.browser.isConnected, false);
    }
    if (vite) {
      await vite.close();
      report.cleanup.vite = { closeAwaited: true, listening: viteHttpServer?.listening ?? false };
      assert.equal(report.cleanup.vite.listening, false);
    }
    if (api) {
      await stopFunction(api.server);
      report.cleanup.functionHttp = { closeAwaited: true, listening: api.server.listening };
      assert.equal(report.cleanup.functionHttp.listening, false);
    }
    if (report.ownPorts) {
      report.cleanup.portProbes = [];
      for (const port of Object.values(report.ownPorts)) {
        const probe = await probeClosedPort(port);
        report.cleanup.portProbes.push(probe);
        assert.equal(probe.result, "ECONNREFUSED", `Own HTTP port ${port} remained reachable after close`);
      }
    }
    report.canonicalAfter = await fileRef(path.join(ROOT, "learner/learning_state.yaml"));
    assert.equal(report.canonicalAfter.sha256, canonicalBefore.sha256, "canonical learner changed");
    await writeFile(path.join(logDir, "http-requests.json"), JSON.stringify(requests, null, 2));
    await writeFile(path.join(logDir, "browser-console.json"), JSON.stringify(consoleMessages, null, 2));
    await writeFile(path.join(logDir, "network.json"), JSON.stringify(network, null, 2));
  }
}

export async function run(caseName, options = {}) {
  assert.ok(["last-passing-evidence", "verifier-outage-retry", "deployed-verifier"].includes(caseName), `Unknown literacy observation: ${caseName}`);
  const runId = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const logDir = path.resolve(options.artifactDir ?? path.join(ROOT, ".scratch/readiness-implementation-20261015/literacy/runtime", `${caseName}-${runId}`));
  const mediaDir = path.join(ENGINE, "test-results/readiness-plan-runtime", `${caseName}-${runId}`);
  await mkdir(logDir, { recursive: true });
  await mkdir(mediaDir, { recursive: true });
  const commonRoot = path.dirname(git("rev-parse", "--path-format=absolute", "--git-common-dir"));
  const policySource = options.sharedPolicySource ?? path.join(commonRoot, "engines/shared/playwright/base.config.ts");
  const report = {
    engineId: "literacyDojo", caseName, observedAt: new Date().toISOString(),
    producerContext: "readiness-literacy-build-agent", verifierContext: null,
    sourceCommit: git("rev-parse", "HEAD"),
    invocation: { argv: process.argv, cwd: process.cwd(), pid: process.pid, caseName },
    helperSource: await fileRef(fileURLToPath(import.meta.url)),
    functionSource: await fileRef(path.join(ROOT, "learner/gate/netlify-functions/literacy-verify.mjs")),
    status: "unverified", evidenceRefs: [], limitations: [],
    browserAvailability: "Browser plugin not available; regular Playwright used per frontend-testing-debugging skill",
    evidencePolicy: { source: await fileRef(policySource), importedOrPromoted: false, screenshot: "on", video: "on", trace: "retain-on-failure", outputDir: mediaDir },
  };
  if (caseName === "deployed-verifier") {
    report.deployedEndpoint = "https://aidevschool-literacydojo.netlify.app/.netlify/functions/literacy-verify";
    report.limitations.push("No exact deployed source SHA/deploy ID was supplied or verified. Local candidate HTTP evidence cannot establish deployment provenance. No deployment or production data write was performed.");
    report.missingPrerequisites = ["Verified public deploy ID", "Verified public source SHA matching the offered candidate", "Actual endpoint positives a1/a2/a3 and identity/tamper negatives pinned to that deployment"];
  } else await browserCase(caseName, report, mediaDir, logDir, options);
  for (const folder of [logDir, mediaDir]) {
    for (const name of await readdir(folder)) {
      const filename = path.join(folder, name);
      report.evidenceRefs.push(await fileRef(filename));
    }
  }
  const reportPath = path.join(logDir, "report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  return { ...report, reportPath, reportSha256: sha256(await readFile(reportPath)) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await run(process.argv[2]);
  console.log(JSON.stringify(result, null, 2));
  if (result.status === "blocked") process.exitCode = 1;
}

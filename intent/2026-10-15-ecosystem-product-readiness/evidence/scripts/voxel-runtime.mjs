import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const ENGINE = path.join(ROOT, "engines/voxelDojo");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const git = (...args) => execFileSync("rtk", ["proxy", "git", ...args], { cwd: ROOT, encoding: "utf8" }).trim();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function bounded(label, operation, ms = 15_000) {
  let timer;
  try {
    return await Promise.race([operation, new Promise((_resolve, reject) => { timer = setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms observer budget`)), ms); })]);
  } finally { clearTimeout(timer); }
}
async function fileRef(filename) { return { path: filename, sha256: sha256(await readFile(filename)) }; }
async function filesUnder(folder) {
  const out = [];
  for (const item of await readdir(folder, { withFileTypes: true })) {
    if (["node_modules", "dist", "test-results", ".logs"].includes(item.name)) continue;
    const filename = path.join(folder, item.name);
    if (item.isDirectory()) out.push(...await filesUnder(filename));
    else if (item.isFile()) out.push(filename);
  }
  return out.sort();
}
async function sourceRefs(gameDir) {
  const files = [...await filesUnder(path.join(gameDir, "src")), path.join(gameDir, "index.html"), path.join(gameDir, "package.json")];
  return Promise.all(files.sort().map(fileRef));
}
async function freePort() {
  const reservation = createServer();
  await new Promise((resolve, reject) => { reservation.once("error", reject); reservation.listen(0, "127.0.0.1", resolve); });
  const port = reservation.address().port;
  await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
  return port;
}
async function startServer(gameDir, requireGame, logDir) {
  const port = await freePort();
  const vite = path.join(path.dirname(requireGame.resolve("vite/package.json")), "bin/vite.js");
  const argv = [vite, "--host", "127.0.0.1", "--port", String(port), "--strictPort"];
  const child = spawn(process.execPath, argv, { cwd: gameDir, env: { ...process.env, RTK_DISABLED: "1" }, stdio: ["ignore", "pipe", "pipe"] });
  const output = [];
  child.stdout.on("data", (chunk) => output.push({ stream: "stdout", text: chunk.toString() }));
  child.stderr.on("data", (chunk) => output.push({ stream: "stderr", text: chunk.toString() }));
  const metadata = { executable: process.execPath, argv, cwd: gameDir, pid: child.pid, port, origin: `http://127.0.0.1:${port}`, strictPort: true, startedAt: new Date().toISOString() };
  await writeFile(path.join(logDir, "server-start.json"), JSON.stringify(metadata, null, 2));
  child.on("exit", (code, signal) => Object.assign(metadata, { exitCode: code, signal, exitedAt: new Date().toISOString() }));
  const stop = async () => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      await Promise.race([new Promise((resolve) => child.once("exit", resolve)), delay(5000)]);
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }
    await writeFile(path.join(logDir, "server.json"), JSON.stringify({ ...metadata, output }, null, 2));
  };
  try {
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error(`Private Vite exited: ${child.exitCode}`);
      try { if ((await fetch(metadata.origin)).ok) return { child, metadata, stop }; } catch {}
      await delay(100);
    }
    throw new Error("Private Vite did not become ready in 10 seconds");
  } catch (error) { await stop(); throw error; }
}

// This is a producer input solver, never a verifier. It reads the existing public
// smoke hooks; all mutations are actual button/input/keyboard interactions below.
async function nextActions(page, hook, number, wrong, step) {
  return bounded("Read-only browser input solver", page.evaluate(async ({ hook, number, wrong, step }) => {
    const g = window[hook]?.game;
    if (!g) throw new Error(`Missing public smoke hook ${hook}`);
    const s = g.snapshot;
    const level = s.level.id;
    const click = (id) => ({ type: "click", id });
    const range = (id, key) => ({ type: "range", id, key });
    if (["cleared", "failed"].includes(s.phase)) return [];
    switch (number) {
      case 2: {
        if (level === "L1") {
          const truth = g.shelfOfKey(s.keys[s.pendingIndex]);
          return [click(`shelf-${wrong ? (truth + 1) % s.store.shelfCount : truth}`)];
        }
        if (level === "L2" || level === "L3") {
          if (s.crudIndex < s.keys.length) return [click(g.getTruth(s.keys[s.crudIndex]) !== null ? "get-alive" : "get-missing")];
          return [click(`swept-${s.keys.length}`)];
        }
        return step === 0 ? [range("strength-dial", "End")] : [click("lock-in")];
      }
      case 3: {
        if (level === "L1") return [{ type: "fill", id: "code-input", value: wrong ? "WRONG" : g.predictedCodeForPending() }, click("submit-code")];
        if (level === "L2") {
          const truth = g.currentRedirectDestination();
          const dests = [...new Set([...s.map.values()].map((v) => v.url))];
          return [click(`dest-${dests.indexOf(truth)}`)];
        }
        if (level === "L3") {
          const { wouldCollide } = await import("/src/sim/levels.ts");
          return [click(wouldCollide(s.map, g.currentCollisionUrl()) ? "predict-collide" : "predict-safe")];
        }
        return [click("resolve-salted")];
      }
      case 4: {
        if (s.inbound !== null && g.inboundRequiresReject()) return [click("reject-inbound")];
        const route = g.headFinished()?.correctRoute;
        if (route) return [click((wrong ? route !== "retry" : route === "retry") ? "classify-retry" : "classify-dlq")];
        const truth = g.expectedDispatchId();
        if (truth) {
          return [click(`pick-${truth}`)];
        }
        return [{ type: "key", key: "p" }, { type: "key", key: "p" }];
      }
      case 5: {
        if (level === "L4") return [click(`station-${g.truthReconnectTarget()}`)];
        if (step > 0 || wrong) return [click("submit")];
        const truth = level === "L1" ? g.truthConnected() : level === "L2" ? g.truthDelivery() : g.truthSurvivors();
        return [...truth.map((id) => click(`station-${id}`)), click("submit")];
      }
      case 6: {
        if (level === "L1" || level === "L4") {
          const truth = g.bufferedOverflows();
          return [click(`predict-overflow-${(wrong ? !truth : truth) ? "yes" : "no"}`)];
        }
        if (level === "L2") return [click("predict-bounded-yes")];
        if (step === 0) return [range("chunk-dial", "Home")];
        return [{ type: "fill", id: "peak-input", value: String(s.tunedChunkSize) }, click("lock-in")];
      }
      case 7: {
        if (level === "L4") {
          if (step === 0) return [click("move-0-down"), click("move-1-down")];
          return [click("gate-auth")];
        }
        const truth = g.pendingAnswer();
        return [click(`predict-${wrong ? (truth === "auth" ? "handler" : "auth") : truth}`)];
      }
      case 8: {
        if (level === "L1") {
          const truth = g.nextCorrectEventType();
          const other = g.appendChoices().find((v) => v !== truth);
          return [click(`append-${wrong ? other : truth}`)];
        }
        if (level === "L2") return [click(`status-${g.truthStatus()}`)];
        if (level === "L3") return [click(`at-checkpoint-${g.truthStatusAtCheckpoint()}`), click(`after-replay-${g.truthStatus()}`)];
        return [click(`status-${g.truthStatus()}`), click(`shipped-${g.truthShipped()}`)];
      }
      case 9: {
        if (level === "L1") return s.pods.map((p) => click(`dock-${(wrong ? !g.podWouldDock(p) : g.podWouldDock(p)) ? "yes" : "no"}-${p.id}`));
        if (level === "L2") return s.pods.map((p) => click(`missing-${p.id}-${g.podMissing(p)}`));
        if (level === "L3") return s.probe.invokedMethods.map((m) => click(`${g.probeAllows(m) ? "allow" : "block"}-${m}`));
        return [...g.minimalCapabilities().map((m) => click(`cap-${m}`)), click("lock-in")];
      }
      case 10: {
        if (level === "L1") {
          const truth = g.ownerOfKey(s.keys[s.pendingKeyIndex]);
          return [click(`station-${wrong ? s.stations.find((st) => st.id !== truth).id : truth}`)];
        }
        if (level === "L2") return [click(`station-${s.actualLoserId}`)];
        if (level === "L3") return step === 0 ? [range("vnode-dial", "End")] : [click("lock-in")];
        return [click("contrast-consistent-0.2"), click("contrast-modulo-0.8")];
      }
      case 11: {
        if ((level === "L2" || level === "L4") && !s.probeFired) return [click("probe")];
        if (level === "L3" && s.policy !== "least_connections") return [click("policy-least_connections")];
        const truth = g.predictTruthPad();
        return [click(`pad-${wrong ? s.backends.find((b) => b.id !== truth).id : truth}`)];
      }
      case 12: {
        if (level === "L1") return [click(`station-${wrong ? s.stations.find((st) => st.id !== g.currentLeaderId()).id : g.currentLeaderId()}`)];
        if (level === "L2") {
          if (s.killedLeaderId === null && s.leaderPredicted) return [click("kill-leader")];
          return [click(`station-${g.currentLeaderId()}`)];
        }
        if (level === "L4" && s.killedLeaderId === null && s.completed.size > 0) return [click("kill-leader")];
        if (level === "L4" && s.killedLeaderId !== null && !s.leaderPredicted) return [click(`station-${g.currentLeaderId()}`)];
        const ready = g.readyJobs()[0];
        if (!ready) throw new Error("No ready job exposed by public solver");
        return [click(`job-${ready.id}`)];
      }
      case 13: {
        if (s.phase === "injecting") {
          const actions = [];
          if (["L1", "L2", "L4"].includes(level)) {
            for (let i = 0; i < s.level.failureThreshold; i++) actions.push(click("inject-failure"));
          }
          if (level === "L2") actions.push(click("advance-clock"));
          return [...actions, click("to-predict")];
        }
        if (level === "L1") return [click(`pred-state-${wrong ? "closed" : "open"}`)];
        if (level === "L2") return [click("probe-success")];
        if (level === "L3") return [click("burst-5")];
        return [click("cascade-predict")];
      }
      case 14: {
        if (level === "L1") {
          const truth = g.sourceOf(s.prompts[s.promptIndex]);
          return [click(`source-${wrong ? s.level.sources.find((id) => id !== truth) : truth}`)];
        }
        if (level === "L2") return [click(g.logReached(s.prompts[s.promptIndex]) ? "filter-pass" : "filter-drop")];
        if (level === "L3") {
          if (s.injectSource === null) return [click(`source-${g.traceSourceSet()[0]}`)];
          return [...g.traceSourceSet().map((id) => click(`source-${id}`)), click("lock-in")];
        }
        return [...g.traceLogIds().map((id) => click(`log-${id}`)), click("lock-in")];
      }
      case 15: {
        if (level === "L1") return [click(`bucket-${wrong ? (g.truthBucket() + 1) % 8 : g.truthBucket()}`)];
        if (level === "L2") {
          const p = g.watchedPercentile();
          let index = s.histogram.boundaries.findIndex((b) => p <= b);
          if (index < 0) index = s.histogram.boundaries.length - 1;
          return [click(`bucket-${index}`)];
        }
        if (level === "L3") return step === 0 ? [range("slo-dial", "Home")] : [click("predict-fires")];
        return [click(`dist-${g.alertingDistributionId()}`)];
      }
      case 16: {
        if (level === "L1") {
          const truth = g.pendingKeyPartition();
          return [click(`lane-${wrong ? (truth + 1) % s.level.partitionCount : truth}`)];
        }
        if (level === "L2") return [click("auto-assign"), click("lock-in")];
        // The offered L3 UI has no owner-prediction controls. Resolve records
        // its real result; no hook mutation is used to manufacture those inputs.
        if (level === "L3") return [click("resolve-rebalance")];
        throw new Error("L4 canvas-only replay selection requires its own observable input solver; no public mutation permitted");
      }
      case 17: {
        if (level === "L1") {
          if (wrong) return [click("quorum-1"), click("resolve")];
          return [click(`quorum-${g.quorumRequired()}`), ...s.ackOrder.slice(0, g.quorumRequired()).map((id) => click(`node-${id}`)), click("resolve")];
        }
        if (level === "L2") {
          if (s.committedValue === null) return s.ackOrder.slice(0, g.quorumRequired()).map((id) => click(`node-${id}`));
          const truth = Object.entries(s.level.watchers).filter(([, keys]) => keys.includes(s.level.key)).map(([id]) => id);
          const different = [...new Set([...truth, ...s.predictedLit])].filter((id) => truth.includes(id) !== s.predictedLit.includes(id));
          return [...different.map((id) => click(`node-${id}`)), click("resolve")];
        }
        if (level === "L3") return [click(g.sideCanCommit("left") ? "side-left" : "side-right"), click("resolve")];
        return [...s.level.partitionSide.map((id) => click(`node-${id}`)), click("resolve")];
      }
      case 18: {
        if (level === "L1") {
          const truth = g.cardTruth(s.cards[s.filingPredictions.length]);
          return [click(`shelf-${wrong ? s.shelves.find((v) => v !== truth) : truth}`)];
        }
        if (level === "L2" || level === "L3") return [click(`doc-${g.topDocId()}`)];
        return g.fullRanking().slice(0, 3).map((r) => click(`doc-${r.docId}`));
      }
      default: throw new Error(`No observer solver for game ${number}`);
    }
  }, { hook, number, wrong, step }));
}

async function observeMode(game, mode, browser, server, logDir, mediaDir, report) {
  const modeDir = path.join(mediaDir, mode);
  await mkdir(modeDir, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, baseURL: server.metadata.origin, recordVideo: { dir: modeDir, size: { width: 1280, height: 800 } } });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  if (mode === "unsupported-webgl-fallback") {
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        if (["webgl", "webgl2", "experimental-webgl"].includes(kind)) return null;
        return original.call(this, kind, ...args);
      };
    });
  }
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  const evaluate = (fn, argument) => bounded("Browser state read", page.evaluate(fn, argument));
  const consoleEvents = [];
  const pageErrors = [];
  const actions = [];
  const seen = [];
  let failed = false;
  const cases = [];
  page.on("console", (event) => consoleEvents.push({ type: event.type(), text: event.text() }));
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  const read = () => evaluate((hook) => { const s = window[hook]?.game.snapshot; return s ? { phase: s.phase, level: s.level.id } : null; }, game.hook);
  const play = async (name, expectedPass, wrong = false) => {
    const item = { caseId: `${game.id}/${mode}/${name}`, gameId: game.id, rendererMode: mode, level: (await read())?.level, expectedPass, status: "unverified", source: [path.join(game.dir, "src/scene/hud.ts"), path.join(game.dir, "src/sim/levels.ts"), "docs/design/teaching-game-contract.md"], assertions: [] };
    cases.push(item);
    const before = await evaluate(() => window.__voxelDojoEvidence ?? []);
    const deadline = Date.now() + 45_000;
    let step = 0;
    while (!["cleared", "failed"].includes((await read())?.phase)) {
      assert.ok(Date.now() < deadline && step < 160, "Bounded game interaction budget exhausted");
      const next = await nextActions(page, game.hook, game.number, wrong, step++);
      assert.ok(next.length > 0, "No actionable public input returned");
      for (const action of next) {
        if (["cleared", "failed"].includes((await read())?.phase)) break;
        actions.push({ at: new Date().toISOString(), caseId: item.caseId, ...action });
        if (action.type === "click") await page.getByTestId(action.id).click();
        else if (action.type === "fill") await page.getByTestId(action.id).fill(action.value);
        else if (action.type === "range") { await page.getByTestId(action.id).focus(); await page.getByTestId(action.id).press(action.key); }
        else await page.keyboard.press(action.key);
      }
    }
    const current = await read();
    const after = await evaluate(() => window.__voxelDojoEvidence ?? []);
    assert.deepEqual(after.slice(0, before.length), before, "Existing raw records mutated");
    assert.equal(after.length, before.length + 1, "Wave must append one raw record");
    const record = after.at(-1);
    const consoleRecords = consoleEvents.filter((event) => event.text.startsWith("EVIDENCE ")).map((event) => JSON.parse(event.text.slice(9)));
    assert.deepEqual(consoleRecords.at(-1), record, "Raw evidence dual channels differ");
    assert.equal(record.source, "voxeldojo");
    assert.equal(record.unit_id, game.unitId);
    for (const key of ["project", "game", "scenario_id", "ts", "metrics", "review_context", "curriculum_context"]) assert.ok(record[key] !== undefined, `Missing evidence field ${key}`);
    assert.equal(record.review_context.verifier_required, true);
    assert.equal(record.review_context.scheduler_source, "learner-substrate");
    item.rawRecord = record;
    item.observedPhase = current.phase;
    item.assertions.push("one actual record appended", "previous records unchanged", "window and console records identical", "identity and raw-envelope fields present");
    const filename = path.join(modeDir, `${name}.png`);
    await page.screenshot({ path: filename });
    item.screenshot = await fileRef(filename);
    seen.push(record);
    assert.equal(record.pass, expectedPass, `Observed producer verdict differs from expected for ${item.caseId}`);
    assert.equal(current.phase, expectedPass ? "cleared" : "failed");
    item.status = "pass";
    await writeFile(path.join(logDir, `${mode}-cases.json`), JSON.stringify(cases, null, 2));
    process.stdout.write(`${new Date().toISOString()} ${item.caseId}: ${item.status}\n`);
    return item;
  };
  try {
    await page.goto("/");
    await page.getByTestId("start").waitFor();
    assert.equal((await read()).level, "L1");
    assert.ok((await page.locator("body").innerText()).length > 80);
    assert.equal(await page.locator("vite-error-overlay").count(), 0);
    assert.ok((await page.title()).length > 0);
    if (mode === "unsupported-webgl-fallback") {
      await page.getByTestId("accessible-projection").waitFor();
      const renderer = await page.locator("#stage").evaluate((canvas) => ({ hidden: canvas.hidden, computedDisplay: getComputedStyle(canvas).display, webgl: !!(canvas.getContext("webgl2") || canvas.getContext("webgl")) }));
      assert.equal(renderer.hidden, true);
      assert.equal(renderer.webgl, false);
      report.rendererObservations.push({ gameId: game.id, mode, ...renderer });
    } else {
      await page.locator("#stage").waitFor({ state: "visible" });
      await page.waitForFunction(() => { const canvas = document.querySelector("#stage"); return !!(canvas?.getContext("webgl2") || canvas?.getContext("webgl")); });
    }
    await page.screenshot({ path: path.join(modeDir, "entry.png") });
    if (mode === "webgl" && game.number !== 4) {
      await page.getByTestId("start").click();
      await play("L1-negative", false, true);
      await page.getByTestId("retry").click();
      await play("L1-retry", true);
    } else {
      await page.getByTestId("start").click();
      await play("L1", true);
    }
    for (const level of ["L2", "L3", "L4"]) {
      await page.getByTestId("next").click();
      assert.equal((await read()).level, level);
      await page.getByTestId("start").click();
      if (mode === "webgl" && game.number === 4 && level === "L3") {
        await play("L3-negative", false, true);
        await page.getByTestId("retry").click();
        await play("L3-retry", true);
      } else await play(level, true);
    }
    if (mode === "webgl") {
      const retained = JSON.stringify(seen);
      await page.reload();
      await page.getByTestId("start").waitFor();
      assert.deepEqual(await read(), { phase: "briefing", level: "L1" });
      assert.equal(await evaluate(() => window.__voxelDojoEvidence?.length ?? 0), 0);
      await page.getByTestId("start").click();
      await play("reentry-L1", true);
      assert.equal(retained, JSON.stringify(seen.slice(0, -1)), "Saved handoff changed on re-entry");
    }
    assert.deepEqual(pageErrors, [], "Browser runtime exception");
  } catch (error) {
    failed = true;
    const current = cases.at(-1);
    if (current && current.status !== "pass") { current.status = current.rawRecord ? "blocked" : "unverified"; current.error = String(error); }
    report.errors.push({ gameId: game.id, mode, message: String(error), stack: error.stack, classification: current?.rawRecord ? "observed-flow-or-producer-result" : "observer-or-runtime-prerequisite" });
    await page.screenshot({ path: path.join(modeDir, "failure.png") }).catch(() => {});
    await writeFile(path.join(logDir, `${mode}-failure-dom.txt`), await page.locator("body").innerText().catch(() => "unavailable"));
  } finally {
    for (const level of ["L1", "L2", "L3", "L4"]) {
      if (!cases.some((item) => item.level === level && item.expectedPass)) cases.push({ caseId: `${game.id}/${mode}/${level}`, gameId: game.id, rendererMode: mode, level, status: "unverified", reason: "Not reached through the offered controls before the preceding bounded case stopped" });
    }
    report.cases.push(...cases);
    await writeFile(path.join(logDir, `${mode}-console.json`), JSON.stringify({ consoleEvents, pageErrors }, null, 2));
    await writeFile(path.join(logDir, `${mode}-actions.json`), JSON.stringify(actions, null, 2));
    await writeFile(path.join(logDir, `${mode}-raw-records.json`), JSON.stringify(seen, null, 2));
    await context.tracing.stop(failed ? { path: path.join(modeDir, "trace.zip") } : {});
    await context.close();
  }
}

export async function run(caseName = "declared-use", options = {}) {
  assert.equal(caseName, "declared-use", `Unknown voxel observation: ${caseName}`);
  const runId = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const logDir = path.resolve(options.artifactDir ?? path.join(ROOT, ".scratch/readiness-implementation-20261015/qa-voxel", runId));
  const mediaDir = path.join(ENGINE, "test-results/readiness-plan-runtime", runId);
  await mkdir(logDir, { recursive: true });
  await mkdir(mediaDir, { recursive: true });
  const allGames = JSON.parse(await readFile(path.join(ENGINE, "catalog.json"), "utf8"));
  assert.equal(allGames.length, 17);
  assert.equal(new Set(allGames.map((item) => item.id)).size, 17);
  const selected = options.gameIds ? allGames.filter((item) => options.gameIds.includes(item.id)) : allGames;
  const canonicalPath = path.join(ROOT, "learner/learning_state.yaml");
  const before = await fileRef(canonicalPath);
  const policySource = options.sharedPolicySource ?? "/Users/danielbarreto/Development/aidevschool/engines/shared/playwright/base.config.ts";
  const report = {
    engineId: "voxelDojo", caseName, observedAt: new Date().toISOString(), sourceCommit: git("rev-parse", "HEAD"),
    producerContext: "readiness-qa-voxel-runtime-agent", verifierContext: null, status: "unverified",
    invocation: { argv: process.argv, cwd: process.cwd(), pid: process.pid, caseName, gameIds: selected.map((item) => item.id) },
    declaredUse: "17 deterministic concept attempt games; offered L1–L4; raw evidence handoff to separate verifier",
    browserAvailability: "Browser plugin not available; existing repository Playwright used", viewport: { width: 1280, height: 800 },
    helperSource: await fileRef(fileURLToPath(import.meta.url)), catalogSource: await fileRef(path.join(ENGINE, "catalog.json")),
    evidencePolicy: { source: await fileRef(policySource), sourceImportedOrPromoted: false, screenshot: "on", video: "on", trace: "retain-on-failure", outputDir: mediaDir },
    canonicalBefore: before, catalogIds: allGames.map((item) => item.id), games: [], cases: [], evidenceRefs: [], errors: [],
    rendererObservations: [],
    limitations: ["Producer QA only: public read-only smoke hooks and one pure collision helper supply browser inputs; they are not an independent concept verifier.", "TypeSafe/Jev semantic prerequisite is missing; no model was called. Pixels and producer pass fields do not establish semantic verification or mastery.", "Raw evidence is retained for a separate verifier; this run writes no receipt, learner state, commit, push, deployment, or production data.", "Prior probes are retained: warehouse canvas isVisible was an invalid extra observer assertion; Task Forge L1 distractor selections did not guarantee failure under its 80% threshold. The current observer requires unavailable WebGL plus a visible playable accessible projection, and uses explicit L3 retry-vs-DLQ misclassification for Task Forge's negative/retry case.", "Pointer action timeout is bounded at 10 seconds; each solver loop is bounded at 45 seconds/160 iterations. A timeout without a failed producer record remains observer/runtime uncertainty, not a product defect."],
  };
  if (selected.length !== 17) report.limitations.push("This invocation deliberately selects a subset; it cannot qualify all 17 games.");
  try {
    for (const entry of selected) {
      const dir = path.join(ENGINE, entry.id);
      const gameLog = path.join(logDir, entry.id);
      const gameMedia = path.join(mediaDir, entry.id);
      await mkdir(gameLog, { recursive: true });
      await mkdir(gameMedia, { recursive: true });
      const main = await readFile(path.join(dir, "src/main.ts"), "utf8");
      const hook = main.match(/windowKey:\s*"([^"]+)"/)?.[1];
      assert.ok(hook, `Missing declared smoke hook for ${entry.id}`);
      const game = { ...entry, dir, hook, number: Number(entry.id.slice(5, 7)), sourceBefore: await sourceRefs(dir), rendererFallbackOffered: /renderer:\s*\{/.test(main) };
      const requireGame = createRequire(path.join(dir, "package.json"));
      const { chromium } = requireGame("@playwright/test");
      let server;
      let browser;
      process.stdout.write(`${new Date().toISOString()} observing ${entry.id}\n`);
      try {
        server = await startServer(dir, requireGame, gameLog);
        game.server = server.metadata;
        browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"] });
        game.browserVersion = browser.version();
        for (const mode of ["webgl", ...(game.rendererFallbackOffered ? ["unsupported-webgl-fallback"] : [])]) await observeMode(game, mode, browser, server, gameLog, gameMedia, report);
      } catch (error) {
        report.errors.push({ gameId: game.id, message: String(error), classification: "observer-or-runtime-prerequisite" });
      } finally {
        if (browser) await browser.close();
        if (server) await server.stop();
        game.sourceAfter = await sourceRefs(dir);
        assert.deepEqual(game.sourceAfter, game.sourceBefore, "Game source changed during observation");
        game.sourceFingerprint = sha256(JSON.stringify(game.sourceBefore));
        report.games.push(game);
        await writeFile(path.join(logDir, "checkpoint.json"), JSON.stringify(report, null, 2));
      }
    }
  } finally {
    report.canonicalAfter = await fileRef(canonicalPath);
    assert.equal(report.canonicalAfter.sha256, before.sha256, "Canonical learner changed during observation");
  }
    report.completedAt = new Date().toISOString();
    report.matrix = report.catalogIds.flatMap((gameId) => ["L1", "L2", "L3", "L4"].map((level) => {
      const observed = report.cases.filter((item) => item.gameId === gameId && item.level === level && item.rendererMode === "webgl" && item.expectedPass);
      return { gameId, level, status: observed.some((item) => item.status === "blocked") ? "blocked" : observed.some((item) => item.status === "pass") ? "pass" : "unverified", caseIds: observed.map((item) => item.caseId) };
    }));
    report.runtimeStatus = report.cases.some((item) => item.status === "blocked") ? "blocked" : report.matrix.every((item) => item.status === "pass") ? "pass" : "unverified";
    report.status = report.runtimeStatus === "blocked" ? "blocked" : "unverified";
    report.sourceFingerprint = sha256(JSON.stringify(report.games.map((game) => [game.id, game.sourceFingerprint])));
    for (const folder of [logDir, mediaDir]) for (const filename of await filesUnder(folder)) if (!filename.endsWith("checkpoint.json")) report.evidenceRefs.push(await fileRef(filename));
    const reportPath = path.join(logDir, "report.json");
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    return { ...report, reportPath, reportSha256: sha256(await readFile(reportPath)) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await run(process.argv[2] ?? "declared-use");
  console.log(JSON.stringify({ status: result.status, runtimeStatus: result.runtimeStatus, reportPath: result.reportPath, matrix: result.matrix, errors: result.errors }, null, 2));
  if (result.status === "blocked") process.exitCode = 1;
}

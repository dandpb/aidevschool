import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
export const ORIGINAL = "/Users/danielbarreto/Development/aidevschool";
export const sha = (b) => createHash("sha256").update(b).digest("hex");
export const pause = (ms) => new Promise((r) => setTimeout(r, ms));
export const json = async (p) => JSON.parse(await readFile(p, "utf8"));
export async function checkAbort(r) {
  let requested = r.abortRequested;
  try {
    requested ||= await json(path.join(r.logDir, "abort-requested.json"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  if (requested) {
    const error = new Error("Observer interrupted externally; unfinished variants are unverified");
    error.code = "OBSERVER_INTERRUPTED";
    throw error;
  }
}
export const git = (...args) =>
  execFileSync("rtk", ["proxy", "git", ...args], { cwd: ROOT, encoding: "utf8" }).trim();
export async function refs(files) {
  return Promise.all(files.map(async (p) => ({ path: p, sha256: sha(await readFile(p)) })));
}
async function learner(root) {
  const names = [
    "learning_state.yaml",
    "learner_profile.md",
    "pitfalls.md",
    "journal.md",
    "pipeline_status.yaml",
    "pipeline_status.md",
    "predictions.yaml",
  ];
  const out = [];
  for (const f of names) {
    try {
      out.push(...(await refs([path.join(root, "learner", f)])));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  return { root, files: out, digest: sha(JSON.stringify(out)) };
}
export async function freePort() {
  const s = createServer();
  await new Promise((r, j) => s.once("error", j).listen(0, "127.0.0.1", r));
  const p = s.address().port;
  await new Promise((r) => s.close(r));
  return p;
}
export function safeEnv(extra = {}) {
  const e = { ...process.env };
  for (const k of Object.keys(e))
    if (/(^VITE_|^LLM_|^OPENAI_|^ANTHROPIC_|^TYPESAFE_|_KEY$|_TOKEN$|_SECRET$|PASSWORD)/i.test(k))
      delete e[k];
  return { ...e, ...extra };
}
export async function command(r, cwd, args, env = {}, wait = false) {
  const i = r.commands.length,
    rec = {
      executable: "rtk",
      argv: ["proxy", ...args],
      cwd,
      envKeys: Object.keys(env),
      startedAt: new Date().toISOString(),
      pid: null,
      exitCode: null,
      signal: null,
    };
  const child = spawn("rtk", rec.argv, {
    cwd,
    env: safeEnv(env),
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  rec.pid = child.pid;
  r.commands.push(rec);
  let out = "",
    err = "";
  child.stdout.on("data", (b) => (out += b));
  child.stderr.on("data", (b) => (err += b));
  const done = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (c, s) => {
      rec.exitCode = c;
      rec.signal = s;
      rec.endedAt = new Date().toISOString();
      resolve();
    });
  });
  // The caller awaits this promise after ownership persistence. Attach a
  // rejection handler now so a fast spawn error cannot become unhandled.
  done.catch(() => {});
  await writeFile(
    path.join(r.logDir, `command-${i}-ownership.json`),
    JSON.stringify(
      {
        observerPid: process.pid,
        pid: child.pid,
        processGroup: child.pid,
        cwd,
        executable: rec.executable,
        argv: rec.argv,
      },
      null,
      2,
    ),
  );
  const save = async () => {
    rec.stdout = path.join(r.logDir, `command-${i}.stdout.log`);
    rec.stderr = path.join(r.logDir, `command-${i}.stderr.log`);
    await writeFile(rec.stdout, out);
    await writeFile(rec.stderr, err);
  };
  const stop = async () => {
    if (child.exitCode === null && child.signalCode === null) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch (e) {
        if (e.code !== "ESRCH") throw e;
      }
      await Promise.race([done, pause(5000)]);
      if (child.exitCode === null && child.signalCode === null) process.kill(-child.pid, "SIGKILL");
    }
    await done;
    await save();
  };
  if (wait) {
    await done;
    await save();
    assert.equal(rec.exitCode, 0, `Failed ${args.join(" ")}`);
  }
  return { child, rec, done, stop, save };
}
export async function serve(r, engine, args, env = {}) {
  await checkAbort(r);
  const p = await freePort(),
    origin = `http://127.0.0.1:${p}`;
  const h = await command(r, path.join(ROOT, "engines", engine), args(p), {
    ...env,
    HOST: "127.0.0.1",
    HOSTNAME: "127.0.0.1",
    PORT: String(p),
  });
  r.servers.push({ engine, origin, port: p, pid: h.child.pid, processGroup: h.child.pid });
  await writeFile(path.join(r.logDir, "server-ownership.json"), JSON.stringify(r.servers, null, 2));
  try {
    for (let i = 0; i < 180; i++) {
      await checkAbort(r);
      if (h.child.exitCode !== null) break;
      try {
        if ((await fetch(origin)).ok) return { ...h, origin, port: p };
      } catch {}
      await pause(250);
    }
    throw Error(`Own server not ready: ${engine} ${origin}`);
  } catch (e) {
    await h.stop();
    throw e;
  }
}
export async function browser(r, moduleEngine = r.engineId) {
  const req = createRequire(path.join(ROOT, "engines", moduleEngine, "package.json"));
  const pw = req(moduleEngine === "school-entry" ? "playwright" : "@playwright/test");
  const b = await pw.chromium.launch({ headless: true });
  r.browser = {
    name: "Chromium",
    version: b.version(),
    routing: "Browser plugin not available; regular Playwright authorized for this observer",
  };
  return b;
}
export async function context(r, b, name) {
  const dir = path.join(r.mediaDir, name);
  await mkdir(dir, { recursive: true });
  const c = await b.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir, size: { width: 1280, height: 800 } },
    acceptDownloads: true,
    reducedMotion: "reduce",
  });
  await c.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const p = await c.newPage();
  p.setDefaultTimeout(9000);
  p.on("pageerror", (e) => r.errors.push({ case: name, error: String(e) }));
  p.on("console", (m) => {
    if (m.type() === "error") r.consoleErrors.push({ case: name, text: m.text() });
  });
  return { c, p, dir };
}
export async function shot(r, p, name) {
  const dest = path.join(r.mediaDir, `${name}.png`);
  await p.screenshot({ path: dest, fullPage: false });
  return dest;
}
export function check(r, name, value, details = {}) {
  if (r.abortRequested) {
    const error = new Error("Observer interrupted externally; unfinished variants are unverified");
    error.code = "OBSERVER_INTERRUPTED";
    throw error;
  }
  assert.ok(value, name);
  r.checks.push({ name, status: "pass", ...details });
}
export async function closeContext(ctx, failed = false) {
  if (failed) await ctx.c.tracing.stop({ path: path.join(ctx.dir, "trace.zip") });
  else await ctx.c.tracing.stop();
  await ctx.c.close();
}
async function files(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    out.push(...(ent.isDirectory() ? await files(p) : [p]));
  }
  return out;
}
export async function run(engineId, caseName = "declared-use", options = {}) {
  assert.ok(["school-entry", "sdlc-quest", "zai-duolingo-like"].includes(engineId));
  assert.equal(caseName, "declared-use");
  const engine = path.join(ROOT, "engines", engineId),
    runId = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const r = {
    engineId,
    caseName,
    criterion: { "school-entry": "C27", "sdlc-quest": "C28", "zai-duolingo-like": "C30" }[engineId],
    observedAt: new Date().toISOString(),
    producerContext: {
      id: "qa-local-products-runtime",
      role: "evidence-producer",
      pid: process.pid,
      argv: process.argv,
      cwd: process.cwd(),
    },
    verifierContext: null,
    sourceCommit: git("rev-parse", "HEAD"),
    commands: [],
    servers: [],
    checks: [],
    cases: [],
    errors: [],
    consoleErrors: [],
    limitations: [
      "Independent verifier and TypeSafe/Jev semantic image judgment pending; no model/provider calls made.",
    ],
    mediaDir: path.join(engine, "test-results", "readiness-plan-runtime", runId),
    logDir: path.join(
      ROOT,
      ".scratch",
      "readiness-implementation-20261015",
      "qa-local-products",
      engineId,
      runId,
    ),
  };
  await mkdir(r.logDir, { recursive: true });
  await mkdir(r.mediaDir, { recursive: true });
  r.sharedBaseProvenance = await refs([
    path.join(ORIGINAL, "engines/shared/playwright/base.config.ts"),
    path.join(ORIGINAL, "engines/shared/playwright/README.md"),
  ]);
  await writeFile(
    path.join(r.logDir, "observer-ownership.json"),
    JSON.stringify({ pid: process.pid, argv: process.argv, cwd: process.cwd() }, null, 2),
  );
  const onSignal = (signal) => {
    r.abortRequested = { signal, at: new Date().toISOString() };
  };
  const onInt = () => onSignal("SIGINT"),
    onTerm = () => onSignal("SIGTERM");
  process.once("SIGINT", onInt);
  process.once("SIGTERM", onTerm);
  r.observerSourceRefs = await refs(
    [
      "local-products-runtime.mjs",
      "local-products-runtime-school.mjs",
      "local-products-runtime-quest.mjs",
      "local-products-runtime-zai.mjs",
    ].map((name) => fileURLToPath(new URL(name, import.meta.url))),
  );
  const sourceFiles = git("ls-files", "-z", `engines/${engineId}`)
    .split("\0")
    .filter(Boolean)
    .filter((f) => !/(test-results|evidence-v1|\.next|node_modules|\.log$)/.test(f));
  r.sourceFiles = await refs(sourceFiles.map((f) => path.join(ROOT, f)));
  r.sourceFingerprint = sha(JSON.stringify(r.sourceFiles));
  r.learnerBefore = [await learner(ROOT), await learner(ORIGINAL)];
  try {
    const mod = await import(
      `./local-products-runtime-${engineId === "school-entry" ? "school" : engineId === "sdlc-quest" ? "quest" : "zai"}.mjs`
    );
    await mod.observe(r, options);
    await checkAbort(r);
  } catch (e) {
    if (e.code === "OBSERVER_INTERRUPTED" || r.abortRequested) {
      r.interrupted = true;
      r.interruption = r.abortRequested || "external abort file";
      r.checks.push({ name: "declared-use runtime interrupted externally", status: "unverified" });
    } else {
      r.fatal = String(e.stack || e);
      r.checks.push({ name: "declared-use runtime", status: "fail", error: String(e) });
    }
  } finally {
    process.removeListener("SIGINT", onInt);
    process.removeListener("SIGTERM", onTerm);
    r.learnerAfter = [await learner(ROOT), await learner(ORIGINAL)];
    r.learnerUnchanged = JSON.stringify(r.learnerBefore) === JSON.stringify(r.learnerAfter);
    assert.ok(r.learnerUnchanged, "Canonical learner hashes changed");
    r.evidenceRefs = await refs(await files(r.mediaDir));
    r.functionalStatus = r.interrupted
      ? "unverified"
      : r.fatal
        ? "blocked"
        : r.cases.some((c) => c.status === "unverified")
          ? "unverified"
          : "pass";
    r.status = r.functionalStatus === "blocked" ? "blocked" : "unverified";
    r.completedAt = new Date().toISOString();
    r.report = path.join(r.logDir, "report.json");
    await writeFile(r.report, JSON.stringify(r, null, 2));
  }
  return r;
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  run(process.argv[2], process.argv[3] ?? "declared-use")
    .then((result) => {
      console.log(
        JSON.stringify({
          engineId: result.engineId,
          status: result.status,
          functionalStatus: result.functionalStatus,
          checks: result.checks.length,
          fatal: result.fatal,
          report: result.report,
        }),
      );
      process.exitCode = result.interrupted ? 2 : result.fatal ? 1 : 0;
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    });

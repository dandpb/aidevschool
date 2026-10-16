import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const scripts = path.resolve("intent/2026-10-15-ecosystem-product-readiness/evidence/scripts");

// Exercise the exported function's actual source with process/I/O substitutes.
// No browser, server, native process or canonical learner is created by these tests.
async function actualFunction(file, name, context) {
  const source = await readFile(path.join(scripts, file), "utf8");
  const start = source.indexOf(`export async function ${name}(`);
  assert.notEqual(start, -1, `Export ${name} must exist`);
  const next = source.indexOf("\nexport ", start + 1);
  const body = source.slice(start, next === -1 ? undefined : next).replace(/^export /, "");
  return vm.runInNewContext(`(${body})`, context, { filename: file, timeout: 1000 });
}

function processFixture() {
  const child = new EventEmitter();
  Object.assign(child, { pid: 12345, exitCode: null, signalCode: null, stdout: new EventEmitter(), stderr: new EventEmitter() });
  const signals = [];
  return {
    child, signals,
    process: { execPath: "node", pid: 54321, env: {}, kill(group, signal) {
      assert.equal(group, -12345, "Only the owned process group may be signalled");
      signals.push(signal);
      queueMicrotask(() => {
        child.signalCode = signal;
        child.emit("exit", null, signal);
        child.emit("close", null, signal);
      });
    } },
  };
}

async function viteFixture(earlyExit = false, ready = false) {
  const fixture = processFixture();
  let closed = 0;
  const start = await actualFunction("learning-runtime-support.mjs", "startVite", {
    root: "/private-fixture", path,
    port: async () => 1234,
    createRequire: () => ({ resolve: () => "/virtual/vite/package.json" }),
    fs: { open: async () => ({ fd: 1, close: async () => { closed += 1; } }), writeFile: async () => {} },
    spawn: () => { if (earlyExit) fixture.child.exitCode = 7; return fixture.child; },
    process: fixture.process,
    fetch: async () => { if (ready) return { ok: true }; throw new Error("own server unavailable"); },
    setTimeout: (callback) => setTimeout(callback, 0),
  });
  return { ...fixture, start, closed: () => closed };
}

test("failed startup terminates its owned child and closes its log before rejecting", async () => {
  const f = await viteFixture();
  await assert.rejects(f.start("literacyDojo", "/artifacts"), /did not become ready/);
  assert.equal(f.child.signalCode, "SIGTERM");
  assert.equal(f.closed(), 1);
});

test("an already exited startup still closes the opened log", async () => {
  const f = await viteFixture(true);
  await assert.rejects(f.start("literacyDojo", "/artifacts"), /exited 7/);
  assert.equal(f.closed(), 1);
  assert.equal(f.signals.length, 0);
});

test("stopping the same owned server twice closes its log once", async () => {
  const f = await viteFixture(false, true);
  const server = await f.start("literacyDojo", "/artifacts");
  await server.stop();
  await server.stop();
  assert.equal(f.closed(), 1);
  assert.equal(f.signals.length, 1);
});

test("exit during ownership persistence is observed and wait finishes with its actual status", async () => {
  const f = processFixture();
  let first = true;
  const command = await actualFunction("local-products-runtime.mjs", "command", {
    assert, path, process: f.process, safeEnv: () => ({}), spawn: () => f.child,
    pause: (ms) => new Promise((resolve) => setTimeout(resolve, Math.min(ms, 1))),
    writeFile: async () => {
      if (first) {
        first = false;
        queueMicrotask(() => { f.child.exitCode = 0; f.child.emit("exit", 0, null); f.child.emit("close", 0, null); });
        await new Promise((resolve) => setImmediate(resolve));
      }
    },
  });
  const record = { commands: [], logDir: "/artifacts" };
  let timer;
  const outcome = await Promise.race([
    command(record, "/fixture", ["node", "-e", ""], {}, true).then(() => "finished"),
    new Promise((resolve) => { timer = setTimeout(() => resolve("missed exit event"), 100); }),
  ]);
  clearTimeout(timer);
  assert.equal(outcome, "finished");
  assert.equal(record.commands[0].exitCode, 0);
});

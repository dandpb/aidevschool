import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  createChecker,
  validateTarget,
  fetchPinned,
} from "../server/health.mjs";
test("C06 browser checker requires visible enabled ready control", async (t) => {
  let html = '<button id="ready">Start</button>';
  const s = createServer((q, r) => r.end(html));
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const checker = createChecker({ allowLocal: true, timeout: 10000 });
  t.after(async () => {
    await checker.close();
    await new Promise((r) => s.close(r));
  });
  const target = {
    url: `http://127.0.0.1:${s.address().port}`,
    readySelector: "#ready",
  };
  assert.equal(await checker(target), true);
  html = '<button id="ready" disabled>Start</button>';
  assert.equal(await checker(target), false);
  html = '<button id="ready" hidden>Start</button>';
  assert.equal(await checker(target), false);
  html = "<h1>Broken page</h1>";
  assert.equal(await checker(target), false);
});
test("C07 private targets and redirects are rejected in public mode", async () => {
  for (const url of [
    "http://127.0.0.1",
    "http://localhost",
    "http://169.254.169.254",
    "http://10.0.0.1",
    "http://[::1]",
  ])
    await assert.rejects(validateTarget(url));
  await assert.rejects(
    validateTarget("https://example.com/path", {
      origin: "https://another.example",
      lookup: async () => [{ address: "93.184.216.34" }],
    }),
  );
});

test("C07 checker blocks navigation redirected to another origin", async (t) => {
  let reached = false;
  const destination = createServer((q, r) => {
    reached = true;
    r.end('<button id="ready">Start</button>');
  });
  await new Promise((r) => destination.listen(0, "127.0.0.1", r));
  const source = createServer((q, r) => {
    r.writeHead(302, {
      Location: `http://127.0.0.1:${destination.address().port}`,
    });
    r.end();
  });
  await new Promise((r) => source.listen(0, "127.0.0.1", r));
  const checker = createChecker({ allowLocal: true });
  t.after(async () => {
    await checker.close();
    await Promise.all(
      [source, destination].map((s) => new Promise((r) => s.close(r))),
    );
  });
  assert.equal(
    await checker({
      url: `http://127.0.0.1:${source.address().port}`,
      readySelector: "#ready",
    }),
    false,
  );
  assert.equal(reached, false);
});

test("C07 rebinding and write probes are rejected before connection", async () => {
  let calls = 0;
  const request = { method: () => "GET", url: () => "http://school.example" };
  await assert.rejects(
    fetchPinned(request, {
      timeout: 100,
      lookup: async () =>
        ++calls === 1
          ? [{ address: "93.184.216.34", family: 4 }]
          : [{ address: "127.0.0.1", family: 4 }],
    }),
    /private/,
  );
  assert.equal(calls, 2);
  await assert.rejects(fetchPinned({ method: () => "POST" }, {}), /read-only/);
});

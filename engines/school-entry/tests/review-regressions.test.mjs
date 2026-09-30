import test from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { setImmediate } from "node:timers/promises";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp, createStore, hashPassword, CATALOG } from "../server/app.mjs";
import { createRuntime } from "../server/runtime.mjs";

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function fixture(t, ranker) {
  const store = createStore(":memory:");
  const ids = CATALOG.slice(0, 4).map((engine) => engine.id);
  for (const id of ids) store.update(id, true, 0);
  const server = createApp({
    store,
    targets: Object.fromEntries(ids.map((id) => [id, {
      url: "https://example.org/", readySelector: "button",
    }])),
    checker: async () => true,
    ranker: ranker ?? (async () => ({
      anyFit: 1, scores: Object.fromEntries(ids.map((id, i) => [id, 3 - i])),
    })),
    adminPasswordHash: hashPassword("operador-ç-seguro-123"),
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    store.close();
  });
  const origin = `http://127.0.0.1:${server.address().port}`;

  async function post(path, data, splitCharacter) {
    const bytes = Buffer.from(JSON.stringify(data));
    const firstChunkReceived = deferred();
    if (splitCharacter) {
      server.once("request", (incoming) => incoming.once("data", firstChunkReceived.resolve));
    }
    let outgoing;
    const response = new Promise((resolve, reject) => {
      outgoing = request(origin + path, {
        method: "POST",
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          "Content-Length": bytes.length,
        },
      }, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
        res.on("error", reject);
      });
      outgoing.on("error", reject);
    });
    if (splitCharacter) {
      const index = bytes.indexOf(Buffer.from(splitCharacter));
      assert.ok(index >= 0);
      outgoing.write(bytes.subarray(0, index + 1));
      await firstChunkReceived.promise;
      await setImmediate();
      outgoing.end(bytes.subarray(index + 1));
    } else {
      outgoing.end(bytes);
    }
    return response;
  }
  return { ids, store, post };
}

test("R1 split UTF-8 descriptions reach the ranker unchanged", { timeout: 5000 }, async (t) => {
  let received;
  const f = await fixture(t, async (description, engines) => {
    received = description;
    return { anyFit: 1, scores: Object.fromEntries(engines.map((engine) => [engine.id, 3])) };
  });
  for (const [description, boundary] of [["Quero programação", "ç"], ["Quero aprender 🧠", "🧠"]]) {
    const response = await f.post("/api/recommend", { description }, boundary);
    assert.equal(response.status, 200);
    assert.equal(received, description);
  }
});

test("R2 valid Unicode password authenticates across chunk boundaries", { timeout: 5000 }, async (t) => {
  const f = await fixture(t);
  const body = { password: "operador-ç-seguro-123" };
  assert.equal((await f.post("/api/session", body)).status, 200);
  const split = await f.post("/api/session", body, "ç");
  assert.equal(split.status, 200);
  assert.equal(split.body.authenticated, true);
});

test("R3 current release filtering refills the ranked top three", { timeout: 5000 }, async (t) => {
  for (const disabledCount of [3, 1]) {
    const started = deferred();
    const release = deferred();
    const f = await fixture(t, async () => {
      started.resolve();
      await release.promise;
      return { anyFit: 1, scores: Object.fromEntries(f.ids.map((id, i) => [id, 3 - i])) };
    });
    const pending = f.post("/api/recommend", { description: "Quero aprender" });
    await started.promise;
    for (const id of f.ids.slice(0, disabledCount)) f.store.update(id, false, 1);
    release.resolve();
    const response = await pending;
    assert.equal(response.status, 200);
    assert.equal(response.body.mode, "recommended");
    assert.deepEqual(response.body.engines.map((engine) => engine.id), f.ids.slice(disabledCount));
  }
});

// FSE review AID-3484 (2026-09-30 14:38Z): loopback URLs may exist as local
// server configuration, but NEVER as a published browser destination. The
// production runtime must refuse local targets — at startup and at launch.
test("R4 production launch never serves a loopback navigation target", { timeout: 10000 }, async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "entry-prod-"));
  const store = createStore(":memory:");
  store.update("literacyDojo", true, 0);
  const app = createRuntime(
    {
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      BASE_URL: "https://school.example",
      ADMIN_PASSWORD_HASH: hashPassword("production-test-only-123"),
      DATA_DIR: dir,
    },
    {
      store,
      targets: {
        literacyDojo: {
          url: "http://127.0.0.1:5178/?hosted=1",
          readySelector: "h1",
        },
      },
      ranker: async () => ({ anyFit: 1, scores: { literacyDojo: 3 } }),
    },
  );
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => app.close(resolve));
    await app.closeResources();
    rmSync(dir, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${app.address().port}`;
  const response = await fetch(origin + "/api/launch/literacyDojo", {
    method: "POST",
    headers: {
      Origin: "https://school.example",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.error.code, "UNAVAILABLE");
  // The loopback URL must never reach the published navigation payload.
  assert.doesNotMatch(JSON.stringify(body), /127\.0\.0\.1|localhost/);
});

test("R5 production refuses ALLOW_LOCAL_TARGETS at startup", () => {
  assert.throws(
    () =>
      createRuntime({
        NODE_ENV: "production",
        ALLOW_LOCAL_TARGETS: "1",
        BASE_URL: "https://school.example",
        ADMIN_PASSWORD_HASH: "irrelevant-throws-earlier",
      }),
    /Local targets cannot be enabled in production/,
  );
});

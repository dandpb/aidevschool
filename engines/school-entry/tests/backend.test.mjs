import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createApp,
  createStore,
  hashPassword,
  CATALOG,
} from "../server/app.mjs";
const ids = CATALOG.map((e) => e.id),
  baseUrl = "https://school.example";
async function fixture(t, opts = {}) {
  const store = opts.store ?? createStore(":memory:");
  let clock = 0;
  const targets = Object.fromEntries(
    ids.map((id) => [
      id,
      { url: `https://${id.toLowerCase()}.example/`, readySelector: "button" },
    ]),
  );
  const server = createApp({
    store,
    targets,
    checker: async () => true,
    ranker: async (_, engines) => ({
      anyFit: 1,
      scores: Object.fromEntries(engines.map((e, i) => [e.id, 3 - i * 0.1])),
    }),
    baseUrl,
    adminPasswordHash: hashPassword("correct password"),
    now: () => clock,
    ...opts,
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(async () => {
    await new Promise((r) => server.close(r));
    try {
      store.close();
    } catch {}
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  let cookie = "",
    csrf = "";
  async function req(path, method = "GET", body, headers = {}) {
    const r = await fetch(url + path, {
      method,
      headers: {
        Origin: baseUrl,
        "Content-Type": "application/json",
        Cookie: cookie,
        "X-CSRF-Token": csrf,
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, body: await r.json(), response: r };
  }
  async function login() {
    const r = await req("/api/session", "POST", {
      password: "correct password",
    });
    assert.equal(r.status, 200);
    cookie = r.response.headers.get("set-cookie").split(";")[0];
    csrf = r.body.csrfToken;
  }
  function enable(n = 4) {
    ids.slice(0, n).forEach((id) => store.update(id, true, 0));
  }
  return { store, req, login, enable, clock: (n) => (clock = n) };
}
test("C01 admin lists all thirteen engines", async (t) => {
  const f = await fixture(t);
  await f.login();
  const r = await f.req("/api/admin/engines");
  assert.equal(r.body.engines.length, 13);
  assert.equal(new Set(r.body.engines.map((e) => e.id)).size, 13);
  assert.ok(r.body.engines.every((e) => e.enabled === false));
});
test("C02 saved availability is global and durable", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "entry-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "data.db");
  let s = createStore(path);
  s.update(ids[0], true, 0);
  s.close();
  s = createStore(path);
  const f = await fixture(t, { store: s });
  assert.equal((await f.req("/api/engines")).body.engines[0].id, ids[0]);
  assert.equal((await f.req("/api/engines")).body.engines.length, 1);
});
test("C03 anonymous mutations and foreign origin are rejected", async (t) => {
  const f = await fixture(t);
  assert.equal(
    (
      await f.req(`/api/admin/engines/${ids[0]}`, "PUT", {
        enabled: true,
        version: 0,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await f.req(
        "/api/session",
        "POST",
        { password: "correct password" },
        { Origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  await f.login();
  assert.equal(
    (
      await f.req(
        `/api/admin/engines/${ids[0]}`,
        "PUT",
        { enabled: true, version: 0 },
        { "X-CSRF-Token": "bad" },
      )
    ).status,
    403,
  );
});
test("C04 concurrent update returns conflict", async (t) => {
  const f = await fixture(t);
  await f.login();
  const r = await Promise.all(
    [1, 2].map(() =>
      f.req(`/api/admin/engines/${ids[0]}`, "PUT", {
        enabled: true,
        version: 0,
      }),
    ),
  );
  assert.deepEqual(r.map((x) => x.status).sort(), [200, 409]);
});
test("C05 only enabled healthy engines are eligible", async (t) => {
  const f = await fixture(t, {
    checker: async (target) => target.url.includes(ids[0].toLowerCase()),
  });
  f.enable(2);
  assert.deepEqual(
    (await f.req("/api/engines")).body.engines.map((e) => e.id),
    [ids[0]],
  );
});
test("C08 failed and unknown checks cannot become available", async (t) => {
  const f = await fixture(t, { checker: async () => undefined });
  f.enable();
  assert.equal((await f.req("/api/engines")).body.engines.length, 0);
});
test("C09 valid judgments return top three in descending order", async (t) => {
  const f = await fixture(t, {
    ranker: async () => ({
      anyFit: 1,
      scores: { [ids[0]]: 1, [ids[1]]: 3, [ids[2]]: 2, [ids[3]]: 0 },
    }),
  });
  f.enable();
  const r = await f.req("/api/recommend", "POST", {
    description: "Quero aprender",
  });
  assert.deepEqual(
    r.body.engines.map((e) => e.id),
    [ids[1], ids[2], ids[0]],
  );
  assert.equal(r.body.mode, "recommended");
  assert.ok(r.body.engines.every((e) => typeof e.reason === "string"));
});
test("C10 two eligible engines return two results", async (t) => {
  const f = await fixture(t);
  f.enable(2);
  assert.equal(
    (await f.req("/api/recommend", "POST", { description: "Aprender" })).body
      .engines.length,
    2,
  );
});
test("C11 no match returns available catalog with distinct mode", async (t) => {
  const f = await fixture(t, {
    ranker: async (_, es) => ({
      anyFit: 0,
      scores: Object.fromEntries(es.map((e) => [e.id, 0])),
    }),
  });
  f.enable();
  const r = await f.req("/api/recommend", "POST", { description: "Cozinhar" });
  assert.equal(r.body.mode, "no-match");
  assert.equal(r.body.engines.length, 4);
});
test("C12 malformed provider results trigger full eligible fallback", async (t) => {
  const f = await fixture(t, {
    ranker: async () => ({ anyFit: 1, scores: { unknown: 3 } }),
  });
  f.enable();
  const r = await f.req("/api/recommend", "POST", { description: "Aprender" });
  assert.equal(r.body.mode, "fallback");
  assert.equal(r.body.engines.length, 4);
});
test("C13 description boundaries are enforced", async (t) => {
  const f = await fixture(t);
  for (const description of ["", " ", "a".repeat(2001), 42])
    assert.equal(
      (await f.req("/api/recommend", "POST", { description })).status,
      400,
    );
  for (const description of ["a", "a".repeat(2000)])
    assert.equal(
      (await f.req("/api/recommend", "POST", { description })).status,
      200,
    );
});
test("C15 launch rechecks release and health", async (t) => {
  let healthy = true;
  const f = await fixture(t, { checker: async () => healthy });
  f.enable(1);
  assert.equal((await f.req(`/api/launch/${ids[0]}`, "POST", {})).status, 200);
  healthy = false;
  assert.equal((await f.req(`/api/launch/${ids[0]}`, "POST", {})).status, 409);
  healthy = true;
  f.store.update(ids[0], false, 1);
  assert.equal((await f.req(`/api/launch/${ids[0]}`, "POST", {})).status, 409);
});
test("C17 public origin configuration has no loopback dependency", async (t) => {
  const f = await fixture(t);
  assert.equal(
    (await f.req("/api/recommend", "POST", { description: "Aprender" })).status,
    200,
  );
});
test("C18 provider failure shows all available engines", async (t) => {
  const f = await fixture(t, {
    ranker: async () => {
      throw Error("failure");
    },
  });
  f.enable();
  const r = await f.req("/api/recommend", "POST", { description: "Aprender" });
  assert.equal(r.body.mode, "fallback");
  assert.equal(r.body.engines.length, 4);
});
test("C19 zero available engines returns empty with no links", async (t) => {
  const f = await fixture(t, {
    ranker: () => assert.fail("must not call model"),
  });
  const r = await f.req("/api/recommend", "POST", { description: "Aprender" });
  assert.equal(r.body.mode, "empty");
  assert.deepEqual(r.body.engines, []);
});
test("C20 storage error is not reported as empty", async (t) => {
  const f = await fixture(t);
  f.store.close();
  assert.equal((await f.req("/api/engines")).status, 503);
});
test("C25 session expiry logout and rate limits are enforced", async (t) => {
  const f = await fixture(t);
  await f.login();
  assert.equal((await f.req("/api/session", "DELETE", {})).status, 200);
  assert.equal((await f.req("/api/admin/engines")).status, 401);
  await f.login();
  f.clock(8 * 3600 * 1000 + 1);
  assert.equal((await f.req("/api/admin/engines")).status, 401);
  for (let i = 0; i < 10; i++)
    assert.equal(
      (await f.req("/api/recommend", "POST", { description: "a" })).status,
      200,
    );
  assert.equal(
    (await f.req("/api/recommend", "POST", { description: "a" })).status,
    429,
  );
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await f.req("/api/session", "POST", { password: "wrong" })).status,
      401,
    );
  assert.equal(
    (await f.req("/api/session", "POST", { password: "wrong" })).status,
    429,
  );
});

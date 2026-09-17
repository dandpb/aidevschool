import test from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { once } from "node:events";
import { createApp } from "../server/app.mjs";
import { createStore } from "../server/store.mjs";
import { CATALOG } from "../server/catalog.mjs";

test("delayed request bodies cannot exceed global inference admission", async () => {
  const store = createStore(":memory:");
  const id = CATALOG[0].id;
  store.setEnabled(id, true, 0);
  let active = 0;
  let peak = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const server = createApp({
    store,
    targets: { [id]: { url: "https://example.org", readySelector: "button" } },
    checker: async () => true,
    ranker: async () => {
      peak = Math.max(peak, ++active);
      await gate;
      active--;
      return { anyFit: 1, scores: { [id]: 3 } };
    },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    let headersSeen = 0;
    let allHeadersArrived;
    const allHeaders = new Promise((resolve) => {
      allHeadersArrived = resolve;
    });
    server.on("request", () => {
      if (++headersSeen === 9) allHeadersArrived();
    });
    const payload = JSON.stringify({ description: "Quero praticar IA" });
    const pending = Array.from({ length: 9 }, () => {
      let req;
      const response = new Promise((resolve, reject) => {
        req = request(
          `${origin}/api/recommend`,
          {
            method: "POST",
            headers: {
              Origin: origin,
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(payload),
            },
          },
          (res) => {
            res.resume();
            res.on("end", () => resolve(res.statusCode));
          },
        );
        req.on("error", reject);
      });
      req.flushHeaders();
      return { req, response };
    });
    await allHeaders;
    for (const { req } of pending) req.end(payload);
    await new Promise((resolve) => setTimeout(resolve, 100));
    release();
    const statuses = await Promise.all(pending.map(({ response }) => response));
    assert.equal(peak, 8);
    assert.equal(statuses.filter((status) => status === 429).length, 1);
    assert.equal(statuses.filter((status) => status === 200).length, 8);
  } finally {
    release();
    await new Promise((resolve) => server.close(resolve));
    store.close();
  }
});

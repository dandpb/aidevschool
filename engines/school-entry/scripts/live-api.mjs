import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRuntime } from "../server/runtime.mjs";
import { CATALOG } from "../server/catalog.mjs";
if (!process.env.TYPESAFE_API_KEY) throw Error("TYPESAFE_API_KEY required");
const dir = mkdtempSync(join(tmpdir(), "school-entry-live-"));
const events = [];
const targets = Object.fromEntries(
  CATALOG.map((e) => [
    e.id,
    { url: `https://${e.id.toLowerCase()}.example`, readySelector: "button" },
  ]),
);
const server = createRuntime(
  {
    ...process.env,
    NODE_ENV: "test",
    DATA_DIR: dir,
    BASE_URL: "http://127.0.0.1:5185",
  },
  { targets, checker: async () => true, logger: (event) => events.push(event) },
);
try {
  for (const e of CATALOG) server.runtime.store.update(e.id, true, 0);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  for (const description of [
    "Sou iniciante e quero entender inteligência artificial sem programar.",
    "Quero explorar conceitos de sistemas com simulações 3D.",
  ]) {
    const start = Date.now();
    const r = await fetch(
      `http://127.0.0.1:${server.address().port}/api/recommend`,
      {
        method: "POST",
        headers: {
          Origin: "http://127.0.0.1:5185",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description }),
      },
    );
    const result = await r.json();
    assert.equal(r.status, 200);
    assert.equal(result.mode, "recommended");
    assert.ok(result.engines.length > 0 && result.engines.length <= 3);
    console.log(
      JSON.stringify({
        test: "C26",
        syntheticEligibility: true,
        liveEngineAvailabilityProven: false,
        durationMs: Date.now() - start,
        candidateIds: CATALOG.map((e) => e.id),
        result,
      }),
    );
  }
  assert.equal(events.filter((e) => e.event === "model").length, 2);
  console.log(JSON.stringify({ events }));
} finally {
  await new Promise((r) => server.close(r));
  await server.closeResources();
  rmSync(dir, { recursive: true, force: true });
}

// AID-947 root-cause repro (kept as evidence).
// Pre-fix output (captured 2026-09-06, commit 65d64bca tree) is in
// repro-rootcause-output-prefix.txt: the bare `@netlify/blobs` import
// rejected with ERR_MODULE_NOT_FOUND AND the deployed default export
// appended duplicate lines for identical batches (ephemeral /tmp NDJSON).
// Post-fix this script demonstrates the LOCAL contract: without a Blobs
// runtime context the default export still uses the append-only NDJSON
// fallback — which is exactly why production must ship the dependency and
// why the durable path is proven separately by
// learner/gate/analytics/verify_deployed_blobs.mjs (real local Blobs server).
import { rm } from "node:fs/promises";
const mod = await import("../../../learner/gate/netlify-functions/dojo-analytics-collector.mjs");

await rm("/tmp/dojo-analytics-collector", { recursive: true, force: true });
const batch = () => JSON.stringify({ schemaVersion: 2, source: "literacydojo", events: [{
  schemaVersion: 2, source: "literacydojo", event: "entry_viewed",
  eventId: "0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0",
  sessionId: "0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0",
  occurredAt: new Date().toISOString(), contentVersion: "repro-a947", props: {},
}]});
const post = () => new Request("https://live.example/__dojo/bridge/v1/analytics", {
  method: "POST",
  headers: { "content-type": "application/json", "sec-fetch-site": "same-origin" },
  body: batch(),
});
const fs = await import("node:fs/promises");
const day = new Date().toISOString().slice(0, 10);
const sinkFile = `/tmp/dojo-analytics-collector/events-${day}.ndjson`;
const count = async () => (await fs.readFile(sinkFile, "utf8").catch(() => "")).trim().split("\n").filter(Boolean).length;
const first = await mod.default(post());
const linesAfterFirst = await count();
const second = await mod.default(post());
const linesAfterSecond = await count();
console.log("deployed-default POST #1:", first.status, "| POST #2:", second.status);
console.log(`/tmp NDJSON lines after POST #1: ${linesAfterFirst} | after identical POST #2: ${linesAfterSecond}`);
console.log("no runtime Blobs context -> NDJSON fallback (append-only, duplicates BY DESIGN locally).");
console.log("durable+idempotent path (1 line after duplicate POSTs): verify_deployed_blobs.mjs / CI step AID-947.");

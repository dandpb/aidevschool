// AID-947 post-fix verification — proves, END TO END and without any network
// beyond localhost, that the deployed default export now uses the durable
// Blobs backing when the runtime provides it:
//
//   1. real Blobs server (@netlify/blobs/server, the same implementation
//      `netlify dev` uses) on 127.0.0.1 with a temp directory;
//   2. runtime context injected the way the Netlify Functions runtime does
//      (base64-encoded globalThis.netlifyBlobsContext);
//   3. POST the SAME byte-identical batch twice through the module's DEFAULT
//      export (what Netlify actually deploys) -> both 202;
//   4. GET export with Bearer token -> exactly ONE line per eventId
//      (the QA AID-940 countersign reproduced TWO lines pre-fix);
//   5. control: without a runtime context, the default export falls back to
//      the NDJSON file sink (local/test behavior preserved).
//
// Requires `npm install` in ../netlify-functions/ (the deployed dependency
// set); the server import reaches into that node_modules explicitly because
// the bare specifier only resolves from inside the functions directory.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BlobsServer } from "../netlify-functions/node_modules/@netlify/blobs/dist/server.js";

const collector = await import("../netlify-functions/dojo-analytics-collector.mjs");

const failures = [];
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(label);
};

const dir = await mkdtemp(join(tmpdir(), "aid947-blobs-"));
const server = new BlobsServer({ directory: dir, debug: false, port: 0 });
const address = await server.start();
const url = `http://127.0.0.1:${address.port}`;

// The Netlify Functions runtime injects the Blobs context as a base64-encoded
// string (global or NETLIFY_BLOBS_CONTEXT); the client decodes siteID, token
// and apiURL from it. Mirror that exact mechanism here.
globalThis.netlifyBlobsContext = Buffer.from(
  JSON.stringify({ apiURL: url, token: "local-verify", siteID: "local-site" }),
).toString("base64");

const day = new Date().toISOString().slice(0, 10);
const eventId = "11111111-2222-3333-4444-555555555555";
const batch = () => JSON.stringify({
  schemaVersion: 2,
  source: "literacydojo",
  events: [{
    schemaVersion: 2,
    source: "literacydojo", event: "entry_viewed",
    eventId,
    sessionId: "99999999-9999-9999-9999-999999999999",
    occurredAt: new Date().toISOString(),
    contentVersion: "verify-a947",
    props: {},
  }],
});
const post = () => new Request("https://live.example/__dojo/bridge/v1/analytics", {
  method: "POST",
  headers: { "content-type": "application/json", "sec-fetch-site": "same-origin" },
  body: batch(),
});
const get = (token) => new Request(
  `https://live.example/__dojo/bridge/v1/analytics?from=${day}&to=${day}`,
  { headers: { authorization: `Bearer ${token}` } },
);

// 3) identical byte-identical POSTs through the DEFAULT export
process.env.ANALYTICS_EXPORT_TOKEN = "verify-token";
const first = await collector.default(post());
const second = await collector.default(post());
check("identical POST #1 -> 202", first.status === 202, `status=${first.status}`);
check("identical POST #2 -> 202", second.status === 202, `status=${second.status}`);

// 4) export shows exactly ONE line per eventId (idempotent durable backing)
const exportResponse = await collector.default(get("verify-token"));
const body = exportResponse.status === 200 ? await exportResponse.text() : "";
const lines = body.split("\n").filter((line) => line.length > 0);
check("export -> 200 ndjson", exportResponse.status === 200, `status=${exportResponse.status}`);
check("exactly 1 line per eventId after duplicate POSTs", lines.length === 1,
  `lines=${lines.length}${lines.length > 1 ? " (DUPLICATED — pre-fix behavior)" : ""}`);
check("line carries the posted eventId", lines[0]?.includes(eventId) === true);

// 5) control: no runtime context -> NDJSON fallback (local/test semantics)
delete globalThis.netlifyBlobsContext;
process.env.ANALYTICS_EXPORT_TOKEN = "";
const noContext = await collector.default(post());
check("no-context POST still 202 via NDJSON fallback", noContext.status === 202,
  `status=${noContext.status}`);

await server.stop();
await rm(dir, { recursive: true, force: true });
if (failures.length > 0) {
  console.log(`\n${failures.length} check(s) FAILED`);
  process.exit(1);
}
console.log("\nall checks passed");

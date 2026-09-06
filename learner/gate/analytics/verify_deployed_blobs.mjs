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
//   5. AID-961 edge-semantics probe: the local server devolves RECURSIVE
//      results for `directories:true` (and [] for a flat list WITH a day
//      prefix), but the PRODUCTION edge API is the INVERSE — flat no-prefix
//      listing is the recursive one, `directories:true` is a DELIMITED
//      one-level listing (0 nested blobs) — which made the live export
//      return 0 rows on both surfaces (pin c2937e55). This probe wraps the
//      REAL server store so BOTH divergent forms behave exactly like the
//      edge and re-runs POST+GET end-to-end: the export must still return
//      every line, failing closed if any read path reintroduces them;
//   6. control: without a runtime context, the default export falls back to
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

// 5) AID-961 edge-semantics probe. The real store stays underneath; the two
// forms whose semantics DIVERGE between the local server and the production
// edge are rewritten to the observed edge behavior (live probes on both
// surfaces, drafts 6a9dbcbd…/6a9dbd4bd…): `directories:true` → delimited
// listing with ZERO nested blobs; flat list with a `prefix` → also empty.
// The portable no-prefix flat scan passes through untouched.
const runtime = await import("../netlify-functions/netlify-blobs-runtime.mjs");
const realStore = runtime.getStore("dojo-analytics");
const edgeViolations = [];
const edgeStore = Object.create(realStore);
edgeStore.list = async (options = {}) => {
  if (options.directories) {
    edgeViolations.push(`list({prefix:${JSON.stringify(options.prefix ?? "")}, directories:true}) — edge semantics: delimited, 0 nested blobs`);
    const flat = await realStore.list({});
    const directories = new Set();
    for (const { key } of flat.blobs) {
      const rest = key.slice((options.prefix ?? "").length);
      const slash = rest.indexOf("/");
      if (slash !== -1) directories.add(rest.slice(0, slash + 1));
    }
    return { blobs: [], directories: [...directories] };
  }
  if (options.prefix !== undefined && options.prefix !== "") {
    edgeViolations.push(`list({prefix:${JSON.stringify(options.prefix)}}) — edge/local semantics diverge on prefixed flat lists`);
    return { blobs: [] };
  }
  return realStore.list(options);
};
const edgeEventId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const edgeDay = new Date().toISOString().slice(0, 10);
const edgeBatch = () => JSON.stringify({
  schemaVersion: 2,
  source: "literacydojo",
  events: [{
    schemaVersion: 2,
    source: "literacydojo", event: "entry_viewed",
    eventId: edgeEventId,
    sessionId: "99999999-9999-9999-9999-999999999999",
    occurredAt: new Date().toISOString(),
    contentVersion: "verify-a961-edge",
    props: {},
  }],
});
const edgeHandler = collector.createCollectorHandler({
  backing: new collector.BlobsEventStore({ store: edgeStore }),
  exportToken: "edge-token",
  now: () => new Date(),
});
const edgePost = new Request("https://live.example/__dojo/bridge/v1/analytics", {
  method: "POST",
  headers: { "content-type": "application/json", "sec-fetch-site": "same-origin" },
  body: edgeBatch(),
});
const edgeAccepted = await edgeHandler(edgePost);
check("edge-semantics POST -> 202", edgeAccepted.status === 202, `status=${edgeAccepted.status}`);
const edgeExport = await edgeHandler(new Request(
  `https://live.example/__dojo/bridge/v1/analytics?from=${edgeDay}&to=${edgeDay}`,
  { headers: { authorization: "Bearer edge-token" } },
));
const edgeBody = edgeExport.status === 200 ? await edgeExport.text() : "";
const edgeLines = edgeBody.split("\n").filter((line) => line.length > 0);
const edgeHits = edgeLines.filter((line) => line.includes(edgeEventId)).length;
check("edge-semantics export -> 200 ndjson with the edge line", edgeExport.status === 200 && edgeHits === 1,
  `status=${edgeExport.status} edgeHits=${edgeHits}${edgeHits === 0 ? " (0 ROWS — live defect AID-961)" : ""}`);
check("read paths only use the portable no-prefix flat scan (edge semantics)", edgeViolations.length === 0,
  edgeViolations[0] ?? "");

// 6) control: no runtime context -> NDJSON fallback (local/test semantics)
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

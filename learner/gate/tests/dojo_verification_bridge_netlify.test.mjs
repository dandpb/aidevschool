import assert from "node:assert/strict";
import test from "node:test";
import handler, { verifyWarehouse } from "../netlify-functions/dojo-verification-bridge.mjs";

const predictions = [
  ["key:8gl33c:0", 2], ["key:8ril9k:1", 4], ["key:a223ac:2", 2],
  ["key:9rd4jn:3", 3], ["key:e2j3i0:4", 2], ["key:8wbont:5", 5],
  ["key:1bn8kx:6", 0], ["key:8ruko7:7", 5], ["key:a1twjr:8", 5],
  ["key:7g40wq:9", 3], ["key:7xsz51:10", 1], ["key:dy7kps:11", 2],
].map(([key, shelf]) => ({ key, shelf }));

function record(pass = true, attemptId = "kv-warehouse-L1-attempt-1") {
  return {
    source: "voxeldojo", unit_id: "U2-key-value-store", project: "02_key_value_store",
    scenario_id: "kv-warehouse-L1", game: "KV WAREHOUSE", ts: "2026-08-26T00:00:00.000Z",
    attempt_id: attemptId,
    pass, metrics: {
      kind: "voxeldoj-kv-warehouse", shelf_predictions: 12,
      shelf_prediction_accuracy: pass ? 1 : 0.75,
    }, observations: pass ? { kind: "warehouse-L1", predictions } : {
      kind: "warehouse-L1",
      predictions: predictions.map((item, index) =>
        index < 3 ? { ...item, shelf: (item.shelf + 1) % 6 } : item),
    }, review_context: { verifier_required: true }, curriculum_context: {},
  };
}

test("WAREHOUSE retry changes FAIL to independently bound PASS", () => {
  const failed = verifyWarehouse(record(false));
  const passed = verifyWarehouse(record(true, "kv-warehouse-L1-attempt-2"));
  assert.equal(failed.verdict, "FAIL");
  assert.equal(passed.verdict, "PASS");
  assert.equal(failed.attempt_id, "kv-warehouse-L1-attempt-1");
  assert.equal(passed.attempt_id, "kv-warehouse-L1-attempt-2");
  assert.match(passed.evidence_digest, /^[a-f0-9]{64}$/);
  assert.notEqual(failed.evidence_digest, passed.evidence_digest);
  assert.equal(passed.canonical_gate_status, "not-submitted");
});

test("publishes same-origin session JSON instead of SPA HTML", async () => {
  const response = await handler(new Request("https://example.test/.netlify/functions/dojo-verification-bridge", {
    headers: { "sec-fetch-site": "same-origin", "x-nf-original-path": "/__dojo/bridge/v1/session" },
  }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.equal(typeof (await response.json()).token, "string");
});

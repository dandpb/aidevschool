import { createHash, timingSafeEqual } from "node:crypto";

const SESSION_PATH = "/__dojo/bridge/v1/session";
const VERIFICATION_PATH = "/__dojo/bridge/v1/verification";
const TOKEN = createHash("sha256").update(`aidevschool:${process.env.SITE_ID ?? "local"}`).digest("base64url");
const EXPECTED_KEYS = [
  ["key:8gl33c:0", 2], ["key:8ril9k:1", 4], ["key:a223ac:2", 2],
  ["key:9rd4jn:3", 3], ["key:e2j3i0:4", 2], ["key:8wbont:5", 5],
  ["key:1bn8kx:6", 0], ["key:8ruko7:7", 5], ["key:a1twjr:8", 5],
  ["key:7g40wq:9", 3], ["key:7xsz51:10", 1], ["key:dy7kps:11", 2],
];

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extra },
  });
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(record) {
  const { ts: _timestamp, verifier: _verifier, ...payload } = record;
  return createHash("sha256").update(stable(payload)).digest("hex");
}

function tokenMatches(received) {
  const left = Buffer.from(received ?? "");
  const right = Buffer.from(TOKEN);
  return left.length === right.length && timingSafeEqual(left, right);
}

function verifyWarehouse(record) {
  const errors = [];
  if (record?.source !== "voxeldojo" || record?.unit_id !== "U2-key-value-store"
    || record?.project !== "02_key_value_store" || record?.game !== "KV WAREHOUSE"
    || record?.scenario_id !== "kv-warehouse-L1"
    || typeof record?.attempt_id !== "string" || record.attempt_id.trim() === ""
    || record?.review_context?.verifier_required !== true) {
    errors.push("evidence identity is not the fixed WAREHOUSE L1 verifier contract");
  }
  const predictions = record?.observations?.kind === "warehouse-L1"
    && Array.isArray(record?.observations?.predictions) ? record.observations.predictions : [];
  const traceClosed = predictions.length === EXPECTED_KEYS.length && predictions.every((item, index) => {
    const [key] = EXPECTED_KEYS[index];
    return item && Object.keys(item).sort().join(",") === "key,shelf"
      && item.key === key && Number.isInteger(item.shelf);
  });
  if (!traceClosed) errors.push("observations do not match the closed L1 scenario trace");
  const correct = traceClosed
    ? predictions.filter((item, index) => item.shelf === EXPECTED_KEYS[index][1]).length : 0;
  const accuracy = Math.round((correct / EXPECTED_KEYS.length) * 100) / 100;
  const expectedMetrics = { kind: "voxeldoj-kv-warehouse", shelf_predictions: 12, shelf_prediction_accuracy: accuracy };
  if (stable(record?.metrics) !== stable(expectedMetrics)) {
    errors.push("producer metrics disagree with independently recomputed observations");
  }
  const independentPass = traceClosed && accuracy >= 0.8;
  if (typeof record?.pass === "boolean" && record.pass !== independentPass) {
    errors.push("producer pass claim disagrees with the fixed independent evaluator");
  }
  const passed = independentPass && errors.length === 0;
  return {
    schema_version: 1, verdict: passed ? "PASS" : "FAIL", context_isolated: true,
    source: "independent-teaching-game-verifier", evidence_digest: digest(record ?? {}),
    unit_id: String(record?.unit_id ?? ""), project: String(record?.project ?? ""),
    scenario_id: String(record?.scenario_id ?? ""), game: String(record?.game ?? ""),
    attempt_id: String(record?.attempt_id ?? ""),
    producer_pass_claim: typeof record?.pass === "boolean" ? record.pass : null,
    independent_pass: passed, errors, producer_writes_mastered: false,
    max_producer_claim: "completed", canonical_gate_status: "not-submitted",
    canonical_gate_reason: "learner-attempt-and-gate-eligibility-required",
  };
}

export default async (request) => {
  const originalPath = request.headers.get("x-nf-original-path");
  const pathname = originalPath || new URL(request.url).pathname;
  const sameOrigin = request.headers.get("sec-fetch-site") === "same-origin";
  if (!sameOrigin) return json({ error: "origin-forbidden" }, 403);
  if (pathname === SESSION_PATH) {
    if (request.method !== "GET") return json({ error: "method-not-allowed" }, 405, { allow: "GET" });
    return json({ token: TOKEN }, 200, { "cross-origin-resource-policy": "same-origin" });
  }
  if (pathname !== VERIFICATION_PATH) return json({ error: "not-found" }, 404);
  if (request.method !== "POST") return json({ error: "method-not-allowed" }, 405, { allow: "POST" });
  if (!tokenMatches(request.headers.get("x-codexdojo-bridge-token"))) return json({ error: "unauthorized" }, 401);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 65_536) return json({ error: "payload-too-large" }, 413);
  let input;
  try { input = JSON.parse(raw); } catch { return json({ error: "invalid-json" }, 400); }
  if (input?.schemaId !== "teaching-game-evidence" || input?.schemaVersion !== 1
    || !input.record || typeof input.record !== "object" || Array.isArray(input.record)) {
    return json({ error: "unsupported-schema" }, 422);
  }
  return json({ receipt: verifyWarehouse(input.record) });
};

export { verifyWarehouse };

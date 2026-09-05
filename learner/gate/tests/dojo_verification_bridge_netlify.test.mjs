import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import handler, {
  verifyLiteracyEvidence,
  verifyTeachingGameEvidence,
} from "../netlify-functions/dojo-verification-bridge.mjs";

const PRODUCER_PAYLOADS = JSON.parse(readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "fixtures", "teaching_game_producer_payloads.json"),
  "utf8",
));

const LITERACY_PAYLOADS = JSON.parse(readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "fixtures", "literacy_producer_payloads.json"),
  "utf8",
)).records;

const L1 = [
  ["key:8gl33c:0", 2], ["key:8ril9k:1", 4], ["key:a223ac:2", 2],
  ["key:9rd4jn:3", 3], ["key:e2j3i0:4", 2], ["key:8wbont:5", 5],
  ["key:1bn8kx:6", 0], ["key:8ruko7:7", 5], ["key:a1twjr:8", 5],
  ["key:7g40wq:9", 3], ["key:7xsz51:10", 1], ["key:dy7kps:11", 2],
];
const L2_KEYS = [
  "key:aa8soc:0", "key:3wxzra:1", "key:3q2dy3:2", "key:3e8o2g:3",
  "key:6121p0:4", "key:eu4mct:5", "key:7d5v1n:6", "key:b4u2g8:7",
  "key:cbeik6:8", "key:9u4i7:9",
];
const L3_KEYS = [
  "key:93ww4u:0", "key:c89yjl:1", "key:a96j6j:2", "key:9rgfr:3",
  "key:7dunha:4", "key:djkdb9:5", "key:4eecb0:6", "key:9sjdhc:7",
  "key:d2dauv:8", "key:fx6tp8:9",
];

function levelPayload(level, passed = true) {
  if (level === "L1") {
    const predictions = L1.map(([key, shelf]) => ({ key, shelf }));
    if (!passed) {
      predictions[0].shelf = (predictions[0].shelf + 1) % 6;
      predictions[1].shelf = (predictions[1].shelf + 1) % 6;
      predictions[2].shelf = (predictions[2].shelf + 1) % 6;
    }
    const correct = passed ? 12 : 9;
    return [
      { kind: "warehouse-L1", predictions },
      {
        kind: "voxeldoj-kv-warehouse",
        shelf_predictions: 12,
        shelf_prediction_accuracy: correct / 12,
      },
    ];
  }
  if (level === "L2") {
    const probes = L2_KEYS.map((key) => ({ key, predictedAlive: true }));
    if (!passed) probes[0].predictedAlive = false;
    return [
      { kind: "warehouse-L2", probes },
      {
        kind: "voxeldoj-kv-warehouse",
        crud_probes: 10,
        crud_accuracy: passed ? 1 : 0.9,
      },
    ];
  }
  if (level === "L3") {
    const probes = L3_KEYS.map((key) => ({ key, predictedAlive: false }));
    return [
      { kind: "warehouse-L3", probes, predictedSwept: passed ? 10 : 9 },
      {
        kind: "voxeldoj-kv-warehouse",
        ttl_probes: 10,
        ttl_accuracy: 1,
        expired_swept: 10,
        swept_prediction_ok: passed,
      },
    ];
  }
  return [
    { kind: "warehouse-L4", hashStrength: passed ? "full" : 1 },
    {
      kind: "voxeldoj-kv-warehouse",
      load_skew: passed ? 1.51 : 5.63,
      hash_strength: passed ? -1 : 1,
    },
  ];
}

function makeWarehouseRecord(level = "L1", passed = true, overrides = {}) {
  const [observations, metrics] = levelPayload(level, passed);
  return {
    source: "voxeldojo",
    unit_id: "U2-key-value-store",
    project: "02_key_value_store",
    scenario_id: `kv-warehouse-${level}`,
    game: "KV WAREHOUSE",
    ts: "2026-07-25T12:00:00.000Z",
    attempt_id: `kv-warehouse-${level}-attempt-1`,
    pass: passed,
    metrics,
    observations,
    review_context: {
      unit_kind: "concept",
      scheduled_review: false,
      review_reason: "deepening",
      scheduler_source: "learner-substrate",
      verifier_required: true,
    },
    curriculum_context: {
      concept: "hash-map-backed CRUD with TTL expiration",
      mechanic: "warehouse shelves + decaying crates",
    },
    ...overrides,
  };
}

const IDENTITIES = {
  WORMHOLE: { unit_id: "U3-url-shortener", project: "03_url_shortener", scenario: "wormhole" },
  "RELAY STATION": { unit_id: "U5-websocket-chat", project: "05_websocket_chat", scenario: "relay-station" },
  "PIPELINE PLANT": { unit_id: "U6-file-upload", project: "06_file_upload_pipeline", scenario: "pipeline-plant" },
  "CHECKPOINT CITY": { unit_id: "U7-rest-api-auth", project: "07_rest_api_auth", scenario: "checkpoint-city" },
  "TIMELINE TOWER": { unit_id: "U8-event-driven", project: "08_event_driven_order_system", scenario: "timeline-tower" },
  "DOCKING BAY": { unit_id: "U9-plugin-system", project: "09_plugin_system", scenario: "docking-bay" },
};

function makeTeachingGameRecord(game, level = "L1", overrides = {}) {
  if (game === "KV WAREHOUSE") return makeWarehouseRecord(level, true, overrides);
  const payload = structuredClone(PRODUCER_PAYLOADS[game][level]);
  const identity = IDENTITIES[game];
  return makeWarehouseRecord(level, true, {
    observations: payload.observations,
    metrics: payload.metrics,
    game,
    unit_id: identity.unit_id,
    project: identity.project,
    scenario_id: `${identity.scenario}-${level}`,
    attempt_id: `${identity.scenario}-${level}-attempt-1`,
    ...overrides,
  });
}

const SUPPORTED_GAMES = ["KV WAREHOUSE", "WORMHOLE", "RELAY STATION", "PIPELINE PLANT", "CHECKPOINT CITY", "TIMELINE TOWER", "DOCKING BAY"];
const SUPPORTED_CASES = SUPPORTED_GAMES
  .flatMap((game) => ["L1", "L2", "L3", "L4"].map((level) => [game, level]));

test("staged bridge recomputes each official payload across the 7-game x L1-L4 matrix", () => {
  for (const [game, level] of SUPPORTED_CASES) {
    const receipt = verifyTeachingGameEvidence(makeTeachingGameRecord(game, level));
    assert.equal(receipt.verdict, "PASS", `${game} ${level}`);
    assert.equal(receipt.source, "independent-teaching-game-verifier");
    assert.equal(receipt.independent_pass, true);
    assert.match(receipt.evidence_digest, /^[a-f0-9]{64}$/);
    assert.equal(receipt.canonical_gate_status, "not-submitted");
    assert.equal(receipt.producer_writes_mastered, false);
    assert.equal(receipt.game, game);
    assert.equal(receipt.scenario_id, receipt.scenario_id);
    assert.deepEqual(receipt.errors, []);
  }
});

test("hosted records without attempt_id verify PASS and the receipt omits attempt_id (AID-448)", () => {
  for (const game of SUPPORTED_GAMES) {
    const record = makeTeachingGameRecord(game, "L1");
    delete record.attempt_id;
    const receipt = verifyTeachingGameEvidence(record);
    assert.equal(receipt.verdict, "PASS", game);
    assert.equal(receipt.errors.length, 0, game);
    assert.ok(!("attempt_id" in receipt), `${game} receipt must not mint an attempt_id`);
  }
});

test("WAREHOUSE retry changes FAIL to independently bound PASS", () => {
  const failed = verifyTeachingGameEvidence(makeWarehouseRecord("L1", false, { attempt_id: "kv-warehouse-L1-attempt-1" }));
  const passed = verifyTeachingGameEvidence(makeWarehouseRecord("L1", true, { attempt_id: "kv-warehouse-L1-attempt-2" }));
  assert.equal(failed.verdict, "FAIL");
  assert.equal(passed.verdict, "PASS");
  assert.equal(failed.attempt_id, "kv-warehouse-L1-attempt-1");
  assert.equal(passed.attempt_id, "kv-warehouse-L1-attempt-2");
  assert.match(passed.evidence_digest, /^[a-f0-9]{64}$/);
  assert.notEqual(failed.evidence_digest, passed.evidence_digest);
  assert.equal(passed.canonical_gate_status, "not-submitted");
});

test("each complete failing WAREHOUSE level stays an honest FAIL without errors", () => {
  for (const level of ["L1", "L2", "L3", "L4"]) {
    const receipt = verifyTeachingGameEvidence(makeWarehouseRecord(level, false));
    assert.equal(receipt.verdict, "FAIL", level);
    assert.equal(receipt.producer_pass_claim, false);
    assert.deepEqual(receipt.errors, []);
  }
});

test("rejects favorable aggregate without observations for every game", () => {
  for (const game of SUPPORTED_GAMES) {
    const record = makeTeachingGameRecord(game);
    delete record.observations;
    const receipt = verifyTeachingGameEvidence(record);
    assert.equal(receipt.verdict, "FAIL", game);
    assert.ok(receipt.errors.some((error) => error.includes("observations")), game);
  }
});

test("rejects forged metrics and pass claims for every game", () => {
  for (const game of SUPPORTED_GAMES) {
    const metrics = makeTeachingGameRecord(game);
    metrics.metrics = { kind: "forged" };
    const passClaim = makeTeachingGameRecord(game);
    passClaim.pass = false;
    assert.equal(verifyTeachingGameEvidence(metrics).verdict, "FAIL", game);
    assert.equal(verifyTeachingGameEvidence(passClaim).verdict, "FAIL", game);
  }
});

test("rejects trace or producer disagreement mutations", () => {
  const mutations = {
    truncated: (record) => record.observations.predictions.pop(),
    extra: (record) => record.observations.predictions.push({ key: "extra", shelf: 0 }),
    altered: (record) => { record.observations.predictions[0].key = "altered"; },
    metrics: (record) => { record.metrics.shelf_prediction_accuracy = 0.99; },
    pass: (record) => { record.pass = false; },
  };
  for (const [name, mutate] of Object.entries(mutations)) {
    const record = makeWarehouseRecord("L1");
    mutate(record);
    const receipt = verifyTeachingGameEvidence(record);
    assert.equal(receipt.verdict, "FAIL", name);
    assert.ok(receipt.errors.length > 0, name);
  }
});

test("rejects other projects and embedded verifiers", () => {
  const receipt = verifyTeachingGameEvidence(makeWarehouseRecord("L1", true, {
    project: "03_url_shortener",
    verifier: { verdict: "PASS" },
  }));
  assert.equal(receipt.verdict, "FAIL");
  assert.ok(receipt.errors.some((error) => error.includes("project")));
  assert.ok(receipt.errors.some((error) => error.includes("verifier")));
});

test("rejects unknown game and nonclosed record", () => {
  const receipt = verifyTeachingGameEvidence(makeWarehouseRecord("L1", true, { game: "UNKNOWN", extra: true }));
  assert.equal(receipt.verdict, "FAIL");
  assert.ok(receipt.errors.includes("game is not supported"));
  assert.ok(receipt.errors.some((error) => error.includes("unknown fields: extra")));
});

test("rejects malformed or timezone-naive timestamps", () => {
  for (const ts of ["not-a-timestamp", "2026-07-25T12:00:00"]) {
    const receipt = verifyTeachingGameEvidence(makeWarehouseRecord("L1", true, { ts }));
    assert.equal(receipt.verdict, "FAIL", ts);
    assert.ok(receipt.errors.some((error) => error.includes("timezone-aware")), ts);
  }
});

test("publishes same-origin session JSON instead of SPA HTML", async () => {
  const response = await handler(new Request("https://example.test/.netlify/functions/dojo-verification-bridge", {
    headers: { "sec-fetch-site": "same-origin", "x-nf-original-path": "/__dojo/bridge/v1/session" },
  }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.equal(typeof (await response.json()).token, "string");
});

test("verification endpoint returns a bound receipt for a wormhole payload", async () => {
  const session = await (await handler(new Request("https://example.test/.netlify/functions/dojo-verification-bridge", {
    headers: { "sec-fetch-site": "same-origin", "x-nf-original-path": "/__dojo/bridge/v1/session" },
  }))).json();
  const record = makeTeachingGameRecord("WORMHOLE", "L3");
  const response = await handler(new Request("https://example.test/.netlify/functions/dojo-verification-bridge", {
    method: "POST",
    headers: {
      "sec-fetch-site": "same-origin",
      "x-nf-original-path": "/__dojo/bridge/v1/verification",
      "x-codexdojo-bridge-token": session.token,
    },
    body: JSON.stringify({ schemaId: "teaching-game-evidence", schemaVersion: 1, record }),
  }));
  assert.equal(response.status, 200);
  const { receipt } = await response.json();
  assert.equal(receipt.verdict, "PASS");
  assert.equal(receipt.game, "WORMHOLE");
  assert.equal(receipt.attempt_id, record.attempt_id);
});

test("verification endpoint omits attempt_id for a hosted wormhole record without one (AID-448)", async () => {
  const session = await (await handler(new Request("https://example.test/.netlify/functions/dojo-verification-bridge", {
    headers: { "sec-fetch-site": "same-origin", "x-nf-original-path": "/__dojo/bridge/v1/session" },
  }))).json();
  const record = makeTeachingGameRecord("WORMHOLE", "L1");
  delete record.attempt_id;
  const response = await handler(new Request("https://example.test/.netlify/functions/dojo-verification-bridge", {
    method: "POST",
    headers: {
      "sec-fetch-site": "same-origin",
      "x-nf-original-path": "/__dojo/bridge/v1/verification",
      "x-codexdojo-bridge-token": session.token,
    },
    body: JSON.stringify({ schemaId: "teaching-game-evidence", schemaVersion: 1, record }),
  }));
  assert.equal(response.status, 200);
  const { receipt } = await response.json();
  assert.equal(receipt.verdict, "PASS");
  assert.ok(!("attempt_id" in receipt));
});

// --- literacy staged verifier (AID-449) ---

const literacyRecords = [];
for (const [lessonId, activities] of Object.entries(LITERACY_PAYLOADS)) {
  for (const [activityId, variants] of Object.entries(activities)) {
    for (const [variant, record] of Object.entries(variants)) {
      literacyRecords.push({ label: `${lessonId}/${activityId}/${variant}`, variant, record });
    }
  }
}

const LITERACY_EDGE_CASES = [
  {
    label: "prompt_builder fails closed without free text",
    variant: "fail",
    record: {
      schemaVersion: 1,
      source: "literacydojo",
      attemptId: "att-l05-pb",
      lessonId: "l05",
      lessonVersion: 3,
      activityId: "l05-a1",
      activityType: "prompt_builder",
      skillIds: ["pedir"],
      deterministicChecks: { hash: "deadbeef" },
      score: 1,
      pass: true,
      timestamp: "2026-08-31T00:00:00.000Z",
      verifierRequired: true,
    },
  },
  {
    label: "unknown lesson",
    variant: "fail",
    record: {
      ...LITERACY_PAYLOADS.l02["l02-a1"].pass,
      lessonId: "l99",
      attemptId: "att-unknown-lesson",
    },
  },
  {
    label: "stale lessonVersion",
    variant: "fail",
    record: { ...LITERACY_PAYLOADS.l02["l02-a1"].pass, lessonVersion: 2 },
  },
  {
    label: "skillIds drift",
    variant: "fail",
    record: { ...LITERACY_PAYLOADS.l02["l02-a1"].pass, skillIds: ["entender"] },
  },
  {
    label: "forged score claim",
    variant: "fail",
    record: { ...LITERACY_PAYLOADS.l02["l02-a1"].fail, score: 1, pass: true },
  },
  {
    label: "unknown field",
    variant: "fail",
    record: { ...LITERACY_PAYLOADS.l02["l02-a1"].pass, verifier: { verdict: "PASS" } },
  },
  {
    label: "missing required field",
    variant: "fail",
    record: (() => { const copy = { ...LITERACY_PAYLOADS.l02["l02-a1"].pass }; delete copy.deterministicChecks; return copy; })(),
  },
  {
    label: "score out of range",
    variant: "fail",
    record: { ...LITERACY_PAYLOADS.l02["l02-a1"].pass, score: 1.5 },
  },
  {
    label: "invalid timestamp",
    variant: "fail",
    record: { ...LITERACY_PAYLOADS.l02["l02-a1"].pass, timestamp: "not-a-timestamp" },
  },
  {
    label: "naive timestamp accepted like the canonical verifier",
    variant: "pass",
    record: { ...LITERACY_PAYLOADS.l02["l02-a1"].pass, timestamp: "2026-08-31T12:00:00" },
  },
  {
    label: "invalid context",
    variant: "fail",
    record: { ...LITERACY_PAYLOADS.l02["l02-a1"].pass, context: "retake" },
  },
  {
    label: "answer with two discriminators",
    variant: "fail",
    record: {
      ...LITERACY_PAYLOADS.l02["l02-a1"].pass,
      answer: { optionIds: ["opt-a"], orderedIds: ["opt-a"] },
    },
  },
  {
    label: "blank attemptId",
    variant: "fail",
    record: { ...LITERACY_PAYLOADS.l02["l02-a1"].pass, attemptId: " " },
  },
];

function canonicalLiteracyReceipts(records) {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const program = [
    "import json, sys",
    "from learner.gate.literacy_verifier import verify_literacy_evidence",
    "for line in sys.stdin:",
    "    receipt = verify_literacy_evidence(json.loads(line)).to_receipt_dict()",
    "    print(json.dumps(receipt, sort_keys=True))",
  ].join("\n");
  const result = spawnSync("python3", ["-c", program], {
    cwd: repoRoot,
    input: `${records.map((item) => JSON.stringify(item.record)).join("\n")}\n`,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(result.status, 0, `canonical verifier failed: ${result.stderr}`);
  return result.stdout.trim().split("\n").map((line) => JSON.parse(line));
}

test("staged literacy verifier matches the canonical Python verifier receipt-for-receipt (AID-449)", () => {
  const cases = [
    ...literacyRecords.map(({ label, record }) => ({ label, record })),
    ...LITERACY_EDGE_CASES.map(({ label, record }) => ({ label, record })),
  ];
  const canonical = canonicalLiteracyReceipts(cases);
  assert.equal(cases.length, canonical.length);
  for (let index = 0; index < cases.length; index += 1) {
    const staged = verifyLiteracyEvidence(cases[index].record);
    assert.deepEqual(staged, canonical[index], cases[index].label);
  }
});

test("staged literacy verifier recomputes every canonical activity across the 20 hosted lessons", () => {
  const byType = {};
  for (const { label, variant, record } of literacyRecords) {
    const receipt = verifyLiteracyEvidence(record);
    assert.equal(receipt.verdict, variant === "pass" ? "PASS" : "FAIL", label);
    assert.deepEqual(receipt.errors, [], label);
    assert.equal(receipt.source, "independent-literacy-verifier");
    assert.equal(receipt.lesson_id, record.lessonId, label);
    assert.equal(receipt.activity_id, record.activityId, label);
    assert.equal(receipt.attempt_id, record.attemptId, label);
    assert.equal(receipt.producer_pass_claim, record.pass, label);
    assert.equal(receipt.independent_pass, variant === "pass", label);
    assert.equal(receipt.mastery_eligible, variant === "pass", label);
    assert.equal(receipt.producer_writes_mastered, false, label);
    assert.match(receipt.evidence_digest, /^[a-f0-9]{64}$/, label);
    byType[record.activityType] = (byType[record.activityType] ?? 0) + 1;
  }
  for (const type of ["choice", "sort", "missing_context", "output_comparison", "safety_classification", "rubric_review"]) {
    assert.ok(byType[type] >= 2, `activity type ${type} must be covered`);
  }
});

test("staged literacy verifier fails closed on prompt_builder and drift without false approval", () => {
  const expectedFail = LITERACY_EDGE_CASES.filter(({ label }) => label !== "naive timestamp accepted like the canonical verifier");
  for (const { label, record } of expectedFail) {
    const receipt = verifyLiteracyEvidence(record);
    assert.equal(receipt.verdict, "FAIL", label);
    if (label === "prompt_builder fails closed without free text") {
      assert.ok(receipt.errors.some((error) => error.includes("prompt_builder")), label);
    }
    if (label.startsWith("forged") || label === "skillIds drift" || label === "stale lessonVersion") {
      assert.ok(receipt.errors.length > 0, label);
    }
  }
  const naive = verifyLiteracyEvidence(
    LITERACY_EDGE_CASES.find(({ label }) => label.startsWith("naive timestamp")).record,
  );
  assert.equal(naive.verdict, "PASS");
});

test("verification endpoint returns a bound literacy receipt (AID-449)", async () => {
  const session = await (await handler(new Request("https://example.test/.netlify/functions/dojo-verification-bridge", {
    headers: { "sec-fetch-site": "same-origin", "x-nf-original-path": "/__dojo/bridge/v1/session" },
  }))).json();
  const record = structuredClone(LITERACY_PAYLOADS.l02["l02-a1"].pass);
  const response = await handler(new Request("https://example.test/.netlify/functions/dojo-verification-bridge", {
    method: "POST",
    headers: {
      "sec-fetch-site": "same-origin",
      "x-nf-original-path": "/__dojo/bridge/v1/verification",
      "x-codexdojo-bridge-token": session.token,
    },
    body: JSON.stringify({ schemaId: "literacy-evidence", schemaVersion: 1, record }),
  }));
  assert.equal(response.status, 200);
  const { receipt } = await response.json();
  assert.equal(receipt.verdict, "PASS");
  assert.equal(receipt.source, "independent-literacy-verifier");
  assert.equal(receipt.attempt_id, record.attemptId);
  assert.equal(receipt.mastery_eligible, true);
  assert.equal(receipt.producer_writes_mastered, false);
});

test("verification endpoint still rejects unknown schemas with 422", async () => {
  const session = await (await handler(new Request("https://example.test/.netlify/functions/dojo-verification-bridge", {
    headers: { "sec-fetch-site": "same-origin", "x-nf-original-path": "/__dojo/bridge/v1/session" },
  }))).json();
  const response = await handler(new Request("https://example.test/.netlify/functions/dojo-verification-bridge", {
    method: "POST",
    headers: {
      "sec-fetch-site": "same-origin",
      "x-nf-original-path": "/__dojo/bridge/v1/verification",
      "x-codexdojo-bridge-token": session.token,
    },
    body: JSON.stringify({ schemaId: "literacy-evidence", schemaVersion: 2, record: {} }),
  }));
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error, "unsupported-schema");
});

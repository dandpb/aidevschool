import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  verifyTeachingGameEvidence,
  verifyLiteracyEvidence,
} from "../netlify-functions/dojo-verification-bridge.mjs";

// Identity-guard regressions for the staged bridge (AID-3717 key-coercion
// class, AID-3738 sweep): GAME_SPECS[record.game] coerced non-string keys
// (["KV WAREHOUSE"] -> PASS with a coerced receipt echo) and receipt echo
// String(record.<field>) threw TypeError for {toString: null} instead of
// returning a FAIL receipt. Every non-string identity key must fail closed
// with a receipt — never PASS via coercion and never throw. Parity anchor:
// teaching_game_bridge.py uses `GAME_SPECS.get(game) if isinstance(game, str)`.

const LITERACY_PAYLOADS = JSON.parse(readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "fixtures", "literacy_producer_payloads.json"),
  "utf8",
)).records;

function honestWarehouseRecord(overrides = {}) {
  const predictions = [
    ["key:8gl33c:0", 2], ["key:8ril9k:1", 4], ["key:a223ac:2", 2],
    ["key:9rd4jn:3", 3], ["key:e2j3i0:4", 2], ["key:8wbont:5", 5],
    ["key:1bn8kx:6", 0], ["key:8ruko7:7", 5], ["key:a1twjr:8", 5],
    ["key:7g40wq:9", 3], ["key:7xsz51:10", 1], ["key:dy7kps:11", 2],
  ].map(([key, shelf]) => ({ key, shelf }));
  return {
    source: "voxeldojo",
    unit_id: "U2-key-value-store",
    project: "02_key_value_store",
    scenario_id: "kv-warehouse-L1",
    game: "KV WAREHOUSE",
    ts: "2026-07-25T12:00:00.000Z",
    attempt_id: "kv-warehouse-L1-attempt-1",
    pass: true,
    metrics: {
      kind: "voxeldoj-kv-warehouse",
      shelf_predictions: 12,
      shelf_prediction_accuracy: 1,
    },
    observations: { kind: "warehouse-L1", predictions },
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

const honestLiteracyRecord = () => structuredClone(
  LITERACY_PAYLOADS.l02["l02-a1"].pass);

function assertFailClosedGame(result) {
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.independent_pass, false);
  assert.equal(result.errors[0], "game is not supported");
}

test("array game never passes via key coercion (was PASS with coerced receipt echo)", () => {
  const result = verifyTeachingGameEvidence(honestWarehouseRecord({ game: ["KV WAREHOUSE"] }));
  assertFailClosedGame(result);
});

test("nested array game never passes via key coercion", () => {
  assertFailClosedGame(verifyTeachingGameEvidence(honestWarehouseRecord({ game: [["KV WAREHOUSE"]] })));
});

test("object game with null toString returns a FAIL receipt instead of throwing", () => {
  assertFailClosedGame(verifyTeachingGameEvidence(honestWarehouseRecord({ game: { toString: null } })));
});

test("numeric, boolean, plain-object, and null game fail closed with receipts", () => {
  assertFailClosedGame(verifyTeachingGameEvidence(honestWarehouseRecord({ game: 123 })));
  assertFailClosedGame(verifyTeachingGameEvidence(honestWarehouseRecord({ game: true })));
  assertFailClosedGame(verifyTeachingGameEvidence(honestWarehouseRecord({ game: {} })));
  assertFailClosedGame(verifyTeachingGameEvidence(honestWarehouseRecord({ game: null })));
});

test("object unit_id with null toString returns a FAIL receipt instead of throwing", () => {
  const result = verifyTeachingGameEvidence(honestWarehouseRecord({ unit_id: { toString: null } }));
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.unit_id, "");
  assert.equal(result.errors[0], "unit_id must be 'U2-key-value-store'");
});

test("object project with null toString returns a FAIL receipt instead of throwing", () => {
  const result = verifyTeachingGameEvidence(honestWarehouseRecord({ project: { toString: null } }));
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.errors[0], "project must be '02_key_value_store'");
});

test("object scenario_id with null toString returns a FAIL receipt instead of throwing", () => {
  const result = verifyTeachingGameEvidence(honestWarehouseRecord({ scenario_id: { toString: null } }));
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.scenario_id, "");
  assert.equal(result.errors[0], "scenario_id is not a supported KV WAREHOUSE level");
});

test("object ts with null toString returns a FAIL receipt instead of throwing", () => {
  const result = verifyTeachingGameEvidence(honestWarehouseRecord({ ts: { toString: null } }));
  assert.equal(result.verdict, "FAIL");
  assert.match(result.errors[0], /^evidence ts '.+' is not a valid timezone-aware ISO-8601 timestamp$/);
});

test("array scenario_id still fails closed (typeof guard predates this sweep)", () => {
  const result = verifyTeachingGameEvidence(honestWarehouseRecord({ scenario_id: ["kv-warehouse-L1"] }));
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.errors[0], "scenario_id is not a supported KV WAREHOUSE level");
});

test("object game whose toString yields the valid game fails closed (sharpest coercion probe)", () => {
  const coercingGame = { toString: () => "KV WAREHOUSE" };
  const result = verifyTeachingGameEvidence(honestWarehouseRecord({ game: coercingGame }));
  assertFailClosedGame(result);
});

test("scenario_id coercing to a valid level never reaches level-table lookups", () => {
  const result = verifyTeachingGameEvidence(
    honestWarehouseRecord({ scenario_id: { toString: () => "kv-warehouse-L1" } }),
  );
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.errors[0], "scenario_id is not a supported KV WAREHOUSE level");
});

test("literacy lessonId 'toString' (inherited-key probe) fails closed with a receipt", () => {
  const result = verifyLiteracyEvidence({ ...honestLiteracyRecord(), lessonId: "toString" });
  assert.equal(result.verdict, "FAIL");
  assert.equal(typeof result.errors[0], "string");
});

test("string game still passes (guard did not overreach)", () => {
  const result = verifyTeachingGameEvidence(honestWarehouseRecord());
  assert.equal(result.verdict, "PASS");
  assert.equal(result.game, "KV WAREHOUSE");
  assert.deepEqual(result.errors, []);
});

test("literacy object identity fields with null toString return FAIL receipts instead of throwing", () => {
  for (const field of ["lessonId", "activityId", "attemptId", "activityType"]) {
    const result = verifyLiteracyEvidence({ ...honestLiteracyRecord(), [field]: { toString: null } });
    assert.equal(result.verdict, "FAIL", field);
    assert.equal(result.independent_pass, false, field);
    assert.equal(result.mastery_eligible, false, field);
    assert.equal(result.errors[0], `${field} must be a bounded non-empty string`, field);
  }
});

test("literacy array lessonId fails closed without throwing (echo stays cosmetic)", () => {
  const result = verifyLiteracyEvidence({ ...honestLiteracyRecord(), lessonId: ["l02"] });
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.errors[0], "lessonId must be a bounded non-empty string");
});

test("literacy honest record still passes (guard did not overreach)", () => {
  const result = verifyLiteracyEvidence(honestLiteracyRecord());
  assert.equal(result.verdict, "PASS");
  assert.equal(result.mastery_eligible, true);
  assert.deepEqual(result.errors, []);
});

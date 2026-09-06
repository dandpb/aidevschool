import assert from "node:assert/strict";
import test from "node:test";
import { verify } from "../netlify-functions/literacy-verify.mjs";

function record(overrides = {}) {
  return {
    schemaVersion: 1,
    source: "literacydojo",
    attemptId: "att-000001",
    lessonId: "l02",
    lessonVersion: 3,
    activityId: "l02-a1",
    activityType: "output_comparison",
    skillIds: ["entender", "avaliar"],
    deterministicChecks: {
      betterOutputId: true,
      "c-fontes": true,
      "c-limites": true,
      noExtraCriteria: 0,
    },
    score: 1,
    pass: true,
    timestamp: "2026-08-25T18:00:00.000Z",
    verifierRequired: true,
    answer: { outputId: "out-b", criterionIds: ["c-fontes", "c-limites"] },
    ...overrides,
  };
}

test("accepts the independently recomputed l02 v3 attempt", () => {
  const result = verify(record());
  assert.equal(result.verdict, "PASS");
  assert.equal(result.attempt_id, "att-000001");
  assert.equal(result.producer_writes_mastered, false);
  assert.match(result.evidence_digest, /^[a-f0-9]{64}$/);
});

test("fails closed when producer claims drift from the structured answer", () => {
  const result = verify(record({ answer: { outputId: "out-a", criterionIds: [] } }));
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.mastery_eligible, false);
  assert.ok(result.errors.length >= 1);
});

test("fails closed outside the fixed canonical lesson contract", () => {
  const result = verify(record({ lessonVersion: 999 }));
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.mastery_eligible, false);
});

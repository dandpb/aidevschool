import assert from "node:assert/strict";
import test from "node:test";
import { verify } from "../netlify-functions/literacy-verify.mjs";

// Identity-guard regressions for the l02 v4 contract (review of PR #656):
// the shared schema pins activityId to a string, so every non-string value
// must fail closed with the identity error — never PASS via key coercion and
// never throw. These cases document the hasOwnProperty coercion defect found
// in review (array key coerced to "l02-a1" -> PASS with empty activity_id;
// {"toString": null} key -> TypeError) and pin the fix.

function honestA1Record(activityId) {
  return {
    schemaVersion: 1,
    source: "literacydojo",
    attemptId: "att-000009",
    lessonId: "l02",
    lessonVersion: 4,
    activityId,
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
    timestamp: "2026-10-02T01:20:00.000Z",
    verifierRequired: true,
    answer: { outputId: "out-b", criterionIds: ["c-fontes", "c-limites"] },
  };
}

function assertFailClosedIdentity(result) {
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.independent_pass, false);
  assert.equal(result.mastery_eligible, false);
  assert.equal(result.errors[0], "evidence identity is not the fixed l02 v4 verifier contract");
}

test("array activityId never passes via key coercion (was PASS with empty activity_id)", () => {
  const result = verify(honestA1Record(["l02-a1"]));
  assertFailClosedIdentity(result);
  assert.equal(result.activity_id, "");
});

test("array activityId for other contract activities also fails closed", () => {
  assertFailClosedIdentity(verify(honestA1Record(["l02-a3"])));
});

test("object activityId with null toString returns a FAIL receipt instead of throwing", () => {
  const result = verify(honestA1Record({ toString: null }));
  assertFailClosedIdentity(result);
});

test("plain object activityId fails closed", () => {
  assertFailClosedIdentity(verify(honestA1Record({})));
});

test("null activityId fails closed", () => {
  assertFailClosedIdentity(verify(honestA1Record(null)));
});

test("numeric activityId fails closed", () => {
  assertFailClosedIdentity(verify(honestA1Record(4)));
});

test("boolean activityId fails closed", () => {
  assertFailClosedIdentity(verify(honestA1Record(true)));
});

test("missing activityId fails closed", () => {
  const record = honestA1Record("l02-a1");
  delete record.activityId;
  assertFailClosedIdentity(verify(record));
});

test("string activityId still passes the v4 contract (guard did not overreach)", () => {
  const result = verify(honestA1Record("l02-a1"));
  assert.equal(result.verdict, "PASS");
  assert.equal(result.activity_id, "l02-a1");
  assert.equal(result.errors.length, 0);
});

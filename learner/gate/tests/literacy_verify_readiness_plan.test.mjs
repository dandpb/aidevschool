import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { verify } from "../netlify-functions/literacy-verify.mjs";

// Values are fixed by readiness plan criteria 8–10, canonical l02 v4, and
// evaluation.ts. Expected scores/checks are not computed by the verifier.
const CASES = [
  {
    activityId: "l02-a1",
    activityType: "output_comparison",
    answer: { outputId: "out-b", criterionIds: ["c-fontes", "c-limites"] },
    deterministicChecks: { betterOutputId: true, "c-fontes": true, "c-limites": true, noExtraCriteria: 0 },
    incorrect: {
      answer: { outputId: "out-a", criterionIds: [] },
      deterministicChecks: { betterOutputId: false, "c-fontes": false, "c-limites": false, noExtraCriteria: 0 },
      score: 0.2,
      pass: false,
    },
  },
  {
    activityId: "l02-a2",
    activityType: "choice",
    answer: { optionIds: ["opt-verifica-na-fonte"] },
    deterministicChecks: { "opt-verifica-na-fonte": true, "opt-confia-no-especifico": true, "opt-descarta-tudo": true },
    incorrect: {
      answer: { optionIds: ["opt-confia-no-especifico"] },
      deterministicChecks: { "opt-verifica-na-fonte": false, "opt-confia-no-especifico": false, "opt-descarta-tudo": true },
      score: 0.33,
      pass: false,
    },
  },
  {
    activityId: "l02-a3",
    activityType: "sort",
    answer: { orderedIds: ["fluxo-resposta", "fluxo-afirmacoes", "fluxo-fonte", "fluxo-conferencia", "fluxo-uso"] },
    deterministicChecks: { "fluxo-resposta": true, "fluxo-afirmacoes": true, "fluxo-fonte": true, "fluxo-conferencia": true, "fluxo-uso": true },
    incorrect: {
      answer: { orderedIds: ["fluxo-afirmacoes", "fluxo-resposta", "fluxo-fonte", "fluxo-conferencia", "fluxo-uso"] },
      deterministicChecks: { "fluxo-resposta": false, "fluxo-afirmacoes": false, "fluxo-fonte": true, "fluxo-conferencia": true, "fluxo-uso": true },
      score: 0.6,
      pass: false,
    },
  },
];

function record(activity, overrides = {}) {
  return {
    schemaVersion: 1,
    source: "literacydojo",
    attemptId: `plan-attempt-${activity.activityId}`,
    lessonId: "l02",
    lessonVersion: 4,
    activityId: activity.activityId,
    activityType: activity.activityType,
    skillIds: ["entender", "avaliar"],
    deterministicChecks: structuredClone(activity.deterministicChecks),
    answer: structuredClone(activity.answer),
    score: 1,
    pass: true,
    timestamp: "2026-10-15T12:00:00.000Z",
    verifierRequired: true,
    ...overrides,
  };
}

// Independent test-side canonical JSON: serialize the sorted plain object,
// excluding only timestamp as defined by the public evidence contract.
function expectedDigest(value) {
  function sorted(item) {
    if (Array.isArray(item)) return item.map(sorted);
    if (item !== null && typeof item === "object") {
      return Object.fromEntries(Object.keys(item).sort().map((key) => [key, sorted(item[key])]));
    }
    return item;
  }
  const { timestamp: _ignored, ...bound } = value;
  return createHash("sha256").update(JSON.stringify(sorted(bound))).digest("hex");
}

test("plan: complete v4 receipt binding", async (t) => {
  for (const activity of CASES) {
    await t.test(`${activity.activityId}/${activity.activityType}`, () => {
      const evidence = record(activity);
      const receipt = verify(evidence);
      assert.deepEqual(Object.keys(receipt).sort(), [
        "activity_id", "attempt_id", "context_isolated", "errors", "evidence_digest",
        "independent_pass", "lesson_id", "lesson_version", "mastery_eligible",
        "max_producer_claim", "producer_writes_mastered", "source", "verdict",
        "verified_at", "verifier_version",
      ].sort());
      assert.equal(receipt.verdict, "PASS");
      assert.equal(receipt.independent_pass, true);
      assert.equal(receipt.mastery_eligible, true);
      assert.equal(receipt.context_isolated, true);
      assert.equal(receipt.source, "independent-literacy-verifier");
      assert.equal(receipt.verifier_version, "1-netlify-l02-v4");
      assert.equal(receipt.lesson_id, "l02");
      assert.equal(receipt.lesson_version, 4);
      assert.equal(receipt.activity_id, activity.activityId);
      assert.equal(receipt.attempt_id, `plan-attempt-${activity.activityId}`);
      assert.equal(receipt.evidence_digest, expectedDigest(evidence));
      assert.equal(receipt.producer_writes_mastered, false);
      assert.equal(receipt.max_producer_claim, "completed");
      assert.deepEqual(receipt.errors, []);
      assert.equal(new Date(receipt.verified_at).toISOString(), receipt.verified_at);
      assert.equal(verify({ ...evidence, timestamp: "2026-10-15T13:00:00.000Z" }).evidence_digest, receipt.evidence_digest);
      assert.notEqual(verify({ ...evidence, attemptId: "different-attempt" }).evidence_digest, receipt.evidence_digest);
    });
  }
});

test("plan: independent tamper rejection", async (t) => {
  for (const activity of CASES) {
    for (const field of ["deterministicChecks", "score", "pass"]) {
      await t.test(`${activity.activityId}: ${field} changed alone`, () => {
        const changes = {
          deterministicChecks: { ...activity.deterministicChecks, [Object.keys(activity.deterministicChecks)[0]]: false },
          score: 0.99,
          pass: false,
        };
        const receipt = verify(record(activity, { [field]: changes[field] }));
        assert.equal(receipt.verdict, "FAIL");
        assert.equal(receipt.independent_pass, false);
        assert.equal(receipt.mastery_eligible, false);
        assert.deepEqual(receipt.errors, [`producer ${field} does not match independent recomputation`]);
      });
    }
    await t.test(`${activity.activityId}: honest incorrect answer`, () => {
      const receipt = verify(record(activity, activity.incorrect));
      assert.equal(receipt.verdict, "FAIL");
      assert.equal(receipt.independent_pass, false);
      assert.equal(receipt.mastery_eligible, false);
      assert.deepEqual(receipt.errors, []);
    });
  }
});

test("plan: invalid identity and legacy contract", async (t) => {
  const invalid = [
    ["legacy-v3", { lessonVersion: 3 }],
    ["schema", { schemaVersion: 2 }],
    ["source", { source: "producer" }],
    ["verifierRequired", { verifierRequired: false }],
    ["lesson", { lessonId: "l03" }],
    ["type", { activityType: "sort" }],
    ["unknown-activity", { activityId: "l02-a4" }],
    ["null-activity", { activityId: null }],
    ["numeric-activity", { activityId: 1 }],
    ["boolean-activity", { activityId: true }],
    ["array-activity", { activityId: ["l02-a1"] }],
    ["object-activity", { activityId: {} }],
    ["uncoercible-activity", { activityId: { toString: null } }],
    ["reordered-skills", { skillIds: ["avaliar", "entender"] }],
    ["missing-skill", { skillIds: ["entender"] }],
    ["extra-skill", { skillIds: ["entender", "avaliar", "criar"] }],
    ["nonarray-skills", { skillIds: "entender,avaliar" }],
    ["null-skills", { skillIds: null }],
  ];
  for (const [name, overrides] of invalid) {
    await t.test(name, () => {
      const receipt = verify(record(CASES[0], overrides));
      assert.equal(receipt.verdict, "FAIL");
      assert.equal(receipt.independent_pass, false);
      assert.equal(receipt.mastery_eligible, false);
      assert.deepEqual(receipt.errors, ["evidence identity is not the fixed l02 v4 verifier contract"]);
    });
  }
  await t.test("missing-activity", () => {
    const evidence = record(CASES[0]);
    delete evidence.activityId;
    const receipt = verify(evidence);
    assert.equal(receipt.verdict, "FAIL");
    assert.equal(receipt.independent_pass, false);
    assert.equal(receipt.mastery_eligible, false);
    assert.deepEqual(receipt.errors, ["evidence identity is not the fixed l02 v4 verifier contract"]);
  });
});

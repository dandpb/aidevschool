import assert from "node:assert/strict";
import test from "node:test";
import { verify } from "../netlify-functions/literacy-verify.mjs";

function a1Record(overrides = {}) {
  return {
    schemaVersion: 1,
    source: "literacydojo",
    attemptId: "att-000001",
    lessonId: "l02",
    lessonVersion: 4,
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
    timestamp: "2026-10-01T18:00:00.000Z",
    verifierRequired: true,
    answer: { outputId: "out-b", criterionIds: ["c-fontes", "c-limites"] },
    ...overrides,
  };
}

function a2Record(answer, deterministicChecks, score, pass, overrides = {}) {
  return {
    schemaVersion: 1,
    source: "literacydojo",
    attemptId: "att-000002",
    lessonId: "l02",
    lessonVersion: 4,
    activityId: "l02-a2",
    activityType: "choice",
    skillIds: ["entender", "avaliar"],
    deterministicChecks,
    score,
    pass,
    timestamp: "2026-10-01T18:01:00.000Z",
    verifierRequired: true,
    answer,
    ...overrides,
  };
}

function a3Record(answer, deterministicChecks, score, pass, overrides = {}) {
  return {
    schemaVersion: 1,
    source: "literacydojo",
    attemptId: "att-000003",
    lessonId: "l02",
    lessonVersion: 4,
    activityId: "l02-a3",
    activityType: "sort",
    skillIds: ["entender", "avaliar"],
    deterministicChecks,
    score,
    pass,
    timestamp: "2026-10-01T18:02:00.000Z",
    verifierRequired: true,
    answer,
    ...overrides,
  };
}

const SORT_CORRECT_ORDER = [
  "fluxo-resposta",
  "fluxo-afirmacoes",
  "fluxo-fonte",
  "fluxo-conferencia",
  "fluxo-uso",
];

test("accepts the independently recomputed l02 v4 a1 output_comparison attempt", () => {
  const result = verify(a1Record());
  assert.equal(result.verdict, "PASS");
  assert.equal(result.attempt_id, "att-000001");
  assert.equal(result.producer_writes_mastered, false);
  assert.match(result.evidence_digest, /^[a-f0-9]{64}$/);
});

test("fails closed when producer claims drift from the structured answer (a1)", () => {
  const result = verify(a1Record({ answer: { outputId: "out-a", criterionIds: [] } }));
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.mastery_eligible, false);
  assert.ok(result.errors.length >= 1);
});

test("fails closed outside the fixed canonical lesson contract", () => {
  const result = verify(a1Record({ lessonVersion: 999 }));
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.mastery_eligible, false);
});

test("fails closed on legacy l02 v3 records (superseded contract)", () => {
  const legacyV3 = a1Record({
    lessonVersion: 3,
    deterministicChecks: {
      betterOutputId: true,
      "c-fontes": true,
      "c-limites": true,
      noExtraCriteria: 0,
    },
    score: 1,
    pass: true,
    answer: { outputId: "out-b", criterionIds: ["c-fontes", "c-limites"] },
  });
  const result = verify(legacyV3);
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.mastery_eligible, false);
  assert.equal(result.errors[0], "evidence identity is not the fixed l02 v4 verifier contract");
});

test("accepts the independently recomputed l02 v4 a2 choice attempt", () => {
  const result = verify(
    a2Record(
      { optionIds: ["opt-verifica-na-fonte"] },
      {
        "opt-verifica-na-fonte": true,
        "opt-confia-no-especifico": true,
        "opt-descarta-tudo": true,
      },
      1,
      true,
    ),
  );
  assert.equal(result.verdict, "PASS");
  assert.equal(result.mastery_eligible, true);
  assert.equal(result.errors.length, 0);
});

test("fails closed on a2 wrong selection even with honest producer claims", () => {
  const result = verify(
    a2Record(
      { optionIds: ["opt-confia-no-especifico"] },
      {
        "opt-verifica-na-fonte": false,
        "opt-confia-no-especifico": false,
        "opt-descarta-tudo": true,
      },
      0.33,
      false,
    ),
  );
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.mastery_eligible, false);
  assert.equal(result.independent_pass, false);
  assert.equal(result.errors.length, 0);
});

test("accepts the independently recomputed l02 v4 a3 sort attempt", () => {
  const result = verify(
    a3Record(
      { orderedIds: SORT_CORRECT_ORDER },
      {
        "fluxo-resposta": true,
        "fluxo-afirmacoes": true,
        "fluxo-fonte": true,
        "fluxo-conferencia": true,
        "fluxo-uso": true,
      },
      1,
      true,
    ),
  );
  assert.equal(result.verdict, "PASS");
  assert.equal(result.mastery_eligible, true);
  assert.equal(result.errors.length, 0);
});

test("fails closed on a3 with swapped positions (3/5 = 0.6 below threshold)", () => {
  const swapped = [
    "fluxo-afirmacoes",
    "fluxo-resposta",
    "fluxo-fonte",
    "fluxo-conferencia",
    "fluxo-uso",
  ];
  const result = verify(
    a3Record(
      { orderedIds: swapped },
      {
        "fluxo-resposta": false,
        "fluxo-afirmacoes": false,
        "fluxo-fonte": true,
        "fluxo-conferencia": true,
        "fluxo-uso": true,
      },
      0.6,
      false,
    ),
  );
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.mastery_eligible, false);
  assert.equal(result.errors.length, 0);
});

test("accepts a3 at the inclusive pass boundary (4/5 = 0.8 >= 0.75)", () => {
  const incomplete = SORT_CORRECT_ORDER.slice(0, 4);
  const result = verify(
    a3Record(
      { orderedIds: incomplete },
      {
        "fluxo-resposta": true,
        "fluxo-afirmacoes": true,
        "fluxo-fonte": true,
        "fluxo-conferencia": true,
        "fluxo-uso": false,
      },
      0.8,
      true,
    ),
  );
  assert.equal(result.verdict, "PASS");
  assert.equal(result.errors.length, 0);
});

test("fails closed on a3 with tampered score and checks (recomputation error)", () => {
  const result = verify(
    a3Record(
      { orderedIds: SORT_CORRECT_ORDER },
      {
        "fluxo-resposta": true,
        "fluxo-afirmacoes": true,
        "fluxo-fonte": false,
        "fluxo-conferencia": true,
        "fluxo-uso": true,
      },
      0.9,
      true,
    ),
  );
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.mastery_eligible, false);
  assert.ok(result.errors.includes("producer deterministicChecks does not match independent recomputation"));
  assert.ok(result.errors.includes("producer score does not match independent recomputation"));
});

test("fails closed for lessons and activities outside the l02 v4 contract", () => {
  const wrongLesson = verify(a1Record({ lessonId: "l03" }));
  assert.equal(wrongLesson.verdict, "FAIL");

  const wrongActivity = verify(
    a2Record(
      { optionIds: ["opt-verifica-na-fonte"] },
      {
        "opt-verifica-na-fonte": true,
        "opt-confia-no-especifico": true,
        "opt-descarta-tudo": true,
      },
      1,
      true,
      { activityId: "l02-a4" },
    ),
  );
  assert.equal(wrongActivity.verdict, "FAIL");
  assert.equal(wrongActivity.mastery_eligible, false);

  const wrongType = verify(
    a2Record(
      { optionIds: ["opt-verifica-na-fonte"] },
      {
        "opt-verifica-na-fonte": true,
        "opt-confia-no-especifico": true,
        "opt-descarta-tudo": true,
      },
      1,
      true,
      { activityType: "sort" },
    ),
  );
  assert.equal(wrongType.verdict, "FAIL");
});

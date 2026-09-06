import { createHash } from "node:crypto";

const SOURCE = "independent-literacy-verifier";
const VERSION = "1-netlify-l02-v3";
const MAX_BODY_BYTES = 65_536;

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(record) {
  const { timestamp: _timestamp, ...fields } = record;
  return createHash("sha256").update(stable(fields)).digest("hex");
}

function identity(record) {
  return {
    lesson_id: typeof record?.lessonId === "string" ? record.lessonId : "",
    lesson_version: Number.isInteger(record?.lessonVersion) ? record.lessonVersion : 0,
    activity_id: typeof record?.activityId === "string" ? record.activityId : "",
    attempt_id: typeof record?.attemptId === "string" ? record.attemptId : "",
  };
}

function receipt(record, independentPass, errors) {
  return {
    verdict: independentPass ? "PASS" : "FAIL",
    context_isolated: true,
    source: SOURCE,
    verifier_version: VERSION,
    verified_at: new Date().toISOString(),
    evidence_digest: record && typeof record === "object" ? digest(record) : "",
    ...identity(record),
    independent_pass: independentPass,
    mastery_eligible: independentPass,
    producer_writes_mastered: false,
    max_producer_claim: "completed",
    errors,
  };
}

export function verify(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return receipt(null, false, ["evidence must be a JSON object"]);
  }

  const expectedIdentity =
    record.schemaVersion === 1 &&
    record.source === "literacydojo" &&
    record.verifierRequired === true &&
    record.lessonId === "l02" &&
    record.lessonVersion === 3 &&
    record.activityId === "l02-a1" &&
    record.activityType === "output_comparison" &&
    Array.isArray(record.skillIds) &&
    stable(record.skillIds) === stable(["entender", "avaliar"]);
  if (!expectedIdentity) {
    return receipt(record, false, ["evidence identity is not the fixed l02 v3 verifier contract"]);
  }

  const answer = record.answer;
  const criterionIds = Array.isArray(answer?.criterionIds) ? answer.criterionIds : [];
  const selected = new Set(criterionIds);
  const expectedChecks = {
    betterOutputId: answer?.outputId === "out-b",
    "c-fontes": selected.has("c-fontes"),
    "c-limites": selected.has("c-limites"),
    noExtraCriteria: [...selected].filter((id) => !["c-fontes", "c-limites"].includes(id)).length,
  };
  const recomputedPass =
    expectedChecks.betterOutputId &&
    expectedChecks["c-fontes"] &&
    expectedChecks["c-limites"] &&
    expectedChecks.noExtraCriteria === 0;
  const earned =
    (expectedChecks.betterOutputId ? 2 : 0) +
    (expectedChecks["c-fontes"] ? 1 : 0) +
    (expectedChecks["c-limites"] ? 1 : 0) +
    (expectedChecks.noExtraCriteria === 0 ? 1 : 0);
  const recomputedScore = Math.round((earned / 5) * 100) / 100;
  const errors = [];
  if (stable(record.deterministicChecks) !== stable(expectedChecks)) errors.push("producer deterministicChecks does not match independent recomputation");
  if (record.score !== recomputedScore) errors.push("producer score does not match independent recomputation");
  if (record.pass !== recomputedPass) errors.push("producer pass does not match independent recomputation");
  return receipt(record, recomputedPass && errors.length === 0, errors);
}

export default async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json", allow: "POST" },
    });
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: "payload too large" }), { status: 413 });
  }
  let record;
  try {
    record = JSON.parse(body);
  } catch {
    record = null;
  }
  return new Response(JSON.stringify(verify(record)), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};

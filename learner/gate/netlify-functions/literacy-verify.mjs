import { createHash } from "node:crypto";

const SOURCE = "independent-literacy-verifier";
const VERSION = "1-netlify-l02-v4";
const MAX_BODY_BYTES = 65_536;

const LESSON_SKILL_IDS = ["entender", "avaliar"];
const PASS_THRESHOLD = 0.75;

// Fixed l02 v4 contract: lesson version 4 with exactly these three activities
// (mirrors curriculum/ai-literacy/modules/01-ai-sem-misterio/l02-*.yaml and the
// producer domain semantics in engines/literacyDojo/src/domain/evaluation.ts).
const CONTRACT_ACTIVITY_TYPES = {
  "l02-a1": "output_comparison",
  "l02-a2": "choice",
  "l02-a3": "sort",
};
const CHOICE_OPTION_IDS = ["opt-verifica-na-fonte", "opt-confia-no-especifico", "opt-descarta-tudo"];
const CHOICE_CORRECT_OPTION_IDS = ["opt-verifica-na-fonte"];
const SORT_EXPECTED_ORDER = [
  "fluxo-resposta",
  "fluxo-afirmacoes",
  "fluxo-fonte",
  "fluxo-conferencia",
  "fluxo-uso",
];

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

function round2(value) {
  return Math.round(value * 100) / 100;
}

function recomputeOutputComparison(record) {
  const answer = record.answer;
  const criterionIds = Array.isArray(answer?.criterionIds) ? answer.criterionIds : [];
  const selected = new Set(criterionIds);
  const checks = {
    betterOutputId: answer?.outputId === "out-b",
    "c-fontes": selected.has("c-fontes"),
    "c-limites": selected.has("c-limites"),
    noExtraCriteria: [...selected].filter((id) => !["c-fontes", "c-limites"].includes(id)).length,
  };
  const pass =
    checks.betterOutputId &&
    checks["c-fontes"] &&
    checks["c-limites"] &&
    checks.noExtraCriteria === 0;
  const earned =
    (checks.betterOutputId ? 2 : 0) +
    (checks["c-fontes"] ? 1 : 0) +
    (checks["c-limites"] ? 1 : 0) +
    (checks.noExtraCriteria === 0 ? 1 : 0);
  return { checks, pass, score: round2(earned / 5) };
}

function recomputeChoice(record) {
  const optionIds = Array.isArray(record?.answer?.optionIds) ? record.answer.optionIds : [];
  const selected = new Set(optionIds);
  const correct = new Set(CHOICE_CORRECT_OPTION_IDS);
  const checks = {};
  let passed = 0;
  for (const optionId of CHOICE_OPTION_IDS) {
    const ok = selected.has(optionId) === correct.has(optionId);
    checks[optionId] = ok;
    if (ok) passed += 1;
  }
  const fraction = passed / CHOICE_OPTION_IDS.length;
  return { checks, pass: fraction >= PASS_THRESHOLD, score: round2(fraction) };
}

function recomputeSort(record) {
  const orderedIds = Array.isArray(record?.answer?.orderedIds) ? record.answer.orderedIds : [];
  const checks = {};
  let passed = 0;
  SORT_EXPECTED_ORDER.forEach((itemId, index) => {
    const ok = orderedIds[index] === itemId;
    checks[itemId] = ok;
    if (ok) passed += 1;
  });
  const fraction = passed / SORT_EXPECTED_ORDER.length;
  return { checks, pass: fraction >= PASS_THRESHOLD, score: round2(fraction) };
}

function recompute(record, activityType) {
  if (activityType === "output_comparison") return recomputeOutputComparison(record);
  if (activityType === "choice") return recomputeChoice(record);
  return recomputeSort(record);
}

export function verify(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return receipt(null, false, ["evidence must be a JSON object"]);
  }

  // The shared schema pins activityId to a string; non-string values must fail
  // closed here too. The typeof guard must short-circuit BEFORE the contract
  // lookup: hasOwnProperty coerces its key (["l02-a1"] would pass as "l02-a1")
  // and {"toString": null} would throw instead of returning a FAIL receipt.
  const activityIdIsString = typeof record.activityId === "string";
  const contractActivityType =
    activityIdIsString &&
    Object.prototype.hasOwnProperty.call(CONTRACT_ACTIVITY_TYPES, record.activityId)
      ? CONTRACT_ACTIVITY_TYPES[record.activityId]
      : undefined;
  const expectedIdentity =
    record.schemaVersion === 1 &&
    record.source === "literacydojo" &&
    record.verifierRequired === true &&
    record.lessonId === "l02" &&
    record.lessonVersion === 4 &&
    contractActivityType !== undefined &&
    record.activityType === contractActivityType &&
    Array.isArray(record.skillIds) &&
    stable(record.skillIds) === stable(LESSON_SKILL_IDS);
  if (!expectedIdentity) {
    return receipt(record, false, ["evidence identity is not the fixed l02 v4 verifier contract"]);
  }

  const recomputed = recompute(record, contractActivityType);
  const errors = [];
  if (stable(record.deterministicChecks) !== stable(recomputed.checks)) errors.push("producer deterministicChecks does not match independent recomputation");
  if (record.score !== recomputed.score) errors.push("producer score does not match independent recomputation");
  if (record.pass !== recomputed.pass) errors.push("producer pass does not match independent recomputation");
  return receipt(record, recomputed.pass && errors.length === 0, errors);
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

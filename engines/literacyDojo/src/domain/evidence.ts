import type { CheckValue, EvaluationResult } from "./evaluation";

/**
 * Envelope de evidência do bounded context AI Literacy
 * (docs/design/ai-literacy/evidence-contract.md). A UI emite evidência bruta
 * para cada tentativa avaliada e nunca promove domínio: `verifierRequired` é
 * literal true, e `deterministicChecks` carrega somente resultados
 * estruturados dos checks — nunca texto livre do usuário.
 */

export const EVIDENCE_SCHEMA_VERSION = 1;
export const EVIDENCE_SOURCE = "literacydojo";

export type LiteracyEvidenceRecord = {
  schemaVersion: 1;
  source: "literacydojo";
  attemptId: string;
  lessonId: string;
  lessonVersion: number;
  activityId: string;
  activityType: string;
  skillIds: string[];
  deterministicChecks: Record<string, CheckValue>;
  score: number;
  pass: boolean;
  timestamp: string;
  verifierRequired: true;
};

export function buildEvidenceRecord(input: {
  attemptId: string;
  lessonId: string;
  lessonVersion: number;
  skillIds: string[];
  evaluation: EvaluationResult;
  timestamp: string;
}): LiteracyEvidenceRecord {
  return {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    source: EVIDENCE_SOURCE,
    attemptId: input.attemptId,
    lessonId: input.lessonId,
    lessonVersion: input.lessonVersion,
    activityId: input.evaluation.activityId,
    activityType: input.evaluation.activityType,
    skillIds: input.skillIds,
    deterministicChecks: input.evaluation.deterministicChecks,
    score: input.evaluation.score,
    pass: input.evaluation.pass,
    timestamp: input.timestamp,
    verifierRequired: true,
  };
}

const ALLOWED_KEYS = new Set([
  "schemaVersion",
  "source",
  "attemptId",
  "lessonId",
  "lessonVersion",
  "activityId",
  "activityType",
  "skillIds",
  "deterministicChecks",
  "score",
  "pass",
  "timestamp",
  "verifierRequired",
]);

function isCheckValue(value: unknown): value is CheckValue {
  return typeof value === "boolean" || typeof value === "number" || typeof value === "string";
}

/** Validação estrutural do envelope — usada por testes unitários e pelo fluxo Playwright. */
export function isValidEvidenceRecord(value: unknown): value is LiteracyEvidenceRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!ALLOWED_KEYS.has(key)) return false;
  }
  if (record.schemaVersion !== EVIDENCE_SCHEMA_VERSION) return false;
  if (record.source !== EVIDENCE_SOURCE) return false;
  if (typeof record.attemptId !== "string" || record.attemptId.length === 0) return false;
  if (typeof record.lessonId !== "string" || record.lessonId.length === 0) return false;
  if (typeof record.lessonVersion !== "number" || !Number.isInteger(record.lessonVersion)) {
    return false;
  }
  if (typeof record.activityId !== "string" || record.activityId.length === 0) return false;
  if (typeof record.activityType !== "string" || record.activityType.length === 0) return false;
  if (!Array.isArray(record.skillIds) || !record.skillIds.every((id) => typeof id === "string")) {
    return false;
  }
  if (typeof record.deterministicChecks !== "object" || record.deterministicChecks === null) {
    return false;
  }
  if (!Object.values(record.deterministicChecks).every(isCheckValue)) return false;
  if (typeof record.score !== "number" || record.score < 0 || record.score > 1) return false;
  if (typeof record.pass !== "boolean") return false;
  if (typeof record.timestamp !== "string" || Number.isNaN(Date.parse(record.timestamp))) {
    return false;
  }
  return record.verifierRequired === true;
}

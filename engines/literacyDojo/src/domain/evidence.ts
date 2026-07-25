import sharedEvidenceSchema from "../../../../learner/gate/literacy_evidence.schema.json" with {
  type: "json",
};
import type { CheckValue, EvaluationResult } from "./evaluation";

/**
 * Envelope de evidência do bounded context AI Literacy
 * (docs/design/ai-literacy/evidence-contract.md). A UI emite evidência bruta
 * para cada tentativa avaliada e nunca promove domínio: `verifierRequired` é
 * literal true, e `deterministicChecks` carrega somente resultados
 * estruturados dos checks — nunca texto livre do usuário.
 */

type JsonSchema = {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean";
  const?: unknown;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema;
  propertyNames?: JsonSchema;
  oneOf?: JsonSchema[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: "date-time";
};

const literacyEvidenceSchema = sharedEvidenceSchema as JsonSchema;

export const EVIDENCE_SCHEMA_VERSION = sharedEvidenceSchema.properties.schemaVersion.const as 1;
export const EVIDENCE_SOURCE = sharedEvidenceSchema.properties.source.const as "literacydojo";
const VERIFIER_REQUIRED = sharedEvidenceSchema.properties.verifierRequired.const as true;

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
  /**
   * Contexto da tentativa (extensão aditiva da Fase 2): "initial" = prática da
   * lição; "review" = revisão espaçada de lição já concluída.
   */
  context?: "initial" | "review";
};

export function buildEvidenceRecord(input: {
  attemptId: string;
  lessonId: string;
  lessonVersion: number;
  skillIds: string[];
  evaluation: EvaluationResult;
  timestamp: string;
  context?: "initial" | "review";
}): LiteracyEvidenceRecord {
  const record: LiteracyEvidenceRecord = {
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
    verifierRequired: VERIFIER_REQUIRED,
    ...(input.context !== undefined ? { context: input.context } : {}),
  };
  if (!isValidEvidenceRecord(record)) {
    throw new Error("LiteracyEvidenceRecord does not match the shared schema");
  }
  return record;
}

function matchesSchema(value: unknown, schema: JsonSchema): boolean {
  if (schema.oneOf !== undefined) {
    return schema.oneOf.filter((candidate) => matchesSchema(value, candidate)).length === 1;
  }
  if (schema.const !== undefined && !Object.is(value, schema.const)) return false;
  if (schema.enum !== undefined && !schema.enum.some((item) => Object.is(value, item))) {
    return false;
  }

  if (schema.type === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    if (schema.required?.some((key) => !(key in record))) return false;
    for (const [key, item] of Object.entries(record)) {
      if (schema.propertyNames !== undefined && !matchesSchema(key, schema.propertyNames)) {
        return false;
      }
      const propertySchema = schema.properties?.[key];
      if (propertySchema !== undefined) {
        if (!matchesSchema(item, propertySchema)) return false;
      } else if (schema.additionalProperties === false) {
        return false;
      } else if (
        typeof schema.additionalProperties === "object" &&
        !matchesSchema(item, schema.additionalProperties)
      ) {
        return false;
      }
    }
    return true;
  }

  if (schema.type === "array") {
    return (
      Array.isArray(value) &&
      (schema.items === undefined || value.every((item) => matchesSchema(item, schema.items!)))
    );
  }
  if (schema.type === "string") {
    if (typeof value !== "string") return false;
    if (schema.minLength !== undefined && value.length < schema.minLength) return false;
    if (schema.maxLength !== undefined && value.length > schema.maxLength) return false;
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) return false;
    return schema.format !== "date-time" || !Number.isNaN(Date.parse(value));
  }
  if (schema.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) return false;
    if (schema.minimum !== undefined && value < schema.minimum) return false;
    return schema.maximum === undefined || value <= schema.maximum;
  }
  if (schema.type === "integer") {
    if (typeof value !== "number" || !Number.isInteger(value)) return false;
    if (schema.minimum !== undefined && value < schema.minimum) return false;
    return schema.maximum === undefined || value <= schema.maximum;
  }
  if (schema.type === "boolean") return typeof value === "boolean";
  return true;
}

/** Validação estrutural do envelope — usada por testes unitários e pelo fluxo Playwright. */
export function isValidEvidenceRecord(value: unknown): value is LiteracyEvidenceRecord {
  return matchesSchema(value, literacyEvidenceSchema);
}

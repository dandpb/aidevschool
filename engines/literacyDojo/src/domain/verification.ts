import type { LiteracyEvidenceRecord } from "./evidence";

export const INDEPENDENT_VERIFIER_SOURCE = "independent-literacy-verifier";

export type LiteracyVerificationReceipt = {
  verdict: "PASS" | "FAIL";
  context_isolated: true;
  source: typeof INDEPENDENT_VERIFIER_SOURCE;
  verifier_version: string;
  verified_at: string;
  evidence_digest: string;
  lesson_id: string;
  lesson_version: number;
  activity_id: string;
  attempt_id: string;
  independent_pass: boolean;
  mastery_eligible: boolean;
  producer_writes_mastered: false;
  max_producer_claim: "completed";
  errors: string[];
};

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function evidenceDigest(record: LiteracyEvidenceRecord): Promise<string> {
  const { timestamp: _timestamp, ...digestFields } = record;
  const encoded = new TextEncoder().encode(stable(digestFields));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function validateReceipt(
  value: unknown,
  record: LiteracyEvidenceRecord,
): Promise<LiteracyVerificationReceipt> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("O verificador devolveu um recibo inválido.");
  }
  const receipt = value as Record<string, unknown>;
  const digest = await evidenceDigest(record);
  const valid =
    (receipt.verdict === "PASS" || receipt.verdict === "FAIL") &&
    receipt.context_isolated === true &&
    receipt.source === INDEPENDENT_VERIFIER_SOURCE &&
    typeof receipt.verifier_version === "string" &&
    receipt.verifier_version.length > 0 &&
    typeof receipt.verified_at === "string" &&
    !Number.isNaN(Date.parse(receipt.verified_at)) &&
    receipt.evidence_digest === digest &&
    receipt.lesson_id === record.lessonId &&
    receipt.lesson_version === record.lessonVersion &&
    receipt.activity_id === record.activityId &&
    receipt.attempt_id === record.attemptId &&
    receipt.producer_writes_mastered === false &&
    receipt.max_producer_claim === "completed" &&
    Array.isArray(receipt.errors) &&
    receipt.errors.every((error) => typeof error === "string") &&
    receipt.independent_pass === (receipt.verdict === "PASS") &&
    typeof receipt.mastery_eligible === "boolean";
  if (!valid) throw new Error("O recibo não corresponde exatamente a esta tentativa.");
  return receipt as LiteracyVerificationReceipt;
}

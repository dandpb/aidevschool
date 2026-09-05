import { describe, expect, it } from "vitest";
import type { LiteracyEvidenceRecord } from "../../src/domain/evidence";
import {
  INDEPENDENT_VERIFIER_SOURCE,
  evidenceDigest,
  validateReceipt,
} from "../../src/domain/verification";

const record: LiteracyEvidenceRecord = {
  schemaVersion: 1,
  source: "literacydojo",
  attemptId: "att-000001",
  lessonId: "l02",
  lessonVersion: 2,
  activityId: "l02-a01",
  activityType: "output_comparison",
  skillIds: ["avaliar-saidas"],
  deterministicChecks: { betterOutputId: true },
  score: 1,
  pass: true,
  timestamp: "2026-08-05T12:00:00.000Z",
  verifierRequired: true,
  answer: { outputId: "out-b", criterionIds: ["c-fontes"] },
};

async function validReceipt() {
  return {
    verdict: "PASS",
    context_isolated: true,
    source: INDEPENDENT_VERIFIER_SOURCE,
    verifier_version: "1",
    verified_at: "2026-08-05T12:00:01.000Z",
    evidence_digest: await evidenceDigest(record),
    lesson_id: record.lessonId,
    lesson_version: record.lessonVersion,
    activity_id: record.activityId,
    attempt_id: record.attemptId,
    independent_pass: true,
    mastery_eligible: true,
    producer_writes_mastered: false,
    max_producer_claim: "completed",
    errors: [],
  };
}

describe("recibo de verificação independente", () => {
  it("aceita somente um recibo ligado à identidade e ao digest da tentativa", async () => {
    await expect(validateReceipt(await validReceipt(), record)).resolves.toMatchObject({
      verdict: "PASS",
      attempt_id: record.attemptId,
    });
  });

  it.each(["evidence_digest", "attempt_id", "lesson_version"])(
    "rejeita divergência em %s",
    async (field) => {
      const receipt = { ...(await validReceipt()), [field]: "alterado" };
      await expect(validateReceipt(receipt, record)).rejects.toThrow("não corresponde");
    },
  );

  it("rejeita recibo que atribui escrita de domínio ao produtor", async () => {
    const receipt = { ...(await validReceipt()), producer_writes_mastered: true };
    await expect(validateReceipt(receipt, record)).rejects.toThrow("não corresponde");
  });
});

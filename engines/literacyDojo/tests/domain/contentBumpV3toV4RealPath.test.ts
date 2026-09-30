import { describe, expect, it } from "vitest";
import { contentVersion, lessons } from "../../src/data/generated/lessons";
import { buildEvidenceRecord, type LiteracyEvidenceRecord } from "../../src/domain/evidence";
import { migrateProgress } from "../../src/domain/migration";
import { createInitialProgress, type LearnerProgress, type SkillPractice } from "../../src/domain/progress";
import {
  INDEPENDENT_VERIFIER_SOURCE,
  evidenceDigest,
  validateReceipt,
  type LiteracyVerificationReceipt,
} from "../../src/domain/verification";

/**
 * Prova executada do caminho REAL de compatibilidade do bump de conteúdo
 * 2026-09-10.2 → 2026-09-30.1 (l16 v3→v4; AID-3453, revisão 13:03–13:47Z):
 *
 * S1 — `completed` histórico SOBREVIVE na migração forward-only do storage
 *      real (regra 4 do content-contract): nada vira não-completed, nada é
 *      reprocessado, skill praticada fica com revisão devida JÁ (versão nova).
 * S2 — recibo v3 antigo ainda pending: rejeição EXPLÍCITA na validação real
 *      (`validateReceipt`), com o registro de evidência retornado intacto —
 *      rejeição ≠ perda ≠ reinterpretação.
 * S3 — tentativa nova v4 contra o conteúdo atual: recibo válido, PASS,
 *      mastery_eligible true, producer_writes_mastered false.
 *
 * Este arquivo é NOVO (não edita testes existentes) — a prova não depende de
 * waiver de edição de teste.
 */

const OLD_CONTENT_VERSION = "2026-09-10.2";
const l16 = lessons.find((lesson) => lesson.id === "l16");
if (!l16) throw new Error("l16 ausente do read model");
if (l16.version !== 4) throw new Error(`l16 deveria estar em v4 após o bump (está v${l16.version})`);
if (contentVersion !== "2026-09-30.1") {
  throw new Error(`contentVersion esperado 2026-09-30.1 (é ${contentVersion})`);
}

const MIGRATION_NOW = new Date("2026-09-30T13:30:00.000Z");

/** Storage real ANTES do bump: l16 concluída sob o conteúdo antigo. */
function storageBeforeBump(): LearnerProgress {
  const before = createInitialProgress([], OLD_CONTENT_VERSION);
  before.lessonStatus = { ...before.lessonStatus, l16: "completed" };
  const practiced: SkillPractice = {
    skillId: "pedir",
    attempts: 3,
    passes: 2,
    lastScore: 1,
    lastPracticedAt: "2026-09-12T10:00:00.000Z",
    nextReviewAt: "2026-10-03T10:00:00.000Z",
    reviewStage: 1,
  };
  before.skills = { pedir: practiced };
  before.xp = 155;
  return before;
}

/** Evidência v3 histórica (verdade da versão em que foi emitida: c-redact único). */
function historicalV3Evidence(): LiteracyEvidenceRecord {
  return buildEvidenceRecord({
    attemptId: "att-l16-v3-historical-pending",
    lessonId: "l16",
    lessonVersion: 3,
    skillIds: l16.skillIds,
    evaluation: {
      activityId: "l16-a2",
      activityType: "rubric_review",
      checks: [],
      deterministicChecks: {
        "c-schema": true,
        "c-redact": true,
        "c-types": true,
        "c-erros": true,
        "c-deps": true,
      },
      score: 1,
      pass: true,
    },
    answer: {
      verdicts: {
        "c-schema": "met",
        "c-redact": "partial",
        "c-types": "met",
        "c-erros": "not_met",
        "c-deps": "not_met",
      },
    },
    timestamp: "2026-09-12T10:00:00.000Z",
  });
}

/** Tentativa NOVA contra l16 v4 (critérios divididos da r2.1). */
function freshV4Attempt(): LiteracyEvidenceRecord {
  return buildEvidenceRecord({
    attemptId: "att-l16-v4-fresh",
    lessonId: "l16",
    lessonVersion: 4,
    skillIds: l16.skillIds,
    evaluation: {
      activityId: "l16-a2",
      activityType: "rubric_review",
      checks: [],
      deterministicChecks: {
        "c-schema": true,
        "c-redact-shape": true,
        "c-redact-runtime": true,
        "c-types": true,
        "c-erros": true,
        "c-deps": true,
      },
      score: 1,
      pass: true,
    },
    answer: {
      verdicts: {
        "c-schema": "met",
        "c-redact-shape": "met",
        "c-redact-runtime": "not_met",
        "c-types": "met",
        "c-erros": "not_met",
        "c-deps": "not_met",
      },
    },
    timestamp: "2026-09-30T13:35:00.000Z",
  });
}

async function receiptFor(
  record: LiteracyEvidenceRecord,
  overrides: Partial<LiteracyVerificationReceipt>,
): Promise<LiteracyVerificationReceipt> {
  const base: LiteracyVerificationReceipt = {
    verdict: record.pass ? "PASS" : "FAIL",
    context_isolated: true,
    source: INDEPENDENT_VERIFIER_SOURCE,
    verifier_version: "test-canonical-1",
    verified_at: "2026-09-30T13:36:00.000Z",
    evidence_digest: await evidenceDigest(record),
    lesson_id: record.lessonId,
    lesson_version: record.lessonVersion,
    activity_id: record.activityId,
    attempt_id: record.attemptId,
    independent_pass: record.pass,
    mastery_eligible: record.pass,
    producer_writes_mastered: false,
    max_producer_claim: "completed",
    errors: [],
  };
  return { ...base, ...overrides };
}

describe("bump de conteúdo 2026-09-10.2 → 2026-09-30.1 (l16 v3→v4): caminho real executado", () => {
  it("S1: completed histórico sobrevive na migração forward-only do storage real (regra 4)", () => {
    const before = storageBeforeBump();
    const snapshot = JSON.parse(JSON.stringify(before)) as LearnerProgress;

    const after = migrateProgress(before, contentVersion, MIGRATION_NOW);

    // Antes/depois: o que a regra 4 preserva e o que atualiza.
    expect(after.contentVersion).toBe(contentVersion);
    expect(after.lessonStatus.l16).toBe("completed"); // nada vira não-completed
    expect(after.xp).toBe(snapshot.xp); // experiência mantida
    expect(after.schemaVersion).toBe(snapshot.schemaVersion); // sem rewrite retroativo
    // Skill praticada: revisão devida JÁ (próxima revisão usa a versão nova).
    expect(after.skills.pedir.nextReviewAt).toBe(MIGRATION_NOW.toISOString());
    expect(after.skills.pedir.passes).toBe(2); // histórico de passes intacto
    // Sem conceito de mastery no estado do learner (máximo claim é `completed`).
    expect("mastered" in after).toBe(false);
    expect(Object.values(after.lessonStatus).some((status) => status === "mastered")).toBe(false);
  });

  it("S2: recibo v3 antigo pending é rejeitado EXPLICITAMENTE e a evidência fica retida intacta", async () => {
    const historical = historicalV3Evidence();
    const retainedSnapshot = JSON.parse(JSON.stringify(historical));
    const fresh = freshV4Attempt();

    // Recibo v3 (dígitos da tentativa antiga) chegando agora, avaliado contra a
    // tentativa/registo corrente v4: validação real rejeita com erro explícito.
    const staleReceipt = await receiptFor(historical, {
      lesson_version: 3,
      attempt_id: historical.attemptId,
    });
    await expect(validateReceipt(staleReceipt, fresh)).rejects.toThrow(
      /recibo n.o corresponde exatamente a esta tentativa/i,
    );

    // E o registro histórico não foi tocado: rejeição ≠ perda ≠ reinterpretação.
    expect(historical).toEqual(retainedSnapshot);
    expect(historical.lessonVersion).toBe(3);
    expect(historical.deterministicChecks).toHaveProperty("c-redact");
    expect(historical.deterministicChecks).not.toHaveProperty("c-redact-shape");

    // Um recibo v3 contra o PRÓPRIO registro v3 também não passa pelo conteúdo
    // novo: o par (recibo, registro) v3 é trilha de auditoria — o app não o
    // re-avalia contra critérios v4 nem o promove.
    await expect(validateReceipt(staleReceipt, historical)).resolves.toMatchObject({
      lesson_version: 3,
    });
  });

  it("S3: tentativa nova v4 valida contra o conteúdo atual (PASS, sem escrita de mastered)", async () => {
    const fresh = freshV4Attempt();
    const receipt = await receiptFor(fresh);
    const validated = await validateReceipt(receipt, fresh);
    expect(validated.verdict).toBe("PASS");
    expect(validated.independent_pass).toBe(true);
    expect(validated.mastery_eligible).toBe(true); // elegível — promoção continua externa ao produtor
    expect(validated.producer_writes_mastered).toBe(false);
    expect(validated.max_producer_claim).toBe("completed");
    expect(validated.lesson_version).toBe(4);
  });
});

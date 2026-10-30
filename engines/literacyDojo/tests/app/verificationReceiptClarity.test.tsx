import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ServicesProvider } from "../../src/app/services";
import type { LiteracyEvidenceRecord } from "../../src/domain/evidence";
import type { LiteracyVerificationReceipt } from "../../src/domain/verification";
import { ResultScreen } from "../../src/screens/ResultScreen";
import { makeServices } from "../helpers";

it.each([
  { verdict: "PASS", unknown: false, hosted: false },
  { verdict: "FAIL", unknown: false, hosted: false },
  { verdict: "PASS", unknown: true, hosted: true },
] as const)(
  "explica o recibo $verdict como resultado de uma atividade (desconhecida: $unknown)",
  async ({ verdict, unknown, hosted }) => {
    const { services } = makeServices();
    const lesson = services.content.getLesson("l02");
    if (!lesson || lesson.activities.length < 3) throw new Error("lição incompleta");
    const activityId = unknown ? "atividade-ausente" : lesson.activities[1].id;
    const record: LiteracyEvidenceRecord = {
      schemaVersion: 1,
      source: "literacydojo",
      attemptId: "att-sintetica",
      lessonId: lesson.id,
      lessonVersion: lesson.version,
      activityId,
      activityType: "choice",
      skillIds: ["avaliar"],
      deterministicChecks: {},
      score: 1,
      pass: true,
      timestamp: "2026-08-05T12:00:00.000Z",
      verifierRequired: true,
      answer: { optionIds: [] },
    };
    const receipt: LiteracyVerificationReceipt = {
      verdict,
      context_isolated: true,
      source: "independent-literacy-verifier",
      verifier_version: "teste",
      verified_at: "2026-08-05T12:00:01.000Z",
      evidence_digest: "synthetic",
      lesson_id: lesson.id,
      lesson_version: lesson.version,
      activity_id: activityId,
      attempt_id: record.attemptId,
      independent_pass: verdict === "PASS",
      mastery_eligible: false,
      producer_writes_mastered: false,
      max_producer_claim: "completed",
      errors: [],
    };
    vi.spyOn(services.verification, "verify").mockResolvedValue(receipt);
    render(
      <ServicesProvider value={services}>
        <ResultScreen
          summary={{ lesson, lessonScore: 1, activityResults: [], evidenceRecord: record }}
          hosted={hosted}
          onNextLesson={() => {}}
          onHome={() => {}}
          onMap={() => {}}
        />
      </ServicesProvider>,
    );
    const card = screen.getByTestId("verification-status");
    expect(await within(card).findByText(/Recibo independente:/)).toHaveTextContent(
      verdict === "PASS" ? "tentativa aprovada" : "tentativa não confirmada",
    );
    if (verdict === "FAIL")
      expect(card).toHaveTextContent(
        "não significa necessariamente que sua resposta esteja errada",
      );
    expect(card).toHaveTextContent(
      unknown
        ? "somente à tentativa de uma atividade"
        : `somente à tentativa da atividade 2 de ${lesson.activities.length}`,
    );
    expect(card).toHaveTextContent(record.attemptId);
    expect(card).toHaveTextContent("não altera domínio canônico");
    if (!hosted)
      expect(screen.getByTestId("completion-distinction")).toHaveTextContent(
        "comprovação de competência exige verificação independente",
      );
  },
);

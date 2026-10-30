import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HttpVerificationClient } from "../../src/adapters/httpVerificationClient";
import { ServicesProvider } from "../../src/app/services";
import type { LiteracyEvidenceRecord } from "../../src/domain/evidence";
import { ResultScreen } from "../../src/screens/ResultScreen";
import { makeServices } from "../helpers";

afterEach(() => vi.unstubAllGlobals());

it("explica falha de conexão sem expor erro técnico e permite tentar novamente", async () => {
  const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
  vi.stubGlobal("fetch", fetchMock);
  const { services } = makeServices();
  services.verification = new HttpVerificationClient("/local-test-verifier");
  const lesson = services.content.getLesson("l02");
  if (!lesson) throw new Error("lição ausente");
  const record: LiteracyEvidenceRecord = {
    schemaVersion: 1,
    source: "literacydojo",
    attemptId: "att-test",
    lessonId: "l02",
    lessonVersion: 4,
    activityId: "l02-a1",
    activityType: "output_comparison",
    skillIds: ["avaliar"],
    deterministicChecks: { betterOutputId: true },
    score: 1,
    pass: true,
    timestamp: "2026-08-05T12:00:00.000Z",
    verifierRequired: true,
    answer: { outputId: "out-b", criterionIds: ["c-fontes"] },
  };
  render(
    <ServicesProvider value={services}>
      <ResultScreen
        summary={{ lesson, lessonScore: 1, activityResults: [], evidenceRecord: record }}
        onNextLesson={() => {}}
        onHome={() => {}}
        onMap={() => {}}
      />
    </ServicesProvider>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível conectar ao verificador",
  );
  expect(screen.getByRole("alert")).not.toHaveTextContent("Failed to fetch");
  fireEvent.click(screen.getByTestId("retry-verification"));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(screen.getByTestId("retry-verification")).toBeVisible();
});

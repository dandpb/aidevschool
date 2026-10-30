import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServicesProvider } from "../../src/app/services";
import type { LiteracyEvidenceRecord } from "../../src/domain/evidence";
import { ResultScreen } from "../../src/screens/ResultScreen";
import { makeServices } from "../helpers";

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

describe("retry de verificação", () => {
  it("evita pedidos duplicados e mantém foco enquanto nova verificação aguarda", async () => {
    const { services } = makeServices();
    const lesson = services.content.getLesson("l02");
    if (!lesson) throw new Error("lição ausente");
    let reject!: () => void;
    const verify = vi
      .spyOn(services.verification, "verify")
      .mockRejectedValueOnce(new Error("unavailable"))
      .mockImplementation(
        () =>
          new Promise((_, fail) => {
            reject = () => fail(new Error("still unavailable"));
          }),
      );
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
    const retry = await screen.findByTestId("retry-verification");
    retry.focus();
    act(() => {
      retry.click();
      retry.click();
    });
    expect(verify).toHaveBeenCalledTimes(2);
    expect(retry).toHaveAttribute("aria-disabled", "true");
    expect(retry).toHaveFocus();
    await act(async () => {
      reject();
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("still unavailable");
    expect(retry).toHaveAttribute("aria-disabled", "false");
    expect(retry).toHaveFocus();
    act(() => {
      retry.click();
    });
    expect(verify).toHaveBeenCalledTimes(3);
    await act(async () => {
      reject();
    });
    expect(retry).toHaveAttribute("aria-disabled", "false");
    expect(retry).toHaveFocus();
  });
});

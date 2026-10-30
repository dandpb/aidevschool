import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServicesProvider } from "../../src/app/services";
import type { LiteracyEvidenceRecord } from "../../src/domain/evidence";
import type { LiteracyVerificationReceipt } from "../../src/domain/verification";
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

const fakeReceipt: LiteracyVerificationReceipt = {
  verdict: "FAIL",
  context_isolated: true,
  source: "independent-literacy-verifier",
  verifier_version: "fake-test",
  verified_at: "2026-08-05T12:00:01.000Z",
  evidence_digest: "test",
  lesson_id: record.lessonId,
  lesson_version: record.lessonVersion,
  activity_id: record.activityId,
  attempt_id: record.attemptId,
  independent_pass: false,
  mastery_eligible: false,
  producer_writes_mastered: false,
  max_producer_claim: "completed",
  errors: [],
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
  it("retorna foco ao recibo após retry bem-sucedido, se o usuário não mudou de foco", async () => {
    const { services } = makeServices();
    const lesson = services.content.getLesson("l02");
    if (!lesson) throw new Error("lição ausente");
    let release!: () => void;
    vi.spyOn(services.verification, "verify")
      .mockRejectedValueOnce(new Error("unavailable"))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = () => resolve(fakeReceipt);
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
    });
    await act(async () => {
      release();
    });
    expect(screen.getByText(/Recibo independente: FAIL/)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Verificação da tentativa" })).toHaveFocus();
  });
  it("não desloca foco escolhido durante retry pendente", async () => {
    const { services } = makeServices();
    const lesson = services.content.getLesson("l02");
    if (!lesson) throw new Error("lição ausente");
    let release!: () => void;
    vi.spyOn(services.verification, "verify")
      .mockRejectedValueOnce(new Error("unavailable"))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = () => resolve(fakeReceipt);
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
    });
    const map = screen.getByTestId("go-map");
    map.focus();
    await act(async () => {
      release();
    });
    expect(screen.getByText(/Recibo independente: FAIL/)).toBeVisible();
    expect(map).toHaveFocus();
  });
  it("verificação automática não desloca o foco já escolhido", async () => {
    const { services } = makeServices();
    const lesson = services.content.getLesson("l02");
    if (!lesson) throw new Error("lição ausente");
    let release!: () => void;
    vi.spyOn(services.verification, "verify").mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(fakeReceipt);
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
    const map = screen.getByTestId("go-map");
    map.focus();
    await act(async () => {
      release();
    });
    expect(screen.getByText(/Recibo independente: FAIL/)).toBeVisible();
    expect(map).toHaveFocus();
  });
  it("não restaura foco após clique deliberado na área vazia", async () => {
    const { services } = makeServices();
    const lesson = services.content.getLesson("l02");
    if (!lesson) throw new Error("lição ausente");
    let release!: () => void;
    vi.spyOn(services.verification, "verify")
      .mockRejectedValueOnce(new Error("unavailable"))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = () => resolve(fakeReceipt);
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
    });
    fireEvent.pointerDown(document.body);
    await act(async () => {
      release();
    });
    expect(screen.getByText(/Recibo independente: FAIL/)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Verificação da tentativa" })).not.toHaveFocus();
  });
});

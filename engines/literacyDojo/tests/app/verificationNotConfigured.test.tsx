import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { UnavailableVerificationClient } from "../../src/adapters/httpVerificationClient";
import { ServicesProvider } from "../../src/app/services";
import { VerificationNotConfiguredError } from "../../src/application/verificationErrors";
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

it("classifica a falta de configuração e não oferece repetição no resultado hospedado", async () => {
  const { services } = makeServices();
  services.verification = new UnavailableVerificationClient();
  const verify = vi.spyOn(services.verification, "verify");
  const lesson = services.content.getLesson("l02");
  if (!lesson) throw new Error("lição ausente");
  render(
    <ServicesProvider value={services}>
      <ResultScreen
        summary={{ lesson, lessonScore: 1, activityResults: [], evidenceRecord: record }}
        hosted
        onNextLesson={() => {}}
        onHome={() => {}}
        onMap={() => {}}
      />
    </ServicesProvider>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("ainda não está configurada");
  expect(screen.queryByTestId("retry-verification")).not.toBeInTheDocument();
  expect(verify).toHaveBeenCalledOnce();
  await expect(new UnavailableVerificationClient().verify()).rejects.toBeInstanceOf(
    VerificationNotConfiguredError,
  );
});

it("sem evidência não inicia verificação nem apresenta retry", () => {
  const { services } = makeServices();
  const verify = vi.spyOn(services.verification, "verify");
  const lesson = services.content.getLesson("l02");
  if (!lesson) throw new Error("lição ausente");
  render(
    <ServicesProvider value={services}>
      <ResultScreen
        summary={{ lesson, lessonScore: 1, activityResults: [] }}
        onNextLesson={() => {}}
        onHome={() => {}}
        onMap={() => {}}
      />
    </ServicesProvider>,
  );
  expect(screen.getByTestId("verification-status")).toHaveTextContent("Nenhuma tentativa aprovada");
  expect(screen.queryByTestId("retry-verification")).not.toBeInTheDocument();
  expect(verify).not.toHaveBeenCalled();
});

it("preserva referência de foco se um retry se torna não configurado", async () => {
  const { services } = makeServices();
  vi.spyOn(services.verification, "verify")
    .mockRejectedValueOnce(new Error("falha temporária"))
    .mockRejectedValueOnce(new VerificationNotConfiguredError("não configurada"));
  const lesson = services.content.getLesson("l02");
  if (!lesson) throw new Error("lição ausente");
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
  fireEvent.click(retry);
  await waitFor(() => expect(screen.queryByTestId("retry-verification")).not.toBeInTheDocument());
  expect(screen.getByRole("heading", { name: "Verificação da tentativa" })).toHaveFocus();
});

it("não desloca foco escolhido enquanto o retry aguarda", async () => {
  const { services } = makeServices();
  let reject!: (error: Error) => void;
  vi.spyOn(services.verification, "verify")
    .mockRejectedValueOnce(new Error("falha temporária"))
    .mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
  const lesson = services.content.getLesson("l02");
  if (!lesson) throw new Error("lição ausente");
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
  fireEvent.click(retry);
  const map = screen.getByTestId("go-map");
  map.focus();
  await act(async () => reject(new VerificationNotConfiguredError("não configurada")));
  expect(screen.queryByTestId("retry-verification")).not.toBeInTheDocument();
  expect(map).toHaveFocus();
});

it.each(["wheel", "keydown"] as const)(
  "não retorna foco após %s durante o retry",
  async (event) => {
    const { services } = makeServices();
    let reject!: (error: Error) => void;
    vi.spyOn(services.verification, "verify")
      .mockRejectedValueOnce(new Error("falha temporária"))
      .mockImplementationOnce(
        () =>
          new Promise((_, fail) => {
            reject = fail;
          }),
      );
    const lesson = services.content.getLesson("l02");
    if (!lesson) throw new Error("lição ausente");
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
    fireEvent.click(retry);
    if (event === "wheel") fireEvent.wheel(document);
    else fireEvent.keyDown(document, { key: "PageDown" });
    await act(async () => reject(new VerificationNotConfiguredError("não configurada")));
    expect(screen.queryByTestId("retry-verification")).not.toBeInTheDocument();
    expect(document.body).toHaveFocus();
  },
);

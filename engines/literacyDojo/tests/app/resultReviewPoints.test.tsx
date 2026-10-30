import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ActivityResultSummary } from "../../src/app/App";
import { ServicesProvider } from "../../src/app/services";
import { lessons } from "../../src/data/generated/lessons";
import { ResultScreen } from "../../src/screens/ResultScreen";
import { makeServices } from "../helpers";

const lesson = lessons.find((item) => item.id === "l12");
if (!lesson) throw new Error("lição ausente");

function show(results: ActivityResultSummary[], hosted = false) {
  const { services } = makeServices();
  return render(
    <ServicesProvider value={services}>
      <ResultScreen
        summary={{ lesson: lesson!, lessonScore: 0.9, activityResults: results, mode: "review" }}
        onNextLesson={() => {}}
        onHome={() => {}}
        onMap={() => {}}
        hosted={hosted}
      />
    </ServicesProvider>,
  );
}
function result(
  activityId: string,
  checks: ActivityResultSummary["feedback"]["perCheck"],
): ActivityResultSummary {
  return {
    activityId,
    pass: true,
    score: 0.8,
    feedback: { pass: true, score: 0.8, summary: "Aprovado", perCheck: checks },
  };
}

describe("pontos de revisão no resultado", () => {
  it("agrupa mensagens por atividade e sinaliza detalhe ausente sem repetir mensagens", () => {
    show([
      result("l12-a1", [
        { checkId: "a", passed: false, message: "Primeiro cuidado" },
        { checkId: "b", passed: false, message: "Primeiro cuidado" },
      ]),
      result("l12-a2", [
        { checkId: "a", passed: false },
        { checkId: "c", passed: false, message: "Outro cuidado" },
      ]),
      result("l12-a3", [{ checkId: "ok", passed: true }]),
    ]);
    const card = screen.getByTestId("result-review-points");
    expect(within(card).getByRole("heading", { name: "Atividade 1" })).toBeVisible();
    expect(within(card).getByRole("heading", { name: "Atividade 2" })).toBeVisible();
    expect(within(card).getAllByText("Primeiro cuidado")).toHaveLength(1);
    expect(within(card).getByText("Outro cuidado")).toBeVisible();
    expect(within(card).getByText(/detalhes desta tentativa não estão disponíveis/i)).toBeVisible();
    expect(within(card).queryByRole("heading", { name: "Atividade 3" })).toBeNull();
    expect(screen.getByRole("heading", { name: "O que foi bem" })).toBeVisible();
  });
  it("também mostra detalhe parcial no resultado de revisão hospedado", () => {
    show(
      [result("l12-a1", [{ checkId: "senha", passed: false, message: "Não compartilhe senhas" }])],
      true,
    );
    expect(screen.getByTestId("result-review-points")).toHaveTextContent("Não compartilhe senhas");
    expect(screen.getByText(/Revisão concluída/)).toBeVisible();
  });
  it("não mostra seção de revisão quando tudo está correto, também no host", () => {
    show([result("l12-a1", [{ checkId: "ok", passed: true }])], true);
    expect(screen.queryByTestId("result-review-points")).toBeNull();
    expect(screen.getByText(/Revisão concluída/)).toBeVisible();
  });
});

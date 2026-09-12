import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import { modules } from "../../src/data/generated/lessons";
import { MAP_INITIAL_LESSON_ID, createInitialProgress } from "../../src/domain/progress";
import type { LearnerProgress } from "../../src/domain/progress";
import { makeServices } from "../helpers";

/**
 * AID-1089/W2 — state contract (proposta AID-914 §2.3, doc proposal rev 1) no
 * loop de lição do literacyDojo:
 * - loading assíncrono: controle disable + aria-busy + região role=status;
 * - preservação de foco no retry (heading tabIndex=-1 + foco programático);
 * - container de feedback aria-live polite + aria-atomic.
 *
 * A primeira atividade do Mapa Inicial (l02-a1) é um output_comparison:
 * escolher a saída errada (out-a) sem critério é resposta completa e errada.
 */
const INSTRUCTION =
  "Duas respostas de IA para o mesmo pedido estão abaixo. Escolha qual delas é mais confiável para usar no trabalho e marque os motivos que justificam a sua escolha.";
const FAILURE_TEXT =
  "Quase lá. Uma resposta confiante não é necessariamente confiável: antes de usar, procure dois sinais — a resposta diz de onde vêm os dados e admite o que não sabe?";

async function answerWrong(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId("output-out-a"));
}

function seededProgress(): LearnerProgress {
  const progress = createInitialProgress(modules, "test-content-version");
  progress.onboarding = { completed: true, taskCategory: "scheduling" };
  progress.lessonStatus[MAP_INITIAL_LESSON_ID] = "available";
  progress.currentLessonId = MAP_INITIAL_LESSON_ID;
  return progress;
}

async function enterLessonPlayer(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByTestId("home-screen");
  await user.click(screen.getByTestId("continue-button"));
  await screen.findByTestId("lesson-intro");
  await user.click(screen.getByTestId("start-lesson"));
  await screen.findByTestId("lesson-player");
}

describe("AID-1089/W2: state contract no loop de lição", () => {
  it("loading: submit desabilita + aria-busy e região role=status anuncia o andamento", async () => {
    const user = userEvent.setup();
    const { services } = makeServices({ progress: seededProgress() });
    let releaseSubmission: (() => void) | undefined;
    const originalSubmit = services.useCases.submitActivityAttempt.bind(services.useCases);
    vi.spyOn(services.useCases, "submitActivityAttempt").mockImplementation((input) => {
      releaseSubmission?.();
      return new Promise((resolve) => {
        releaseSubmission = () => resolve(originalSubmit(input));
      });
    });
    render(<App services={services} />);

    await enterLessonPlayer(user);
    await answerWrong(user);
    const submit = screen.getByTestId("submit-attempt");
    await user.click(submit);

    // Durante o voo: controle desabilitado + aria-busy + região role=status.
    await waitFor(() => {
      expect(screen.getByTestId("lesson-busy")).toBeInTheDocument();
    });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute("aria-busy", "true");
    // <output> tem role=status implícito.
    expect(screen.getByRole("status")).toHaveTextContent("Verificando sua resposta");

    releaseSubmission?.();
    await screen.findByTestId("feedback-panel");
    expect(screen.queryByTestId("lesson-busy")).not.toBeInTheDocument();
    expect(submit).not.toHaveAttribute("aria-busy", "true");
  });

  it("retry: foco é preservado no heading tabIndex=-1 (não cai no body)", async () => {
    const user = userEvent.setup();
    const { services } = makeServices({ progress: seededProgress() });
    render(<App services={services} />);

    await enterLessonPlayer(user);
    await answerWrong(user);
    await user.click(screen.getByTestId("submit-attempt"));
    await screen.findByTestId("feedback-panel");

    const retry = screen.getByTestId("retry-activity");
    await user.click(retry);
    await waitFor(() => {
      expect(screen.queryByTestId("feedback-panel")).not.toBeInTheDocument();
    });
    const heading = screen.getByRole("heading", { name: INSTRUCTION });
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(document.activeElement).toBe(heading);
  });

  it("feedback container: aria-live polite + aria-atomic (estado por cor+borda+texto)", async () => {
    const user = userEvent.setup();
    const { services } = makeServices({ progress: seededProgress() });
    render(<App services={services} />);

    await enterLessonPlayer(user);
    await answerWrong(user);
    await user.click(screen.getByTestId("submit-attempt"));
    const feedback = await screen.findByTestId("feedback-panel");
    expect(feedback).toHaveAttribute("aria-live", "polite");
    expect(feedback).toHaveAttribute("aria-atomic", "true");
    // O texto do conteúdo comunica o estado (nunca só cor).
    expect(feedback).toHaveTextContent(FAILURE_TEXT);
  });
});

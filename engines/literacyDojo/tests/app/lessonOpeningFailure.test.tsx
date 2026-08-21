import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import { MAP_INITIAL_LESSON_ID } from "../../src/domain/progress";
import { makeServices } from "../helpers";

describe("abertura de lição", () => {
  it("mantém a tela atual e informa quando o progresso não pode ser salvo", async () => {
    const user = userEvent.setup();
    const { services, progressRepo, initial } = makeServices();
    initial.onboarding = { completed: true, taskCategory: "scheduling" };
    initial.lessonStatus.l01 = "locked";
    initial.lessonStatus[MAP_INITIAL_LESSON_ID] = "available";
    initial.currentLessonId = MAP_INITIAL_LESSON_ID;
    progressRepo.seed(initial);
    vi.spyOn(progressRepo, "save").mockRejectedValueOnce(new Error("quota indisponível"));
    render(<App services={services} />);

    await screen.findByTestId("home-screen");
    await user.click(screen.getByTestId("continue-button"));

    expect(await screen.findByTestId("lesson-open-error")).toHaveTextContent(
      "Não foi possível salvar seu progresso",
    );
    expect(screen.getByTestId("home-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("lesson-intro")).not.toBeInTheDocument();
  });

  it("mantém Progresso aberto quando a revisão é rejeitada", async () => {
    const user = userEvent.setup();
    const { services, progressRepo, initial } = makeServices();
    initial.onboarding = { completed: true, taskCategory: "scheduling" };
    initial.lessonStatus[MAP_INITIAL_LESSON_ID] = "completed";
    initial.skills.entender = {
      skillId: "entender",
      attempts: 1,
      passes: 1,
      lastScore: 1,
      lastPracticedAt: "2026-07-18T12:00:00.000Z",
      nextReviewAt: "2026-07-19T11:59:59.000Z",
    };
    progressRepo.seed(initial);
    vi.spyOn(services.useCases, "startReview").mockRejectedValueOnce(
      new Error("revisão bloqueada"),
    );
    render(<App services={services} />);

    await screen.findByTestId("home-screen");
    await user.click(screen.getByTestId("open-progress"));
    await user.click(await screen.findByTestId(`progress-review-${MAP_INITIAL_LESSON_ID}`));

    expect(await screen.findByTestId("lesson-open-error")).toHaveTextContent(
      "Não foi possível iniciar esta revisão",
    );
    expect(screen.getByTestId("progress-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("lesson-intro")).not.toBeInTheDocument();
  });
});

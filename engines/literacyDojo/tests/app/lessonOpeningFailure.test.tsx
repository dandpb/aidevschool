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
});

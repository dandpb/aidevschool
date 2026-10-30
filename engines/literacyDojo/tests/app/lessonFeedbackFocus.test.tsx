import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import { MAP_INITIAL_LESSON_ID } from "../../src/domain/progress";
import { makeServices } from "../helpers";

describe("foco durante verificação", () => {
  it("não desloca foco escolhido durante tentativa pendente", async () => {
    const { services, stateStore, initial } = makeServices();
    initial.onboarding = { completed: true, taskCategory: "scheduling" };
    initial.lessonStatus.l01 = "locked";
    initial.lessonStatus[MAP_INITIAL_LESSON_ID] = "available";
    initial.currentLessonId = MAP_INITIAL_LESSON_ID;
    stateStore.seedProgress(initial);
    const real = services.useCases.submitActivityAttempt.bind(services.useCases);
    let release!: () => void;
    vi.spyOn(services.useCases, "submitActivityAttempt").mockImplementationOnce(
      (input) =>
        new Promise((resolve) => {
          release = () => resolve(real(input));
        }),
    );
    const user = userEvent.setup();
    render(<App services={services} />);
    await user.click(await screen.findByTestId("continue-button"));
    await user.click(await screen.findByTestId("start-lesson"));
    await user.click(screen.getByTestId("output-out-a"));
    await user.click(screen.getByTestId("submit-attempt"));
    const exit = screen.getByRole("button", { name: "Sair da lição" });
    exit.focus();
    await act(async () => {
      release();
    });
    expect(await screen.findByTestId("feedback-panel")).toBeVisible();
    expect(exit).toHaveFocus();
  });
});

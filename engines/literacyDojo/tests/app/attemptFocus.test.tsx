import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import { MAP_INITIAL_LESSON_ID } from "../../src/domain/progress";
import { makeServices } from "../helpers";

describe("foco após falha de envio", () => {
  it("não toma o foco de outro controle escolhido enquanto o envio está pendente", async () => {
    const user = userEvent.setup();
    const { services, stateStore, initial } = makeServices();
    initial.onboarding = { completed: true, taskCategory: "scheduling" };
    initial.lessonStatus.l01 = "locked";
    initial.lessonStatus[MAP_INITIAL_LESSON_ID] = "available";
    initial.currentLessonId = MAP_INITIAL_LESSON_ID;
    stateStore.seedProgress(initial);
    let reject!: () => void;
    vi.spyOn(services.useCases, "submitActivityAttempt").mockImplementation(
      () =>
        new Promise((_, fail) => {
          reject = () => fail(new Error("simulated"));
        }),
    );
    render(<App services={services} />);
    await user.click(await screen.findByTestId("continue-button"));
    await user.click(await screen.findByTestId("start-lesson"));
    await user.click(screen.getByTestId("output-out-a"));
    await user.click(screen.getByTestId("submit-attempt"));
    const exit = screen.getByRole("button", { name: "Sair da lição" });
    exit.focus();
    await act(async () => {
      reject();
    });
    await screen.findByRole("alert");
    expect(exit).toHaveFocus();
  });
  it("não restaura foco após interação deliberada com a área vazia", async () => {
    const user = userEvent.setup();
    const { services, stateStore, initial } = makeServices();
    initial.onboarding = { completed: true, taskCategory: "scheduling" };
    initial.lessonStatus.l01 = "locked";
    initial.lessonStatus[MAP_INITIAL_LESSON_ID] = "available";
    initial.currentLessonId = MAP_INITIAL_LESSON_ID;
    stateStore.seedProgress(initial);
    let reject!: () => void;
    vi.spyOn(services.useCases, "submitActivityAttempt").mockImplementation(
      () =>
        new Promise((_, fail) => {
          reject = () => fail(new Error("simulated"));
        }),
    );
    render(<App services={services} />);
    await user.click(await screen.findByTestId("continue-button"));
    await user.click(await screen.findByTestId("start-lesson"));
    await user.click(screen.getByTestId("output-out-a"));
    await user.click(screen.getByTestId("submit-attempt"));
    await screen.findByTestId("submit-attempt").then((button) => expect(button).toBeDisabled());
    document.body.tabIndex = -1;
    document.body.focus();
    document.body.removeAttribute("tabindex");
    fireEvent.pointerDown(document.body);
    await act(async () => {
      reject();
    });
    await screen.findByRole("alert");
    expect(document.body).toHaveFocus();
  });
});

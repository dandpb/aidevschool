import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import { MAP_INITIAL_LESSON_ID } from "../../src/domain/progress";
import { makeServices } from "../helpers";

describe("recuperação de tentativa", () => {
  it("informa falha, preserva resposta e permite nova verificação deliberada", async () => {
    const user = userEvent.setup();
    const { services, stateStore, initial } = makeServices();
    initial.onboarding = { completed: true, taskCategory: "scheduling" };
    initial.lessonStatus.l01 = "locked";
    initial.lessonStatus[MAP_INITIAL_LESSON_ID] = "available";
    initial.currentLessonId = MAP_INITIAL_LESSON_ID;
    stateStore.seedProgress(initial);
    render(<App services={services} />);
    await user.click(await screen.findByTestId("continue-button"));
    await user.click(await screen.findByTestId("start-lesson"));
    await user.click(screen.getByTestId("output-out-a"));
    vi.spyOn(stateStore, "saveState").mockRejectedValueOnce(new Error("private storage detail"));
    await user.click(screen.getByTestId("submit-attempt"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível confirmar");
    expect(screen.getByRole("alert")).not.toHaveTextContent("private storage detail");
    expect(screen.getByTestId("output-out-a")).toBeChecked();
    expect(screen.getByTestId("submit-attempt")).toBeEnabled();
    await user.click(screen.getByTestId("submit-attempt"));
    expect(await screen.findByTestId("feedback-panel")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("avisa quando a falha ocorre depois da gravação, sem reenviar automaticamente", async () => {
    const user = userEvent.setup();
    const { services, stateStore, initial } = makeServices();
    initial.onboarding = { completed: true, taskCategory: "scheduling" };
    initial.lessonStatus.l01 = "locked";
    initial.lessonStatus[MAP_INITIAL_LESSON_ID] = "available";
    initial.currentLessonId = MAP_INITIAL_LESSON_ID;
    stateStore.seedProgress(initial);
    render(<App services={services} />);
    await user.click(await screen.findByTestId("continue-button"));
    await user.click(await screen.findByTestId("start-lesson"));
    await user.click(screen.getByTestId("output-out-a"));
    const emission = vi.spyOn(services.evidence, "emit").mockImplementationOnce(() => {
      throw new Error("evidence unavailable");
    });
    await user.click(screen.getByTestId("submit-attempt"));
    expect(await screen.findByRole("alert")).toHaveTextContent("pode já ter sido registrada");
    expect((await stateStore.loadProgress())?.counters.attempts).toBe(1);
    expect(emission).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("output-out-a")).toBeChecked();
  });
});

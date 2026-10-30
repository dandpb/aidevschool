import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import { ServicesProvider } from "../../src/app/services";
import { MAP_INITIAL_LESSON_ID } from "../../src/domain/progress";
import { LessonScreen } from "../../src/screens/LessonScreen";
import { makeServices } from "../helpers";

describe("saída durante gravação", () => {
  it("mantém a lição até a tentativa terminar e libera a saída depois", async () => {
    const { services, stateStore, initial } = makeServices();
    initial.onboarding = { completed: true, taskCategory: "scheduling" };
    initial.lessonStatus.l01 = "locked";
    initial.lessonStatus[MAP_INITIAL_LESSON_ID] = "available";
    initial.currentLessonId = MAP_INITIAL_LESSON_ID;
    stateStore.seedProgress(initial);
    let release!: () => void;
    const real = services.useCases.submitActivityAttempt.bind(services.useCases);
    vi.spyOn(services.useCases, "submitActivityAttempt").mockImplementation(
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
    expect(exit).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(exit);
    expect(screen.getByTestId("lesson-player")).toBeVisible();
    await act(async () => {
      release();
    });
    await screen.findByTestId("feedback-panel");
    expect(exit).toHaveAttribute("aria-disabled", "false");
    await user.click(exit);
    expect(await screen.findByTestId("map-screen")).toBeVisible();
  });
  it("bloqueia saída durante dica e retry, liberando após falha ou sucesso", async () => {
    const { services, stateStore, initial } = makeServices();
    initial.onboarding = { completed: true, taskCategory: "scheduling" };
    initial.lessonStatus.l01 = "locked";
    initial.lessonStatus[MAP_INITIAL_LESSON_ID] = "available";
    initial.currentLessonId = MAP_INITIAL_LESSON_ID;
    stateStore.seedProgress(initial);
    const user = userEvent.setup();
    render(<App services={services} />);
    await user.click(await screen.findByTestId("continue-button"));
    await user.click(await screen.findByTestId("start-lesson"));
    let rejectHint!: () => void;
    vi.spyOn(services.useCases, "requestHint").mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectHint = () => reject(new Error("simulated"));
        }),
    );
    await user.click(screen.getByTestId("hint-button"));
    let exit = screen.getByRole("button", { name: "Sair da lição" });
    expect(exit).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(exit);
    expect(screen.getByTestId("lesson-player")).toBeVisible();
    await act(async () => {
      rejectHint();
    });
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(exit).toHaveAttribute("aria-disabled", "false");
    await user.click(screen.getByTestId("output-out-a"));
    await user.click(screen.getByTestId("submit-attempt"));
    await screen.findByTestId("feedback-panel");
    const realRetry = services.useCases.retryActivity.bind(services.useCases);
    let releaseRetry!: () => void;
    vi.spyOn(services.useCases, "retryActivity").mockImplementationOnce(
      (input) =>
        new Promise((resolve) => {
          releaseRetry = () => resolve(realRetry(input));
        }),
    );
    await user.click(screen.getByTestId("retry-activity"));
    exit = screen.getByRole("button", { name: "Sair da lição" });
    expect(exit).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(exit);
    expect(screen.getByTestId("lesson-player")).toBeVisible();
    await act(async () => {
      releaseRetry();
    });
    expect(exit).toHaveAttribute("aria-disabled", "false");
  });

  it("bloqueia saída enquanto a conclusão da revisão está pendente", async () => {
    const { services, stateStore, initial } = makeServices();
    initial.onboarding = { completed: true, taskCategory: "scheduling" };
    initial.lessonStatus[MAP_INITIAL_LESSON_ID] = "completed";
    stateStore.seedProgress(initial);
    const onExit = vi.fn();
    let reject!: () => void;
    vi.spyOn(services.useCases, "completeReview").mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = () => fail(new Error("simulated"));
        }),
    );
    const user = userEvent.setup();
    render(
      <ServicesProvider value={services}>
        <LessonScreen
          lessonId={MAP_INITIAL_LESSON_ID}
          mode="review"
          reviewStage={0}
          onboarding={initial.onboarding}
          onProgressChange={() => {}}
          onCompleted={() => {}}
          onExit={onExit}
        />
      </ServicesProvider>,
    );
    await user.click(screen.getByTestId("start-lesson"));
    await user.click(screen.getByTestId("output-out-b"));
    await user.click(screen.getByTestId("criterion-c-fontes"));
    await user.click(screen.getByTestId("criterion-c-limites"));
    await user.click(screen.getByTestId("submit-attempt"));
    await user.click(await screen.findByTestId("next-activity"));
    await user.click(screen.getByTestId("option-opt-verifica-na-fonte"));
    await user.click(screen.getByTestId("submit-attempt"));
    await user.click(await screen.findByTestId("next-activity"));
    await user.click(screen.getByTestId("submit-attempt"));
    await user.click(await screen.findByTestId("finish-lesson"));
    const exit = screen.getByRole("button", { name: "Sair da revisão" });
    expect(exit).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(exit);
    expect(onExit).not.toHaveBeenCalled();
    await act(async () => {
      reject();
    });
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(exit).toHaveAttribute("aria-disabled", "false");
    await user.click(exit);
    expect(onExit).toHaveBeenCalledOnce();
  });
});

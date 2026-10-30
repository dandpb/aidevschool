import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import { makeServices } from "../helpers";

function setup() {
  const { services, stateStore, initial } = makeServices();
  initial.onboarding = { completed: true, taskCategory: "scheduling" };
  initial.lessonStatus.l01 = "locked";
  initial.lessonStatus.l02 = "available";
  initial.currentLessonId = "l02";
  stateStore.seedProgress(initial);
  return { services, stateStore };
}

async function completeActivities(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByTestId("continue-button"));
  await user.click(await screen.findByTestId("start-lesson"));
  await answerActivities(user);
}

async function answerActivities(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId("output-out-b"));
  await user.click(screen.getByTestId("criterion-c-fontes"));
  await user.click(screen.getByTestId("criterion-c-limites"));
  await user.click(screen.getByTestId("submit-attempt"));
  await user.click(await screen.findByTestId("next-activity"));
  await user.click(screen.getByTestId("option-opt-verifica-na-fonte"));
  await user.click(screen.getByTestId("submit-attempt"));
  await user.click(await screen.findByTestId("next-activity"));
  await user.click(screen.getByTestId("submit-attempt"));
  await screen.findByTestId("finish-lesson");
}

it("reconcilia conclusão gravada sem inventar resultado nem repetir envio", async () => {
  const { services, stateStore } = setup();
  const user = userEvent.setup();
  render(<App services={services} />);
  await completeActivities(user);
  const complete = vi.spyOn(services.useCases, "completeLesson");
  vi.spyOn(services.analytics, "track").mockImplementationOnce(() => {
    throw new Error("falha após save");
  });
  await user.click(screen.getByTestId("finish-lesson"));
  expect(await screen.findByText(/Não foi possível confirmar a conclusão/)).toBeVisible();
  await waitFor(() => expect(document.querySelector(".product-stats")).toHaveTextContent("55 XP"));
  expect((await stateStore.loadProgress())?.lessonStatus.l02).toBe("completed");
  expect(screen.queryByTestId("result-screen")).not.toBeInTheDocument();
  expect(complete).toHaveBeenCalledTimes(1);
  await waitFor(() =>
    expect(screen.getByTestId("finish-lesson")).toHaveAttribute("aria-disabled", "false"),
  );
  await user.click(screen.getByTestId("finish-lesson"));
  expect(await screen.findByTestId("result-screen")).toBeVisible();
  expect(complete).toHaveBeenCalledTimes(2);
  expect((await stateStore.loadProgress())?.xp).toBe(55);
  await user.click(screen.getByTestId("go-map"));
  expect(await screen.findByTestId("map-lesson-l02")).toHaveTextContent("Concluída");
});

it("respeita foco escolhido enquanto confere a conclusão", async () => {
  const { services } = setup();
  const user = userEvent.setup();
  const original = services.useCases.readProgressForRecovery.bind(services.useCases);
  let release!: () => void;
  vi.spyOn(services.useCases, "readProgressForRecovery").mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = () => resolve(original());
      }),
  );
  render(<App services={services} />);
  await completeActivities(user);
  vi.spyOn(services.analytics, "track").mockImplementationOnce(() => {
    throw new Error("falha após save");
  });
  await user.click(screen.getByTestId("finish-lesson"));
  await waitFor(() => expect(release).toBeTypeOf("function"));
  const exit = screen.getByRole("button", { name: "Sair da lição" });
  exit.focus();
  await act(async () => release());
  expect(exit).toHaveFocus();
  expect(document.querySelector(".product-stats")).toHaveTextContent("55 XP");
});

it("reconcilia erro antes de gravar sem apresentar conclusão", async () => {
  const { services, stateStore } = setup();
  const user = userEvent.setup();
  render(<App services={services} />);
  await completeActivities(user);
  const recover = vi.spyOn(services.useCases, "readProgressForRecovery");
  vi.spyOn(stateStore, "saveState").mockRejectedValueOnce(new Error("falha antes do save"));
  await user.click(screen.getByTestId("finish-lesson"));
  expect(await screen.findByText(/Não foi possível confirmar a conclusão/)).toBeVisible();
  await waitFor(() => expect(recover).toHaveBeenCalledTimes(1));
  expect((await stateStore.loadProgress())?.lessonStatus.l02).toBe("in_progress");
  expect(document.querySelector(".product-stats")).toHaveTextContent("30 XP");
  expect(screen.queryByTestId("result-screen")).not.toBeInTheDocument();
});

it("reconcilia conclusão incerta de revisão sem reexecutar ou inventar resultado", async () => {
  const { services, stateStore, initial } = makeServices();
  initial.onboarding = { completed: true, taskCategory: "scheduling" };
  initial.lessonStatus.l02 = "completed";
  initial.currentLessonId = "l03";
  initial.skills.entender = {
    skillId: "entender",
    attempts: 1,
    passes: 1,
    lastScore: 1,
    lastPracticedAt: "2020-01-01T00:00:00Z",
    nextReviewAt: "2020-01-02T00:00:00Z",
    reviewStage: 0,
  };
  stateStore.seedProgress(initial);
  const user = userEvent.setup();
  render(<App services={services} />);
  await user.click(await screen.findByTestId("review-button"));
  await user.click(await screen.findByTestId("start-lesson"));
  await answerActivities(user);
  const original = services.useCases.completeReview.bind(services.useCases);
  const complete = vi
    .spyOn(services.useCases, "completeReview")
    .mockImplementationOnce(async (input) => {
      await original(input);
      throw new Error("falha pós-save simulada");
    });
  await user.click(screen.getByTestId("finish-lesson"));
  expect(await screen.findByText(/Não foi possível confirmar a conclusão/)).toBeVisible();
  await waitFor(() =>
    expect(screen.getByTestId("finish-lesson")).toHaveAttribute("aria-disabled", "false"),
  );
  const progress = await stateStore.loadProgress();
  expect(progress?.skills.entender.reviewStage).toBe(1);
  expect(progress?.skills.entender.nextReviewAt).toBe("2026-07-26T12:00:00.000Z");
  expect(complete).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("result-screen")).not.toBeInTheDocument();
});

it("bloqueia conclusão enquanto lê e após falha de reconciliação", async () => {
  const { services } = setup();
  const user = userEvent.setup();
  render(<App services={services} />);
  await completeActivities(user);
  const complete = vi.spyOn(services.useCases, "completeLesson");
  let rejectRead!: () => void;
  vi.spyOn(services.useCases, "readProgressForRecovery").mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        rejectRead = () => reject(new Error("falha na leitura"));
      }),
  );
  vi.spyOn(services.analytics, "track").mockImplementationOnce(() => {
    throw new Error("falha após save");
  });
  await user.click(screen.getByTestId("finish-lesson"));
  await waitFor(() => expect(rejectRead).toBeTypeOf("function"));
  const finish = screen.getByTestId("finish-lesson");
  expect(finish).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(finish);
  expect(complete).toHaveBeenCalledTimes(1);
  await act(async () => rejectRead());
  expect(await screen.findByText(/Não foi possível confirmar o estado salvo/)).toBeVisible();
  expect(finish).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(finish);
  expect(complete).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("result-screen")).not.toBeInTheDocument();
});

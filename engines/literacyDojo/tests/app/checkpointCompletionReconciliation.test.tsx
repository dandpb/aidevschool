import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import { makeServices } from "../helpers";

function setup() {
  const { services, stateStore, initial } = makeServices();
  initial.onboarding = { completed: true, taskCategory: "scheduling" };
  for (const id of ["l01", "l02", "l03"]) initial.lessonStatus[id] = "completed";
  initial.currentLessonId = "l04";
  stateStore.seedProgress(initial);
  return { services, stateStore };
}

async function finishActivities(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByTestId("continue-button"));
  await user.click(await screen.findByTestId("start-checkpoint"));
  await user.click(screen.getByTestId("submit-attempt"));
  await user.click(await screen.findByTestId("next-activity"));
  await user.click(screen.getByTestId("output-out-b"));
  await user.click(screen.getByTestId("criterion-c-fontes"));
  await user.click(screen.getByTestId("criterion-c-limites"));
  await user.click(screen.getByTestId("submit-attempt"));
  await user.click(await screen.findByTestId("next-activity"));
  await user.click(screen.getByTestId("option-f-noticia"));
  await user.click(screen.getByTestId("option-f-planilha"));
  await user.click(screen.getByTestId("submit-attempt"));
  await screen.findByTestId("finish-checkpoint");
}

it("reconcilia conclusão gravada sem repetir nem criar resultado", async () => {
  const { services, stateStore } = setup();
  const user = userEvent.setup();
  render(<App services={services} />);
  await finishActivities(user);
  const original = services.useCases.completeCheckpoint.bind(services.useCases);
  const complete = vi
    .spyOn(services.useCases, "completeCheckpoint")
    .mockImplementationOnce(async (input) => {
      await original(input);
      throw new Error("falha pós-save simulada");
    });
  await user.click(screen.getByTestId("finish-checkpoint"));
  expect(await screen.findByText(/Não foi possível confirmar a conclusão/)).toBeVisible();
  await waitFor(() =>
    expect(screen.getByTestId("finish-checkpoint")).toHaveAttribute("aria-disabled", "false"),
  );
  expect((await stateStore.loadProgress())?.moduleCheckpoints["mod-01"].status).toBe("completed");
  expect(complete).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("checkpoint-result")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Sair do desafio" }));
  expect(await screen.findByTestId("map-lesson-l04")).toHaveTextContent("Disponível");
});

it("bloqueia conclusão durante leitura e após falha de recuperação", async () => {
  const { services } = setup();
  const user = userEvent.setup();
  render(<App services={services} />);
  await finishActivities(user);
  const original = services.useCases.completeCheckpoint.bind(services.useCases);
  const complete = vi
    .spyOn(services.useCases, "completeCheckpoint")
    .mockImplementationOnce(async (input) => {
      await original(input);
      throw new Error("falha pós-save simulada");
    });
  let rejectRead!: () => void;
  vi.spyOn(services.useCases, "readProgressForRecovery").mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        rejectRead = () => reject(new Error("falha de leitura"));
      }),
  );
  await user.click(screen.getByTestId("finish-checkpoint"));
  await waitFor(() => expect(rejectRead).toBeTypeOf("function"));
  const finish = screen.getByTestId("finish-checkpoint");
  const exit = screen.getByRole("button", { name: "Sair do desafio" });
  expect(finish).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(finish);
  fireEvent.click(exit);
  expect(complete).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("checkpoint-player")).toBeVisible();
  await act(async () => rejectRead());
  expect(await screen.findByText(/Não foi possível confirmar o estado salvo/)).toBeVisible();
  expect(finish).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(finish);
  expect(complete).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("checkpoint-result")).not.toBeInTheDocument();
});

it("reconcilia erro antes de gravar sem marcar o desafio concluído", async () => {
  const { services, stateStore } = setup();
  const user = userEvent.setup();
  render(<App services={services} />);
  await finishActivities(user);
  const recover = vi.spyOn(services.useCases, "readProgressForRecovery");
  vi.spyOn(stateStore, "saveState").mockRejectedValueOnce(new Error("falha antes do save"));
  await user.click(screen.getByTestId("finish-checkpoint"));
  expect(await screen.findByText(/Não foi possível confirmar a conclusão/)).toBeVisible();
  await waitFor(() => expect(recover).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(screen.getByTestId("finish-checkpoint")).toHaveAttribute("aria-disabled", "false"),
  );
  expect((await stateStore.loadProgress())?.moduleCheckpoints["mod-01"].status).not.toBe(
    "completed",
  );
  expect(screen.queryByTestId("checkpoint-result")).not.toBeInTheDocument();
});

it("preserva foco escolhido durante releitura da conclusão", async () => {
  const { services } = setup();
  const user = userEvent.setup();
  render(<App services={services} />);
  await finishActivities(user);
  const original = services.useCases.completeCheckpoint.bind(services.useCases);
  vi.spyOn(services.useCases, "completeCheckpoint").mockImplementationOnce(async (input) => {
    await original(input);
    throw new Error("falha pós-save simulada");
  });
  const read = services.useCases.readProgressForRecovery.bind(services.useCases);
  let release!: () => void;
  vi.spyOn(services.useCases, "readProgressForRecovery").mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = () => resolve(read());
      }),
  );
  await user.click(screen.getByTestId("finish-checkpoint"));
  await waitFor(() => expect(release).toBeTypeOf("function"));
  const exit = screen.getByRole("button", { name: "Sair do desafio" });
  exit.focus();
  await act(async () => release());
  expect(exit).toHaveFocus();
});

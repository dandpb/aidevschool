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

async function enter(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByTestId("continue-button"));
  await user.click(await screen.findByTestId("start-checkpoint"));
}

it("reconcilia uma tentativa gravada no desafio sem reenviar", async () => {
  const { services, stateStore } = setup();
  const user = userEvent.setup();
  render(<App services={services} />);
  await enter(user);
  const emit = vi.spyOn(services.evidence, "emit").mockImplementationOnce(() => {
    throw new Error("falha simulada");
  });
  await user.click(screen.getByTestId("submit-attempt"));
  expect(await screen.findByText(/tentativa pode já ter sido registrada/)).toBeVisible();
  await waitFor(() => expect(document.querySelector(".product-stats")).toHaveTextContent("10 XP"));
  expect((await stateStore.loadProgress())?.counters.attempts).toBe(1);
  expect(emit).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "Sair do desafio" }));
  expect(await screen.findByTestId("map-screen")).toHaveTextContent("10 XP");
});

it("reconcilia falha antes da gravação sem acrescentar tentativa", async () => {
  const { services, stateStore } = setup();
  const user = userEvent.setup();
  render(<App services={services} />);
  await enter(user);
  const recover = vi.spyOn(services.useCases, "readProgressForRecovery");
  vi.spyOn(stateStore, "saveState").mockRejectedValueOnce(new Error("falha antes do save"));
  await user.click(screen.getByTestId("submit-attempt"));
  expect(await screen.findByText(/tentativa pode já ter sido registrada/)).toBeVisible();
  await waitFor(() => expect(recover).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(screen.getByTestId("submit-attempt")).toHaveAttribute("aria-disabled", "false"),
  );
  expect((await stateStore.loadProgress())?.counters.attempts).toBe(0);
  expect(document.querySelector(".product-stats")).toHaveTextContent("0 XP");
});

it("preserva foco escolhido durante a releitura atrasada do desafio", async () => {
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
  await enter(user);
  vi.spyOn(services.evidence, "emit").mockImplementationOnce(() => {
    throw new Error("falha simulada");
  });
  await user.click(screen.getByTestId("submit-attempt"));
  await waitFor(() => expect(release).toBeTypeOf("function"));
  const exit = screen.getByRole("button", { name: "Sair do desafio" });
  exit.focus();
  await act(async () => release());
  expect(exit).toHaveFocus();
  expect(document.querySelector(".product-stats")).toHaveTextContent("10 XP");
});

it("mantém guardas durante releitura e bloqueia ações se ela falhar", async () => {
  const { services } = setup();
  const user = userEvent.setup();
  let rejectRead!: () => void;
  vi.spyOn(services.useCases, "readProgressForRecovery").mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        rejectRead = () => reject(new Error("falha na leitura"));
      }),
  );
  render(<App services={services} />);
  await enter(user);
  vi.spyOn(services.evidence, "emit").mockImplementationOnce(() => {
    throw new Error("falha simulada");
  });
  await user.click(screen.getByTestId("submit-attempt"));
  await waitFor(() => expect(rejectRead).toBeTypeOf("function"));
  const exit = screen.getByRole("button", { name: "Sair do desafio" });
  expect(exit).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(exit);
  expect(screen.getByTestId("checkpoint-player")).toBeVisible();
  await act(async () => rejectRead());
  expect(await screen.findByText(/Não foi possível confirmar o estado salvo/)).toBeVisible();
  expect(screen.getByTestId("submit-attempt")).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(screen.getByTestId("submit-attempt"));
  expect(screen.getByTestId("checkpoint-player")).toBeVisible();
  expect(screen.getByTestId("hint-button")).toHaveAttribute("aria-disabled", "true");
});

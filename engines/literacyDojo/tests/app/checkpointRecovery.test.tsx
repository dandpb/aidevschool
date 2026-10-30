import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ServicesProvider } from "../../src/app/services";
import { CheckpointScreen } from "../../src/screens/CheckpointScreen";
import { makeServices } from "../helpers";

function setup() {
  const { services, stateStore, initial } = makeServices();
  initial.onboarding = { completed: true, taskCategory: "scheduling" };
  for (const id of ["l01", "l02", "l03"]) initial.lessonStatus[id] = "completed";
  stateStore.seedProgress(initial);
  return { services, stateStore };
}
function view(services: ReturnType<typeof setup>["services"], onExit = vi.fn()) {
  render(
    <ServicesProvider value={services}>
      <CheckpointScreen
        checkpointId="cp-01"
        onProgressChange={() => {}}
        onFinished={() => {}}
        onExit={onExit}
        onStartNextLesson={() => {}}
      />
    </ServicesProvider>,
  );
  return onExit;
}

describe("recuperação do desafio", () => {
  it("guarda cliques repetidos e saída enquanto o início aguarda gravação", async () => {
    const { services } = setup();
    let release!: () => void;
    const spy = vi.spyOn(services.useCases, "startCheckpoint").mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ progress: setup().stateStore.storedStateValue()!.progress });
        }),
    );
    const onExit = view(services);
    const start = screen.getByTestId("start-checkpoint");
    start.focus();
    fireEvent.click(start);
    fireEvent.click(start);
    fireEvent.click(screen.getByRole("button", { name: "Sair do desafio" }));
    expect(spy).toHaveBeenCalledOnce();
    expect(onExit).not.toHaveBeenCalled();
    expect(start).toHaveFocus();
    expect(start).toHaveAttribute("aria-disabled", "true");
    await act(async () => {
      release();
    });
    expect(screen.getByTestId("checkpoint-player")).toBeVisible();
  });

  it("avisa que um início pode ter sido salvo antes de uma falha posterior", async () => {
    const { services, stateStore } = setup();
    const real = services.useCases.startCheckpoint.bind(services.useCases);
    vi.spyOn(services.useCases, "startCheckpoint").mockImplementationOnce(async (id) => {
      await real(id);
      throw new Error("post-save failure");
    });
    view(services);
    await userEvent.click(screen.getByTestId("start-checkpoint"));
    expect(await screen.findByRole("alert")).toHaveTextContent("pode já ter sido registrado");
    expect(stateStore.storedStateValue()?.progress.moduleCheckpoints["mod-01"]?.attempts).toBe(1);
    await userEvent.click(screen.getByTestId("start-checkpoint"));
    expect(await screen.findByTestId("checkpoint-player")).toBeVisible();
    expect(stateStore.storedStateValue()?.progress.moduleCheckpoints["mod-01"]?.attempts).toBe(2);
  });
});

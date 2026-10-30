import { act, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App, AppShell } from "../../src/app/App";
import { LiteracyMissionAdapter } from "../../src/host/LiteracyMissionAdapter";
import { makeServices } from "../helpers";

afterEach(() => window.history.replaceState(null, "", "/"));
function returningLearner() {
  window.history.replaceState(null, "", "/?journey=dev");
  const bundle = makeServices();
  bundle.initial.onboarding = { completed: true, taskCategory: "scheduling" };
  bundle.stateStore.seedProgress(bundle.initial);
  return bundle;
}

describe("troca de jornada durante o boot", () => {
  it("reconcilia a jornada gravada antes de uma falha notificada", async () => {
    const { services, stateStore } = returningLearner();
    const original = services.useCases.switchJourney.bind(services.useCases);
    const change = vi
      .spyOn(services.useCases, "switchJourney")
      .mockImplementation(async (journey) => {
        await original(journey);
        throw new Error("notificação após gravação");
      });
    render(<App services={services} />);
    await screen.findByTestId("home-screen");
    expect(screen.getByTestId("journey-switch-dev")).toHaveAttribute("aria-pressed", "true");
    expect((await stateStore.loadProgress())?.journeys?.active).toBe("dev");
    expect(screen.getByRole("alert")).toHaveTextContent("troca de jornada");
    expect(change).toHaveBeenCalledTimes(1);
  });
  it("retoma lição em andamento a partir do mesmo snapshot conciliado", async () => {
    const { services, stateStore, initial } = returningLearner();
    initial.lessonStatus.l15 = "in_progress";
    stateStore.seedProgress(initial);
    const original = services.useCases.switchJourney.bind(services.useCases);
    vi.spyOn(services.useCases, "switchJourney").mockImplementation(async (journey) => {
      await original(journey);
      throw new Error("notificação após gravação");
    });
    const resume = vi.spyOn(services.useCases, "resumeSession");
    render(<App services={services} />);
    expect(await screen.findByTestId("lesson-intro")).toHaveTextContent(
      "Quando usar IA e quando não usar",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("troca de jornada");
    expect(resume).not.toHaveBeenCalled();
  });
  it("mantém jornada anterior e avisa quando a troca falha antes de gravar", async () => {
    const { services, stateStore } = returningLearner();
    const change = vi
      .spyOn(services.useCases, "switchJourney")
      .mockRejectedValue(new Error("sem gravação"));
    render(<App services={services} />);
    await screen.findByTestId("home-screen");
    expect(screen.getByTestId("journey-switch-ia_pratica")).toHaveAttribute("aria-pressed", "true");
    expect((await stateStore.loadProgress())?.journeys?.active).not.toBe("dev");
    expect(screen.getByRole("alert")).toHaveTextContent("troca de jornada");
    expect(change).toHaveBeenCalledTimes(1);
  });
  it("StrictMode cancela boot antigo e faz uma única troca pendente", async () => {
    const { services, stateStore } = returningLearner();
    const original = services.useCases.switchJourney.bind(services.useCases);
    let release!: () => void;
    const change = vi
      .spyOn(services.useCases, "switchJourney")
      .mockImplementation(async (journey) => {
        await original(journey);
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        throw new Error("pós-commit");
      });
    const save = vi.spyOn(stateStore, "saveState");
    render(
      <StrictMode>
        <App services={services} />
      </StrictMode>,
    );
    await waitFor(() => expect(release).toBeDefined());
    expect(change).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => {
      release();
    });
    expect(await screen.findByTestId("journey-switch-dev")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("troca de jornada");
  });
  it("StrictMode ignora primeira leitura atrasada após conciliar o commit", async () => {
    const { services, stateStore } = returningLearner();
    const read = stateStore.readState.bind(stateStore);
    let release!: (value: Awaited<ReturnType<typeof read>>) => void;
    vi.spyOn(stateStore, "readState")
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = resolve;
          }),
      )
      .mockImplementation(read);
    const original = services.useCases.switchJourney.bind(services.useCases);
    const change = vi
      .spyOn(services.useCases, "switchJourney")
      .mockImplementation(async (journey) => {
        await original(journey);
        throw new Error("pós-commit");
      });
    render(
      <StrictMode>
        <App services={services} />
      </StrictMode>,
    );
    expect(await screen.findByTestId("journey-switch-dev")).toHaveAttribute("aria-pressed", "true");
    const current = await read();
    await act(async () => {
      release(current);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("troca de jornada");
    expect(change).toHaveBeenCalledTimes(1);
  });
  it("reutiliza troca pendente ao voltar à mesma instância após leitura já mostrar Dev", async () => {
    const { services, stateStore } = returningLearner();
    const originalSwitch = services.useCases.switchJourney.bind(services.useCases);
    let release!: () => void;
    const change = vi
      .spyOn(services.useCases, "switchJourney")
      .mockImplementation(async (journey) => {
        await originalSwitch(journey);
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        throw new Error("pós-commit");
      });
    const save = vi.spyOn(stateStore, "saveState");
    const adapter = new LiteracyMissionAdapter();
    const start = vi.spyOn(adapter, "start").mockReturnValue(() => {});
    const view = render(<AppShell services={services} hostAdapter={null} />);
    await waitFor(() => expect(release).toBeDefined());
    expect((await stateStore.loadProgress())?.journeys?.active).toBe("dev");
    view.rerender(<AppShell services={services} hostAdapter={adapter} />);
    await waitFor(() => expect(start).toHaveBeenCalled());
    const read = stateStore.readState.bind(stateStore);
    let observed!: () => void;
    const bootRead = new Promise<void>((resolve) => {
      observed = resolve;
    });
    vi.spyOn(stateStore, "readState")
      .mockImplementationOnce(async () => {
        const state = await read();
        observed();
        return state;
      })
      .mockImplementation(read);
    view.rerender(<AppShell services={services} hostAdapter={null} />);
    await act(async () => {
      await bootRead;
    });
    expect(change).toHaveBeenCalledTimes(1);
    await act(async () => {
      release();
    });
    expect(await screen.findByTestId("journey-switch-dev")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("troca de jornada");
    expect(change).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
  });
  it("não reaplica snapshot antigo ao reiniciar a mesma instância após sucesso", async () => {
    const { services, stateStore } = returningLearner();
    const change = vi.spyOn(services.useCases, "switchJourney");
    const adapter = new LiteracyMissionAdapter();
    const start = vi.spyOn(adapter, "start").mockReturnValue(() => {});
    const view = render(<AppShell services={services} hostAdapter={null} />);
    await screen.findByTestId("home-screen");
    view.rerender(<AppShell services={services} hostAdapter={adapter} />);
    await waitFor(() => expect(start).toHaveBeenCalled());
    const progress = await stateStore.loadProgress();
    if (!progress) throw new Error("progresso ausente");
    stateStore.seedProgress({ ...progress, xp: 99 });
    view.rerender(<AppShell services={services} hostAdapter={null} />);
    await waitFor(() =>
      expect(screen.getByLabelText("Resumo do progresso")).toHaveTextContent("99 XP"),
    );
    expect(change).toHaveBeenCalledTimes(1);
  });
  it("não repete troca ao receber leitura antiga depois de commit bem-sucedido", async () => {
    const { services, stateStore } = returningLearner();
    const originalSwitch = services.useCases.switchJourney.bind(services.useCases);
    let releaseSwitch!: () => void;
    const switchGate = new Promise<void>((resolve) => {
      releaseSwitch = resolve;
    });
    const change = vi
      .spyOn(services.useCases, "switchJourney")
      .mockImplementation(async (journey) => {
        await switchGate;
        return originalSwitch(journey);
      });
    const save = vi.spyOn(stateStore, "saveState");
    const adapter = new LiteracyMissionAdapter();
    const start = vi.spyOn(adapter, "start").mockReturnValue(() => {});
    const view = render(<AppShell services={services} hostAdapter={null} />);
    await waitFor(() => expect(change).toHaveBeenCalledTimes(1));
    view.rerender(<AppShell services={services} hostAdapter={adapter} />);
    await waitFor(() => expect(start).toHaveBeenCalled());
    const read = stateStore.readState.bind(stateStore);
    let captured!: () => void;
    let releaseRead!: () => void;
    const readCaptured = new Promise<void>((resolve) => {
      captured = resolve;
    });
    const readGate = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    vi.spyOn(stateStore, "readState")
      .mockImplementationOnce(async () => {
        const oldState = await read();
        captured();
        await readGate;
        return oldState;
      })
      .mockImplementation(read);
    view.rerender(<AppShell services={services} hostAdapter={null} />);
    await act(async () => {
      await readCaptured;
      releaseSwitch();
    });
    await waitFor(async () =>
      expect((await stateStore.loadProgress())?.journeys?.active).toBe("dev"),
    );
    await act(async () => {
      releaseRead();
    });
    await screen.findByTestId("home-screen");
    expect(change).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("journey-switch-dev")).toHaveAttribute("aria-pressed", "true");
  });
  it("bloqueia quando a leitura de reconciliação também falha", async () => {
    const { services } = returningLearner();
    vi.spyOn(services.useCases, "switchJourney").mockRejectedValue(new Error("uncertain"));
    vi.spyOn(services.useCases, "readProgressForRecovery").mockRejectedValue(
      new Error("unreadable"),
    );
    render(<App services={services} />);
    expect(await screen.findByTestId("error-recovery-screen")).toHaveTextContent(
      "Não foi possível confirmar o progresso salvo",
    );
    expect(screen.queryByTestId("home-screen")).toBeNull();
  });
});

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import { MAP_INITIAL_LESSON_ID } from "../../src/domain/progress";
import { makeServices } from "../helpers";

function setup() {
  const { services, stateStore, initial } = makeServices();
  initial.onboarding = { completed: true, taskCategory: "scheduling" };
  initial.lessonStatus.l01 = "locked";
  initial.lessonStatus[MAP_INITIAL_LESSON_ID] = "available";
  initial.currentLessonId = MAP_INITIAL_LESSON_ID;
  stateStore.seedProgress(initial);
  return { services, stateStore };
}

describe("abertura interrompida", () => {
  afterEach(() => vi.restoreAllMocks());
  it("preserva o mapa e reflete progresso salvo sem iniciar duas escritas", async () => {
    const { services } = setup();
    const user = userEvent.setup();
    const real = services.useCases.startLesson.bind(services.useCases);
    let release!: () => void;
    const start = vi.spyOn(services.useCases, "startLesson").mockImplementation(async (id) => {
      const saved = await real(id);
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return saved;
    });
    render(<App services={services} />);
    await user.click(await screen.findByTestId("continue-button"));
    await waitFor(() => expect(release).toBeTypeOf("function"));
    const switchJourney = vi.spyOn(services.useCases, "switchJourney");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByTestId("journey-switch-dev"));
    fireEvent.click(screen.getByTestId("reset-progress"));
    expect(switchJourney).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    await user.click(screen.getByTestId("open-progress"));
    const restore = vi.spyOn(services.useCases, "importProgress");
    expect(screen.getByTestId("import-progress")).toHaveAttribute("aria-disabled", "true");
    const file = new File(["{}"], "backup.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: async () => "{}" });
    fireEvent.change(screen.getByTestId("import-progress-file"), { target: { files: [file] } });
    expect(restore).not.toHaveBeenCalled();
    await user.click(screen.getByTestId("progress-back"));
    await user.click(screen.getByTestId("open-map"));
    const map = screen.getByTestId("map-screen");
    const open = screen.getByTestId(`map-start-${MAP_INITIAL_LESSON_ID}`);
    expect(open).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(open);
    expect(start).toHaveBeenCalledOnce();
    await act(async () => {
      release();
    });
    expect(map).toBeVisible();
    expect(
      within(screen.getByTestId(`map-lesson-${MAP_INITIAL_LESSON_ID}`)).getByText(/em andamento/i),
    ).toBeVisible();
    expect(screen.getByTestId(`map-start-${MAP_INITIAL_LESSON_ID}`)).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });

  it("reconcilia progresso quando abertura gravou antes de falhar", async () => {
    const { services } = setup();
    const real = services.useCases.startLesson.bind(services.useCases);
    vi.spyOn(services.useCases, "startLesson").mockImplementationOnce(async (id) => {
      await real(id);
      throw new Error("simulated post-save failure");
    });
    const user = userEvent.setup();
    render(<App services={services} />);
    await user.click(await screen.findByTestId("continue-button"));
    expect(await screen.findByRole("alert")).toHaveTextContent("pode já ter sido");
    await user.click(screen.getByTestId("open-map"));
    expect(screen.getByTestId("lesson-open-error")).toHaveTextContent("solicitação anterior");
    expect(
      within(screen.getByTestId(`map-lesson-${MAP_INITIAL_LESSON_ID}`)).getByText(/em andamento/i),
    ).toBeVisible();
  });
  it("bloqueia mutações e oferece reload se a releitura após falha também falhar", async () => {
    const { services } = setup();
    const start = vi.spyOn(services.useCases, "startLesson").mockRejectedValue(new Error("write"));
    vi.spyOn(services.useCases, "readProgressForRecovery").mockRejectedValue(new Error("read"));
    const user = userEvent.setup();
    render(<App services={services} />);
    await user.click(await screen.findByTestId("continue-button"));
    expect(await screen.findByRole("button", { name: "Recarregar página" })).toBeVisible();
    const startButton = screen.getByTestId("continue-button");
    expect(startButton).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(startButton);
    expect(start).toHaveBeenCalledOnce();
  });

  it("reset impede navegação interna enquanto aguarda e termina em onboarding", async () => {
    const { services, stateStore } = setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const realDelete = stateStore.deleteState.bind(stateStore);
    let release!: () => void;
    vi.spyOn(stateStore, "deleteState").mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await realDelete();
    });
    const user = userEvent.setup();
    render(<App services={services} />);
    await user.click(await screen.findByTestId("reset-progress"));
    await waitFor(() => expect(release).toBeTypeOf("function"));
    expect(screen.getByTestId("open-map")).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByTestId("open-map"));
    expect(screen.getByTestId("home-screen")).toBeVisible();
    await act(async () => {
      release();
    });
    expect(await screen.findByTestId("assistant-welcome")).toBeVisible();
  });

  it("falha após marcador de reset mantém bloqueio até recuperação explícita", async () => {
    const { services, stateStore } = setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(stateStore, "deleteState").mockRejectedValueOnce(new Error("after marker"));
    const user = userEvent.setup();
    render(<App services={services} />);
    await user.click(await screen.findByTestId("reset-progress"));
    expect(await screen.findByRole("button", { name: "Recarregar página" })).toBeVisible();
    expect(stateStore.storedIntentValue()).not.toBeNull();
    expect(screen.getByTestId("continue-button")).toHaveAttribute("aria-disabled", "true");
    const start = vi.spyOn(services.useCases, "startLesson");
    fireEvent.click(screen.getByTestId("continue-button"));
    expect(start).not.toHaveBeenCalled();
  });

  it("troca de jornada concluída depois de navegação não altera a tela escolhida", async () => {
    const { services } = setup();
    const real = services.useCases.switchJourney.bind(services.useCases);
    let release!: () => void;
    vi.spyOn(services.useCases, "switchJourney").mockImplementation(async (journey) => {
      const saved = await real(journey);
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return saved;
    });
    const user = userEvent.setup();
    render(<App services={services} />);
    await user.click(await screen.findByTestId("journey-switch-dev"));
    await waitFor(() => expect(release).toBeTypeOf("function"));
    await user.click(screen.getByTestId("open-progress"));
    await act(async () => {
      release();
    });
    expect(screen.getByTestId("progress-screen")).toBeVisible();
    await user.click(screen.getByTestId("progress-back"));
    expect(screen.getByTestId("journey-switch-dev")).toHaveAttribute("aria-pressed", "true");
  });
  it("falha tardia informa a solicitação anterior sem trocar a tela", async () => {
    const { services } = setup();
    const real = services.useCases.startLesson.bind(services.useCases);
    let reject!: () => void;
    vi.spyOn(services.useCases, "startLesson").mockImplementationOnce(async (id) => {
      await real(id);
      await new Promise<void>((_, fail) => {
        reject = () => fail(new Error("failure"));
      });
      throw new Error("unreachable");
    });
    const user = userEvent.setup();
    render(<App services={services} />);
    await user.click(await screen.findByTestId("continue-button"));
    await waitFor(() => expect(reject).toBeTypeOf("function"));
    await user.click(screen.getByTestId("open-map"));
    await act(async () => {
      reject();
    });
    expect(screen.getByTestId("map-screen")).toBeVisible();
    expect(screen.queryByTestId("lesson-open-error")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("antes de mudar de tela");
    expect(
      within(screen.getByTestId(`map-lesson-${MAP_INITIAL_LESSON_ID}`)).getByText(/em andamento/i),
    ).toBeVisible();
  });
  it("ignora ações da tela antiga disparadas no mesmo evento após navegar", async () => {
    const { services } = setup();
    const start = vi.spyOn(services.useCases, "startLesson");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<App services={services} />);
    const map = await screen.findByTestId("open-map");
    const oldStart = screen.getByTestId("continue-button");
    const oldReset = screen.getByTestId("reset-progress");
    act(() => {
      map.click();
      oldStart.click();
      oldReset.click();
    });
    expect(screen.getByTestId("map-screen")).toBeVisible();
    expect(start).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });
  it("não grava ações da lição antiga disparadas logo após sair", async () => {
    const { services } = setup();
    const user = userEvent.setup();
    render(<App services={services} />);
    await user.click(await screen.findByTestId("continue-button"));
    await user.click(await screen.findByTestId("start-lesson"));
    await user.click(screen.getByTestId("output-out-a"));
    const hint = vi.spyOn(services.useCases, "requestHint");
    const submit = vi.spyOn(services.useCases, "submitActivityAttempt");
    const oldExit = screen.getByRole("button", { name: "Sair da lição" });
    const oldHint = screen.getByTestId("hint-button");
    const oldSubmit = screen.getByTestId("submit-attempt");
    act(() => {
      oldExit.click();
      oldHint.click();
      oldSubmit.click();
    });
    expect(screen.getByTestId("map-screen")).toBeVisible();
    expect(hint).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });
});

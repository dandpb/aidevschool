import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { App, AppShell } from "../../src/app/App";
import {
  LiteracyMissionAdapter,
  type LiteracyMissionLaunch,
} from "../../src/host/LiteracyMissionAdapter";
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

async function enterAndAnswer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByTestId("continue-button"));
  await user.click(await screen.findByTestId("start-lesson"));
  await user.click(screen.getByTestId("output-out-b"));
  await user.click(screen.getByTestId("criterion-c-fontes"));
  await user.click(screen.getByTestId("criterion-c-limites"));
}

it("reconcilia progresso após erro posterior à gravação e não reenvia", async () => {
  const { services, stateStore } = setup();
  const user = userEvent.setup();
  render(<App services={services} />);
  await enterAndAnswer(user);
  const emit = vi.spyOn(services.evidence, "emit").mockImplementationOnce(() => {
    throw new Error("falha simulada");
  });
  await user.click(screen.getByTestId("submit-attempt"));
  expect(await screen.findByRole("alert")).toHaveTextContent("pode já ter sido registrada");
  expect((await stateStore.loadProgress())?.xp).toBe(10);
  await waitFor(() => expect(document.querySelector(".product-stats")).toHaveTextContent("10 XP"));
  expect(emit).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "Sair da lição" }));
  expect(await screen.findByTestId("map-screen")).toHaveTextContent("10 XP");
});

it("reconcilia falha antes da gravação sem inventar progresso", async () => {
  const { services, stateStore } = setup();
  const user = userEvent.setup();
  render(<App services={services} />);
  await enterAndAnswer(user);
  const recover = vi.spyOn(services.useCases, "readProgressForRecovery");
  vi.spyOn(stateStore, "saveState").mockRejectedValueOnce(new Error("falha simulada"));
  await user.click(screen.getByTestId("submit-attempt"));
  expect(await screen.findByText(/pode já ter sido registrada/)).toBeVisible();
  await waitFor(() => expect(recover).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByTestId("submit-attempt")).toBeEnabled());
  expect((await stateStore.loadProgress())?.xp).toBe(0);
  expect(document.querySelector(".product-stats")).toHaveTextContent("0 XP");
  expect(screen.getByTestId("output-out-b")).toBeChecked();
});

it("mantém a lição ocupada durante a leitura e bloqueia mutações se ela falhar", async () => {
  const { services } = setup();
  const user = userEvent.setup();
  let rejectRead!: () => void;
  vi.spyOn(services.useCases, "readProgressForRecovery").mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        rejectRead = () => reject(new Error("falha simulada"));
      }),
  );
  render(<App services={services} />);
  await enterAndAnswer(user);
  vi.spyOn(services.evidence, "emit").mockImplementationOnce(() => {
    throw new Error("falha simulada");
  });
  await user.click(screen.getByTestId("submit-attempt"));
  await waitFor(() => expect(rejectRead).toBeTypeOf("function"));
  const exit = screen.getByRole("button", { name: "Sair da lição" });
  expect(exit).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByTestId("output-out-b")).toBeDisabled();
  fireEvent.click(exit);
  fireEvent.click(screen.getByTestId("submit-attempt"));
  expect(screen.getByTestId("lesson-player")).toBeVisible();
  await act(async () => rejectRead());
  expect(await screen.findByText(/Não foi possível confirmar o estado salvo/)).toBeVisible();
  expect(screen.getByTestId("submit-attempt")).toBeDisabled();
  expect(screen.getByTestId("output-out-b")).toBeDisabled();
});

it("respeita foco escolhido durante a releitura atrasada", async () => {
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
  await enterAndAnswer(user);
  vi.spyOn(services.evidence, "emit").mockImplementationOnce(() => {
    throw new Error("falha simulada");
  });
  await user.click(screen.getByTestId("submit-attempt"));
  await waitFor(() => expect(release).toBeTypeOf("function"));
  const exit = screen.getByRole("button", { name: "Sair da lição" });
  exit.focus();
  await act(async () => release());
  expect(exit).toHaveFocus();
  expect(document.querySelector(".product-stats")).toHaveTextContent("10 XP");
});

for (const status of ["absent", "present-invalid"] as const) {
  it(`bloqueia mutação quando a releitura retorna ${status}`, async () => {
    const { services, stateStore } = setup();
    const user = userEvent.setup();
    render(<App services={services} />);
    await enterAndAnswer(user);
    vi.spyOn(services.evidence, "emit").mockImplementationOnce(() => {
      vi.spyOn(stateStore, "readState").mockResolvedValueOnce({ status } as never);
      throw new Error("falha simulada após gravação");
    });
    await user.click(screen.getByTestId("submit-attempt"));
    expect(await screen.findByText(/Não foi possível confirmar o estado salvo/)).toBeVisible();
    expect(screen.getByTestId("submit-attempt")).toBeDisabled();
    expect((await stateStore.loadProgress())?.xp).toBe(10);
  });
}

it("reconcilia uma reverificação sem substituir a resposta nem repetir o envio", async () => {
  const { services, stateStore } = setup();
  const user = userEvent.setup();
  render(<App services={services} />);
  await user.click(await screen.findByTestId("continue-button"));
  await user.click(await screen.findByTestId("start-lesson"));
  await user.click(screen.getByTestId("output-out-a"));
  await user.click(screen.getByTestId("submit-attempt"));
  await screen.findByTestId("feedback-panel");
  await user.click(screen.getByTestId("output-out-b"));
  await user.click(screen.getByTestId("criterion-c-fontes"));
  await user.click(screen.getByTestId("criterion-c-limites"));
  const emit = vi.spyOn(services.evidence, "emit").mockImplementationOnce(() => {
    throw new Error("falha simulada");
  });
  await user.click(screen.getByTestId("submit-attempt"));
  expect(await screen.findByText(/pode já ter sido registrada/)).toBeVisible();
  await waitFor(() => expect(document.querySelector(".product-stats")).toHaveTextContent("10 XP"));
  expect(screen.getByTestId("output-out-b")).toBeChecked();
  expect((await stateStore.loadProgress())?.counters.attempts).toBe(2);
  expect(emit).toHaveBeenCalledTimes(1);
});

it("reconcilia tentativa de revisão sem reagendar uma sessão interrompida", async () => {
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
  };
  stateStore.seedProgress(initial);
  const user = userEvent.setup();
  render(<App services={services} />);
  await user.click(await screen.findByTestId("review-button"));
  await user.click(await screen.findByTestId("start-lesson"));
  await user.click(screen.getByTestId("output-out-b"));
  await user.click(screen.getByTestId("criterion-c-fontes"));
  await user.click(screen.getByTestId("criterion-c-limites"));
  vi.spyOn(services.evidence, "emit").mockImplementationOnce(() => {
    throw new Error("falha simulada");
  });
  await user.click(screen.getByTestId("submit-attempt"));
  expect(await screen.findByText(/pode já ter sido registrada/)).toBeVisible();
  await waitFor(() => expect(document.querySelector(".product-stats")).toHaveTextContent("10 XP"));
  expect((await stateStore.loadProgress())?.skills.entender.nextReviewAt).toBe(
    "2020-01-02T00:00:00Z",
  );
});

it("não aplica uma releitura antiga depois de outra rota ser aberta", async () => {
  const { services, stateStore } = setup();
  const user = userEvent.setup();
  const original = services.useCases.readProgressForRecovery.bind(services.useCases);
  let release!: () => void;
  let captured!: () => void;
  const snapshotCaptured = new Promise<void>((resolve) => {
    captured = resolve;
  });
  vi.spyOn(services.useCases, "readProgressForRecovery").mockImplementationOnce(async () => {
    const snapshot = await original();
    captured();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    return snapshot;
  });
  const view = render(<AppShell services={services} hostAdapter={null} />);
  await enterAndAnswer(user);
  vi.spyOn(services.evidence, "emit").mockImplementationOnce(() => {
    throw new Error("falha simulada");
  });
  await user.click(screen.getByTestId("submit-attempt"));
  await act(async () => {
    await snapshotCaptured;
  });
  const adapter = new LiteracyMissionAdapter();
  let launch!: (payload: LiteracyMissionLaunch) => Promise<void>;
  vi.spyOn(adapter, "start").mockImplementation((callback) => {
    launch = callback;
    return () => {};
  });
  const originalRead = stateStore.readState.bind(stateStore);
  let bootRead!: () => void;
  const bootObserved = new Promise<void>((resolve) => {
    bootRead = resolve;
  });
  vi.spyOn(stateStore, "readState")
    .mockImplementationOnce(async () => {
      const result = await originalRead();
      bootRead();
      return result;
    })
    .mockImplementation(originalRead);
  view.rerender(<AppShell services={services} hostAdapter={adapter} />);
  await act(async () => {
    await bootObserved;
  });
  await waitFor(() => expect(launch).toBeTypeOf("function"));
  const current = await stateStore.loadProgress();
  if (!current) throw new Error("progresso ausente");
  current.xp = 77;
  stateStore.seedProgress(current);
  const lesson = services.content.getLesson("l15");
  if (!lesson) throw new Error("lição ausente");
  await act(async () => {
    await launch({
      missionId: lesson.id,
      missionVersion: lesson.version,
      mode: "initial",
      locale: "pt-BR",
    });
  });
  expect(await screen.findByTestId("lesson-intro")).toHaveTextContent(lesson.title);
  expect(document.querySelector(".product-stats")).toHaveTextContent("77 XP");
  await act(async () => release());
  expect(screen.getByTestId("lesson-intro")).toHaveTextContent(lesson.title);
  expect(document.querySelector(".product-stats")).toHaveTextContent("77 XP");
  expect(screen.getByText(/Não foi possível confirmar o estado salvo/)).toBeVisible();
  expect(screen.getByTestId("start-lesson")).toBeDisabled();
  fireEvent.click(screen.getByTestId("start-lesson"));
  expect(screen.getByTestId("lesson-intro")).toBeVisible();
});

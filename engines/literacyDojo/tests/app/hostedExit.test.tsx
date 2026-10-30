import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "../../src/app/App";
import { ServicesProvider } from "../../src/app/services";
import { MAP_INITIAL_LESSON_ID } from "../../src/domain/progress";
import { LiteracyMissionAdapter } from "../../src/host/LiteracyMissionAdapter";
import { ErrorRecoveryScreen } from "../../src/screens/ErrorRecoveryScreen";
import { LessonScreen } from "../../src/screens/LessonScreen";
import { makeServices } from "../helpers";

describe("saída da missão", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("orienta saída na intro e atividade iniciadas pelo adaptador hospedado", async () => {
    window.history.replaceState(null, "", "/?hosted=1&hostOrigin=http%3A%2F%2Fhost.test");
    vi.spyOn(document, "referrer", "get").mockReturnValue("http://host.test/");
    vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);
    const { services } = makeServices();
    const lesson = services.content.getLesson(MAP_INITIAL_LESSON_ID);
    if (!lesson) throw new Error("Lição ausente");
    render(<AppShell services={services} hostAdapter={new LiteracyMissionAdapter()} />);
    const envelope = (type: string, payload: Record<string, unknown>) => ({
      protocol: "aidevschool.host-engine",
      version: "1.0",
      type,
      messageId: `${type}-1`,
      hostSessionId: "host-1",
      missionRunId: "run-1",
      engineId: "literacyDojo",
      sentAt: "2026-09-11T12:00:00.000Z",
      payload,
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      for (const [type, payload] of [
        ["host.hello", { missionId: MAP_INITIAL_LESSON_ID, protocolVersion: "1.0" }],
        [
          "mission.launch",
          {
            missionId: MAP_INITIAL_LESSON_ID,
            missionVersion: lesson.version,
            mode: "initial",
            locale: "pt-BR",
          },
        ],
      ] as const) {
        window.dispatchEvent(
          new MessageEvent("message", {
            source: window.parent,
            origin: "http://host.test",
            data: envelope(type, payload),
          }),
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const intro = await screen.findByTestId("lesson-intro");
    expect(within(intro).queryByRole("button", { name: "Sair da lição" })).not.toBeInTheDocument();
    expect(
      within(intro).getByText(/use a navegação do aplicativo que abriu esta missão/i),
    ).toBeVisible();
    await userEvent.click(within(intro).getByTestId("start-lesson"));
    const player = await screen.findByTestId("lesson-player");
    expect(within(player).queryByRole("button", { name: "Sair da lição" })).not.toBeInTheDocument();
    expect(
      within(player).getByText(/use a navegação do aplicativo que abriu esta missão/i),
    ).toBeVisible();
  });

  it("mantém a saída da lição autônoma", async () => {
    const { services, initial } = makeServices();
    const onExit = vi.fn();
    render(
      <ServicesProvider value={services}>
        <LessonScreen
          lessonId={MAP_INITIAL_LESSON_ID}
          onboarding={initial.onboarding}
          onProgressChange={() => {}}
          onCompleted={() => {}}
          onExit={onExit}
        />
      </ServicesProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Sair da lição" }));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it("orienta recuperação hospedada sem oferecer volta inoperante", () => {
    render(<ErrorRecoveryScreen message="Falha" hosted />);
    expect(screen.getByText(/use a navegação do aplicativo que abriu esta missão/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Voltar" })).not.toBeInTheDocument();
    expect(screen.queryByText(/voltar ao mapa/i)).not.toBeInTheDocument();
  });
});

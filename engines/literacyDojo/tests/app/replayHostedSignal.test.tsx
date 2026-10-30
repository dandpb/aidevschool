import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { AppShell } from "../../src/app/App";
import { LiteracyMissionAdapter } from "../../src/host/LiteracyMissionAdapter";
import { makeServices } from "../helpers";

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

it("replay hospedado mantém cursor e sinaliza o próximo ID contratual", async () => {
  window.history.replaceState(null, "", "/?hosted=1&hostOrigin=http%3A%2F%2Fhost.test");
  vi.spyOn(document, "referrer", "get").mockReturnValue("http://host.test/");
  vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);
  const { services, stateStore, initial } = makeServices();
  initial.onboarding = { completed: true, route: "intermediate" };
  initial.lessonStatus.l02 = "completed";
  initial.lessonStatus.l03 = "completed";
  initial.lessonStatus.l04 = "in_progress";
  initial.currentLessonId = "l04";
  initial.journeys = { active: "ia_pratica", current: { ia_pratica: "l04", dev: "l16" } };
  stateStore.seedProgress(initial);
  const lesson = services.content.getLesson("l02");
  if (!lesson) throw new Error("lição ausente");
  const adapter = new LiteracyMissionAdapter();
  const completed = vi.spyOn(adapter, "publishCompleted");
  render(<AppShell services={services} hostAdapter={adapter} />);
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
      ["host.hello", { missionId: "l02", protocolVersion: "1.0" }],
      [
        "mission.launch",
        { missionId: "l02", missionVersion: lesson.version, mode: "initial", locale: "pt-BR" },
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
  const user = userEvent.setup();
  await user.click(await screen.findByTestId("start-lesson"));
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
  await waitFor(() => expect(completed).toHaveBeenCalledWith("l03"));
  expect(await screen.findByTestId("result-screen")).toHaveTextContent(
    "Sinal de conclusão enviado",
  );
  const stored = await stateStore.loadProgress();
  expect(stored?.currentLessonId).toBe("l04");
  expect(stored?.journeys?.current).toEqual({ ia_pratica: "l04", dev: "l16" });
});

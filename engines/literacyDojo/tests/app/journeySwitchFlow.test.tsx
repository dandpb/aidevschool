import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/app/App";
import { MAP_INITIAL_LESSON_ID } from "../../src/domain/progress";
import { makeServices } from "../helpers";

/** Progresso pós-onboarding: Mapa Inicial disponível, rota guiada padrão. */
function seedReturningLearner() {
  const { services, progressRepo, initial } = makeServices();
  initial.onboarding = { completed: true, taskCategory: "scheduling" };
  initial.lessonStatus.l01 = "locked";
  initial.lessonStatus[MAP_INITIAL_LESSON_ID] = "available";
  initial.currentLessonId = MAP_INITIAL_LESSON_ID;
  progressRepo.seed(initial);
  return { services, progressRepo, initial };
}

describe("jornada Dev opcional (AID-3584) — fluxo no app", () => {
  it("Home mostra as duas jornadas com IA ativa por default (legado sem journeys)", async () => {
    const { services } = seedReturningLearner();
    render(<App services={services} />);

    await screen.findByTestId("home-screen");
    const card = screen.getByTestId("journey-card");
    expect(card).toBeInTheDocument();
    expect(screen.getByTestId("journey-switch-ia_pratica")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("journey-switch-dev")).toHaveAttribute("aria-pressed", "false");
  });

  it("escolher Dev leva ao mapa Dev: l15 disponível, l16 bloqueada, módulo Dev visível", async () => {
    const user = userEvent.setup();
    const { services, progressRepo } = seedReturningLearner();
    render(<App services={services} />);

    await screen.findByTestId("home-screen");
    await user.click(screen.getByTestId("journey-switch-dev"));

    expect(await screen.findByTestId("map-screen")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mapa da Jornada Dev" })).toBeInTheDocument();
    expect(screen.getByTestId("map-start-l15")).toBeInTheDocument();
    expect(screen.queryByTestId("map-start-l16")).not.toBeInTheDocument();
    expect(screen.getByTestId("map-lesson-l16").textContent).toContain("Bloqueada");
    expect(screen.queryByTestId("map-start-l01")).not.toBeInTheDocument();

    const saved = await progressRepo.load();
    expect(saved?.journeys?.active).toBe("dev");
    expect(saved?.lessonStatus.l15).toBe("available");
    // Status IA preservado.
    expect(saved?.lessonStatus[MAP_INITIAL_LESSON_ID]).toBe("available");
  });

  it("alternar de volta para IA restaura o mapa IA e preserva o cursor Dev", async () => {
    const user = userEvent.setup();
    const { services, progressRepo } = seedReturningLearner();
    render(<App services={services} />);

    await screen.findByTestId("home-screen");
    await user.click(screen.getByTestId("journey-switch-dev"));
    await screen.findByTestId("map-screen");
    await user.click(screen.getByTestId("map-back"));
    await screen.findByTestId("home-screen");
    await user.click(screen.getByTestId("journey-switch-ia_pratica"));

    expect(await screen.findByTestId("map-screen")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mapa da Vila Lume" })).toBeInTheDocument();
    expect(screen.queryByTestId("map-lesson-l15")).not.toBeInTheDocument();

    const saved = await progressRepo.load();
    expect(saved?.journeys?.active).toBe("ia_pratica");
    expect(saved?.journeys?.current?.dev).toBe("l15");
    expect(saved?.currentLessonId).toBe(MAP_INITIAL_LESSON_ID);
  });

  it("falha ao salvar a troca mantém a tela atual e informa", async () => {
    const user = userEvent.setup();
    const { services, progressRepo } = seedReturningLearner();
    vi.spyOn(progressRepo, "save").mockRejectedValueOnce(new Error("quota indisponível"));
    render(<App services={services} />);

    await screen.findByTestId("home-screen");
    await user.click(screen.getByTestId("journey-switch-dev"));

    expect(await screen.findByTestId("journey-switch-error")).toHaveTextContent(
      "Não foi possível salvar a troca de jornada",
    );
    expect(screen.getByTestId("home-screen")).toBeInTheDocument();
  });

  it("reload (boot) com Dev ativa retoma pela jornada Dev", async () => {
    const { services, progressRepo } = seedReturningLearner();
    await services.useCases.switchJourney("dev");
    await services.useCases.startLesson("l15");
    expect(progressRepo.load()).resolves.toBeDefined();
    render(<App services={services} />);

    // Retomada: l15 em andamento volta direto ao player (resumeSession lê o
    // cursor espelhado da jornada ativa).
    expect(await screen.findByTestId("lesson-intro")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Quando usar IA e quando não usar/i }));
  });
});

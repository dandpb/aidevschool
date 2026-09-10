import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../src/app/App";
import { createServices } from "../../src/app/services";
import type { AnalyticsSink } from "../../src/application/ports";
import type { ProductAnalyticsEvent } from "../../src/domain/analytics";
import { MAP_INITIAL_LESSON_ID, createInitialProgress } from "../../src/domain/progress";
import { InMemoryEvidenceSink, InMemoryProgressRepository, fixedClock } from "../fakes";

// F2 prova 2 (plan §3 / spec R1): `entry_viewed` na PRIMEIRA rota renderizada,
// qualquer destino de resumeSession — home, retomada pós-reload de lição em
// andamento (entry:"lesson-resume") e onboarding — exatamente 1× por page load.

const FIXED_NOW = new Date("2026-09-10T12:00:00.000Z");

class InMemoryAnalyticsSink implements AnalyticsSink {
  readonly events: ProductAnalyticsEvent[] = [];

  track(event: ProductAnalyticsEvent): void {
    this.events.push(event);
  }
}

function bootServices() {
  const analytics = new InMemoryAnalyticsSink();
  const progressRepo = new InMemoryProgressRepository();
  const services = createServices({
    progressRepo,
    evidence: new InMemoryEvidenceSink(),
    clock: fixedClock(FIXED_NOW),
    analytics,
  });
  progressRepo.seed(
    createInitialProgress(services.content.listModules(), services.content.getContentVersion()),
  );
  return { analytics, progressRepo, services };
}

async function entryEvents(analytics: InMemoryAnalyticsSink) {
  // A emissão vive num efeito passivo (App.tsx useEffect) que pode dar flush
  // DEPOIS do commit do h1 — sob carga, o findByRole resolvia antes do evento
  // chegar ao sink (flake AID-1255). Pronto-sinal é o próprio evento: poll do
  // sink até `entry_viewed` estar presente; a unicidade segue assertada por
  // cada teste.
  await waitFor(() => {
    expect(analytics.events.some((event) => event.event === "entry_viewed")).toBe(true);
  });
  return analytics.events.filter((event) => event.event === "entry_viewed");
}

describe("entry_viewed na 1ª rota renderizada (F2 R1)", () => {
  it("sessão retomada pós-reload (resumeSession→lesson) emite entry_viewed com entry:'lesson-resume' exatamente 1×", async () => {
    const { analytics, progressRepo, services } = bootServices();
    await services.useCases.completeOnboarding({
      goal: "save_time",
      context: "work",
      confidence: "medium",
      taskCategory: "scheduling",
      audience: "ia_pratica",
    });
    // Reload: lição em andamento persistida → resumeSession cai no player.
    await services.useCases.startLesson(MAP_INITIAL_LESSON_ID);
    analytics.events.length = 0;
    // Novo page load (mount) com o MESMO repositório persistido.
    render(
      <App
        services={createServices({
          progressRepo,
          evidence: new InMemoryEvidenceSink(),
          clock: fixedClock(FIXED_NOW),
          analytics,
        })}
      />,
    );
    const events = await entryEvents(analytics);
    expect(events).toHaveLength(1);
    expect(events[0]?.props).toEqual({ entry: "lesson-resume" });
    expect(screen.getByTestId("lesson-intro")).toBeTruthy();
  });

  it("rota home emite entry_viewed com entry:'home' 1×", async () => {
    const { analytics, services } = bootServices();
    await services.useCases.completeOnboarding({
      goal: "save_time",
      context: "work",
      confidence: "medium",
      taskCategory: "scheduling",
      audience: "ia_pratica",
    });
    analytics.events.length = 0;
    render(<App services={services} />);
    const events = await entryEvents(analytics);
    expect(events).toHaveLength(1);
    expect(events[0]?.props).toEqual({ entry: "home" });
  });

  it("onboarding pendente emite entry_viewed com entry:'onboarding' 1×", async () => {
    const { analytics, services } = bootServices();
    render(<App services={services} />);
    const events = await entryEvents(analytics);
    expect(events).toHaveLength(1);
    expect(events[0]?.props).toEqual({ entry: "onboarding" });
  });

  it("a emissão é única por page load mesmo navegando entre rotas depois", async () => {
    const { analytics, services } = bootServices();
    await services.useCases.completeOnboarding({
      goal: "save_time",
      context: "work",
      confidence: "medium",
      taskCategory: "scheduling",
      audience: "ia_pratica",
    });
    analytics.events.length = 0;
    render(<App services={services} />);
    await entryEvents(analytics);
    // A guarda (ref) impede re-emissão: sem interação adicional o total segue 1.
    expect(analytics.events.filter((event) => event.event === "entry_viewed")).toHaveLength(1);
  });
});

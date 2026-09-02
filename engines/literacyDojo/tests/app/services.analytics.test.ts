import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServices } from "../../src/app/services";
import type { AnalyticsSink } from "../../src/application/ports";
import { lessons } from "../../src/data/generated/lessons";
import {
  type ProductAnalyticsEvent,
  buildLessonCompletedEvent,
  isValidAnalyticsEvent,
} from "../../src/domain/analytics";
import { MAP_INITIAL_LESSON_ID, createInitialProgress } from "../../src/domain/progress";
import { InMemoryEvidenceSink, InMemoryProgressRepository, fixedClock } from "../fakes";

/** Coleta os eventos de analytics em memória — canal de teste (ADR-0009). */
class InMemoryAnalyticsSink implements AnalyticsSink {
  readonly events: ProductAnalyticsEvent[] = [];

  track(event: ProductAnalyticsEvent): void {
    this.events.push(event);
  }
}

// AID-676 (spec AID-673 §3, espelho do createServices.analytics.test.ts do
// OS): a fronteira de emissão do literacyDojo — nada sai do navegador a menos
// que VITE_ANALYTICS_ENDPOINT seja explicitamente configurado em build, o que
// nenhuma superfície deste repo faz (ativação é gate do board, ADR-0010 §4).
// Missão hospedada nunca emite pelo sink literacy (o host OS já mede as
// missões) e o piloto lesson_completed sai exatamente 1× por conclusão.

const FIXED_NOW = new Date("2026-07-19T12:00:00.000Z");

const PILOT_EVENT = buildLessonCompletedEvent({
  lessonId: "l02",
  lessonVersion: 1,
  score: 1,
  occurredAt: FIXED_NOW.toISOString(),
  contentVersion: "test",
});

function makeCompletableServices(analytics: InMemoryAnalyticsSink) {
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
  return services;
}

describe("createServices analytics transport selection", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("(a) sem VITE_ANALYTICS_ENDPOINT ⇒ zero chamadas de fetch", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { analytics } = createServices();

    analytics.track(PILOT_EVENT);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('(b) VITE_ANALYTICS_ENDPOINT="" ⇒ zero rede', () => {
    vi.stubEnv("VITE_ANALYTICS_ENDPOINT", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { analytics } = createServices();

    analytics.track(PILOT_EVENT);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("(c) env definido ⇒ httpNdjson selecionado (POST NDJSON no endpoint)", () => {
    vi.stubEnv("VITE_ANALYTICS_ENDPOINT", "/literacy-analytics");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { analytics } = createServices();

    analytics.track(PILOT_EVENT);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe("/literacy-analytics");
    const init = call?.[1] as RequestInit | undefined;
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("application/x-ndjson");
    expect(init?.body).toBe(`${JSON.stringify(PILOT_EVENT)}\n`);
  });

  it("(d) missão hospedada ⇒ noop mesmo com env definido", () => {
    vi.stubEnv("VITE_ANALYTICS_ENDPOINT", "/literacy-analytics");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { analytics } = createServices({ hostAdapter: { emit: () => undefined } });

    analytics.track(PILOT_EVENT);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("(e) lesson_completed 1× por conclusão com envelope válido — e só na conclusão", async () => {
    const analytics = new InMemoryAnalyticsSink();
    const services = makeCompletableServices(analytics);
    const lesson = lessons.find((item) => item.id === MAP_INITIAL_LESSON_ID);
    if (!lesson) throw new Error("Mapa Inicial ausente do read model");
    const allBestScores = Object.fromEntries(
      lesson.completion.requiredActivityIds.map((id) => [id, 1]),
    );

    // Conclusão incompleta (atividade obrigatória faltando): não emite.
    const partial = { ...allBestScores };
    delete partial[lesson.completion.requiredActivityIds[0]];
    const unfinished = await services.useCases.completeLesson({
      lessonId: lesson.id,
      bestScores: partial,
      durationSeconds: 30,
    });
    expect(unfinished.outcome.completed).toBe(false);
    expect(analytics.events).toHaveLength(0);

    // Primeira conclusão: exatamente 1 evento válido.
    const result = await services.useCases.completeLesson({
      lessonId: lesson.id,
      bestScores: allBestScores,
      durationSeconds: 42,
    });
    expect(result.outcome.completed).toBe(true);
    expect(analytics.events).toHaveLength(1);
    const [event] = analytics.events;
    expect(isValidAnalyticsEvent(event)).toBe(true);
    expect(event.event).toBe("lesson_completed");
    expect(event.source).toBe("literacydojo");
    expect(event.schemaVersion).toBe(1);
    expect(event.occurredAt).toBe(FIXED_NOW.toISOString());
    expect(event.contentVersion).toBe(services.content.getContentVersion());
    expect(event.props).toEqual({
      lessonId: lesson.id,
      lessonVersion: lesson.version,
      score: result.outcome.lessonScore,
      durationSeconds: 42,
    });

    // Revisão espaçada não é conclusão: não emite.
    await services.useCases.startReview(lesson.id);
    await services.useCases.completeReview({ lessonId: lesson.id, bestScores: allBestScores });
    expect(analytics.events).toHaveLength(1);

    // Nova conclusão (replay): 1 novo evento — sempre 1× por conclusão.
    await services.useCases.completeLesson({ lessonId: lesson.id, bestScores: allBestScores });
    expect(analytics.events).toHaveLength(2);
    expect(analytics.events.every((item) => item.event === "lesson_completed")).toBe(true);
  });
});

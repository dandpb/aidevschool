import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServices } from "../../src/app/services";
import type { AnalyticsSink } from "../../src/application/ports";
import { lessons } from "../../src/data/generated/lessons";
import {
  type ProductAnalyticsEvent,
  buildAnalyticsBatch,
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
// por ativação O1 (AID-913, emenda ADR-0009/ADR-0010 §4) acontece SOMENTE nos
// [build.environment] dos 2 netlify.toml (same-origin; travado por teste).
// Missão hospedada nunca emite pelo sink literacy (o host OS já mede as
// missões) e o piloto lesson_completed sai exatamente 1× por conclusão.

const FIXED_NOW = new Date("2026-07-19T12:00:00.000Z");

// Identidade anônima efêmera v2 (emenda AID-913): eventId por evento,
// sessionId por page load — nunca persistida, nunca PII.
const PILOT_IDENTITY = {
  eventId: "01234567-89ab-4cde-8f01-23456789abcd",
  sessionId: "fedcba98-7654-4321-8fed-cba987654321",
};

const PILOT_EVENT = buildLessonCompletedEvent(
  PILOT_IDENTITY,
  {
    lessonId: "l02",
    lessonVersion: 1,
    score: 1,
  },
  {
    occurredAt: FIXED_NOW.toISOString(),
    contentVersion: "test",
  },
);

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

  it("(c) env definido ⇒ batch sink same-origin selecionado (1 POST JSON por lote no flush)", () => {
    // Ativação O1 (AID-913): o transporte é o batch sink NDJSON→JSON
    // (buffer 20 eventos/15s/pagehide) — substitui o POST-por-evento v1.
    vi.stubEnv("VITE_ANALYTICS_ENDPOINT", "/literacy-analytics");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { analytics } = createServices();

    analytics.track(PILOT_EVENT);
    // Bufferizado: analytics nunca bloqueia nem atrasa a lição.
    expect(fetchMock).not.toHaveBeenCalled();

    const flushable = analytics as unknown as { flush(reason?: string): void };
    flushable.flush("dispose");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe("/literacy-analytics");
    const init = call?.[1] as RequestInit | undefined;
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(init?.body).toBe(JSON.stringify(buildAnalyticsBatch([PILOT_EVENT])));
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
    expect(event.schemaVersion).toBe(2);
    expect(event.occurredAt).toBe(FIXED_NOW.toISOString());
    expect(event.contentVersion).toBe(services.content.getContentVersion());
    expect(event.props).toEqual({
      lessonId: lesson.id,
      lessonVersion: lesson.version,
      score: result.outcome.lessonScore,
      durationSeconds: 42,
    });
    // Identidade anônima v2: eventId novo por evento; sessionId estável por
    // page load (serviços = 1 sessão em memória).
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    expect(event.eventId).toMatch(uuid);

    // Revisão espaçada não é conclusão: emite os eventos de MEDIÇÃO do
    // corredor (spec AID-915 §4.3) — review_started + review_completed — e
    // nunca `lesson_completed`.
    await services.useCases.startReview(lesson.id);
    await services.useCases.completeReview({ lessonId: lesson.id, bestScores: allBestScores });
    expect(analytics.events).toHaveLength(3);
    expect(analytics.events[1]).toMatchObject({
      event: "review_started",
      props: { lessonId: lesson.id },
    });
    expect(analytics.events[2]).toMatchObject({
      event: "review_completed",
      props: { lessonId: lesson.id, score: 1 },
    });
    expect(analytics.events.every(isValidAnalyticsEvent)).toBe(true);

    // Nova conclusão (replay): 1 novo evento — sempre 1× por conclusão.
    await services.useCases.completeLesson({ lessonId: lesson.id, bestScores: allBestScores });
    expect(analytics.events).toHaveLength(4);
    expect(JSON.stringify(analytics.events)).not.toContain("mastered");
    expect(analytics.events.filter((item) => item.event === "lesson_completed")).toHaveLength(2);
    // Identidade anônima v2: mesma sessão ⇒ mesmo sessionId em TODOS os
    // eventos (conclusão + revisão); eventId distinto por evento.
    expect(new Set(analytics.events.map((item) => item.sessionId)).size).toBe(1);
    expect(new Set(analytics.events.map((item) => item.eventId)).size).toBe(4);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServices } from "../../src/app/services";
import type { AnalyticsSink } from "../../src/application/ports";
import type { ProductAnalyticsEvent } from "../../src/domain/analytics";
import { isValidAnalyticsEvent } from "../../src/domain/analytics";
import { MAP_INITIAL_LESSON_ID, createInitialProgress } from "../../src/domain/progress";
import { InMemoryEvidenceSink, InMemoryProgressRepository, fixedClock } from "../fakes";

// Funil anônimo da ativação O1 (AID-913, emenda ADR-0009): startLesson emite
// lesson_started; submitActivityAttempt emite activity_attempted (passa ou
// não); completeLesson emite lesson_completed 1×. Todos os eventos da mesma
// page load compartilham o sessionId efêmero e trazem eventId próprio.

const FIXED_NOW = new Date("2026-07-19T12:00:00.000Z");

class InMemoryAnalyticsSink implements AnalyticsSink {
  readonly events: ProductAnalyticsEvent[] = [];

  track(event: ProductAnalyticsEvent): void {
    this.events.push(event);
  }
}

function makeServices() {
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
  return { analytics, services };
}

async function completeMvpOnboarding(services: ReturnType<typeof makeServices>["services"]) {
  await services.useCases.completeOnboarding({
    goal: "save_time",
    context: "work",
    confidence: "medium",
    taskCategory: "scheduling",
    audience: "ia_pratica",
  });
}

describe("funil anônimo (emenda AID-913)", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("startLesson emite lesson_started com envelope v2 válido", async () => {
    const { analytics, services } = makeServices();
    await completeMvpOnboarding(services);
    await services.useCases.startLesson(MAP_INITIAL_LESSON_ID);
    expect(analytics.events).toHaveLength(1);
    const [event] = analytics.events;
    expect(isValidAnalyticsEvent(event)).toBe(true);
    expect(event.event).toBe("lesson_started");
    expect(event.props).toEqual({
      lessonId: MAP_INITIAL_LESSON_ID,
      lessonVersion: expect.any(Number),
    });
    expect(event.occurredAt).toBe(FIXED_NOW.toISOString());
  });

  it("submitActivityAttempt emite activity_attempted com o resultado da tentativa", async () => {
    const { analytics, services } = makeServices();
    await completeMvpOnboarding(services);
    await services.useCases.startLesson(MAP_INITIAL_LESSON_ID);
    analytics.events.length = 0;

    const lesson = services.content.getLesson(MAP_INITIAL_LESSON_ID);
    if (!lesson) throw new Error("Mapa Inicial ausente");
    const activity = lesson.activities[0];
    if (!activity) throw new Error("Atividade ausente");

    // Tentativa vazia (não passa) — avaliação determinística: score 0.
    await services.useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId: activity.id,
      answer: { outputId: "__none__", criterionIds: [] },
    });
    expect(analytics.events).toHaveLength(1);
    const attempt = analytics.events[0];
    expect(attempt?.event).toBe("activity_attempted");
    expect(attempt?.props).toMatchObject({
      lessonId: lesson.id,
      activityType: activity.type,
      passed: false,
    });
  });

  it("sessão anônima: mesmo sessionId em todos os eventos, eventId único por evento", async () => {
    const { analytics, services } = makeServices();
    await completeMvpOnboarding(services);
    await services.useCases.startLesson(MAP_INITIAL_LESSON_ID);
    await services.useCases.completeLesson({
      lessonId: MAP_INITIAL_LESSON_ID,
      bestScores: Object.fromEntries(
        (
          services.content.getLesson(MAP_INITIAL_LESSON_ID)?.completion.requiredActivityIds ?? []
        ).map((id) => [id, 1]),
      ),
    });
    expect(analytics.events.length).toBeGreaterThanOrEqual(2);
    const sessionIds = new Set(analytics.events.map((event) => event.sessionId));
    const eventIds = new Set(analytics.events.map((event) => event.eventId));
    expect(sessionIds.size).toBe(1);
    expect(eventIds.size).toBe(analytics.events.length);
    const sessionId = analytics.events[0]?.sessionId ?? "";
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("completeLesson segue emitindo exatamente 1× por conclusão (regressão do piloto)", async () => {
    const { analytics, services } = makeServices();
    await completeMvpOnboarding(services);
    await services.useCases.startLesson(MAP_INITIAL_LESSON_ID);
    analytics.events.length = 0;
    const lesson = services.content.getLesson(MAP_INITIAL_LESSON_ID);
    if (!lesson) throw new Error("Mapa Inicial ausente");
    const bestScores = Object.fromEntries(
      lesson.completion.requiredActivityIds.map((id) => [id, 1]),
    );
    const result = await services.useCases.completeLesson({
      lessonId: lesson.id,
      bestScores,
    });
    expect(result.outcome.completed).toBe(true);
    const completions = analytics.events.filter((event) => event.event === "lesson_completed");
    expect(completions).toHaveLength(1);
    expect(completions[0]?.props).toMatchObject({ lessonId: lesson.id });
  });
});

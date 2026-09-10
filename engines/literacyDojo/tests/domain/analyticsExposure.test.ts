import { describe, expect, it } from "vitest";
import {
  ANALYTICS_ACTIVITY_TYPES,
  type ProductAnalyticsEvent,
  buildActivityAttemptedEvent,
  buildActivityPresentedEvent,
  buildEntryViewedEvent,
  buildLessonBriefViewedEvent,
  isValidAnalyticsEvent,
} from "../../src/domain/analytics";

// F2 `2026-09-10-entry-brief-instrumentation` (emenda ADR-0009): os 2 eventos
// de exposição e a prop opcional `entry` — construtores fechados, vocabulário
// de valor travado, retro-compat byte-a-byte dos envelopes existentes.

const IDENTITY = {
  sessionId: "01234567-89ab-4cde-8f01-23456789abcd",
  eventId: "fedcba98-7654-4321-8fed-cba987654321",
};
const TIMING = { occurredAt: "2026-09-10T12:00:00.000Z", contentVersion: "test" };

function reidentify(event: ProductAnalyticsEvent): ProductAnalyticsEvent {
  return { ...event, eventId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee" };
}

describe("entry_viewed: prop opcional `entry` (R1)", () => {
  it("sem a prop continua válido (envelope pré-v4, retro-compat)", () => {
    const event = buildEntryViewedEvent(IDENTITY, TIMING);
    expect(event.props).toEqual({});
    expect(isValidAnalyticsEvent(event)).toBe(true);
  });

  it("aceita exatamente os 3 valores do vocabulário", () => {
    for (const entry of ["home", "lesson-resume", "onboarding"] as const) {
      const event = buildEntryViewedEvent(IDENTITY, TIMING, { entry });
      expect(event.props).toEqual({ entry });
      expect(isValidAnalyticsEvent(event)).toBe(true);
    }
  });

  it("rejeita valor fora do vocabulário na validação estrutural", () => {
    const event = {
      ...buildEntryViewedEvent(IDENTITY, TIMING, { entry: "home" }),
      props: { entry: "deep-link" },
    };
    expect(isValidAnalyticsEvent(event)).toBe(false);
  });
});

describe("lesson_brief_viewed (R2): construtor fechado", () => {
  it("carrega somente lessonId + lessonVersion", () => {
    const event = buildLessonBriefViewedEvent(
      IDENTITY,
      { lessonId: "l02", lessonVersion: 3 },
      TIMING,
    );
    expect(event.event).toBe("lesson_brief_viewed");
    expect(event.props).toEqual({ lessonId: "l02", lessonVersion: 3 });
    expect(isValidAnalyticsEvent(event)).toBe(true);
  });

  it("validador rejeita lessonVersion não inteiro e lessonId vazio", () => {
    const base = buildLessonBriefViewedEvent(
      IDENTITY,
      { lessonId: "l02", lessonVersion: 3 },
      TIMING,
    );
    expect(isValidAnalyticsEvent({ ...base, props: { lessonId: "l02", lessonVersion: 1.5 } })).toBe(
      false,
    );
    expect(isValidAnalyticsEvent({ ...base, props: { lessonId: "", lessonVersion: 3 } })).toBe(
      false,
    );
    expect(isValidAnalyticsEvent({ ...base, props: { lessonId: "l02" } })).toBe(false);
  });
});

describe("activity_presented (R2): construtor fechado por (sessão, índice)", () => {
  it("carrega lessonId + activityType + activityIndex ≥ 0", () => {
    const event = buildActivityPresentedEvent(
      IDENTITY,
      { lessonId: "l02", activityType: "choice", activityIndex: 0 },
      TIMING,
    );
    expect(event.props).toEqual({ lessonId: "l02", activityType: "choice", activityIndex: 0 });
    expect(isValidAnalyticsEvent(event)).toBe(true);
  });

  it("aceita os 7 tipos de atividade do contrato", () => {
    for (const activityType of ANALYTICS_ACTIVITY_TYPES) {
      const event = buildActivityPresentedEvent(
        IDENTITY,
        { lessonId: "l02", activityType, activityIndex: 2 },
        TIMING,
      );
      expect(isValidAnalyticsEvent(event)).toBe(true);
    }
  });

  it("rejeita índice negativo, não inteiro e activityType fora do vocabulário", () => {
    const base = buildActivityPresentedEvent(
      IDENTITY,
      { lessonId: "l02", activityType: "choice", activityIndex: 0 },
      TIMING,
    );
    expect(
      isValidAnalyticsEvent({
        ...base,
        props: { lessonId: "l02", activityType: "choice", activityIndex: -1 },
      }),
    ).toBe(false);
    expect(
      isValidAnalyticsEvent({
        ...base,
        props: { lessonId: "l02", activityType: "choice", activityIndex: 0.5 },
      }),
    ).toBe(false);
    expect(
      isValidAnalyticsEvent({
        ...base,
        props: { lessonId: "l02", activityType: "scroll", activityIndex: 0 },
      }),
    ).toBe(false);
  });
});

describe("retro-compat: eventos existentes permanecem válidos", () => {
  it("activity_attempted inalterado (construtor fechado pré-F2)", () => {
    const event = buildActivityAttemptedEvent(
      IDENTITY,
      { lessonId: "l02", activityType: "sort", passed: true },
      TIMING,
    );
    expect(isValidAnalyticsEvent(event)).toBe(true);
    expect(isValidAnalyticsEvent(reidentify(event))).toBe(true);
  });
});

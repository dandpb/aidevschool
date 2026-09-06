import { describe, expect, it } from "vitest";
import {
  ANALYTICS_ACTIVITY_TYPES,
  ANALYTICS_SCHEMA_VERSION,
  buildActivityAttemptedEvent,
  buildAnalyticsBatch,
  buildEntryViewedEvent,
  buildLessonCompletedEvent,
  buildLessonStartedEvent,
  isValidAnalyticsBatch,
  isValidAnalyticsEvent,
} from "../../src/domain/analytics";

// Emenda ADR-0009 via AID-913: envelope v2 com identidade anônima efêmera
// (sessionId por page load + eventId por evento) e vocabulário de funil
// (entry_viewed → lesson_started → activity_attempted → lesson_completed).
// Estas auditorias travam a fronteira de privacidade: sem texto livre, sem
// PII, sem `mastered`, props fechadas por evento.

const IDENTITY = {
  eventId: "0f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
  sessionId: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
};
const TIMING = { occurredAt: "2026-09-06T12:00:00.000Z", contentVersion: "test-v2" };

describe("analytics domain v2 (emenda AID-913)", () => {
  it("envelope v2 carrega schemaVersion 2 e identidade anônima obrigatória", () => {
    const event = buildLessonStartedEvent(IDENTITY, { lessonId: "l01", lessonVersion: 2 }, TIMING);
    expect(event.schemaVersion).toBe(ANALYTICS_SCHEMA_VERSION);
    expect(ANALYTICS_SCHEMA_VERSION).toBe(2);
    expect(event.source).toBe("literacydojo");
    expect(event.eventId).toBe(IDENTITY.eventId);
    expect(event.sessionId).toBe(IDENTITY.sessionId);
    expect(isValidAnalyticsEvent(event)).toBe(true);
  });

  it("rejeita sessionId/eventId fora do formato UUID", () => {
    const event = buildLessonStartedEvent(IDENTITY, { lessonId: "l01", lessonVersion: 2 }, TIMING);
    expect(isValidAnalyticsEvent({ ...event, sessionId: "anonymous-session" })).toBe(false);
    expect(isValidAnalyticsEvent({ ...event, eventId: "" })).toBe(false);
    expect(isValidAnalyticsEvent({ ...event, sessionId: undefined })).toBe(false);
  });

  it("construtores fechados: props exatas por evento", () => {
    const entry = buildEntryViewedEvent(IDENTITY, TIMING);
    expect(entry.event).toBe("entry_viewed");
    expect(entry.props).toEqual({});

    const started = buildLessonStartedEvent(
      IDENTITY,
      { lessonId: "l02", lessonVersion: 3 },
      TIMING,
    );
    expect(started.props).toEqual({ lessonId: "l02", lessonVersion: 3 });

    const attempt = buildActivityAttemptedEvent(
      IDENTITY,
      { lessonId: "l02", activityType: "choice", passed: false },
      TIMING,
    );
    expect(attempt.props).toEqual({ lessonId: "l02", activityType: "choice", passed: false });
    expect(attempt.event).toBe("activity_attempted");

    const completed = buildLessonCompletedEvent(
      IDENTITY,
      { lessonId: "l02", lessonVersion: 3, score: 0.8, durationSeconds: 210 },
      TIMING,
    );
    expect(completed.props).toEqual({
      lessonId: "l02",
      lessonVersion: 3,
      score: 0.8,
      durationSeconds: 210,
    });
    expect(isValidAnalyticsEvent(completed)).toBe(true);
  });

  it("activityType é vocabulário fechado (7 tipos do contrato de conteúdo)", () => {
    expect(ANALYTICS_ACTIVITY_TYPES).toEqual([
      "choice",
      "sort",
      "missing_context",
      "safety_classification",
      "prompt_builder",
      "output_comparison",
      "rubric_review",
    ]);
    // Construtor fechado: tipo fora do vocabulário é erro de programação
    // (falha o build/teste, nunca é enviado — ADR-0009 §2).
    expect(() =>
      buildActivityAttemptedEvent(
        IDENTITY,
        // @ts-expect-error — tipo fora do vocabulário deve falhar a validação
        { lessonId: "l02", activityType: "free_text", passed: true },
        TIMING,
      ),
    ).toThrow(/fronteira de privacidade/);
  });

  it("fronteira de privacidade: props não primitivas ou longas nunca passam", () => {
    const completed = buildLessonCompletedEvent(
      IDENTITY,
      { lessonId: "l02", lessonVersion: 3, score: 1 },
      TIMING,
    );
    expect(
      isValidAnalyticsEvent({ ...completed, props: { answer: "texto livre do usuário" } }),
    ).toBe(false);
    expect(isValidAnalyticsEvent({ ...completed, props: { note: "x".repeat(121) } })).toBe(false);
    expect(isValidAnalyticsEvent({ ...completed, props: { nested: { a: 1 } } })).toBe(false);
    // O fechamento do conjunto de chaves do envelope é imposto no coletor
    // (hasOnlyKeys espelhado); os construtores do domínio nunca produzem
    // chaves extras, então a paridade construtor→coletor é fechada por teste.
  });

  it("batch literacy v2: valida envelope de lote e rejeita eventos inválidos dentro", () => {
    const events = [
      buildEntryViewedEvent(IDENTITY, TIMING),
      buildLessonStartedEvent(IDENTITY, { lessonId: "l01", lessonVersion: 2 }, TIMING),
    ];
    const batch = buildAnalyticsBatch(events);
    expect(batch).toEqual({
      schemaVersion: 2,
      source: "literacydojo",
      events,
    });
    expect(isValidAnalyticsBatch(batch)).toBe(true);
    expect(isValidAnalyticsBatch({ ...batch, source: "other" })).toBe(false);
    expect(isValidAnalyticsBatch({ ...batch, events: [...events, { bogus: true }] })).toBe(false);
    expect(isValidAnalyticsBatch({ schemaVersion: 1, events })).toBe(false);
  });
});

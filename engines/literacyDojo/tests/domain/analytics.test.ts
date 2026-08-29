import { describe, expect, it } from "vitest";
import {
  ANALYTICS_SCHEMA_VERSION,
  ANALYTICS_SOURCE,
  buildLessonCompletedEvent,
  isValidAnalyticsEvent,
} from "../../src/domain/analytics";

const BASE = {
  occurredAt: "2026-08-13T12:00:00.000Z",
  contentVersion: "2026-07-25.1",
};

describe("buildLessonCompletedEvent (evento piloto ADR-0009)", () => {
  it("emite o envelope versionado com somente metadados estruturados", () => {
    const event = buildLessonCompletedEvent({
      lessonId: "l02",
      lessonVersion: 3,
      score: 0.75,
      durationSeconds: 210,
      ...BASE,
    });
    expect(event.schemaVersion).toBe(ANALYTICS_SCHEMA_VERSION);
    expect(event.source).toBe(ANALYTICS_SOURCE);
    expect(event.event).toBe("lesson_completed");
    expect(event.props).toEqual({
      lessonId: "l02",
      lessonVersion: 3,
      score: 0.75,
      durationSeconds: 210,
    });
    expect(isValidAnalyticsEvent(event)).toBe(true);
  });

  it("durationSeconds opcional é omitido quando ausente", () => {
    const event = buildLessonCompletedEvent({
      lessonId: "l02",
      lessonVersion: 3,
      score: 1,
      ...BASE,
    });
    expect(event.props).not.toHaveProperty("durationSeconds");
    expect(isValidAnalyticsEvent(event)).toBe(true);
  });

  it("fronteira de privacidade: texto livre longo é rejeitado (nunca vaza)", () => {
    // Uma resposta de texto livre jamais entra em analytics: o construtor
    // falha fechado se a prop ultrapassar o limite de string curta.
    expect(() =>
      buildLessonCompletedEvent({
        lessonId: "a".repeat(200), // simula texto livre vazando por prop
        lessonVersion: 1,
        score: 1,
        ...BASE,
      }),
    ).toThrow();
  });

  it("construtor fechado: somente props permitidas podem ser construídas (prova de não-vazamento)", () => {
    // A garantia de privacidade é o construtor fechado por evento: a assinatura
    // de buildLessonCompletedEvent só aceita lessonId/lessonVersion/score/
    // durationSeconds — não existe parâmetro por onde texto livre ou dado
    // pessoal possa entrar no envelope. Auditamos o envelope resultante: só
    // metadados estruturados da lição e do resultado.
    const event = buildLessonCompletedEvent({
      lessonId: "l02",
      lessonVersion: 3,
      score: 1,
      ...BASE,
    });
    expect(Object.keys(event.props).sort()).toEqual(["lessonId", "lessonVersion", "score"].sort());
    // Nenhum valor carrega texto livre: lessonId é id curto, version/score numéricos.
    for (const value of Object.values(event.props)) {
      if (typeof value === "string") {
        expect(value.length).toBeLessThanOrEqual(120);
      } else {
        expect(["number", "boolean"]).toContain(typeof value);
      }
    }
  });

  it("validação estrutural rejeita envelope malformado (schema, props não primitivas)", () => {
    const event = buildLessonCompletedEvent({
      lessonId: "l02",
      lessonVersion: 3,
      score: 1,
      ...BASE,
    });
    expect(isValidAnalyticsEvent({ ...event, schemaVersion: 99 })).toBe(false);
    expect(isValidAnalyticsEvent({ ...event, source: "outro" })).toBe(false);
    expect(isValidAnalyticsEvent({ ...event, event: "invented" })).toBe(false);
    expect(isValidAnalyticsEvent({ ...event, props: { nested: { x: 1 } } })).toBe(false);
    expect(isValidAnalyticsEvent({ ...event, props: { list: [1, 2] } })).toBe(false);
    expect(isValidAnalyticsEvent({ ...event, props: { nan: Number.NaN } })).toBe(false);
    expect(isValidAnalyticsEvent({ ...event, occurredAt: "nao-e-data" })).toBe(false);
  });
});

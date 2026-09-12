import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsActivityType, ProductAnalyticsEvent } from "../../src/domain/analytics";
import {
  buildActivityPresentedEvent,
  buildLessonBriefViewedEvent,
} from "../../src/domain/analytics";
import { LiteracyMissionAdapter } from "../../src/host/LiteracyMissionAdapter";
import { ENGINE_MISSION_EVENT_NAMES } from "../../src/host/protocol";
import { isEngineMissionEventName, missionEventPayloadIsValid } from "../../src/host/validation";

// F2 P1/P2: whitelist de nomes `mission-event` do protocolo host-engine (+2
// nomes de exposição) e forwarding do LiteracyMissionAdapter — paridade
// emissor↔receptor (o receptor valida os mesmos nomes em
// engines/codexdojo-os-prototype/src/host/validation.ts, travada por teste lá).

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("whitelist EngineMissionEventName (lado engine)", () => {
  it("contém exatamente os 8 nomes do protocolo (6 pré-F2 + 2 de exposição)", () => {
    expect([...ENGINE_MISSION_EVENT_NAMES]).toEqual([
      "mission.started",
      "mission.completed",
      "structured_attempt.submitted",
      "structured_attempt.passed",
      "retry.requested",
      "review.started",
      "mission.brief_viewed",
      "activity.presented",
    ]);
  });

  it("aceita os 2 nomes novos e rejeita fora do vocabulário", () => {
    expect(isEngineMissionEventName("mission.brief_viewed")).toBe(true);
    expect(isEngineMissionEventName("activity.presented")).toBe(true);
    expect(isEngineMissionEventName("mission.brief_viewed.extra")).toBe(false);
    expect(isEngineMissionEventName("scroll")).toBe(false);
    expect(isEngineMissionEventName("mastered")).toBe(false);
    expect(isEngineMissionEventName(42)).toBe(false);
  });

  it("payload: mission.brief_viewed sem dimensões; activity.presented com activityType do contrato", () => {
    expect(missionEventPayloadIsValid({ name: "mission.brief_viewed", dimensions: {} })).toBe(true);
    expect(
      missionEventPayloadIsValid({ name: "mission.brief_viewed", dimensions: { lessonId: "l02" } }),
    ).toBe(false);
    expect(
      missionEventPayloadIsValid({
        name: "activity.presented",
        dimensions: { activityType: "choice" },
      }),
    ).toBe(true);
    expect(
      missionEventPayloadIsValid({
        name: "activity.presented",
        dimensions: { activityType: "scroll" },
      }),
    ).toBe(false);
    expect(missionEventPayloadIsValid({ name: "activity.presented", dimensions: {} })).toBe(false);
  });
});

function hostedAdapter(): {
  adapter: LiteracyMissionAdapter;
  posted: Array<Record<string, unknown>>;
} {
  window.history.replaceState(null, "", "/?hosted=1&hostOrigin=http%3A%2F%2Fhost.test");
  vi.spyOn(document, "referrer", "get").mockReturnValue("http://host.test/");
  const posted: Array<Record<string, unknown>> = [];
  vi.spyOn(window.parent, "postMessage").mockImplementation((message) => {
    posted.push(message as Record<string, unknown>);
    return undefined;
  });
  const adapter = new LiteracyMissionAdapter();
  adapter.start(async () => undefined, "test.1");
  window.dispatchEvent(
    new MessageEvent("message", {
      source: window.parent,
      origin: "http://host.test",
      data: {
        protocol: "aidevschool.host-engine",
        version: "1.0",
        type: "host.hello",
        messageId: "message-1",
        hostSessionId: "host-1",
        missionRunId: "run-1",
        engineId: "literacyDojo",
        sentAt: "2026-09-10T12:00:00.000Z",
        payload: { missionId: "l02", protocolVersion: "1.0" },
      },
    }),
  );
  posted.length = 0;
  return { adapter, posted };
}

function missionEvents(
  posted: Array<Record<string, unknown>>,
): Array<{ name: string; dimensions: Record<string, unknown> }> {
  return posted
    .filter((message) => message.type === "mission.event")
    .map((message) => {
      const payload = message.payload as { name: string; dimensions: Record<string, unknown> };
      return { name: payload.name, dimensions: payload.dimensions ?? {} };
    });
}

describe("LiteracyMissionAdapter forwarding dos eventos de exposição", () => {
  it("publishBriefViewed emite mission.brief_viewed ao host com sequência própria", () => {
    const { adapter, posted } = hostedAdapter();
    adapter.publishBriefViewed();
    const events = missionEvents(posted);
    expect(events).toEqual([{ name: "mission.brief_viewed", dimensions: {} }]);
  });

  it("publishActivityPresented emite activity.presented com activityType do contrato", () => {
    const { adapter, posted } = hostedAdapter();
    adapter.publishActivityPresented("output_comparison");
    expect(missionEvents(posted)).toEqual([
      { name: "activity.presented", dimensions: { activityType: "output_comparison" } },
    ]);
  });

  it("missão hospedada emite os eventos de exposição no shell (fixture paridade emissor)", () => {
    // A fixture de missão hospedada (prova 1 do plan §3): a engine publica
    // brief+presented pela MESMA via dos mission-events existentes — o shell
    // OS reemite como eventos OS v1 (verificado no teste do OS).
    const { adapter, posted } = hostedAdapter();
    adapter.publishBriefViewed();
    adapter.publishActivityPresented("choice");
    adapter.publishActivityPresented("choice");
    const names = missionEvents(posted).map((event) => event.name);
    expect(names).toEqual(["mission.brief_viewed", "activity.presented", "activity.presented"]);
    // Sequência monotônica nos envelopes postados.
    const sequences = posted
      .filter((message) => message.type === "mission.event")
      .map((message) => (message.payload as { sequence: number }).sequence);
    expect(sequences).toEqual([1, 2, 3]);
  });
});

describe("eventos v2 de exposição são construções fechadas reutilizáveis pelo player", () => {
  it("lesson_brief_viewed e activity_presented passam o validador v2", () => {
    const identity = {
      sessionId: "01234567-89ab-4cde-8f01-23456789abcd",
      eventId: "fedcba98-7654-4321-8fed-cba987654321",
    };
    const timing = { occurredAt: "2026-09-10T12:00:00.000Z", contentVersion: "test" };
    const brief: ProductAnalyticsEvent = buildLessonBriefViewedEvent(
      identity,
      { lessonId: "l02", lessonVersion: 3 },
      timing,
    );
    const presented: ProductAnalyticsEvent = buildActivityPresentedEvent(
      identity,
      { lessonId: "l02", activityType: "choice" satisfies AnalyticsActivityType, activityIndex: 0 },
      timing,
    );
    expect(brief.event).toBe("lesson_brief_viewed");
    expect(presented.event).toBe("activity_presented");
  });
});

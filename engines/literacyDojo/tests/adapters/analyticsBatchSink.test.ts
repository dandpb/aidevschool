import { describe, expect, it, vi } from "vitest";
import { createBatchAnalyticsSink } from "../../src/adapters/analyticsBatchSink";
import type { AnalyticsSink } from "../../src/application/ports";
import {
  buildEntryViewedEvent,
  buildLessonCompletedEvent,
  isValidAnalyticsEvent,
} from "../../src/domain/analytics";

// Batch sink da ativação O1 (AID-913): buffer em memória + flush por
// capacidade/intervalo/pagehide; beacon no pagehide; rede fire-and-forget.

const IDENTITY = {
  eventId: "0f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
  sessionId: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
};
const TIMING = { occurredAt: "2026-09-06T12:00:00.000Z", contentVersion: "test-v2" };

function makeEvent(index: number) {
  const event = buildLessonCompletedEvent(
    { ...IDENTITY, eventId: `${IDENTITY.eventId.slice(0, -1)}${index % 10}` },
    { lessonId: "l01", lessonVersion: 2, score: 1 },
    TIMING,
  );
  return event;
}

function makeTimers() {
  const tasks: Array<{ handler: () => void; timeoutMs: number }> = [];
  return {
    tasks,
    scheduler: {
      setTimeout(handler: () => void, timeoutMs: number) {
        tasks.push({ handler, timeoutMs });
        return tasks.length;
      },
      clearTimeout(handle: unknown) {
        const index = (handle as number) - 1;
        if (tasks[index]) tasks.splice(index, 1);
      },
    },
  };
}

describe("batch analytics sink (AID-913)", () => {
  it("bufferiza e envia por capacidade com o envelope de lote literacy v2", () => {
    const fetcher = vi.fn(async () => undefined);
    const sink = createBatchAnalyticsSink({
      endpoint: "/__dojo/bridge/v1/analytics",
      maxBufferedEvents: 3,
      fetcher: fetcher as unknown as (input: string, init: RequestInit) => Promise<unknown>,
      timers: makeTimers().scheduler,
    });

    sink.track(makeEvent(1));
    sink.track(makeEvent(2));
    expect(fetcher).not.toHaveBeenCalled();

    sink.track(makeEvent(3));
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe("/__dojo/bridge/v1/analytics");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    const batch = JSON.parse(init.body as string) as {
      schemaVersion: number;
      source: string;
      events: unknown[];
    };
    expect(batch.schemaVersion).toBe(2);
    expect(batch.source).toBe("literacydojo");
    expect(batch.events).toHaveLength(3);
  });

  it("flush por intervalo agenda apenas um timer pendente", () => {
    const fetcher = vi.fn(async () => undefined);
    const { tasks, scheduler } = makeTimers();
    const sink = createBatchAnalyticsSink({
      endpoint: "/__dojo/bridge/v1/analytics",
      flushIntervalMs: 15_000,
      fetcher: fetcher as unknown as (input: string, init: RequestInit) => Promise<unknown>,
      timers: scheduler,
    });

    sink.track(makeEvent(1));
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.timeoutMs).toBe(15_000);
    sink.track(makeEvent(2));
    expect(tasks).toHaveLength(1);

    tasks[0]?.handler();
    expect(fetcher).toHaveBeenCalledTimes(1);
    const batch = JSON.parse(
      (fetcher.mock.calls[0] as unknown as [string, RequestInit])?.[1].body as string,
    );
    expect(batch.events).toHaveLength(2);
  });

  it("pagehide usa sendBeacon quando disponível", () => {
    const fetcher = vi.fn(async () => undefined);
    const beacon = vi.fn(() => true);
    const sink = createBatchAnalyticsSink({
      endpoint: "/__dojo/bridge/v1/analytics",
      beacon,
      fetcher: fetcher as unknown as (input: string, init: RequestInit) => Promise<unknown>,
      timers: makeTimers().scheduler,
    });
    sink.track(makeEvent(1));
    sink.flush("pagehide");
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(fetcher).not.toHaveBeenCalled();
    const blob = (beacon.mock.calls[0] as unknown as [string, Blob])?.[1] as Blob;
    expect(blob.type).toBe("application/json");
  });

  it("buffer é limitado ao teto do coletor (100 eventos por lote)", () => {
    const fetcher = vi.fn(async () => undefined);
    const sink = createBatchAnalyticsSink({
      endpoint: "/__dojo/bridge/v1/analytics",
      // Pedir um buffer acima do teto do coletor é clampado para 100 —
      // nenhum POST pode exceder ANALYTICS_BATCH_MAX_EVENTS (ADR-0010).
      maxBufferedEvents: 500,
      fetcher: fetcher as unknown as (input: string, init: RequestInit) => Promise<unknown>,
      timers: makeTimers().scheduler,
    });
    for (let index = 0; index < 99; index += 1) {
      sink.track(makeEvent(index));
    }
    expect(fetcher).not.toHaveBeenCalled();
    sink.track(makeEvent(100));
    expect(fetcher).toHaveBeenCalledTimes(1);
    const batch = JSON.parse(
      (fetcher.mock.calls[0] as unknown as [string, RequestInit])?.[1].body as string,
    );
    expect(batch.events).toHaveLength(100);
  });

  it("evento inválido nunca entra no buffer; falha de rede nunca propaga", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("network down");
    });
    const sink = createBatchAnalyticsSink({
      endpoint: "/__dojo/bridge/v1/analytics",
      maxBufferedEvents: 1,
      fetcher: fetcher as unknown as (input: string, init: RequestInit) => Promise<unknown>,
      timers: makeTimers().scheduler,
    });
    expect(() => sink.track({ ...makeEvent(1), sessionId: "not-a-uuid" } as never)).not.toThrow();
    expect(() => sink.track(makeEvent(2))).not.toThrow();
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
  });

  it("evento válido produzido pelo domínio passa na revalidação do sink", () => {
    const event = buildEntryViewedEvent(IDENTITY, TIMING);
    expect(isValidAnalyticsEvent(event)).toBe(true);
    const sink: AnalyticsSink = createBatchAnalyticsSink({
      endpoint: "/__dojo/bridge/v1/analytics",
      fetcher: vi.fn(async () => undefined) as unknown as (
        input: string,
        init: RequestInit,
      ) => Promise<unknown>,
      timers: makeTimers().scheduler,
    });
    expect(() => sink.track(event)).not.toThrow();
  });
});

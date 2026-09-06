import type { AnalyticsSink } from "../application/ports";
import {
  type ProductAnalyticsBatch,
  type ProductAnalyticsEvent,
  buildAnalyticsBatch,
  isValidAnalyticsEvent,
} from "../domain/analytics";

/**
 * Batch sink de analytics (ADR-0009, emenda AID-913 — ativação O1).
 *
 * Bufferiza eventos em memória e envia lotes same-origin (um POST JSON por
 * lote; beacon no pagehide quando disponível). Erros de rede são engolidos —
 * analytics nunca bloqueia nem atrasa a lição. O lote respeita o teto do
 * coletor (100 eventos; ADR-0010) e nada sai sem o endpoint configurado.
 */

export const ANALYTICS_BATCH_MAX_EVENTS = 100;
const DEFAULT_MAX_BUFFERED_EVENTS = 20;
const DEFAULT_FLUSH_INTERVAL_MS = 15_000;

export type AnalyticsFlushReason = "capacity" | "interval" | "pagehide" | "dispose";

type Fetcher = (input: string, init: RequestInit) => Promise<unknown>;
type BeaconSender = (url: string, data: Blob) => boolean;
type TimerScheduler = {
  setTimeout(handler: () => void, timeoutMs: number): unknown;
  clearTimeout(handle: unknown): void;
};

export type BatchAnalyticsSinkOptions = {
  endpoint: string;
  /** Envia quando o buffer chega a N eventos (padrão 20; teto do coletor: 100). */
  maxBufferedEvents?: number;
  /** Envia no máximo após este intervalo (padrão 15s). */
  flushIntervalMs?: number;
  fetcher?: Fetcher;
  beacon?: BeaconSender | undefined;
  timers?: TimerScheduler;
};

function defaultFetcher(input: string, init: RequestInit): Promise<unknown> {
  return fetch(input, init);
}

function defaultBeacon(url: string, data: Blob): boolean {
  return typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function"
    ? navigator.sendBeacon(url, data)
    : false;
}

const defaultTimers: TimerScheduler = {
  setTimeout: (handler, timeoutMs) => setTimeout(handler, timeoutMs),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function createBatchAnalyticsSink(options: BatchAnalyticsSinkOptions): AnalyticsSink & {
  flush(reason?: AnalyticsFlushReason): void;
  /** Apenas testes: esvazia o buffer sem rede. */
  discardBufferedForTests(): number;
} {
  const endpoint = options.endpoint;
  const maxBufferedEvents = Math.min(
    Math.max(1, options.maxBufferedEvents ?? DEFAULT_MAX_BUFFERED_EVENTS),
    ANALYTICS_BATCH_MAX_EVENTS,
  );
  const flushIntervalMs = Math.max(0, options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS);
  const fetcher = options.fetcher ?? defaultFetcher;
  const beacon = options.beacon ?? defaultBeacon;
  const timers = options.timers ?? defaultTimers;

  let buffer: ProductAnalyticsEvent[] = [];
  let timerHandle: unknown = null;

  const send = (events: ProductAnalyticsEvent[], reason: AnalyticsFlushReason): void => {
    if (events.length === 0) return;
    const batch: ProductAnalyticsBatch = buildAnalyticsBatch(events);
    const body = JSON.stringify(batch);
    try {
      if (
        reason === "pagehide" &&
        beacon(endpoint, new Blob([body], { type: "application/json" }))
      ) {
        return;
      }
      void fetcher(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: reason === "pagehide",
      }).catch(() => undefined);
    } catch {
      // fire-and-forget: nunca propagar
    }
  };

  const flush = (reason: AnalyticsFlushReason = "capacity"): void => {
    if (timerHandle !== null) {
      timers.clearTimeout(timerHandle);
      timerHandle = null;
    }
    const events = buffer;
    buffer = [];
    while (events.length > 0) {
      const chunk = events.splice(0, ANALYTICS_BATCH_MAX_EVENTS);
      send(chunk, reason);
    }
  };

  const schedule = (): void => {
    if (timerHandle !== null || flushIntervalMs === 0) return;
    timerHandle = timers.setTimeout(() => {
      timerHandle = null;
      flush("interval");
    }, flushIntervalMs);
  };

  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("pagehide", () => flush("pagehide"));
  }

  return {
    track(event): void {
      if (!isValidAnalyticsEvent(event)) return;
      buffer.push(event);
      if (buffer.length >= maxBufferedEvents) {
        flush("capacity");
        return;
      }
      schedule();
    },
    flush,
    discardBufferedForTests(): number {
      const count = buffer.length;
      buffer = [];
      return count;
    },
  };
}

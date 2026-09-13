import type { AnalyticsSink } from "../application/ports";
import {
  type ProductAnalyticsBatch,
  type ProductAnalyticsEvent,
  ANALYTICS_SCHEMA_VERSION,
  ANALYTICS_SOURCE,
  buildAnalyticsBatch,
  isValidAnalyticsEvent,
} from "../domain/analytics";
import {
  type FunnelCoreFlushReason,
  type FunnelCoreScheduler,
  type FunnelCoreTransport,
  createFunnelClient,
} from "../../../shared/teaching-evidence/funnelCore";

/**
 * Batch sink de analytics (ADR-0009, emenda AID-913 — ativação O1).
 *
 * Bufferiza eventos em memória e envia lotes same-origin (um POST JSON por
 * lote; beacon no pagehide quando disponível). Erros de rede são engolidos —
 * analytics nunca bloqueia nem atrasa a lição. O lote respeita o teto do
 * coletor (100 eventos; ADR-0010) e nada sai sem o endpoint configurado.
 *
 * Consolidação 2026-09-13: o mecanismo de buffer/flush/capacidade/intervalo
 * vive no core compartilhado (funnelCore.ts) — este adapter só fornece a
 * política do literacy: validador do domínio (vocabulário literacy.json),
 * flush por capacidade/intervalo, envelope v2 com contentVersion, transporte
 * fire-and-forget que engole falhas.
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
  clearTimeout: (handle) => clearTimeout(handle as number),
};

const CORE_FLUSH_REASON: Record<AnalyticsFlushReason, FunnelCoreFlushReason> = {
  capacity: "size",
  interval: "interval",
  pagehide: "page-hide",
  dispose: "manual",
};

const SINK_FLUSH_REASON: Record<FunnelCoreFlushReason, AnalyticsFlushReason> = {
  size: "capacity",
  interval: "interval",
  "page-hide": "pagehide",
  manual: "dispose",
};

export function createBatchAnalyticsSink(options: BatchAnalyticsSinkOptions): AnalyticsSink & {
  flush(reason?: AnalyticsFlushReason): void;
  /** Apenas testes: esvazia o buffer sem rede. */
  discardBufferedForTests(): number;
} {
  const maxBufferedEvents = Math.min(
    Math.max(1, options.maxBufferedEvents ?? DEFAULT_MAX_BUFFERED_EVENTS),
    ANALYTICS_BATCH_MAX_EVENTS,
  );
  const flushIntervalMs = Math.max(0, options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS);
  const endpoint = options.endpoint;
  const fetcher = options.fetcher ?? defaultFetcher;
  const beacon = options.beacon ?? defaultBeacon;
  const timers = options.timers ?? defaultTimers;

  // Política de transporte do literacy: beacon no pagehide, fetch keepalive
  // como fallback, falhas sempre engolidas (fire-and-forget).
  const transport: FunnelCoreTransport<ProductAnalyticsEvent> = {
    send(batch, coreReason) {
      if (batch.events.length === 0) return;
      const reason = SINK_FLUSH_REASON[coreReason];
      const literacyBatch: ProductAnalyticsBatch = buildAnalyticsBatch([...batch.events]);
      const body = JSON.stringify(literacyBatch);
      try {
        if (reason === "pagehide" && beacon(endpoint, new Blob([body], { type: "application/json" }))) {
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
    },
  };

  const scheduler: FunnelCoreScheduler = timers;
  const client = createFunnelClient<ProductAnalyticsEvent>({
    schemaVersion: ANALYTICS_SCHEMA_VERSION,
    source: ANALYTICS_SOURCE,
    validate: isValidAnalyticsEvent,
    batch: {
      maxPerBatch: ANALYTICS_BATCH_MAX_EVENTS,
      flushAtEvents: maxBufferedEvents,
      intervalMs: flushIntervalMs,
      scheduler,
    },
    pageTarget:
      typeof window !== "undefined" && typeof window.addEventListener === "function" ? window : null,
    transport,
  });

  return {
    track(event): void {
      client.enqueue(event);
    },
    flush(reason: AnalyticsFlushReason = "capacity"): void {
      client.flush(CORE_FLUSH_REASON[reason]);
    },
    discardBufferedForTests(): number {
      return client.discard();
    },
  };
}

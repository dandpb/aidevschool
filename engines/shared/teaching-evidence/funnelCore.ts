/**
 * The configurable funnel client behind @aidevschool/evidence (2026-09-13
 * emitter consolidation): one buffering/flush/transport mechanism for every
 * anonymous-telemetry producer, with each producer's policy passed as config.
 *
 * Config dimensions (design Decisions) → slots:
 *   vocabulary      → `validate` — the producer's closed-vocabulary validator
 *                     (fed by vocabularies/<producer>.json; rejects client-side)
 *   envelope extras → `extras` — fields stamped on every minted event (emit
 *                     mode), e.g. a future producer's contentVersion
 *   identity        → `identity` — session/event uuid strategy (emit mode)
 *   batch policy    → `batch` — flush threshold, collector chunk cap, interval
 *   durability      → `transport` — the producer's delivery strategy
 *                     (surfaces: fire-and-forget; literacy: swallow-all)
 *
 * Wire envelopes stay per-producer (v1 OS / v2 literacy / v3 surfaces — no v4);
 * the core unifies mechanism, not policy. Invalid events never enter the
 * buffer; transport failures never propagate out of the client.
 */

export type FunnelCoreScalar = string | number | boolean;
export type FunnelCoreEventProps = Readonly<Record<string, FunnelCoreScalar>>;

export type FunnelCoreEvent = {
  readonly schemaVersion: number;
  readonly source: string;
  readonly event: string;
  readonly eventId: string;
  readonly sessionId: string;
  readonly occurredAt: string;
  readonly props: FunnelCoreEventProps;
  readonly [envelopeExtra: string]: unknown;
};

export type FunnelCoreBatch<E extends FunnelCoreEvent = FunnelCoreEvent> = {
  readonly schemaVersion: number;
  readonly source: string;
  readonly events: readonly E[];
};

/** Why a flush happened — transports prefer beacons on "page-hide". */
export type FunnelCoreFlushReason = "size" | "interval" | "page-hide" | "manual";

export interface FunnelCoreTransport<E extends FunnelCoreEvent = FunnelCoreEvent> {
  send(batch: FunnelCoreBatch<E>, reason: FunnelCoreFlushReason): void;
}

/** Emit-mode identity: one session id per client instance, one id per event. */
export type FunnelCoreIdentity = {
  readonly sessionUuid: () => string;
  readonly eventUuid: () => string;
};

export type FunnelCoreScheduler = {
  setTimeout(handler: () => void, timeoutMs: number): unknown;
  clearTimeout(handle: unknown): void;
};

export type FunnelCoreBatchPolicy = {
  /** Flush once this many events are buffered (default: maxPerBatch). */
  readonly flushAtEvents?: number;
  /** Collector batch cap — flushes are chunked to this size (default 100). */
  readonly maxPerBatch?: number;
  /** Max buffering delay before a flush; 0 (default) disables the timer. */
  readonly intervalMs?: number;
  /** Timer seam for tests (default: global setTimeout/clearTimeout). */
  readonly scheduler?: FunnelCoreScheduler;
};

export type FunnelClientConfig<E extends FunnelCoreEvent = FunnelCoreEvent> = {
  /** Wire envelope version of this producer (frozen: 3 surfaces, 2 literacy). */
  readonly schemaVersion: number;
  readonly source: string;
  /** Closed-vocabulary validation for minted and enqueued events alike. */
  readonly validate: (event: E) => boolean;
  /** Delivery strategy; must be fire-and-forget (failures swallowed inside). */
  readonly transport: FunnelCoreTransport<E>;
  /** Emit mode: mint identity + envelope extras here. */
  readonly identity?: FunnelCoreIdentity;
  readonly extras?: Readonly<Record<string, FunnelCoreScalar>>;
  /** Enqueue mode: buffer externally-built events after validation. */
  readonly clock?: () => Date;
  readonly batch?: FunnelCoreBatchPolicy;
  /** Registers a `pagehide` listener that flushes with "page-hide". */
  readonly pageTarget?: Pick<Window, "addEventListener"> | null;
};

export interface FunnelClient<E extends FunnelCoreEvent = FunnelCoreEvent> {
  /** Mint, validate, and buffer one event (emit mode). */
  emit(event: E["event"], props?: FunnelCoreEventProps): boolean;
  /** Validate and buffer an externally-built event (enqueue mode). */
  enqueue(event: E): boolean;
  flush(reason?: FunnelCoreFlushReason): void;
  /** Buffered event count. */
  readonly pending: number;
  /** Drop everything buffered and return how many (test/teardown seam). */
  discard(): number;
}

function defaultScheduler(): FunnelCoreScheduler {
  return {
    setTimeout: (handler, timeoutMs) => setTimeout(handler, timeoutMs),
    clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
}

export function createFunnelClient<E extends FunnelCoreEvent>(
  config: FunnelClientConfig<E>,
): FunnelClient<E> {
  const maxPerBatch = Math.max(1, config.batch?.maxPerBatch ?? 100);
  const flushAtEvents = Math.max(1, config.batch?.flushAtEvents ?? maxPerBatch);
  const intervalMs = Math.max(0, config.batch?.intervalMs ?? 0);
  const scheduler = config.batch?.scheduler ?? defaultScheduler();
  const clock = config.clock ?? (() => new Date());
  const sessionUuid = config.identity?.sessionUuid;
  const mintedSessionId = sessionUuid !== undefined ? sessionUuid() : "";

  const queue: E[] = [];
  let timerHandle: unknown = null;

  function clearTimer(): void {
    if (timerHandle !== null) {
      scheduler.clearTimeout(timerHandle);
      timerHandle = null;
    }
  }

  const client: FunnelClient<E> = {
    emit(event, props = {}) {
      const candidate = {
        schemaVersion: config.schemaVersion,
        source: config.source,
        event,
        eventId: config.identity?.eventUuid() ?? "",
        sessionId: mintedSessionId,
        occurredAt: clock().toISOString(),
        props,
        ...(config.extras ?? {}),
      } as E;
      return buffer(candidate);
    },

    enqueue(event) {
      return buffer(event);
    },

    flush(reason: FunnelCoreFlushReason = "size") {
      clearTimer();
      while (queue.length > 0) {
        const events = queue.splice(0, maxPerBatch);
        config.transport.send({ schemaVersion: config.schemaVersion, source: config.source, events }, reason);
      }
    },

    get pending() {
      return queue.length;
    },

    discard() {
      return queue.splice(0).length;
    },
  };

  /** Validate → buffer → capacity-flush-or-schedule (shared by both modes). */
  function buffer(event: E): boolean {
    if (!config.validate(event)) return false;
    queue.push(event);
    if (queue.length >= flushAtEvents) {
      client.flush("size");
      return true;
    }
    schedule();
    return true;
  }
  function schedule(): void {
    if (timerHandle !== null || intervalMs === 0) return;
    timerHandle = scheduler.setTimeout(() => {
      timerHandle = null;
      client.flush("interval");
    }, intervalMs);
  }

  if (config.pageTarget !== undefined && config.pageTarget !== null) {
    config.pageTarget.addEventListener("pagehide", () => client.flush("page-hide"));
  }

  return client;
}

// --- Shared validation atoms (the pieces every producer's closed-vocabulary
// validator needs; values themselves live in vocabularies/*.json) ---

/** Bounded scalar: booleans, finite numbers, non-empty bounded strings. */
export function isBoundedFunnelScalar(value: unknown, maxStringChars = 128): boolean {
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && value.length > 0 && value.length <= maxStringChars;
}

/** Closed record: every present key is one of `allowedKeys`. */
export function recordHasOnlyKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  const allowed = new Set(allowedKeys);
  return Object.keys(record).every((key) => allowed.has(key));
}

/** Value-vocabulary check: when the key has a closed enum, the value is in it. */
export function valueMatchesVocabulary(
  key: string,
  value: FunnelCoreScalar,
  vocabularies: Readonly<Record<string, readonly FunnelCoreScalar[] | undefined>>,
): boolean {
  const vocabulary = vocabularies[key];
  return vocabulary === undefined || vocabulary.includes(value);
}

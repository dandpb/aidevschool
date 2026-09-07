// Anonymous funnel telemetry for the programmer surfaces (AID-987/T1b,
// pattern AID-913 / ADR-0010 §4): dojoToday, voxelDojo, PixelQuest.
//
// Contract (envelope "surfaces" v3, received by the SAME collector at
// learner/gate/netlify-functions/dojo-analytics-collector.mjs):
//   POST {schemaVersion: 3, source: "dojotoday"|"voxeldojo"|"pixelquest",
//         events: [{schemaVersion: 3, source, event, eventId, sessionId,
//                   occurredAt, props}]}
//
// Privacy invariants (fail-closed on the emitter too):
//   - ZERO PII and ZERO learner identity: no user ids, no free text, no
//     content; `sessionId` is a random per-page-load UUID kept in memory only
//     (no localStorage, no installation id — the funnel counts events, not
//     people). Props are closed-vocabulary bounded scalars.
//   - Same-origin only: emission activates exclusively when the deploy sets
//     VITE_ANALYTICS_ENDPOINT to an absolute path (the AID-913 activation
//     pattern — local/dev builds without the env stay silent no-ops).
//   - Best effort: transport failures are silently dropped; telemetry must
//     never break a game or a lesson (analytics is not evidence either).
//
// Canonical closed vocabularies live HERE; the collector mirrors them and
// CI locks parity (learner/gate/tests/dojo_analytics_collector_v3.test.mjs).

export type FunnelSource = "dojotoday" | "voxeldojo" | "pixelquest";

export type FunnelEventName =
  | "daily-view-open"
  | "voxel-loop-complete"
  | "pixelquest-encounter-complete"
  | "evidence-handoff";

export type FunnelScalar = string | number | boolean;

export type FunnelProps = Readonly<Record<string, FunnelScalar>>;

export const FUNNEL_BATCH_SCHEMA_VERSION = 3;

export const FUNNEL_SOURCES: readonly FunnelSource[] = [
  "dojotoday",
  "voxeldojo",
  "pixelquest",
];

export const FUNNEL_EVENT_NAMES: readonly FunnelEventName[] = [
  "daily-view-open",
  "voxel-loop-complete",
  "pixelquest-encounter-complete",
  "evidence-handoff",
];

/** Closed per-event prop vocabularies — exactly the keys the collector accepts. */
export const FUNNEL_EVENT_PROPS: Readonly<Record<FunnelEventName, readonly string[]>> = {
  "daily-view-open": [],
  "voxel-loop-complete": ["unitId", "result"],
  "pixelquest-encounter-complete": ["unitId", "result"],
  "evidence-handoff": ["unitId"],
};

export const FUNNEL_RESULT_VALUES: readonly string[] = ["completed", "failed"];

/** Mirror of the collector's ANALYTICS_BATCH_MAX_EVENTS (batch guard). */
export const FUNNEL_BATCH_MAX_EVENTS = 100;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/;
const MAX_SCALAR_STRING = 128;

export type FunnelEvent = {
  readonly schemaVersion: 3;
  readonly source: FunnelSource;
  readonly event: FunnelEventName;
  readonly eventId: string;
  readonly sessionId: string;
  readonly occurredAt: string;
  readonly props: FunnelProps;
};

export type FunnelBatch = {
  readonly schemaVersion: 3;
  readonly source: FunnelSource;
  readonly events: readonly FunnelEvent[];
};

/** Port seam so tests can drive the batcher without a real network. */
export interface FunnelTransport {
  send(batch: FunnelBatch, reason: FunnelFlushReason): void;
}

export type FunnelFlushReason = "size" | "page-hide" | "manual";

export class InMemoryFunnelTransport implements FunnelTransport {
  readonly batches: FunnelBatch[] = [];

  send(batch: FunnelBatch, _reason: FunnelFlushReason): void {
    this.batches.push(batch);
  }
}

function randomUuid(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID !== undefined) return cryptoApi.randomUUID();
  return "00000000-0000-4000-8000-000000000000";
}

/**
 * Same-origin endpoint, activated only by deploy config. Absolute path only
 * (mirrors the collector's sec-fetch-site gate: no cross-origin telemetry).
 * `funnelEndpointPath(env)` is the pure rule; `activeDeployEndpoint()` reads
 * the build-time value.
 */
export function funnelEndpointPath(env: Record<string, string | undefined>): string | null {
  const candidate = env["VITE_ANALYTICS_ENDPOINT"];
  if (candidate === undefined || candidate === "") return null;
  if (!candidate.startsWith("/")) return null;
  return candidate;
}

/**
 * The read below is written as a literal member chain on `import.meta.env`
 * (cast only for strict tsconfigs without vite/client types) so the
 * bundler's define replaces it statically in production builds — the AID-913
 * activation pattern. Bare `import.meta.env` objects are NOT replaced and
 * would stay undefined in browsers; the try/catch keeps non-Vite runtimes
 * (node tests, dev /@fs modules without the env preamble) safely inert.
 */
function activeDeployEndpoint(): string | null {
  let candidate: unknown;
  try {
    candidate = (import.meta as unknown as {
      env: { VITE_ANALYTICS_ENDPOINT?: string };
    }).env.VITE_ANALYTICS_ENDPOINT;
  } catch {
    return null;
  }
  if (typeof candidate !== "string") return null;
  return funnelEndpointPath({ VITE_ANALYTICS_ENDPOINT: candidate });
}

export function funnelEventIsValid(value: unknown): value is FunnelEvent {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Record<string, unknown>;
  if (event["schemaVersion"] !== FUNNEL_BATCH_SCHEMA_VERSION) return false;
  if (!FUNNEL_SOURCES.includes(event["source"] as FunnelSource)) return false;
  if (!FUNNEL_EVENT_NAMES.includes(event["event"] as FunnelEventName)) return false;
  if (typeof event["eventId"] !== "string" || !UUID_PATTERN.test(event["eventId"])) return false;
  if (typeof event["sessionId"] !== "string" || !UUID_PATTERN.test(event["sessionId"])) return false;
  if (typeof event["occurredAt"] !== "string" || Number.isNaN(Date.parse(event["occurredAt"]))) {
    return false;
  }
  const props = event["props"];
  if (typeof props !== "object" || props === null || Array.isArray(props)) return false;
  const propRecord = props as Record<string, unknown>;
  const allowed = FUNNEL_EVENT_PROPS[event["event"] as FunnelEventName];
  for (const key of Object.keys(propRecord)) {
    if (!allowed.includes(key)) return false;
  }
  for (const entryValue of Object.values(propRecord)) {
    if (typeof entryValue === "boolean") continue;
    if (typeof entryValue === "number" && Number.isFinite(entryValue)) continue;
    if (typeof entryValue === "string" && entryValue.length > 0 && entryValue.length <= MAX_SCALAR_STRING) {
      continue;
    }
    return false;
  }
  if (allowed.includes("unitId")) {
    const unitId = propRecord["unitId"];
    if (typeof unitId !== "string" || !SAFE_IDENTIFIER.test(unitId)) return false;
  }
  if (allowed.includes("result")) {
    const result = propRecord["result"];
    if (typeof result !== "string" || !FUNNEL_RESULT_VALUES.includes(result)) return false;
  }
  return true;
}

export class FunnelBatcher {
  private readonly queue: FunnelEvent[] = [];
  private readonly sessionId: string;
  private readonly createId: () => string;
  private readonly clock: () => Date;

  constructor(
    private readonly source: FunnelSource,
    private readonly transport: FunnelTransport,
    options: {
      readonly createId?: () => string;
      readonly clock?: () => Date;
    } = {},
  ) {
    this.createId = options.createId ?? randomUuid;
    this.clock = options.clock ?? (() => new Date());
    this.sessionId = this.createId();
  }

  emit(event: FunnelEventName, props: FunnelProps = {}): boolean {
    const candidate: FunnelEvent = {
      schemaVersion: FUNNEL_BATCH_SCHEMA_VERSION,
      source: this.source,
      event,
      eventId: this.createId(),
      sessionId: this.sessionId,
      occurredAt: this.clock().toISOString(),
      props,
    };
    if (!funnelEventIsValid(candidate)) return false;
    this.queue.push(candidate);
    if (this.queue.length >= FUNNEL_BATCH_MAX_EVENTS) this.flush("size");
    return true;
  }

  flush(reason: FunnelFlushReason): void {
    if (this.queue.length === 0) return;
    const batch: FunnelBatch = {
      schemaVersion: FUNNEL_BATCH_SCHEMA_VERSION,
      source: this.source,
      events: [...this.queue],
    };
    this.queue.length = 0;
    this.transport.send(batch, reason);
  }

  get pending(): number {
    return this.queue.length;
  }
}

/**
 * Browser transport: fetch keepalive for in-page flushes and sendBeacon on
 * page-hide (the reliable unload path). Both are fire-and-forget by design.
 */
export class BrowserFunnelTransport implements FunnelTransport {
  constructor(
    private readonly endpoint: string,
    private readonly fetcher: (input: string, init?: RequestInit) => void = defaultFetch,
    private readonly beacon: (url: string, data: string) => boolean = defaultBeacon,
  ) {}

  send(batch: FunnelBatch, reason: FunnelFlushReason): void {
    const body = JSON.stringify(batch);
    if (reason === "page-hide") {
      this.beacon(this.endpoint, body);
      return;
    }
    this.fetcher(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  }
}

function defaultFetch(input: string, init?: RequestInit): void {
  void fetch(input, init).catch(() => undefined);
}

function defaultBeacon(url: string, data: string): boolean {
  const navigatorApi = globalThis.navigator;
  if (navigatorApi?.sendBeacon === undefined) return false;
  return navigatorApi.sendBeacon(url, new Blob([data], { type: "application/json" }));
}

const batchers = new Map<FunnelSource, FunnelBatcher>();

function batcherFor(source: FunnelSource): FunnelBatcher | null {
  if (typeof window === "undefined") return null;
  const existing = batchers.get(source);
  if (existing !== undefined) return existing;
  const endpoint = activeDeployEndpoint();
  if (endpoint === null) return null;
  const batcher = new FunnelBatcher(source, new BrowserFunnelTransport(endpoint));
  window.addEventListener("pagehide", () => batcher.flush("page-hide"), { once: true });
  batchers.set(source, batcher);
  return batcher;
}

/** Internal seam for tests: reset the singleton map between cases. */
export function resetFunnelBatchers(): void {
  batchers.clear();
}

/**
 * Emit one anonymous funnel event. No-op unless the deploy activated the
 * same-origin endpoint (and outside browser contexts); invalid events are
 * rejected client-side instead of being sent to be rejected server-side.
 */
export function emitFunnelEvent(
  source: FunnelSource,
  event: FunnelEventName,
  props: FunnelProps = {},
): boolean {
  const batcher = batcherFor(source);
  if (batcher === null) return false;
  return batcher.emit(event, props);
}

// Same-origin product-analytics collector for the codexdojo OS (AID-470 F1).
// Canonical parity projection of engines/codexdojo-os-prototype/src/analytics/events.ts:
// this staged function must accept and reject exactly the events the OS emitter
// considers valid (closed vocabularies, bounded scalars, pseudonymous identity).
// The TS module stays canonical for emission; this function is the receiving
// trust boundary. A vitest parity test (src/analytics/collectorParity.test.ts)
// fails CI on drift between the two vocabularies.

// Append-only NDJSON sink. One JSON line per accepted event, files rotate by
// UTC day so the proposed 90-day raw retention (ADR-0010) is a file prune, not
// a rewrite. Durable backing (if any) is a deploy-time decision: on the
// function runtime the filesystem is ephemeral, which is honest for a
// collector that is built and tested but not yet activated.

// Node builtins load lazily inside the sink so importing this module for
// vocabulary parity checks (collectorParity.test.ts) stays side-effect-free
// and browser-test-runner friendly.

export const ANALYTICS_COLLECTOR_PATH = "/__dojo/bridge/v1/analytics";
export const ANALYTICS_BATCH_MAX_EVENTS = 100;
export const ANALYTICS_BODY_MAX_BYTES = 65_536;
export const ANALYTICS_RETENTION_DAYS = 90;

const DAY_FILE_PATTERN = /^events-(\d{4})-(\d{2})-(\d{2})\.ndjson$/;

async function nodeFs() {
  return import("node:fs/promises");
}

export class NdjsonFileSink {
  constructor({ baseDir = "/tmp/dojo-analytics-collector", retentionDays = ANALYTICS_RETENTION_DAYS } = {}) {
    this.baseDir = baseDir;
    this.retentionDays = retentionDays;
  }

  async append(events, now = new Date()) {
    if (events.length === 0) return;
    const fs = await nodeFs();
    await fs.mkdir(this.baseDir, { recursive: true });
    const day = now.toISOString().slice(0, 10);
    const handle = await fs.open(`${this.baseDir}/events-${day}.ndjson`, "a");
    try {
      await handle.write(`${events.map((event) => JSON.stringify(event)).join("\n")}\n`);
    } finally {
      await handle.close();
    }
    await this.prune(now);
  }

  /** Best-effort retention prune; raw NDJSON older than the window is deleted, never rewritten. */
  async prune(now = new Date()) {
    const fs = await nodeFs();
    const cutoff = now.getTime() - this.retentionDays * 24 * 60 * 60 * 1000;
    const entries = await fs.readdir(this.baseDir).catch(() => []);
    for (const entry of entries) {
      const match = DAY_FILE_PATTERN.exec(entry);
      if (match === null) continue;
      const fileDay = Date.parse(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
      if (Number.isNaN(fileDay) || fileDay >= cutoff) continue;
      await fs.unlink(`${this.baseDir}/${entry}`).catch(() => undefined);
    }
  }
}

// --- envelope validation (parity with src/analytics/events.ts) ---

export const ANALYTICS_EVENT_NAMES = [
  "onboarding.started", "onboarding.completed", "journey.returned",
  "mission.started", "mission.completed", "structured_attempt.submitted",
  "structured_attempt.passed", "hint.requested", "retry.requested",
  "review.started", "verification.state_changed", "renderer.degraded",
];

const ACTIVITY_TYPES = [
  "choice", "sort", "missing_context", "safety_classification", "prompt_builder",
  "output_comparison", "rubric_review",
];

// As dimensões permitidas de cada evento são exatamente as chaves do seu vocabulário.
export const EVENT_VOCABULARIES = {
  "onboarding.started": {},
  "onboarding.completed": { recommendationChanged: [true, false] },
  "journey.returned": {},
  "mission.started": { mode: ["initial", "review", "retry", "targeted-practice"] },
  "mission.completed": { result: ["completed", "failed"] },
  "structured_attempt.submitted": { activityType: ACTIVITY_TYPES },
  "structured_attempt.passed": { activityType: ACTIVITY_TYPES },
  "hint.requested": {
    mode: ["question", "explain", "hint"],
    source: ["provider", "fallback", "policy"],
    outcome: ["answered", "attempt-required", "quota-exhausted", "unavailable"],
  },
  "retry.requested": {
    reason: ["retry", "targeted-practice", "verification-unavailable", "engine-retry"],
  },
  "review.started": { reason: ["canonical-review", "due", "overdue"] },
  "verification.state_changed": {
    state: ["validating", "pending", "verified", "rejected", "gateway-unavailable"],
    verdict: ["PASS", "FAIL", "INVALID"],
  },
  "renderer.degraded": {
    reason: [
      "unsupported", "creation-failed", "context-lost", "restore-failed", "load-timeout",
      "reduced-motion",
    ],
    fallback: ["canvas2d", "dom", "none"],
  },
};

export const CONTEXT_KEYS = [
  "trackId",
  "missionId",
  "missionRunId",
  "engineId",
  "engineVersion",
  "contentVersion",
  "rendererMode",
];

export const CONTEXT_VOCABULARIES = {
  trackId: ["ai-pratica", "dev"],
  engineId: ["literacyDojo", "voxelDojo"],
  rendererMode: ["webgl", "canvas2d", "dom", "none"],
};

const ENRICHED_KEYS = ["installationId", "sessionId", ...CONTEXT_KEYS];
const EVENT_NAMES = new Set(ANALYTICS_EVENT_NAMES);
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value, allowed) {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isBoundedScalar(value) {
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}

function dimensionsAreValid(value, allowed, required = []) {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, allowed)) return false;
  if (!required.every((key) => key in value)) return false;
  return Object.values(value).every(isBoundedScalar);
}

function contextValueIsValid(key, value) {
  if (typeof value !== "string") return false;
  if (!SAFE_IDENTIFIER.test(value)) return false;
  const vocabulary = CONTEXT_VOCABULARIES[key];
  return vocabulary === undefined || vocabulary.includes(value);
}

function contextDimensionsAreValid(dimensions) {
  return CONTEXT_KEYS.every(
    (key) => !(key in dimensions) || contextValueIsValid(key, dimensions[key]),
  );
}

function enrichedIdentityIsValid(dimensions) {
  if (!contextValueIsValid("installationId", dimensions.installationId)) return false;
  return contextValueIsValid("sessionId", dimensions.sessionId);
}

function valuesMatchPolicy(vocabularies, dimensions) {
  return Object.entries(dimensions).every(([key, value]) => {
    const vocabulary = vocabularies[key];
    return vocabulary === undefined || vocabulary.includes(value);
  });
}

function isAnalyticsEventName(value) {
  return typeof value === "string" && EVENT_NAMES.has(value);
}

function eventEnvelopeFieldsAreValid(value) {
  if (value.schemaVersion !== 1) return false;
  if (typeof value.eventId !== "string") return false;
  if (value.eventId.length === 0 || value.eventId.length > 128) return false;
  return isAnalyticsEventName(value.name);
}

function eventTimingIsValid(value) {
  if (typeof value.occurredAt !== "string") return false;
  if (Number.isNaN(Date.parse(value.occurredAt))) return false;
  if (!Number.isInteger(value.sequence)) return false;
  return Number(value.sequence) >= 1;
}

export function validateAnalyticsEvent(value) {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, ["schemaVersion", "eventId", "name", "occurredAt", "sequence", "dimensions"])) return false;
  if (!eventEnvelopeFieldsAreValid(value)) return false;
  if (!eventTimingIsValid(value)) return false;
  const vocabularies = EVENT_VOCABULARIES[value.name];
  const allowed = [...ENRICHED_KEYS, ...Object.keys(vocabularies)];
  if (!dimensionsAreValid(value.dimensions, allowed, ["installationId", "sessionId"])) return false;
  const dimensions = value.dimensions;
  if (!enrichedIdentityIsValid(dimensions)) return false;
  if (!contextDimensionsAreValid(dimensions)) return false;
  return valuesMatchPolicy(vocabularies, dimensions);
}

export function isAnalyticsBatch(value) {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, ["schemaVersion", "events"])) return false;
  if (value.schemaVersion !== 1) return false;
  if (!Array.isArray(value.events)) return false;
  if (value.events.length === 0 || value.events.length > ANALYTICS_BATCH_MAX_EVENTS) return false;
  return true;
}

// --- handler (mirrors the verification bridge: same-origin, method, size, JSON gates) ---

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extra },
  });
}

export function createCollectorHandler({ sink = new NdjsonFileSink() } = {}) {
  return async (request) => {
    const originalPath = request.headers.get("x-nf-original-path");
    const pathname = originalPath || new URL(request.url).pathname;
    const sameOrigin = request.headers.get("sec-fetch-site") === "same-origin";
    if (!sameOrigin) return json({ error: "origin-forbidden" }, 403);
    if (pathname !== ANALYTICS_COLLECTOR_PATH) return json({ error: "not-found" }, 404);
    if (request.method !== "POST") return json({ error: "method-not-allowed" }, 405, { allow: "POST" });
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > ANALYTICS_BODY_MAX_BYTES) {
      return json({ error: "payload-too-large" }, 413);
    }
    let input;
    try {
      input = JSON.parse(raw);
    } catch {
      return json({ error: "invalid-json" }, 400);
    }
    if (!isAnalyticsBatch(input)) return json({ error: "unsupported-schema" }, 422);
    const accepted = input.events.filter(validateAnalyticsEvent);
    await sink.append(accepted);
    return json({ acceptedEventIds: accepted.map((event) => event.eventId) }, 202);
  };
}

export default createCollectorHandler();

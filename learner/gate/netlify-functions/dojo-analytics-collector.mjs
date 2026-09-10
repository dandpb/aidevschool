// Same-origin product-analytics collector for the codexdojo OS and the
// literacyDojo standalone app (AID-470 F1 + activation AID-913, ADR-0010 §4).
// Canonical parity projection of:
//   - engines/codexdojo-os-prototype/src/analytics/events.ts        (OS v1)
//   - engines/literacyDojo/src/domain/analytics.ts                  (literacy v2)
// The TS modules stay canonical for emission; this function is the receiving
// trust boundary. Parity tests fail CI on drift between vocabularies.
//
// AID-913 activation: accepts BOTH envelopes — OS batches
// {schemaVersion:1, events:[…]} and literacy batches
// {schemaVersion:2, source:"literacydojo", events:[…]} — and persists each
// accepted event idempotently (key day/eventId), so the beacon+fetch race and
// retries deduplicate for free. Durable backing is Netlify Blobs when the
// runtime provides it; otherwise (local/test) the append-only NDJSON file
// sink keeps behavior inspectable. A token-guarded GET exports the raw NDJSON
// for the F2b funnel aggregation (k≥5 immutable, ADR-463 §3.0).
//
// AID-987/T1b: also accepts the anonymous "surfaces" envelope v3
// {schemaVersion:3, source:"dojotoday"|"voxeldojo"|"pixelquest", events:[…]}
// (dojoToday / voxelDojo / PixelQuest funnel events; canonical emission in
// engines/shared/teaching-evidence/funnelTelemetry.ts) through this same
// route, guards, durability, and export.
//
// AID-947 durability fix: the deployed default export now actually selects
// that durable backing (it previously always built the /tmp NDJSON sink),
// and the Blobs client reaches the deployed bundle through the static-import
// wrapper netlify-blobs-runtime.mjs declared in this directory's package.json
// (a bare dynamic specifier is opaque to the functions bundler and never
// shipped — the live backing was ephemeral /tmp on both surfaces).
//
// AID-961 export fix: `directories:true` on the Blobs EDGE API is a
// DELIMITED one-level listing (0 nested blobs) and a flat list WITH a day
// prefix returns [] on the local @netlify/blobs/server — so the live export
// shipped 0 rows on both surfaces. The read paths use the one listing form
// with IDENTICAL recursive semantics on both implementations — a flat,
// no-prefix, cursor-paginated scan with client-side day filtering (same as
// prune) — and CI locks that with an emulated-edge probe.

// Node builtins load lazily so importing this module for vocabulary parity
// checks stays side-effect-free and browser-test-runner friendly.

export const ANALYTICS_COLLECTOR_PATH = "/__dojo/bridge/v1/analytics";
export const ANALYTICS_BATCH_MAX_EVENTS = 100;
export const ANALYTICS_BODY_MAX_BYTES = 65_536;
export const ANALYTICS_RETENTION_DAYS = 90;

export const OS_BATCH_SCHEMA_VERSION = 1;
export const LITERACY_BATCH_SCHEMA_VERSION = 2;
export const LITERACY_SOURCE = "literacydojo";

const DAY_FILE_PATTERN = /^events-(\d{4})-(\d{2})-(\d{2})\.ndjson$/;

async function nodeFs() {
  return import("node:fs/promises");
}

// --- OS envelope validation (parity with src/analytics/events.ts) ---

export const ANALYTICS_EVENT_NAMES = [
  "onboarding.started", "onboarding.completed", "journey.returned",
  "mission.started", "mission.completed", "structured_attempt.submitted",
  "structured_attempt.passed", "hint.requested", "retry.requested",
  "review.started", "verification.state_changed", "renderer.degraded",
  // F2 `2026-09-10-entry-brief-instrumentation` (emenda ADR-0009): eventos
  // de exposição de missões hospedadas (vocabulário aditivo retro-compat).
  "mission.brief_viewed", "activity.presented",
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
  "mission.brief_viewed": {},
  "activity.presented": { activityType: ACTIVITY_TYPES },
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
  if (value.schemaVersion !== OS_BATCH_SCHEMA_VERSION) return false;
  if (!Array.isArray(value.events)) return false;
  if (value.events.length === 0 || value.events.length > ANALYTICS_BATCH_MAX_EVENTS) return false;
  return true;
}

// --- literacy envelope validation (parity with src/domain/analytics.ts v2) ---

export const LITERACY_EVENT_NAMES = [
  "entry_viewed",
  "mapa_inicial_done",
  "route_chosen",
  "lesson_started",
  "activity_attempted",
  "lesson_completed",
  // Corredor literacy (spec AID-915 §4.3, emenda ADR-0009): revisão espaçada.
  "review_started",
  "review_completed",
  // F2 `2026-09-10-entry-brief-instrumentation` (emenda ADR-0009): eventos
  // de exposição (brief renderizado; atividade visível pela 1ª vez).
  "lesson_brief_viewed",
  "activity_presented",
];

export const LITERACY_ENTRY_ROUTES = ["home", "lesson-resume", "onboarding"];

export const LITERACY_ACTIVITY_TYPES = ACTIVITY_TYPES;

const LITERACY_EVENT_NAMES_SET = new Set(LITERACY_EVENT_NAMES);
const LITERACY_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LITERACY_MAX_PROP_STRING = 120;
const LITERACY_MAX_PROP_KEY = 40;
const LITERACY_PROP_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

// Props permitidas por evento — conjunto EXATO; paridade 1:1 com
// EVENT_PROPS/OPTIONAL_PROPS de engines/literacyDojo/src/domain/analytics.ts.
const LITERACY_EVENT_PROPS = {
  entry_viewed: ["entry"],
  mapa_inicial_done: ["lessonId", "lessonVersion", "score", "durationSeconds"],
  route_chosen: ["route"],
  lesson_started: ["lessonId", "lessonVersion"],
  activity_attempted: ["lessonId", "activityType", "passed"],
  lesson_completed: ["lessonId", "lessonVersion", "score", "durationSeconds"],
  review_started: ["lessonId", "intervalDays", "stage"],
  review_completed: ["lessonId", "score"],
  lesson_brief_viewed: ["lessonId", "lessonVersion"],
  activity_presented: ["lessonId", "activityType", "activityIndex"],
};
const LITERACY_OPTIONAL_PROPS = {
  entry_viewed: ["entry"],
  mapa_inicial_done: ["durationSeconds"],
  route_chosen: [],
  lesson_started: [],
  activity_attempted: [],
  lesson_completed: ["durationSeconds"],
  review_started: [],
  review_completed: [],
  lesson_brief_viewed: [],
  activity_presented: [],
};

function literacyPropsAreValid(eventName, props) {
  if (!isRecord(props)) return false;
  const allowed = LITERACY_EVENT_PROPS[eventName] ?? [];
  const optional = LITERACY_OPTIONAL_PROPS[eventName] ?? [];
  for (const key of allowed) {
    if (!optional.includes(key) && !(key in props)) return false;
  }
  for (const [key, value] of Object.entries(props)) {
    if (!allowed.includes(key)) return false;
    if (key.length > LITERACY_MAX_PROP_KEY || !LITERACY_PROP_KEY_PATTERN.test(key)) return false;
    if (typeof value === "string") {
      if (value.length > LITERACY_MAX_PROP_STRING) return false;
    } else if (typeof value === "number") {
      if (!Number.isFinite(value)) return false;
    } else if (typeof value !== "boolean") {
      return false;
    }
  }
  return true;
}

function literacyEventPropsAreValid(event) {
  const props = event.props;
  switch (event.event) {
    case "activity_attempted":
      return (
        typeof props.lessonId === "string" && props.lessonId.length > 0 &&
        LITERACY_ACTIVITY_TYPES.includes(props.activityType) &&
        typeof props.passed === "boolean"
      );
    case "lesson_started":
    case "lesson_completed":
    case "mapa_inicial_done":
      return (
        typeof props.lessonId === "string" && props.lessonId.length > 0 &&
        typeof props.lessonVersion === "number" && Number.isInteger(props.lessonVersion) &&
        (event.event === "lesson_started" ||
          (typeof props.score === "number" && Number.isFinite(props.score)))
      );
    case "route_chosen":
      return props.route === "guided" || props.route === "intermediate";
    // F2 R1: prop opcional `entry` com vocabulário fechado; ausência
    // (envelopes pré-v4) continua válida — aditivo retro-compat.
    case "entry_viewed":
      return !("entry" in props) || LITERACY_ENTRY_ROUTES.includes(props.entry);
    case "lesson_brief_viewed":
      return (
        typeof props.lessonId === "string" && props.lessonId.length > 0 &&
        typeof props.lessonVersion === "number" && Number.isInteger(props.lessonVersion)
      );
    case "activity_presented":
      return (
        typeof props.lessonId === "string" && props.lessonId.length > 0 &&
        LITERACY_ACTIVITY_TYPES.includes(props.activityType) &&
        typeof props.activityIndex === "number" && Number.isInteger(props.activityIndex) &&
        props.activityIndex >= 0
      );
    default:
      return true;
  }
}

export function validateLiteracyEvent(value) {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, [
    "schemaVersion", "source", "event", "eventId", "sessionId",
    "occurredAt", "contentVersion", "props",
  ])) return false;
  if (value.schemaVersion !== LITERACY_BATCH_SCHEMA_VERSION) return false;
  if (value.source !== LITERACY_SOURCE) return false;
  if (typeof value.event !== "string" || !LITERACY_EVENT_NAMES_SET.has(value.event)) return false;
  if (typeof value.eventId !== "string" || !LITERACY_UUID_PATTERN.test(value.eventId)) return false;
  if (typeof value.sessionId !== "string" || !LITERACY_UUID_PATTERN.test(value.sessionId)) return false;
  if (typeof value.occurredAt !== "string" || Number.isNaN(Date.parse(value.occurredAt))) return false;
  if (typeof value.contentVersion !== "string" || value.contentVersion.length === 0) return false;
  if (!literacyPropsAreValid(value.event, value.props)) return false;
  if (!literacyEventPropsAreValid(value)) return false;
  return true;
}

export function isLiteracyBatch(value) {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, ["schemaVersion", "source", "events"])) return false;
  if (value.schemaVersion !== LITERACY_BATCH_SCHEMA_VERSION) return false;
  if (value.source !== LITERACY_SOURCE) return false;
  if (!Array.isArray(value.events)) return false;
  if (value.events.length === 0 || value.events.length > ANALYTICS_BATCH_MAX_EVENTS) return false;
  return true;
}

// --- surfaces envelope validation (AID-987/T1b: dojoToday, voxelDojo, PixelQuest) ---
//
// Canonical emission vocabularies live in
// engines/shared/teaching-evidence/funnelTelemetry.ts; this function is the
// receiving trust boundary and CI locks parity
// (learner/gate/tests/dojo_analytics_collector_v3.test.mjs). Same privacy
// contract as the other envelopes: closed vocabularies, bounded scalars, no
// free text, no learner identity — sessionId is a per-page-load random UUID.

export const SURFACE_BATCH_SCHEMA_VERSION = 3;
export const SURFACE_SOURCES = ["dojotoday", "voxeldojo", "pixelquest"];

export const SURFACE_EVENT_NAMES = [
  "daily-view-open",
  "voxel-loop-complete",
  "pixelquest-encounter-complete",
  "evidence-handoff",
];

export const SURFACE_EVENT_PROPS = {
  "daily-view-open": [],
  "voxel-loop-complete": ["unitId", "result"],
  "pixelquest-encounter-complete": ["unitId", "result"],
  "evidence-handoff": ["unitId"],
};

export const SURFACE_RESULT_VALUES = ["completed", "failed"];

const SURFACE_EVENT_NAMES_SET = new Set(SURFACE_EVENT_NAMES);
const SURFACE_SOURCES_SET = new Set(SURFACE_SOURCES);
const SURFACE_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SURFACE_MAX_PROP_STRING = 128;
const SURFACE_UNIT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/;

function surfaceEventIsValidSource(value) {
  return typeof value === "string" && SURFACE_SOURCES_SET.has(value);
}

export function validateSurfaceEvent(value) {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, [
    "schemaVersion", "source", "event", "eventId", "sessionId",
    "occurredAt", "props",
  ])) return false;
  if (value.schemaVersion !== SURFACE_BATCH_SCHEMA_VERSION) return false;
  if (!surfaceEventIsValidSource(value.source)) return false;
  if (typeof value.event !== "string" || !SURFACE_EVENT_NAMES_SET.has(value.event)) return false;
  if (typeof value.eventId !== "string" || !SURFACE_UUID_PATTERN.test(value.eventId)) return false;
  if (typeof value.sessionId !== "string" || !SURFACE_UUID_PATTERN.test(value.sessionId)) return false;
  if (typeof value.occurredAt !== "string" || Number.isNaN(Date.parse(value.occurredAt))) return false;
  const props = value.props;
  if (!isRecord(props)) return false;
  const allowed = SURFACE_EVENT_PROPS[value.event];
  if (!Object.keys(props).every((key) => allowed.includes(key))) return false;
  for (const entryValue of Object.values(props)) {
    if (typeof entryValue === "boolean") continue;
    if (typeof entryValue === "number" && Number.isFinite(entryValue)) continue;
    if (typeof entryValue === "string" && entryValue.length > 0 && entryValue.length <= SURFACE_MAX_PROP_STRING) {
      continue;
    }
    return false;
  }
  if (allowed.includes("unitId")) {
    if (typeof props.unitId !== "string" || !SURFACE_UNIT_ID_PATTERN.test(props.unitId)) return false;
  }
  if (allowed.includes("result")) {
    if (typeof props.result !== "string" || !SURFACE_RESULT_VALUES.includes(props.result)) return false;
  }
  return true;
}

export function isSurfaceBatch(value) {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, ["schemaVersion", "source", "events"])) return false;
  if (value.schemaVersion !== SURFACE_BATCH_SCHEMA_VERSION) return false;
  if (!surfaceEventIsValidSource(value.source)) return false;
  if (!Array.isArray(value.events)) return false;
  if (value.events.length === 0 || value.events.length > ANALYTICS_BATCH_MAX_EVENTS) return false;
  return true;
}

// --- durable backing (activation decision AID-913) ---

const UTC_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

function dayKey(date) {
  return date.toISOString().slice(0, 10);
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
    const day = dayKey(now);
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

  /** Export NDJSON lines for the inclusive UTC day range [from, to]. */
  async readRange(from, to) {
    if (!UTC_DAY.test(from) || !UTC_DAY.test(to)) return [];
    const fs = await nodeFs();
    const lines = [];
    for (let day = new Date(`${from}T00:00:00Z`); day <= new Date(`${to}T23:59:59Z`); day.setUTCDate(day.getUTCDate() + 1)) {
      const content = await fs.readFile(`${this.baseDir}/events-${dayKey(day)}.ndjson`, "utf8").catch(() => null);
      if (content !== null) lines.push(...content.split("\n").filter((line) => line.length > 0));
    }
    return lines;
  }
}

/**
 * Netlify Blobs store (durable backing chosen by the AID-913 activation).
 * One blob per accepted event, key `<source>/<day>/<eventId>` — idempotent
 * writes, so duplicated deliveries (beacon+fetch race, client retries)
 * collapse for free. Falls back gracefully when the runtime has no blobs.
 */
export class BlobsEventStore {
  constructor({ store, retentionDays = ANALYTICS_RETENTION_DAYS } = {}) {
    this.store = store;
    this.retentionDays = retentionDays;
  }

  static async create({ retentionDays } = {}) {
    let blobs;
    try {
      // AID-947: o cliente Blobs entra por um wrapper com import ESTÁTICO
      // (netlify-blobs-runtime.mjs) — o bundler do Netlify (esbuild) consegue
      // traçar e embutir a dependência no bundle deployado, coisa que um
      // dynamic import de bare specifier (opaco ao bundler) nunca permitiu;
      // a dependência ficava fora do pacote e a produção caía silenciosamente
      // no NDJSON /tmp efêmero (achado do countersign AID-940). Em
      // vite/vitest o import do wrapper ainda rejeita em runtime e o fallback
      // (NDJSON) assume — nunca quebra a suíte de paridade do OS.
      blobs = await import(/* @vite-ignore */ "./netlify-blobs-runtime.mjs");
    } catch {
      return null;
    }
    try {
      const store = blobs.getStore("dojo-analytics");
      return new BlobsEventStore({ store, retentionDays });
    } catch {
      return null;
    }
  }

  async append(events, now = new Date()) {
    if (events.length === 0) return;
    const day = dayKey(now);
    for (const event of events) {
      // AID-987/T1b: surfaces v3 events carry their own source; OS v1 has
      // `name`, literacy v2 is the remaining fallback.
      const source = event.source ?? (event.name !== undefined ? "os" : LITERACY_SOURCE);
      const eventId = typeof event.eventId === "string" ? event.eventId : null;
      if (eventId === null) continue;
      // Day-first key so a single prefix lists all envelopes per day.
      await this.store.setJSON(`${day}/${source}/${eventId}`, event);
    }
  }

  async readRange(from, to) {
    if (!UTC_DAY.test(from) || !UTC_DAY.test(to)) return [];
    const lines = [];
    // AID-961 (defect do redeploy AID-960): o export live devolvia 0 linhas
    // porque `directories:true` no Blobs EDGE API é listing DELIMITADO (um
    // nível por chamada — 0 blobs aninhados), o INVERSO do servidor local
    // @netlify/blobs/server usado na prova do PR #280 (recursivo com a flag;
    // e, pior, com prefixo de dia o listing FLAT local devolve vazio). A
    // ÚNICA forma de `list` com semântica IDÊNTICA nas duas implementações —
    // e recursiva nas duas — é o scan FLAT SEM prefixo, paginado por cursor,
    // com o filtro de dia aplicado no cliente (mesma estratégia do prune).
    // Trade-off aceito no volume de pilot/90 dias de retenção: export varre
    // o store em vez de endereçar o dia no servidor. Nunca reintroduzir
    // `directories` ou `prefix` neste caminho — CI trava a semântica com
    // probe do edge emulado (verify-deployed-blobs) + teste unitário.
    const days = new Set();
    for (let day = new Date(`${from}T00:00:00Z`); day <= new Date(`${to}T23:59:59Z`); day.setUTCDate(day.getUTCDate() + 1)) {
      days.add(dayKey(day));
    }
    let cursor;
    do {
      const listed = await this.store.list({ ...(cursor === undefined ? {} : { cursor }) });
      for (const blob of listed.blobs) {
        if (!days.has(blob.key.slice(0, 10))) continue;
        const value = await this.store.get(blob.key);
        if (typeof value === "string" && value.length > 0) lines.push(value);
      }
      cursor = listed.nextCursor;
    } while (cursor !== undefined && cursor !== null);
    return lines;
  }

  /** Retention prune: delete blobs whose UTC day prefix is older than the window. */
  async prune(now = new Date()) {
    // AID-961: listing FLAT sem `directories` — no edge API ela é recursiva
    // (varre o store inteiro, paginada por cursor), que é exatamente o que o
    // prune precisa. `directories: true` aqui seria delimitado (1 nível) e
    // esconderia as chaves `<dia>/<source>/<eventId>`.
    const cutoff = now.getTime() - this.retentionDays * 24 * 60 * 60 * 1000;
    let cursor;
    do {
      const listed = await this.store.list({ ...(cursor === undefined ? {} : { cursor }) });
      for (const blob of listed.blobs) {
        const day = blob.key.split("/")[0];
        if (!UTC_DAY.test(day)) continue;
        const fileDay = Date.parse(`${day}T00:00:00Z`);
        if (!Number.isNaN(fileDay) && fileDay < cutoff) {
          await this.store.delete(blob.key).catch(() => undefined);
        }
      }
      cursor = listed.nextCursor;
    } while (cursor !== undefined && cursor !== null);
  }
}

/** Chooses the durable backing: Blobs when the runtime provides it, files otherwise. */
export async function createAnalyticsBacking({ forceFile = false, baseDir } = {}) {
  if (!forceFile) {
    const blobs = await BlobsEventStore.create();
    if (blobs !== null) return { store: blobs, kind: "blobs" };
  }
  return { store: new NdjsonFileSink({ baseDir }), kind: "file" };
}

// --- handler (mirrors the verification bridge: same-origin, method, size, JSON gates) ---

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extra },
  });
}

function ndjsonResponse(lines) {
  return new Response(lines.length === 0 ? "" : `${lines.join("\n")}\n`, {
    status: 200,
    headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" },
  });
}

export function createCollectorHandler({
  /** Backing store: NdjsonFileSink or BlobsEventStore (`sink` kept as alias). */
  backing,
  sink,
  exportToken = process.env.ANALYTICS_EXPORT_TOKEN,
  now = () => new Date(),
} = {}) {
  const store = backing ?? sink ?? new NdjsonFileSink();
  // AID-947: `now` pode ser um Date fixo (testes determinísticos) ou uma
  // função de relógio (default). O default por função evita congelar o dia
  // UTC em instâncias de função de longa vida: eventos pós-virada de dia
  // continuam indo para o bucket do dia certo.
  const currentTime = typeof now === "function" ? now : () => now;
  return async (request) => {
    const originalPath = request.headers.get("x-nf-original-path");
    const pathname = originalPath || new URL(request.url).pathname;
    if (pathname !== ANALYTICS_COLLECTOR_PATH) return json({ error: "not-found" }, 404);

    if (request.method === "GET") {
      // Operator export (F2b funnel read): Bearer-token guarded, never
      // browser-reachable without the deploy-time secret.
      if (typeof exportToken !== "string" || exportToken.length === 0) {
        return json({ error: "export-unavailable" }, 404);
      }
      const authorization = request.headers.get("authorization") ?? "";
      if (authorization !== `Bearer ${exportToken}`) {
        return json({ error: "unauthorized" }, 401);
      }
      const url = new URL(request.url);
      const today = dayKey(currentTime());
      const from = url.searchParams.get("from") ?? today;
      const to = url.searchParams.get("to") ?? today;
      const lines = await store.readRange(from, to);
      return ndjsonResponse(lines);
    }

    if (request.method !== "POST") return json({ error: "method-not-allowed" }, 405, { allow: "GET, POST" });

    const sameOrigin = request.headers.get("sec-fetch-site") === "same-origin";
    if (!sameOrigin) return json({ error: "origin-forbidden" }, 403);

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

    let accepted = [];
    if (isAnalyticsBatch(input)) {
      accepted = input.events.filter(validateAnalyticsEvent);
    } else if (isLiteracyBatch(input)) {
      accepted = input.events.filter(validateLiteracyEvent);
    } else if (isSurfaceBatch(input)) {
      accepted = input.events.filter(validateSurfaceEvent);
    } else {
      return json({ error: "unsupported-schema" }, 422);
    }
    await store.append(accepted, currentTime());
    return json({ acceptedEventIds: accepted.map((event) => event.eventId) }, 202);
  };
}

// AID-947: o handler deployado (default export) agora seleciona o backing
// durável — Netlify Blobs quando o runtime o prove, NDJSON apenas como
// fallback local/test. Antes o default export construía o handler SEM
// backing, então o live escrevia sempre no /tmp efêmero mesmo com Blobs
// disponível (defeito AID-947; reproduzido localmente antes deste fix).
// Seleção preguiçosa no 1º request: mantém o módulo livre de top-level
// await; falha de inicialização é reintegrada no request seguinte.
let deployedHandlerPromise;
export default async function deployedHandler(request) {
  if (deployedHandlerPromise === undefined) {
    deployedHandlerPromise = createAnalyticsBacking().then(({ store }) =>
      createCollectorHandler({ backing: store }));
  }
  let handlerImpl;
  try {
    handlerImpl = await deployedHandlerPromise;
  } catch (error) {
    deployedHandlerPromise = undefined; // init retried on the next request
    throw error;
  }
  return handlerImpl(request);
}

// Offline NDJSON → retention-funnel aggregation for the OS analytics collector
// (AID-473 F2, spec: AID-463 draft §2 rev 40b963bf; F2b extension: AID-675,
// spec AID-673 §2 — D1/D2 cuts + eventId dedup, reportVersion 2).
//
// Reads the collector's day-rotated NDJSON (append-only, accepted events only)
// and emits an AGGREGATED, k-anonymized report. Non-negotiable boundaries:
//   - installationId/sessionId are never published; only counts and rates over
//     cohorts keyed by the ISO week of D0.
//   - buckets with fewer than k installations are suppressed (k≥5 from day 1).
//   - dimensions are closed-vocabulary enums by construction; no free text,
//     no IP, no user-agent, and no mastery state ever enter the report.
//   - analytics is not evidence; this tool never writes learner state.
//   - accepted events are deduplicated by eventId before any cut (ADR-0010
//     Consequências: the beacon+fetch race can append the same event twice);
//     the first occurrence in the standing sort order (occurredAt, sequence)
//     wins and source.duplicateEvents reports how many lines were dropped.
//
// Funnel definitions (draft §2.1):
//   - narrow cohort: first `mission.completed {result:"completed"}` on UTC day D0.
//   - wide cohort (context): first `onboarding.completed` on D0.
//   - activation funnel: onboarding.started → onboarding.completed →
//     mission.started → mission.completed, per ISO week of first event,
//     counted with ordered reachability.
//   - return D+N accumulated (primary): any event at day offset 1..N+graceDays.
//   - return D+N strict (secondary): at least one event at offset N..N+graceDays.
//   - review return (H1): the returning event's session (sessionId group)
//     contains mission.started {mode:"review"} or review.started {reason:
//     "due"|"overdue"} — distinguishes "returned to review" from new content.
// The first cycle establishes the baseline; no external numeric target.

import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateAnalyticsEvent, validateLiteracyEvent } from "../netlify-functions/dojo-analytics-collector.mjs";
import {
  collectInputFiles,
  optionValue,
  parseIntegerOption,
  readNdjsonEntries,
  resolveOutput,
} from "./ndjson_input.mjs";

export const REPORT_VERSION = 4;
/**
 * Canonical mission→module mapping for the D2 cut (spec AID-673 §2.2): read
 * from the shared curriculum catalog at execution time — no copied mapping.
 * Unreadable/absent catalog ⇒ the section is `unavailable` with a reason
 * (fail-closed, never fabricated).
 */
export const DEFAULT_CATALOG_LABEL = "curriculum/ai-literacy/catalog.yaml";
const DEFAULT_CATALOG_PATH = fileURLToPath(new URL("../../../curriculum/ai-literacy/catalog.yaml", import.meta.url));
export const DEFAULT_WINDOWS = [1, 7, 21];
export const DEFAULT_GRACE_DAYS = 2;
export const DEFAULT_K_MINIMUM = 5;
const ACTIVATION_STAGES = [
  { name: "onboarding.started" },
  { name: "onboarding.completed" },
  { name: "mission.started" },
  { name: "mission.completed", dimensions: { result: "completed" } },
];
const DAY_MS = 24 * 60 * 60 * 1000;

// --- F2 v4 (spec AID-1218 R3–R5): exposição, detalhe de entrada, sondas ---

/** Bins de dwell do R3 {`<15s`,`15-60s`,`1-5min`,`>5min`} — o compromisso. */
export const DWELL_BINS = ["<15s", "15-60s", "1-5min", ">5min"];

export function dwellBinLabel(milliseconds) {
  if (milliseconds < 0) return null;
  const seconds = milliseconds / 1000;
  if (seconds < 15) return "<15s";
  if (seconds < 60) return "15-60s";
  if (seconds < 300) return "1-5min";
  return ">5min";
}

/**
 * Marcadores determinísticos de tráfego sintético (R5, emenda ADR-0010): o
 * prefixo `probe.` é a convenção nova; os demais são a lista legada de
 * marcadores conhecidos do 1º relatório (§8.5) — classificação por marcador
 * elimina a inferência por timing ONDE há marcador. As seções v3 continuam
 * computadas sobre TODOS os eventos aceitos (semântica inalterada, R7d);
 * excluir sonda da leitura é decisão do operador, nunca automática.
 */
export const PROBE_MARKER_RULES = [
  { marker: "probe.", matches: (id) => id.startsWith("probe.") },
  { marker: "aid###-", matches: (id) => /^aid\d{3}-/.test(id) },
  { marker: "qa-", matches: (id) => id.startsWith("qa-") },
  {
    marker: "sequential-uuid",
    matches: (id) => /-0000-4000-8000-/.test(id),
  },
];

export function probeMarkerFor(...identifiers) {
  for (const rule of PROBE_MARKER_RULES) {
    for (const id of identifiers) {
      if (typeof id === "string" && id.length > 0 && rule.matches(id)) return rule.marker;
    }
  }
  return null;
}

/** Glossário binding do report v4 (spec R1/R3/R4). */
export const REPORT_GLOSSARY = {
  "entry.lesson-resume":
    "retomada pós-reload de lição em andamento (chamado de 'deep-link' no relatório da janela 2026-09-06→10; o termo 'deep-link' está aposentado no vocabulário novo)",
  "entry.absent-pre-v4": "não instrumentado (pré-v4) — nunca 'unknown'",
  "briefExposure.exitedBrief":
    "viu o brief e não chegou à 1ª atividade — comportamento observado (exposição), nunca leitura ou compreensão",
  "briefExposure.exitedFirstActivity":
    "viu a 1ª atividade e não submeteu — não glosado como 'não entendeu o que fazer' (essa é a hipótese F1, testada com as sessões O1)",
  "briefExposure.residualNoBrief":
    "started sem brief_viewed — canário de qualidade de dados (defeito de emissão se crescer), não segmento de aprendiz",
  "briefExposure.startedToBrief":
    "~100% <15s por construção (a intro renderiza junto com o started) — nota de uso",
  "o1.artifactMapping":
    "artefatos de pesquisa O1 referem a tela pelo nome visível ao aprendiz ('Pedido da Vila Lume'); mapeamento analítico: brief/lesson_brief_viewed ↔ intro/'Pedido da Vila Lume' ('brief' é vocabulário de analista — o aprendiz nunca vê essa palavra)",
};

function medianOf(sortedValues) {
  if (sortedValues.length === 0) return null;
  const mid = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 1
    ? sortedValues[mid]
    : Math.round(((sortedValues[mid - 1] + sortedValues[mid]) / 2) * 1000) / 1000;
}

function utcDayStart(isoMs) {
  const date = new Date(isoMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** ISO-8601 week key ("2026-W29") using the Thursday rule, in UTC. */
export function isoWeekKey(isoMs) {
  const date = new Date(utcDayStart(isoMs));
  const dayNumber = (date.getUTCDay() + 6) % 7; // Monday = 0
  const thursday = new Date(date.getTime() + (3 - dayNumber) * DAY_MS);
  const januaryFirst = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.floor((thursday.getTime() - januaryFirst) / DAY_MS / 7) + 1;
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function rate(count, total) {
  return Math.round((count / total) * 10000) / 10000;
}

function matchesStage(event, stage) {
  if (event.name !== stage.name) return false;
  if (stage.dimensions === undefined) return true;
  return Object.entries(stage.dimensions).every(([key, value]) => event.dimensions[key] === value);
}

function eventTime(event) {
  return Date.parse(event.occurredAt);
}

/**
 * Minimal focused reader for the shared curriculum catalog (D2 cut, spec
 * AID-673 §2.2): extracts modules (id → journey) and lessons (id → moduleId)
 * from the top-level `modules:`/`lessons:` blocks. The tool stays
 * dependency-free (repo root is not a Node project), so this parses exactly
 * the catalog's stable `key: value` shape and nothing else.
 * @returns {{missionToModule: Map<string, string>, moduleJourney: Map<string, string>} | null}
 *   null when the catalog is absent/unreadable or carries no mapping — the
 *   caller must then mark the section `unavailable` (fail-closed, never
 *   fabricate a module attribution).
 */
export function loadMissionModuleIndex(catalogPath = DEFAULT_CATALOG_PATH) {
  let raw;
  try {
    raw = readFileSync(catalogPath, "utf8");
  } catch {
    return null;
  }
  const moduleJourney = new Map();
  const missionToModule = new Map();
  let section = null;
  let currentModule = null;
  let currentLesson = null;
  for (const line of raw.split("\n")) {
    if (/^[A-Za-z][A-Za-z0-9_-]*:/.test(line)) {
      section = line.slice(0, line.indexOf(":"));
      currentModule = null;
      currentLesson = null;
      continue;
    }
    if (section === "modules") {
      const match = /^  - id: (\S+)/.exec(line);
      if (match !== null) {
        currentModule = match[1];
        continue;
      }
      const journey = /^    journey: (\S+)/.exec(line);
      if (journey !== null && currentModule !== null) moduleJourney.set(currentModule, journey[1]);
    } else if (section === "lessons") {
      const match = /^  - id: (\S+)/.exec(line);
      if (match !== null) {
        currentLesson = match[1];
        continue;
      }
      const module = /^    moduleId: (\S+)/.exec(line);
      if (module !== null && currentLesson !== null) missionToModule.set(currentLesson, module[1]);
    }
  }
  return missionToModule.size === 0 ? null : { missionToModule, moduleJourney };
}

/**
 * Aggregate validated events into the k-anonymized funnel report.
 * @param {Array<{value: object}>} entries parsed NDJSON entries (only lines the
 *   collector vocabulary accepts are aggregated; the rest are counted, never
 *   trusted — run schema_drift_monitor.mjs to see why a line was excluded).
 */
export function aggregateFunnel(entries, options = {}) {
  const k = options.k ?? DEFAULT_K_MINIMUM;
  const graceDays = options.graceDays ?? DEFAULT_GRACE_DAYS;
  const windows = [...new Set(options.windows ?? DEFAULT_WINDOWS)].sort((a, b) => a - b);
  // Fail-closed numeric parameters (AID-492 D1): a NaN k makes `n < k` always
  // false, i.e. k-anonymous suppression silently OFF. Invalid values throw
  // instead of aggregating — programmatic callers can't fail open either.
  if (!Number.isInteger(k) || k < 1) {
    throw new TypeError(`k must be an integer ≥ 1, got: ${k}`);
  }
  if (!Number.isInteger(graceDays) || graceDays < 1) {
    throw new TypeError(`graceDays must be an integer ≥ 1, got: ${graceDays}`);
  }
  if (windows.length === 0 || windows.some((nDays) => !Number.isInteger(nDays) || nDays < 1)) {
    throw new TypeError(`windows must be a non-empty list of integers ≥ 1, got: ${JSON.stringify(options.windows)}`);
  }

  const accepted = [];
  const literacyAccepted = [];
  let rejectedEvents = 0;
  let parseErrors = 0;
  for (const entry of entries) {
    if (entry.parseError !== undefined) {
      parseErrors += 1;
    } else if (validateAnalyticsEvent(entry.value)) {
      accepted.push(entry.value);
    } else if (validateLiteracyEvent(entry.value)) {
      literacyAccepted.push(entry.value);
    } else {
      rejectedEvents += 1;
    }
  }
  accepted.sort((a, b) => eventTime(a) - eventTime(b) || a.sequence - b.sequence);
  literacyAccepted.sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));

  // F2b dedup (spec AID-673 §2.1): the beacon+fetch race can append the same
  // eventId twice; every cut below must see each event exactly once. First
  // occurrence in the standing sort order (occurredAt, sequence) wins.
  const seenEventIds = new Set();
  const events = [];
  let duplicateEvents = 0;
  for (const event of accepted) {
    if (seenEventIds.has(event.eventId)) {
      duplicateEvents += 1;
      continue;
    }
    seenEventIds.add(event.eventId);
    events.push(event);
  }

  // Group per installation, tag review sessions, remember first occurrence of
  // every stage, and record each event's day offset from its cohort D0.
  const installations = new Map();
  for (const event of events) {
    const id = event.dimensions.installationId;
    if (!installations.has(id)) {
      installations.set(id, { events: [], firstEventTime: eventTime(event), stageTimes: new Map() });
    }
    const installation = installations.get(id);
    installation.events.push(event);
    for (const stage of ACTIVATION_STAGES) {
      if (matchesStage(event, stage) && !installation.stageTimes.has(stage.name)) {
        installation.stageTimes.set(stage.name, eventTime(event));
      }
    }
  }
  const reviewSessions = new Set();
  for (const event of events) {
    const dimensions = event.dimensions;
    if (
      (event.name === "mission.started" && dimensions.mode === "review") ||
      (event.name === "review.started" && (dimensions.reason === "due" || dimensions.reason === "overdue"))
    ) {
      reviewSessions.add(`${dimensions.installationId}:${dimensions.sessionId}`);
    }
  }

  const narrow = new Map(); // week -> [{d0, installation}]
  const wide = new Map();
  const activation = new Map(); // week -> [{installation}]
  for (const [id, installation] of installations) {
    const firstEventWeek = isoWeekKey(installation.firstEventTime);
    if (!activation.has(firstEventWeek)) activation.set(firstEventWeek, []);
    activation.get(firstEventWeek).push(installation);
    const completedTime = firstTimeOf(installation, "onboarding.completed");
    if (completedTime !== undefined) {
      const week = isoWeekKey(completedTime);
      if (!wide.has(week)) wide.set(week, []);
      wide.get(week).push({ id, d0: utcDayStart(completedTime), installation });
    }
    const missionTime = firstMissionCompleted(installation);
    if (missionTime !== undefined) {
      const week = isoWeekKey(missionTime);
      if (!narrow.has(week)) narrow.set(week, []);
      narrow.get(week).push({ id, d0: utcDayStart(missionTime), installation });
    }
  }

  function retentionBucket(cohort) {
    const n = cohort.length;
    if (n < k) return { suppressed: true, n };
    const bucket = { n };
    for (const nDays of windows) {
      let returned = 0;
      let returnedStrict = 0;
      let reviewReturn = 0;
      for (const member of cohort) {
        const offsets = member.installation.events.map(
          (event) => (utcDayStart(eventTime(event)) - member.d0) / DAY_MS,
        );
        const inAccumulated = offsets.some((offset) => offset >= 1 && offset <= nDays + graceDays);
        const inStrict = offsets.some((offset) => offset >= nDays && offset <= nDays + graceDays);
        if (inAccumulated) returned += 1;
        if (inStrict) returnedStrict += 1;
        if (inAccumulated && returnedWithReview(member, nDays)) reviewReturn += 1;
      }
      bucket[`D+${nDays}`] = {
        returned,
        returnedRate: rate(returned, n),
        returnedStrict,
        returnedStrictRate: rate(returnedStrict, n),
        reviewReturn,
        reviewReturnRate: rate(reviewReturn, n),
      };
    }
    return bucket;
  }

  function returnedWithReview(member, nDays) {
    for (const event of member.installation.events) {
      const offset = (utcDayStart(eventTime(event)) - member.d0) / DAY_MS;
      if (offset < 1 || offset > nDays + graceDays) continue;
      if (reviewSessions.has(`${member.id}:${event.dimensions.sessionId}`)) return true;
    }
    return false;
  }

  const weeks = [...new Set([...narrow.keys(), ...wide.keys(), ...activation.keys()])].sort();
  const retention = { cohortDefinition: "first mission.completed{result:completed} on UTC day D0", cohorts: {} };
  const wideRetention = { cohortDefinition: "first onboarding.completed on UTC day D0", cohorts: {} };
  const activationFunnel = { stages: ACTIVATION_STAGES.map((stage) => stage.name), cohorts: {} };
  let suppressedBuckets = 0;
  for (const week of weeks) {
    const narrowCohort = narrow.get(week) ?? [];
    const wideCohort = wide.get(week) ?? [];
    const activationCohort = activation.get(week) ?? [];
    const narrowBucket = retentionBucket(narrowCohort);
    if (narrowBucket.suppressed === true) suppressedBuckets += 1;
    retention.cohorts[week] = narrowBucket;
    const wideBucket = retentionBucket(wideCohort);
    if (wideBucket.suppressed === true) suppressedBuckets += 1;
    wideRetention.cohorts[week] = wideBucket;
    const activationBucket = activationBucketFor(activationCohort, k);
    if (activationBucket.suppressed === true) suppressedBuckets += 1;
    activationFunnel.cohorts[week] = activationBucket;
  }
  const overallNarrow = retentionBucket([...narrow.values()].flat());
  const overallWide = retentionBucket([...wide.values()].flat());
  const overallActivation = activationBucketFor([...activation.values()].flat(), k);
  if (overallNarrow.suppressed === true) suppressedBuckets += 1;
  if (overallWide.suppressed === true) suppressedBuckets += 1;
  if (overallActivation.suppressed === true) suppressedBuckets += 1;

  // --- F2b sections (spec AID-673 §2.2) — D1 cuts, D2 cut, all k≥5/cell ---

  // A count cell that must not be published below k: zero cells are omitted,
  // 1..k-1 keeps only the convention already used by suppressed buckets (n),
  // ≥k publishes the count. Identifiers never enter these structures.
  function gatedCount(count) {
    if (count === 0) return undefined;
    return count < k ? { suppressed: true, n: count } : count;
  }

  function trackEntrySplitFor() {
    const firstInitialStart = new Map();
    for (const event of events) {
      if (event.name !== "mission.started" || event.dimensions.mode !== "initial") continue;
      const id = event.dimensions.installationId;
      if (!firstInitialStart.has(id)) firstInitialStart.set(id, event);
    }
    const cohorts = new Map();
    for (const event of firstInitialStart.values()) {
      const week = isoWeekKey(eventTime(event));
      const track = event.dimensions.trackId ?? "unknown";
      if (!cohorts.has(week)) cohorts.set(week, new Map());
      const tracks = cohorts.get(week);
      tracks.set(track, (tracks.get(track) ?? 0) + 1);
    }
    const section = {
      definition: "installations with ≥1 mission.started{mode:initial}, by ISO week of the first one; split by its trackId",
      cohorts: {},
    };
    for (const week of [...cohorts.keys()].sort()) {
      const tracks = cohorts.get(week);
      const n = [...tracks.values()].reduce((sum, count) => sum + count, 0);
      if (n < k) {
        section.cohorts[week] = { suppressed: true, n };
        continue;
      }
      const byTrack = {};
      for (const track of [...tracks.keys()].sort()) {
        const count = tracks.get(track);
        byTrack[track] = { installations: count, rate: rate(count, n) };
      }
      section.cohorts[week] = { n, byTrack };
    }
    return section;
  }

  function missionSets() {
    const started = new Map(); // missionId|unattributed -> Set(installationId)
    const completed = new Map();
    const add = (map, key, id) => {
      if (!map.has(key)) map.set(key, new Set());
      map.get(key).add(id);
    };
    for (const event of events) {
      const dimensions = event.dimensions;
      const key = dimensions.missionId ?? "unattributed";
      if (event.name === "mission.started") add(started, key, dimensions.installationId);
      if (event.name === "mission.completed" && dimensions.result === "completed") {
        add(completed, key, dimensions.installationId);
      }
    }
    return { started, completed };
  }

  function missionCompletionFor({ started, completed }) {
    const section = {
      definition: "installations with ≥1 mission.started (n) vs ≥1 mission.completed{result:completed}, per missionId context; missing missionId ⇒ unattributed",
      missions: {},
    };
    for (const key of [...new Set([...started.keys(), ...completed.keys()])].sort()) {
      const n = started.get(key)?.size ?? 0;
      if (n < k) {
        section.missions[key] = { suppressed: true, n };
        continue;
      }
      const completedCount = completed.get(key)?.size ?? 0;
      section.missions[key] = { started: n, completed: completedCount, completionRate: rate(completedCount, n) };
    }
    return section;
  }

  function activityFrictionFor() {
    const attempts = new Map(); // `${activityType}|${missionKey}` -> {submitted, passed}
    const missionFriction = new Map(); // missionKey -> {hint, retry}
    for (const event of events) {
      const dimensions = event.dimensions;
      const missionKey = dimensions.missionId ?? "unattributed";
      if (event.name === "structured_attempt.submitted" || event.name === "structured_attempt.passed") {
        const activityKey = `${dimensions.activityType ?? "unknown"}|${missionKey}`;
        if (!attempts.has(activityKey)) attempts.set(activityKey, { submitted: 0, passed: 0 });
        const cell = attempts.get(activityKey);
        if (event.name === "structured_attempt.submitted") cell.submitted += 1;
        else cell.passed += 1;
      }
      if (event.name === "hint.requested" || event.name === "retry.requested") {
        if (!missionFriction.has(missionKey)) missionFriction.set(missionKey, { hint: 0, retry: 0 });
        const cell = missionFriction.get(missionKey);
        if (event.name === "hint.requested") cell.hint += 1;
        else cell.retry += 1;
      }
    }
    const section = {
      definition: "structured_attempt.passed/submitted per activityType × missionId; hint.requested/retry.requested counted per missionId (those events carry no activityType)",
      attempts: {},
      missionFriction: {},
    };
    for (const key of [...attempts.keys()].sort()) {
      const cell = attempts.get(key);
      if (cell.submitted < k) {
        section.attempts[key] = { suppressed: true, n: cell.submitted };
        continue;
      }
      section.attempts[key] = { submitted: cell.submitted, passed: cell.passed, passRate: rate(cell.passed, cell.submitted) };
    }
    for (const key of [...missionFriction.keys()].sort()) {
      const cell = missionFriction.get(key);
      const hint = gatedCount(cell.hint);
      const retry = gatedCount(cell.retry);
      if (hint !== undefined || retry !== undefined) section.missionFriction[key] = { hintRequested: hint, retryRequested: retry };
    }
    return section;
  }

  function verificationHealthFor() {
    const states = new Map(); // state -> {events, installations: Set}
    let totalEvents = 0;
    for (const event of events) {
      if (event.name !== "verification.state_changed") continue;
      totalEvents += 1;
      const state = event.dimensions.state ?? "unknown";
      if (!states.has(state)) states.set(state, { events: 0, installations: new Set() });
      const cell = states.get(state);
      cell.events += 1;
      cell.installations.add(event.dimensions.installationId);
    }
    const section = {
      definition: "verification.state_changed events by state (bridge-level state; no missionId in the cut)",
      totalEvents,
      states: {},
    };
    for (const state of [...states.keys()].sort()) {
      const cell = states.get(state);
      if (cell.events < k || cell.installations.size < k) {
        section.states[state] = { suppressed: true, n: cell.events };
        continue;
      }
      section.states[state] = { events: cell.events, installations: cell.installations.size, share: rate(cell.events, totalEvents) };
    }
    return section;
  }

  function rendererDegradedFor() {
    const fallbacks = new Map(); // fallback -> {events, reasons: Map, engineIds: Map}
    for (const event of events) {
      if (event.name !== "renderer.degraded") continue;
      const dimensions = event.dimensions;
      const fallback = dimensions.fallback ?? "unknown";
      if (!fallbacks.has(fallback)) fallbacks.set(fallback, { events: 0, reasons: new Map(), engineIds: new Map() });
      const cell = fallbacks.get(fallback);
      cell.events += 1;
      const reason = dimensions.reason ?? "unknown";
      cell.reasons.set(reason, (cell.reasons.get(reason) ?? 0) + 1);
      if (dimensions.engineId !== undefined) {
        cell.engineIds.set(dimensions.engineId, (cell.engineIds.get(dimensions.engineId) ?? 0) + 1);
      }
    }
    const section = {
      definition: "renderer.degraded events by fallback, with aggregated reasons and engineId context when present",
      fallbacks: {},
    };
    for (const fallback of [...fallbacks.keys()].sort()) {
      const cell = fallbacks.get(fallback);
      if (cell.events < k) {
        section.fallbacks[fallback] = { suppressed: true, n: cell.events };
        continue;
      }
      const reasons = {};
      for (const reason of [...cell.reasons.keys()].sort()) {
        const gated = gatedCount(cell.reasons.get(reason));
        if (gated !== undefined) reasons[reason] = gated;
      }
      const engineIds = {};
      for (const engineId of [...cell.engineIds.keys()].sort()) {
        const gated = gatedCount(cell.engineIds.get(engineId));
        if (gated !== undefined) engineIds[engineId] = gated;
      }
      section.fallbacks[fallback] = { events: cell.events, reasons, engineIds };
    }
    return section;
  }

  function moduleCompletionMedianFor({ started, completed }) {
    const catalogPath = options.catalogPath ?? DEFAULT_CATALOG_PATH;
    const catalogLabel = options.catalogPath ?? DEFAULT_CATALOG_LABEL;
    const section = {
      definition: "per-module completion (same definition as missionCompletion, unioned over the module's missions) for ia_pratica modules mapped in the catalog; median across published modules",
      catalog: catalogLabel,
    };
    const catalog = loadMissionModuleIndex(catalogPath);
    if (catalog === null) {
      return { ...section, unavailable: true, reason: `catalog unavailable: ${catalogLabel}` };
    }
    const moduleStarted = new Map();
    const moduleCompleted = new Map();
    let unmappedMissions = 0;
    for (const [missionId, installationIds] of started) {
      if (missionId === "unattributed") continue;
      const moduleId = catalog.missionToModule.get(missionId);
      if (moduleId === undefined) {
        unmappedMissions += 1;
        continue;
      }
      if (!moduleStarted.has(moduleId)) moduleStarted.set(moduleId, new Set());
      for (const id of installationIds) moduleStarted.get(moduleId).add(id);
    }
    for (const [missionId, installationIds] of completed) {
      if (missionId === "unattributed") continue;
      const moduleId = catalog.missionToModule.get(missionId);
      if (moduleId === undefined) continue;
      if (!moduleCompleted.has(moduleId)) moduleCompleted.set(moduleId, new Set());
      for (const id of installationIds) moduleCompleted.get(moduleId).add(id);
    }
    const modules = {};
    const publishedRates = [];
    let modulesSuppressed = 0;
    const journeyModuleIds = [...moduleStarted.keys()]
      .filter((moduleId) => catalog.moduleJourney.get(moduleId) === "ia_pratica")
      .sort();
    for (const moduleId of journeyModuleIds) {
      const n = moduleStarted.get(moduleId).size;
      if (n < k) {
        modules[moduleId] = { suppressed: true, n };
        modulesSuppressed += 1;
        continue;
      }
      const completedCount = moduleCompleted.get(moduleId)?.size ?? 0;
      const completionRate = rate(completedCount, n);
      modules[moduleId] = { n, completed: completedCount, completionRate };
      publishedRates.push(completionRate);
    }
    publishedRates.sort((a, b) => a - b);
    const mid = Math.floor(publishedRates.length / 2);
    const medianCompletionRate =
      publishedRates.length === 0
        ? null
        : publishedRates.length % 2 === 1
          ? publishedRates[mid]
          : rate(publishedRates[mid - 1] + publishedRates[mid], 2);
    return {
      ...section,
      journey: "ia_pratica",
      modules,
      medianCompletionRate,
      modulesPublished: publishedRates.length,
      modulesSuppressed,
      missionsWithoutModuleMapping: unmappedMissions,
    };
  }

  const missionSetsResult = missionSets();
  const trackEntrySplit = trackEntrySplitFor();
  const missionCompletion = missionCompletionFor(missionSetsResult);
  const activityFriction = activityFrictionFor();
  const verificationHealth = verificationHealthFor();
  const rendererDegraded = rendererDegradedFor();
  const moduleCompletionMedian = moduleCompletionMedianFor(missionSetsResult);
  // F2 v4: dedup do envelope literacy compartilhado entre literacyFunnel e
  // as seções novas (activationDetail/briefExposure/probeClassification).
  const literacyDedup = dedupeLiteracyEvents(literacyAccepted);
  const literacyFunnel = literacyFunnelFor({
    events: literacyDedup.events,
    duplicateEvents: literacyDedup.duplicates,
    k,
  });
  const activationDetail = activationDetailFor({ events, literacyEvents: literacyDedup.events, k });
  const briefExposure = briefExposureFor({ osEvents: events, literacyEvents: literacyDedup.events, k });
  const probeClassification = probeClassificationFor({ events, literacyEvents: literacyDedup.events });

  return {
    reportVersion: REPORT_VERSION,
    generatedAt: (options.now ?? new Date()).toISOString(),
    parameters: {
      windowsDays: windows,
      graceDays,
      kMinimum: k,
      returnWindowAccumulated: "any event at day offset 1..N+graceDays",
      returnWindowStrict: "at least one event at day offset N..N+graceDays",
      reviewReturn: "returning event's session contains mission.started{mode:review} or review.started{reason:due|overdue}",
    },
    anonymity: { identifiersPublished: false, suppressionRule: "buckets with n<k are suppressed", suppressedBuckets },
    source: { files: [], totalEvents: events.length, duplicateEvents, rejectedEvents, parseErrors },
    activationFunnel: { ...activationFunnel, overall: overallActivation },
    retention: { ...retention, overall: overallNarrow },
    wideCohortRetention: { ...wideRetention, overall: overallWide },
    trackEntrySplit,
    missionCompletion,
    activityFriction,
    verificationHealth,
    rendererDegraded,
    moduleCompletionMedian,
    literacyFunnel,
    // F2 v4 (spec AID-1218 R3–R5) — seções NOVAS apenas; as seções v3 acima
    // permanecem com definição e números idênticos para o mesmo input (R7d).
    glossary: REPORT_GLOSSARY,
    activationDetail,
    briefExposure,
    probeClassification,
  };
}

/** Dedup por eventId do envelope literacy (corrida beacon+fetch, ADR-0010). */
function dedupeLiteracyEvents(accepted) {
  const seen = new Set();
  const events = [];
  let duplicates = 0;
  for (const event of accepted) {
    if (seen.has(event.eventId)) {
      duplicates += 1;
      continue;
    }
    seen.add(event.eventId);
    events.push(event);
  }
  return { events, duplicates };
}

// --- literacy funnel (AID-913 activation; envelope source:"literacydojo") ---

const LITERACY_STAGES = [
  { key: "entry_viewed", event: "entry_viewed" },
  { key: "lesson_started", event: "lesson_started" },
  { key: "activity_attempted", event: "activity_attempted" },
  { key: "lesson_completed", event: "lesson_completed" },
];

/**
 * Session-level funnel for the literacy v2 envelope. Sessions are anonymous
 * and ephemeral (`sessionId`, in memory per page load — AID-913); every
 * published cell is k-suppressed and no identifier is ever emitted. Attempts
 * per session+lesson beyond the first are the retry marker.
 */
function literacyFunnelFor({ events: literacyEvents, duplicateEvents: literacyDuplicates, k }) {

  const sessions = new Map();
  for (const event of literacyEvents) {
    const id = event.sessionId;
    if (!sessions.has(id)) {
      sessions.set(id, { firstTime: Date.parse(event.occurredAt), stageTimes: new Map(), lessons: new Map() });
    }
    const session = sessions.get(id);
    if (!session.stageTimes.has(event.event)) {
      session.stageTimes.set(event.event, Date.parse(event.occurredAt));
    }
    const lessonId = typeof event.props?.lessonId === "string" ? event.props.lessonId : null;
    if (lessonId !== null && (event.event === "lesson_started" || event.event === "activity_attempted" || event.event === "lesson_completed")) {
      if (!session.lessons.has(lessonId)) session.lessons.set(lessonId, { attempts: 0, started: false, completed: false });
      const lesson = session.lessons.get(lessonId);
      if (event.event === "lesson_started") lesson.started = true;
      if (event.event === "activity_attempted") lesson.attempts += 1;
      if (event.event === "lesson_completed") lesson.completed = true;
    }
  }

  const reachedStages = (session) => {
    const counts = [];
    let previousTime = Number.NEGATIVE_INFINITY;
    for (const stage of LITERACY_STAGES) {
      const stageTime = session.stageTimes.get(stage.event);
      if (stageTime === undefined || stageTime < previousTime) return counts;
      previousTime = stageTime;
      counts.push(stage.event);
    }
    return counts;
  };

  const stageBucket = (cohort) => {
    const n = cohort.length;
    if (n < k) return { suppressed: true, n };
    const counts = LITERACY_STAGES.map(() => 0);
    for (const session of cohort) {
      for (const stage of reachedStages(session)) {
        counts[LITERACY_STAGES.findIndex((item) => item.event === stage)] += 1;
      }
    }
    return { n, counts };
  };

  const byWeek = {};
  for (const session of sessions.values()) {
    const week = isoWeekKey(session.firstTime);
    (byWeek[week] ??= []).push(session);
  }
  const funnelByWeek = {};
  for (const week of [...Object.keys(byWeek)].sort()) {
    funnelByWeek[week] = stageBucket(byWeek[week]);
  }

  const lessonStarts = new Map();
  for (const session of sessions.values()) {
    for (const [lessonId, lesson] of session.lessons) {
      if (!lesson.started && !lesson.completed) continue;
      if (!lessonStarts.has(lessonId)) lessonStarts.set(lessonId, { started: new Set(), completed: new Set() });
      if (lesson.started) lessonStarts.get(lessonId).started.add(session);
      if (lesson.completed) lessonStarts.get(lessonId).completed.add(session);
    }
  }
  const lessonCompletion = {};
  for (const lessonId of [...lessonStarts.keys()].sort()) {
    const n = lessonStarts.get(lessonId).started.size;
    if (n < k) {
      lessonCompletion[lessonId] = { suppressed: true, n };
      continue;
    }
    const completed = lessonStarts.get(lessonId).completed.size;
    lessonCompletion[lessonId] = { n, completed, completionRate: rate(completed, n) };
  }

  let attemptEvents = 0;
  let attemptPassed = 0;
  const attemptSessions = new Set();
  const retrySessions = new Set();
  for (const event of literacyEvents) {
    if (event.event !== "activity_attempted") continue;
    attemptEvents += 1;
    if (event.props?.passed === true) attemptPassed += 1;
    attemptSessions.add(event.sessionId);
    const lessonId = typeof event.props?.lessonId === "string" ? event.props.lessonId : "?";
    const session = sessions.get(event.sessionId);
    if (session !== undefined && (session.lessons.get(lessonId)?.attempts ?? 0) > 1) {
      retrySessions.add(event.sessionId);
    }
  }
  const attempts = attemptSessions.size < k
    ? { suppressed: true, n: attemptSessions.size }
    : { n: attemptSessions.size, submitted: attemptEvents, passed: attemptPassed, retrySessions: retrySessions.size };

  return {
    envelope: "literacydojo v2",
    totalEvents: literacyEvents.length,
    duplicateEvents: literacyDuplicates,
    totalSessions: sessions.size,
    stages: LITERACY_STAGES.map((stage) => stage.key),
    overall: stageBucket([...sessions.values()]),
    byWeek: funnelByWeek,
    lessonCompletion,
    attempts,
  };
}

function firstTimeOf(installation, stageName) {
  return installation.stageTimes.get(stageName);
}

// --- F2 v4 sections (spec AID-1218 R3–R5) — aditivas; seções v3 intactas ---

/** Mediana contínua (segundos) k-gated — bins são o compromisso, esta é a
 *  comparabilidade direcional com o tempo contínuo do scorecard O1. */
function gatedMedian(secondsValues, k) {
  if (secondsValues.length === 0) return null;
  if (secondsValues.length < k) return { suppressed: true, n: secondsValues.length };
  return medianOf([...secondsValues].sort((a, b) => a - b));
}

function gatedCountCell(count, k) {
  if (count === 0) return undefined;
  return count < k ? { suppressed: true, n: count } : count;
}

/**
 * activationDetail (R4): sessões OS classificadas por tipo de entrada —
 * `onboarding.started` (first-visit) × `journey.returned` (returning) ×
 * `unclassified` (canário, esperado ~0) — com alcance IN-SESSÃO dos estágios
 * de ativação; e o split de entrada literacy pela prop `entry` (R1), incluindo
 * o bucket pré-v4 ("não instrumentado") e o canário de sessão sem evento de
 * entrada. Tudo k≥5/célula; identificadores nunca publicados.
 */
function activationDetailFor({ events, literacyEvents, k }) {
  const sessions = new Map();
  for (const event of events) {
    const key = `${event.dimensions.installationId}:${event.dimensions.sessionId}`;
    if (!sessions.has(key)) {
      sessions.set(key, { firstTime: eventTime(event), entry: null, reached: new Set() });
    }
    const session = sessions.get(key);
    if (session.entry === null) {
      if (event.name === "onboarding.started") session.entry = "first-visit";
      else if (event.name === "journey.returned") session.entry = "returning";
    }
    if (event.name === "onboarding.completed") session.reached.add("onboarding.completed");
    if (event.name === "mission.started") session.reached.add("mission.started");
    if (event.name === "mission.completed" && event.dimensions.result === "completed") {
      session.reached.add("mission.completed");
    }
  }

  const bucketFor = (cohort) => {
    const n = cohort.length;
    if (n < k) return { suppressed: true, n };
    const firstVisit = cohort.filter((session) => session.entry === "first-visit");
    const returning = cohort.filter((session) => session.entry === "returning");
    const unclassified = cohort.filter((session) => session.entry === null);
    const bucket = { n };
    if (firstVisit.length > 0) {
      bucket.firstVisit = {
        sessions: firstVisit.length,
        onboardingCompleted: firstVisit.filter((s) => s.reached.has("onboarding.completed")).length,
        missionStarted: firstVisit.filter((s) => s.reached.has("mission.started")).length,
        missionCompleted: firstVisit.filter((s) => s.reached.has("mission.completed")).length,
      };
    }
    if (returning.length > 0) {
      bucket.returning = {
        sessions: returning.length,
        missionStarted: returning.filter((s) => s.reached.has("mission.started")).length,
        missionCompleted: returning.filter((s) => s.reached.has("mission.completed")).length,
      };
    }
    if (unclassified.length > 0) {
      // Canário (esperado ~0): sessão sem onboarding.started nem journey.returned.
      bucket.unclassified = { sessions: unclassified.length };
    }
    return bucket;
  };

  const byWeek = {};
  const weekCohorts = new Map();
  for (const session of sessions.values()) {
    const week = isoWeekKey(session.firstTime);
    if (!weekCohorts.has(week)) weekCohorts.set(week, []);
    weekCohorts.get(week).push(session);
  }
  for (const week of [...weekCohorts.keys()].sort()) {
    byWeek[week] = bucketFor(weekCohorts.get(week));
  }

  // Split de entrada literacy (R1): prop `entry` opcional; ausência em
  // envelope pré-v4 = "não instrumentado (pré-v4)"; sessão sem entry_viewed
  // = canário do gap de instrumentação do 1º relatório (nunca 'unknown').
  const literacyByEntry = new Map();
  const literacyWeeks = new Map();
  const literacySessions = new Map();
  for (const event of literacyEvents) {
    if (!literacySessions.has(event.sessionId)) {
      literacySessions.set(event.sessionId, { firstTime: Date.parse(event.occurredAt), entry: null });
    }
    const session = literacySessions.get(event.sessionId);
    if (event.event === "entry_viewed" && session.entry === null) {
      session.entry = typeof event.props?.entry === "string" ? event.props.entry : "not-instrumented-pre-v4";
    }
  }
  for (const session of literacySessions.values()) {
    const entry = session.entry ?? "no-entry-event";
    literacyByEntry.set(entry, (literacyByEntry.get(entry) ?? 0) + 1);
    const week = isoWeekKey(session.firstTime);
    if (!literacyWeeks.has(week)) literacyWeeks.set(week, new Map());
    const entries = literacyWeeks.get(week);
    entries.set(entry, (entries.get(entry) ?? 0) + 1);
  }
  const literacyEntrySplit = {
    definition:
      "sessões literacy por prop opcional `entry` do entry_viewed (home|lesson-resume|onboarding); sem a prop = 'not-instrumented-pre-v4' (envelope pré-v4, nunca rejeitado); sem entry_viewed = 'no-entry-event' (canário do gap pré-F2)",
    byWeek: {},
  };
  const entryBucket = (entries) => {
    const n = [...entries.values()].reduce((sum, count) => sum + count, 0);
    if (n < k) return { suppressed: true, n };
    const bucket = { n };
    for (const entry of [...entries.keys()].sort()) {
      bucket.byEntry = bucket.byEntry ?? {};
      bucket.byEntry[entry] = { sessions: entries.get(entry) };
    }
    return bucket;
  };
  literacyEntrySplit.overall = entryBucket(literacyByEntry);
  for (const week of [...literacyWeeks.keys()].sort()) {
    literacyEntrySplit.byWeek[week] = entryBucket(literacyWeeks.get(week));
  }

  return {
    definition:
      "OS: sessões por tipo de entrada (primeiro marcador da sessão: onboarding.started=first-visit · journey.returned=returning · nenhum=unclassified canário) com alcance in-sessão; literacy: split pela prop `entry` (R1). k≥5/célula",
    osSessions: { overall: bucketFor([...sessions.values()]), byWeek },
    literacyEntrySplit,
  };
}

/**
 * briefExposure (R3): segmentação por sessão do dwell entre started, brief,
 * 1ª apresentação e 1ª submissão. Rótulos medem COMPORTAMENTO OBSERVADO
 * (exposição) — nunca leitura nem compreensão (glossário binding do report).
 * Resíduo declarado: `started ∧ ¬brief_viewed` é canário de qualidade de
 * dados, não segmento de aprendiz. Medianas contínuas (b)/(c) k-gated;
 * (a) started→brief é ~100% <15s por construção (nota de uso).
 */
function briefExposureFor({ osEvents, literacyEvents, k }) {
  const BIN_KEYS = DWELL_BINS;

  const exposureBlock = (definition, sessions, extra = {}) => {
    const anchor = (session) => {
      const started = session.started ?? null;
      const brief = session.brief ?? null;
      const presented = session.presented ?? null;
      const submitted = session.submitted ?? null;
      const exitedBrief = started !== null && brief !== null && presented === null;
      const exitedFirstActivity = presented !== null && submitted === null;
      const submittedSegment = presented !== null && submitted !== null;
      const residualNoBrief = started !== null && brief === null;
      return { started, brief, presented, submitted, exitedBrief, exitedFirstActivity, submittedSegment, residualNoBrief };
    };
    const anchored = sessions.map(anchor);
    const n = anchored.filter((s) => s.started !== null).length;
    const segments = {
      exitedBrief: gatedCountCell(anchored.filter((s) => s.exitedBrief).length, k),
      exitedFirstActivity: gatedCountCell(anchored.filter((s) => s.exitedFirstActivity).length, k),
      submittedFirst: gatedCountCell(anchored.filter((s) => s.submittedSegment).length, k),
      residualNoBrief: gatedCountCell(anchored.filter((s) => s.residualNoBrief).length, k),
    };
    const intervalBins = (fromKey, toKey) => {
      const observed = anchored.filter((s) => s[fromKey] !== null && s[toKey] !== null && s[toKey] >= s[fromKey]);
      const counts = Object.fromEntries(BIN_KEYS.map((key) => [key, 0]));
      for (const session of observed) {
        const label = dwellBinLabel(session[toKey] - session[fromKey]);
        if (label !== null) counts[label] += 1;
      }
      const bins = {};
      for (const key of BIN_KEYS) {
        const cell = gatedCountCell(counts[key], k);
        if (cell !== undefined) bins[key] = cell;
      }
      return { observed: gatedCountCell(observed.length, k), bins };
    };
    const medianSeconds = (fromKey, toKey) => {
      const values = anchored
        .filter((s) => s[fromKey] !== null && s[toKey] !== null && s[toKey] >= s[fromKey])
        .map((s) => (s[toKey] - s[fromKey]) / 1000);
      return gatedMedian(values, k);
    };
    return {
      definition,
      nSessionsWithStarted: gatedCountCell(n, k),
      segments,
      dwellBins: {
        startedToBrief: intervalBins("started", "brief"),
        briefToFirstPresentation: intervalBins("brief", "presented"),
        presentationToFirstSubmission: intervalBins("presented", "submitted"),
      },
      mediansSeconds: {
        briefToFirstPresentation: medianSeconds("brief", "presented"),
        presentationToFirstSubmission: medianSeconds("presented", "submitted"),
      },
      ...extra,
    };
  };

  // Literacy v2 envelope: âncoras por SESSÃO (primeiras ocorrências; sessão =
  // page load — múltiplas lições numa sessão usam a 1ª de cada estágio).
  const literacySessions = new Map();
  for (const event of literacyEvents) {
    if (!literacySessions.has(event.sessionId)) {
      literacySessions.set(event.sessionId, {});
    }
    const session = literacySessions.get(event.sessionId);
    const time = Date.parse(event.occurredAt);
    if (event.event === "lesson_started" && session.started === undefined) session.started = time;
    if (event.event === "lesson_brief_viewed" && session.brief === undefined) session.brief = time;
    if (
      event.event === "activity_presented" &&
      event.props?.activityIndex === 0 &&
      session.presented === undefined
    ) {
      session.presented = time;
    }
    if (event.event === "activity_attempted" && session.submitted === undefined) session.submitted = time;
  }
  const literacyBlock = exposureBlock(
    "envelope literacy v2 — sessões anônimas efêmeras (page load); segmentos: exitedBrief = started∧brief∧¬presented(índice 0) · exitedFirstActivity = presented(0)∧¬submissão · submittedFirst = presented(0)∧submissão; resíduo = started∧¬brief (canário)",
    [...literacySessions.values()],
  );

  // OS hosted missions (reemissão do MissionShell): a segmentação vale para
  // engineId=literacyDojo — voxelDojo não emite mission.brief_viewed /
  // activity.presented nesta onda (cobertura declarada; adoção = follow-up
  // data-gated). activity.presented não carrega índice no envelope OS: a 1ª
  // apresentação da sessão é o âncor (emissão é 1×/índice por construção).
  const hostedSessions = new Map();
  for (const event of osEvents) {
    if (event.dimensions.engineId !== "literacyDojo") continue;
    if (
      event.name !== "mission.started" &&
      event.name !== "mission.brief_viewed" &&
      event.name !== "activity.presented" &&
      event.name !== "structured_attempt.submitted"
    ) {
      continue;
    }
    const key = `${event.dimensions.installationId}:${event.dimensions.sessionId}`;
    if (!hostedSessions.has(key)) hostedSessions.set(key, {});
    const session = hostedSessions.get(key);
    const time = eventTime(event);
    if (event.name === "mission.started" && session.started === undefined) session.started = time;
    if (event.name === "mission.brief_viewed" && session.brief === undefined) session.brief = time;
    if (event.name === "activity.presented" && session.presented === undefined) session.presented = time;
    if (event.name === "structured_attempt.submitted" && session.submitted === undefined) {
      session.submitted = time;
    }
  }
  const hostedBlock = exposureBlock(
    "envelope OS v1 — missões hospedadas (mission-events reemitidos pelo MissionShell); segmentos análogos ao literacy (started=mission.started)",
    [...hostedSessions.values()],
    {
      coverage:
        "engineId=literacyDojo somente — voxelDojo não emite os eventos de exposição nesta onda (adoção voxel = follow-up data-gated)",
    },
  );

  return {
    definition:
      "dwell/exposição por sessão entre started, brief, 1ª apresentação e 1ª submissão (bins R3); rótulos de comportamento observado, nunca leitura — ver glossário",
    literacySessions: literacyBlock,
    hostedMissions: hostedBlock,
  };
}

/**
 * probeClassification (R5): classificação determinística de tráfego
 * sintético por marcador (prefixo `probe.` + lista legada). DIAGNÓSTICO
 * apenas — as seções v3 continuam computadas sobre todos os eventos aceitos
 * (R7d: mesmo input ⇒ mesmos valores v3); exclusão de sondas é decisão de
 * leitura do operador, nunca aplicada silenciosamente aqui.
 */
function probeClassificationFor({ events, literacyEvents }) {
  const byMarker = {};
  let probeEvents = 0;
  const osInstallations = new Set();
  const literacySessions = new Set();
  const classify = (identifiers) => probeMarkerFor(...identifiers);
  for (const event of events) {
    const marker = classify([event.eventId, event.dimensions.installationId, event.dimensions.sessionId]);
    if (marker === null) continue;
    probeEvents += 1;
    byMarker[marker] = (byMarker[marker] ?? 0) + 1;
    osInstallations.add(event.dimensions.installationId);
  }
  let literacyProbeEvents = 0;
  for (const event of literacyEvents) {
    const marker = classify([event.eventId, event.sessionId]);
    if (marker === null) continue;
    literacyProbeEvents += 1;
    byMarker[marker] = (byMarker[marker] ?? 0) + 1;
    literacySessions.add(event.sessionId);
  }
  return {
    definition:
      "tráfego sintético classificado deterministicamente por marcador de identificador (prefixo probe. novo + lista legada aid###-/qa-/sequential-uuid); elimina inferência por timing ONDE há marcador — sem marcador a sessão permanece não classificada por esta seção",
    markerRules: PROBE_MARKER_RULES.map((rule) => rule.marker),
    counts: {
      osEvents: probeEvents,
      literacyEvents: literacyProbeEvents,
      osInstallations: osInstallations.size,
      literacySessions: literacySessions.size,
      byMarker,
    },
    policy:
      "as seções v3/v4 de aprendiz continuam computadas sobre TODOS os eventos aceitos (semântica inalterada); excluir sondas da leitura é decisão do operador com esta seção em mãos",
  };
}

function firstMissionCompleted(installation) {
  return installation.stageTimes.get("mission.completed");
}

function activationBucketFor(cohort, k) {
  const n = cohort.length;
  if (n < k) return { suppressed: true, n };
  const counts = [];
  for (let index = 0; index < ACTIVATION_STAGES.length; index += 1) {
    // Ordered reachability: stage i counts when stages 0..i all occurred and
    // their first-occurrence times are non-decreasing.
    const reached = cohort.filter((installation) => {
      let previousTime = Number.NEGATIVE_INFINITY;
      for (let previous = 0; previous <= index; previous += 1) {
        const stageTime = installation.stageTimes.get(ACTIVATION_STAGES[previous].name);
        if (stageTime === undefined || stageTime < previousTime) return false;
        previousTime = stageTime;
      }
      return true;
    });
    counts.push(reached.length);
  }
  return { n, counts };
}

/** Attach per-file source stats (the entries carry provenance). */
export function withSourceFiles(report, files) {
  const sourceFiles = files.map((file) => ({ name: file.name, lines: file.lines }));
  return { ...report, source: { ...report.source, files: sourceFiles } };
}

function percent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function trackSplitCell(bucket) {
  return Object.entries(bucket.byTrack)
    .map(([track, cell]) => `${track} ${cell.installations} (${percent(cell.rate)})`)
    .join(" · ");
}

function suppressedCell(bucket) {
  return `suppressed (n=${bucket.n} < k)`;
}

function countCell(value) {
  if (value === undefined) return "0";
  if (typeof value === "number") return String(value);
  return suppressedCell(value);
}

function retentionRow(bucket, windows) {
  if (bucket.suppressed === true) return `suppressed (n=${bucket.n} < k)`;
  return windows
    .map((nDays) => {
      const window = bucket[`D+${nDays}`];
      return `R${nDays} ${percent(window.returnedRate)} (strict ${percent(window.returnedStrictRate)}, review ${window.reviewReturn})`;
    })
    .join(" · ");
}

/** Render the aggregated report as a human-readable Markdown summary. */
export function renderMarkdownReport(report) {
  const { parameters, source, retention, wideCohortRetention, activationFunnel } = report;
  const lines = [
    "# OS analytics — retention funnel (aggregated, k-anonymized)",
    "",
    `Generated ${report.generatedAt} · ${source.totalEvents} accepted events (${source.duplicateEvents} duplicate eventId line(s) removed) · ${source.files.length} file(s) · ${source.rejectedEvents} rejected, ${source.parseErrors} unparsable line(s) excluded`,
    "",
    `Windows: D+${parameters.windowsDays.join("/D+")} · grace ${parameters.graceDays}d · k≥${parameters.kMinimum} · identifiers never published · analytics ≠ evidence`,
    "",
    "## Retention — narrow cohort (first mission.completed)",
    "",
    "| cohort week | n | windows |",
    "| --- | --- | --- |",
  ];
  for (const [week, bucket] of Object.entries(retention.cohorts)) {
    lines.push(`| ${week} | ${bucket.suppressed === true ? "—" : bucket.n} | ${retentionRow(bucket, parameters.windowsDays)} |`);
  }
  lines.push(`| overall | ${retention.overall.suppressed === true ? "—" : retention.overall.n} | ${retentionRow(retention.overall, parameters.windowsDays)} |`);
  lines.push("", "## Retention — wide cohort (first onboarding.completed, context)", "", "| cohort week | n | windows |", "| --- | --- | --- |");
  for (const [week, bucket] of Object.entries(wideCohortRetention.cohorts)) {
    lines.push(`| ${week} | ${bucket.suppressed === true ? "—" : bucket.n} | ${retentionRow(bucket, parameters.windowsDays)} |`);
  }
  lines.push(`| overall | ${wideCohortRetention.overall.suppressed === true ? "—" : wideCohortRetention.overall.n} | ${retentionRow(wideCohortRetention.overall, parameters.windowsDays)} |`);
  lines.push(
    "",
    "## Activation funnel (per week of first event)",
    "",
    `| cohort week | n | ${activationFunnel.stages.join(" → ")} |`,
    "| --- | --- | --- |",
  );
  for (const [week, bucket] of Object.entries(activationFunnel.cohorts)) {
    const cells = bucket.suppressed === true ? `suppressed (n=${bucket.n} < k)` : bucket.counts.join(" → ");
    lines.push(`| ${week} | ${bucket.suppressed === true ? "—" : bucket.n} | ${cells} |`);
  }
  const overallCells =
    activationFunnel.overall.suppressed === true
      ? `suppressed (n=${activationFunnel.overall.n} < k)`
      : activationFunnel.overall.counts.join(" → ");
  lines.push(`| overall | ${activationFunnel.overall.suppressed === true ? "—" : activationFunnel.overall.n} | ${overallCells} |`);

  lines.push(
    "",
    "## Track entry split (first mission.started{mode:initial} per installation)",
    "",
    "| cohort week | n | track split |",
    "| --- | --- | --- |",
  );
  for (const [week, bucket] of Object.entries(report.trackEntrySplit.cohorts)) {
    const split = bucket.suppressed === true ? suppressedCell(bucket) : trackSplitCell(bucket);
    lines.push(`| ${week} | ${bucket.suppressed === true ? "—" : bucket.n} | ${split} |`);
  }

  lines.push(
    "",
    "## Mission completion (per missionId context)",
    "",
    "| mission | started (n) | completed | completion rate |",
    "| --- | --- | --- | --- |",
  );
  for (const [mission, row] of Object.entries(report.missionCompletion.missions)) {
    if (row.suppressed === true) {
      lines.push(`| ${mission} | ${row.n} | — | ${suppressedCell(row)} |`);
    } else {
      lines.push(`| ${mission} | ${row.started} | ${row.completed} | ${percent(row.completionRate)} |`);
    }
  }

  lines.push(
    "",
    "## Activity friction (structured attempts per activityType × missionId)",
    "",
    "| activityType | mission | submitted | passed | pass rate |",
    "| --- | --- | --- | --- | --- |",
  );
  for (const [key, row] of Object.entries(report.activityFriction.attempts)) {
    const [activityType, mission] = key.split("|");
    if (row.suppressed === true) {
      lines.push(`| ${activityType} | ${mission} | ${row.n} | — | ${suppressedCell(row)} |`);
    } else {
      lines.push(`| ${activityType} | ${mission} | ${row.submitted} | ${row.passed} | ${percent(row.passRate)} |`);
    }
  }
  lines.push(
    "",
    "| mission | hint.requested | retry.requested |",
    "| --- | --- | --- |",
  );
  for (const [mission, row] of Object.entries(report.activityFriction.missionFriction)) {
    lines.push(`| ${mission} | ${countCell(row.hintRequested)} | ${countCell(row.retryRequested)} |`);
  }

  lines.push(
    "",
    "## Verification health (state_changed by state)",
    "",
    "| state | events | installations | share |",
    "| --- | --- | --- | --- |",
  );
  for (const [state, row] of Object.entries(report.verificationHealth.states)) {
    if (row.suppressed === true) {
      lines.push(`| ${state} | ${row.n} | — | ${suppressedCell(row)} |`);
    } else {
      lines.push(`| ${state} | ${row.events} | ${row.installations} | ${percent(row.share)} |`);
    }
  }

  lines.push(
    "",
    "## Renderer degradation (by fallback)",
    "",
    "| fallback | events | reasons | engines |",
    "| --- | --- | --- | --- |",
  );
  for (const [fallback, row] of Object.entries(report.rendererDegraded.fallbacks)) {
    if (row.suppressed === true) {
      lines.push(`| ${fallback} | ${row.n} | — | — |`);
    } else {
      const reasons = Object.entries(row.reasons)
        .map(([reason, count]) => `${reason} ${countCell(count)}`)
        .join(" · ");
      const engines = Object.entries(row.engineIds)
        .map(([engineId, count]) => `${engineId} ${countCell(count)}`)
        .join(" · ");
      lines.push(`| ${fallback} | ${row.events} | ${reasons} | ${engines} |`);
    }
  }

  lines.push(
    "",
    `## Module completion median — D2 (catalog: ${report.moduleCompletionMedian.catalog})`,
    "",
  );
  if (report.moduleCompletionMedian.unavailable === true) {
    lines.push(`unavailable: ${report.moduleCompletionMedian.reason}`, "");
  } else {
    lines.push(
      "| module | started (n) | completed | completion rate |",
      "| --- | --- | --- | --- |",
    );
    for (const [moduleId, row] of Object.entries(report.moduleCompletionMedian.modules)) {
      if (row.suppressed === true) {
        lines.push(`| ${moduleId} | ${row.n} | — | ${suppressedCell(row)} |`);
      } else {
        lines.push(`| ${moduleId} | ${row.n} | ${row.completed} | ${percent(row.completionRate)} |`);
      }
    }
    const median = report.moduleCompletionMedian.medianCompletionRate;
    lines.push(
      "",
      `Median completion rate across published modules: ${median === null ? "— (none published)" : percent(median)} (${report.moduleCompletionMedian.modulesPublished} published, ${report.moduleCompletionMedian.modulesSuppressed} suppressed, ${report.moduleCompletionMedian.missionsWithoutModuleMapping} mission id(s) without catalog mapping)`,
    );
  }

  lines.push(
    "",
    "## Literacy funnel (envelope literacydojo v2, sessions anônimas efêmeras)",
    "",
  );
  const literacy = report.literacyFunnel;
  if (literacy.overall.suppressed === true) {
    lines.push(`Overall: ${suppressedCell(literacy.overall)} — sessões insuficientes para publicar o funil.`, "");
  } else {
    lines.push(
      `Overall (${literacy.stages.join(" → ")}): ${literacy.overall.counts.join(" → ")} de ${literacy.overall.n} sessão(ões).`,
      "",
    );
  }
  lines.push("| semana ISO | n | sessões por estágio |", "| --- | --- | --- |");
  for (const [week, bucket] of Object.entries(literacy.byWeek)) {
    if (bucket.suppressed === true) {
      lines.push(`| ${week} | ${bucket.n} | ${suppressedCell(bucket)} |`);
    } else {
      lines.push(`| ${week} | ${bucket.n} | ${bucket.counts.join(" → ")} |`);
    }
  }
  lines.push("", "| lesson | started (n) | completed | completion rate |", "| --- | --- | --- | --- |");
  for (const [lessonId, row] of Object.entries(literacy.lessonCompletion)) {
    if (row.suppressed === true) {
      lines.push(`| ${lessonId} | ${row.n} | — | ${suppressedCell(row)} |`);
    } else {
      lines.push(`| ${lessonId} | ${row.n} | ${row.completed} | ${percent(row.completionRate)} |`);
    }
  }
  if (literacy.attempts.suppressed === true) {
    lines.push("", `Attempts: ${suppressedCell(literacy.attempts)} (sessões com tentativa).`, "");
  } else {
    lines.push(
      "",
      `Attempts: ${literacy.attempts.submitted} tentativa(s), ${literacy.attempts.passed} passada(s), ${literacy.attempts.retrySessions} sessão(ões) com retry, em ${literacy.attempts.n} sessão(ões).`,
      "",
    );
  }

  // --- F2 v4 sections (additive; glossário binding primeiro) ---
  lines.push("", "## Glossário v4 (binding — spec AID-1218 R1/R3/R4)", "");
  for (const [key, text] of Object.entries(report.glossary ?? {})) {
    lines.push(`- **${key}**: ${text}`);
  }

  const detail = report.activationDetail;
  lines.push(
    "",
    "## Activation detail v4 (entrada first-visit × returning; OS por sessão)",
    "",
    "| corte | n | first-visit (onb.compl→mission.started→completed) | returning (started→completed) | unclassified |",
    "| --- | --- | --- | --- | --- |",
  );
  const detailRow = (label, bucket) => {
    if (bucket.suppressed === true) {
      return `| ${label} | ${bucket.n} | ${suppressedCell(bucket)} | — | — |`;
    }
    const first = bucket.firstVisit
      ? `${bucket.firstVisit.sessions} (${bucket.firstVisit.onboardingCompleted}→${bucket.firstVisit.missionStarted}→${bucket.firstVisit.missionCompleted})`
      : "0";
    const returning = bucket.returning
      ? `${bucket.returning.sessions} (${bucket.returning.missionStarted}→${bucket.returning.missionCompleted})`
      : "0";
    const unclassified = bucket.unclassified ? String(bucket.unclassified.sessions) : "0";
    return `| ${label} | ${bucket.n} | ${first} | ${returning} | ${unclassified} |`;
  };
  lines.push(detailRow("overall", detail.osSessions.overall));
  for (const [week, bucket] of Object.entries(detail.osSessions.byWeek)) {
    lines.push(detailRow(week, bucket));
  }
  const entrySplit = detail.literacyEntrySplit;
  lines.push(
    "",
    "### Literacy — split da prop `entry` (R1)",
    "",
    "| corte | n | por entrada |",
    "| --- | --- | --- |",
  );
  const entryRow = (label, bucket) => {
    if (bucket.suppressed === true) return `| ${label} | ${bucket.n} | ${suppressedCell(bucket)} |`;
    const cells = Object.entries(bucket.byEntry ?? {})
      .map(([entry, cell]) => `${entry} ${cell.sessions}`)
      .join(" · ");
    return `| ${label} | ${bucket.n} | ${cells} |`;
  };
  lines.push(entryRow("overall", entrySplit.overall));
  for (const [week, bucket] of Object.entries(entrySplit.byWeek)) {
    lines.push(entryRow(week, bucket));
  }

  const exposure = report.briefExposure;
  lines.push("", "## Brief exposure v4 (segmentos R3 — exposição observada, nunca leitura)", "");
  const exposureBlocks = [
    ["literacySessions", exposure.literacySessions],
    ["hostedMissions", exposure.hostedMissions],
  ];
  for (const [blockKey, block] of exposureBlocks) {
    lines.push(`### ${blockKey}`, "");
    if (block.coverage !== undefined) lines.push(`Cobertura: ${block.coverage}`, "");
    const segmentCell = (value) =>
      value === undefined ? "0" : typeof value === "number" ? String(value) : suppressedCell(value);
    lines.push(
      `Segmentos (sessões com started: ${segmentCell(block.nSessionsWithStarted)}): ` +
        `saiu no brief ${segmentCell(block.segments.exitedBrief)} · saiu na 1ª atividade ${segmentCell(block.segments.exitedFirstActivity)} · submeteu ${segmentCell(block.segments.submittedFirst)} · resíduo sem brief ${segmentCell(block.segments.residualNoBrief)} (canário).`,
    );
    for (const [intervalKey, interval] of Object.entries(block.dwellBins)) {
      const bins = Object.entries(interval.bins)
        .map(([bin, cell]) => `${bin} ${countCell(cell)}`)
        .join(" · ");
      lines.push(`- dwell ${intervalKey} (observados ${countCell(interval.observed)}): ${bins || "—"}`);
    }
    const medians = block.mediansSeconds;
    lines.push(
      `- medianas contínuas (s): brief→1ª apresentação ${medians.briefToFirstPresentation === null ? "—" : typeof medians.briefToFirstPresentation === "number" ? medians.briefToFirstPresentation : suppressedCell(medians.briefToFirstPresentation)} · apresentação→1ª submissão ${medians.presentationToFirstSubmission === null ? "—" : typeof medians.presentationToFirstSubmission === "number" ? medians.presentationToFirstSubmission : suppressedCell(medians.presentationToFirstSubmission)}`,
    );
    lines.push("");
  }

  const probes = report.probeClassification;
  lines.push(
    "## Probe classification v4 (diagnóstico determinístico — não altera as seções acima)",
    "",
    `Marcadores: ${probes.markerRules.join(" · ")} — eventos OS ${probes.counts.osEvents}, literacy ${probes.counts.literacyEvents}, instalações OS ${probes.counts.osInstallations}, sessões literacy ${probes.counts.literacySessions}.`,
    "",
    probes.policy,
    "",
  );

  lines.push("", "Baseline cycle: the first report establishes the baseline; no external numeric target is claimed.", "");
  return lines.join("\n");
}

/**
 * Run the aggregation over NDJSON inputs.
 * @returns {{report: object, markdown: string, exitCode: number}} exit 0 on
 *   success (drift is reported, not fatal here — the monitor fails high),
 *   2 on usage/IO error.
 */
export async function runAggregation({ inputs, k, windows, graceDays, catalogPath, now = new Date() }) {
  // Policy floor at the report-producing boundary (AID-492 D1): AID-463 §3.0
  // mandates k≥5 from day 1, so this tool refuses to produce a report below
  // it (a lower k would publish cohorts of 1-4 installations with rates).
  if (k !== undefined && (!Number.isInteger(k) || k < DEFAULT_K_MINIMUM)) {
    const detail = `k must be an integer ≥ ${DEFAULT_K_MINIMUM} (AID-463 §3.0 k-anonymity floor), got: ${k}`;
    return { report: { error: detail }, markdown: "", exitCode: 2 };
  }
  if (graceDays !== undefined && (!Number.isInteger(graceDays) || graceDays < 1)) {
    return { report: { error: `graceDays must be an integer ≥ 1, got: ${graceDays}` }, markdown: "", exitCode: 2 };
  }
  if (
    windows !== undefined &&
    (!Array.isArray(windows) || windows.length === 0 || windows.some((nDays) => !Number.isInteger(nDays) || nDays < 1))
  ) {
    return { report: { error: `windows must be a non-empty list of integers ≥ 1, got: ${JSON.stringify(windows)}` }, markdown: "", exitCode: 2 };
  }
  let read;
  try {
    const inputFiles = await collectInputFiles(inputs);
    read = await readNdjsonEntries(inputFiles);
  } catch (error) {
    return { report: { error: error instanceof Error ? error.message : String(error) }, markdown: "", exitCode: 2 };
  }
  const report = withSourceFiles(aggregateFunnel(read.entries, { k, windows, graceDays, catalogPath, now }), read.files);
  return { report, markdown: renderMarkdownReport(report), exitCode: 0 };
}

export function aggregateCli(argv, { now = new Date() } = {}) {
  const args = argv.slice(2);
  const inputs = [];
  let output = null;
  let markdown = null;
  let k = DEFAULT_K_MINIMUM;
  let graceDays = DEFAULT_GRACE_DAYS;
  let windows = DEFAULT_WINDOWS;
  const usageError = (message) => {
    process.stderr.write(`${message}\n${usage()}`);
    return Promise.resolve(2);
  };
  for (let i = 0; i < args.length; i += 1) {
    const option = optionValue(args, i);
    if (args[i] === "--input") {
      if (option.error !== undefined) return usageError(option.error);
      inputs.push(...option.value.split(","));
      i += 1;
    } else if (args[i] === "--output") {
      if (option.error !== undefined) return usageError(option.error);
      output = resolveOutput(option.value);
      i += 1;
    } else if (args[i] === "--markdown") {
      if (option.error !== undefined) return usageError(option.error);
      markdown = resolveOutput(option.value);
      i += 1;
    } else if (args[i] === "--k") {
      if (option.error !== undefined) return usageError(option.error);
      const parsed = parseIntegerOption(option.value, 1);
      if (parsed.error !== undefined) return usageError(`invalid --k: ${parsed.error}`);
      if (parsed.value < DEFAULT_K_MINIMUM) {
        return usageError(`invalid --k: ${parsed.value} (AID-463 §3.0 requires k ≥ ${DEFAULT_K_MINIMUM} from day 1)`);
      }
      k = parsed.value;
      i += 1;
    } else if (args[i] === "--grace-days") {
      if (option.error !== undefined) return usageError(option.error);
      const parsed = parseIntegerOption(option.value, 1);
      if (parsed.error !== undefined) return usageError(`invalid --grace-days: ${parsed.error}`);
      graceDays = parsed.value;
      i += 1;
    } else if (args[i] === "--windows") {
      if (option.error !== undefined) return usageError(option.error);
      const parsedWindows = [];
      for (const raw of option.value.split(",")) {
        const parsed = parseIntegerOption(raw, 1);
        if (parsed.error !== undefined) return usageError(`invalid --windows entry: ${parsed.error}`);
        parsedWindows.push(parsed.value);
      }
      windows = parsedWindows;
      i += 1;
    } else if (args[i] === "--now") {
      if (option.error !== undefined) return usageError(option.error);
      const parsed = new Date(option.value);
      if (Number.isNaN(parsed.getTime())) {
        return usageError(`invalid --now: expected a valid ISO-8601 datetime, got: ${option.value}`);
      }
      now = parsed;
      i += 1;
    } else if (args[i] === "--help") {
      process.stdout.write(usage());
      return Promise.resolve(0);
    } else {
      process.stderr.write(`unknown argument: ${args[i]}\n${usage()}`);
      return Promise.resolve(2);
    }
  }
  return runAggregation({ inputs, k, windows, graceDays, now }).then(async ({ report, markdown: rendered, exitCode }) => {
    if (exitCode !== 0) {
      process.stderr.write(`${report.error}\n`);
      return exitCode;
    }
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (output !== null) {
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
    }
    if (markdown !== null) {
      await mkdir(dirname(markdown), { recursive: true });
      await writeFile(markdown, rendered);
    }
    return 0;
  });
}

function usage() {
  return [
    "usage: node learner/gate/analytics/aggregate_funnel.mjs --input <dir|file.ndjson>[,...]",
    "  [--output report.json] [--markdown report.md] [--k 5] [--windows 1,7,21]",
    "  [--grace-days 2] [--now ISO8601]",
    "emits the k-anonymized D+1/D+7/D+21 retention funnel; identifiers are never published",
    "fail-closed: --k/grace-days/windows must be integers (--k ≥ 5 per AID-463 §3.0);",
    "  a missing option value or invalid number exits 2 without aggregating",
    "exit codes: 0 ok · 2 usage/IO error",
    "",
  ].join("\n");
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("aggregate_funnel.mjs")) {
  aggregateCli(process.argv).then((code) => {
    process.exitCode = code;
  });
}

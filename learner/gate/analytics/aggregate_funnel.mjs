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
import { validateAnalyticsEvent } from "../netlify-functions/dojo-analytics-collector.mjs";
import {
  collectInputFiles,
  optionValue,
  parseIntegerOption,
  readNdjsonEntries,
  resolveOutput,
} from "./ndjson_input.mjs";

export const REPORT_VERSION = 2;
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
  let rejectedEvents = 0;
  let parseErrors = 0;
  for (const entry of entries) {
    if (entry.parseError !== undefined) {
      parseErrors += 1;
    } else if (validateAnalyticsEvent(entry.value)) {
      accepted.push(entry.value);
    } else {
      rejectedEvents += 1;
    }
  }
  accepted.sort((a, b) => eventTime(a) - eventTime(b) || a.sequence - b.sequence);

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
  };
}

function firstTimeOf(installation, stageName) {
  return installation.stageTimes.get(stageName);
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

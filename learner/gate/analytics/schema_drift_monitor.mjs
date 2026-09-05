// Schema-drift monitor for the OS analytics collector (AID-473 F2).
//
// The closed vocabularies are canonical in
// engines/codexdojo-os-prototype/src/analytics/events.ts (emission side) and
// projected into the staged collector (receiving side); the vitest parity test
// src/analytics/collectorParity.test.ts fails CI when those two diverge. This
// monitor imports the parity-locked projection from the collector module, so
// "received envelope vs closed vocabulary" here is transitively locked to
// events.ts, and additionally validates the fixtures directly against the TS
// side via src/analytics/fixtureSchemaDrift.test.ts.
//
// It classifies every drifted line with a reason (kind + offending key/value
// preview), exits 1 on any drift so CI fails high, and cross-checks its own
// verdict against the collector's validateAnalyticsEvent on every single line:
// a disagreement is itself reported as drift (kind "monitor-bug") and never
// silently accepted.
//
// Boundary: analytics is not evidence; this tool never writes learner state.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  CONTEXT_KEYS,
  CONTEXT_VOCABULARIES,
  EVENT_VOCABULARIES,
  validateAnalyticsEvent,
} from "../netlify-functions/dojo-analytics-collector.mjs";
import {
  collectInputFiles,
  optionValue,
  parseIntegerOption,
  readNdjsonEntries,
  resolveOutput,
} from "./ndjson_input.mjs";

export const MONITOR_VERSION = 1;
export const DEFAULT_MAX_SAMPLES = 50;
const PREVIEW_LIMIT = 64;
const ENVELOPE_KEYS = ["schemaVersion", "eventId", "name", "occurredAt", "sequence", "dimensions"];
const ENRICHED_KEYS = ["installationId", "sessionId", ...CONTEXT_KEYS];
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function preview(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const bounded = text === undefined ? String(value) : text;
  return bounded.length > PREVIEW_LIMIT ? `${bounded.slice(0, PREVIEW_LIMIT)}…` : bounded;
}

function firstDifference(actual, allowed) {
  const allowedKeys = new Set(allowed);
  for (const key of Object.keys(actual)) {
    if (!allowedKeys.has(key)) return { key, message: `unexpected key "${key}"` };
  }
  for (const key of allowed) {
    if (!(key in actual)) return { key, message: `missing key "${key}"` };
  }
  return { key: null, message: "key sets differ" };
}

function contextDrift(key, value) {
  if (typeof value !== "string" || !SAFE_IDENTIFIER.test(value)) {
    return { kind: "context-format", key, valuePreview: preview(value) };
  }
  const vocabulary = CONTEXT_VOCABULARIES[key];
  if (vocabulary !== undefined && !vocabulary.includes(value)) {
    return { kind: "context-vocabulary", key, valuePreview: preview(value) };
  }
  return null;
}

/**
 * Classify one received envelope against the closed vocabularies, mirroring
 * the collector's decision tree (order included) so the reported reason is the
 * reason the collector rejected (or would reject) the line.
 */
export function classifyEvent(value) {
  if (!isRecord(value)) return { kind: "not-an-object" };
  const envelopeKeys = Object.keys(value);
  if (envelopeKeys.some((key) => !ENVELOPE_KEYS.includes(key)) || envelopeKeys.length !== ENVELOPE_KEYS.length) {
    const diff = firstDifference(value, ENVELOPE_KEYS);
    return { kind: "envelope-keys", message: diff.message, key: diff.key };
  }
  if (value.schemaVersion !== 1) return { kind: "schema-version", valuePreview: preview(value.schemaVersion) };
  if (typeof value.eventId !== "string" || value.eventId.length === 0 || value.eventId.length > 128) {
    return { kind: "event-id", valuePreview: preview(value.eventId) };
  }
  const vocabularies = EVENT_VOCABULARIES[value.name];
  if (vocabularies === undefined) return { kind: "event-name", valuePreview: preview(value.name) };
  if (typeof value.occurredAt !== "string" || Number.isNaN(Date.parse(value.occurredAt))) {
    return { kind: "occurred-at", valuePreview: preview(value.occurredAt) };
  }
  if (!Number.isInteger(value.sequence) || Number(value.sequence) < 1) {
    return { kind: "sequence", valuePreview: preview(value.sequence) };
  }
  const dimensions = value.dimensions;
  if (!isRecord(dimensions)) return { kind: "dimensions-keys", message: "dimensions is not an object" };
  const allowed = [...ENRICHED_KEYS, ...Object.keys(vocabularies)];
  const unexpectedKey = Object.keys(dimensions).find((key) => !allowed.includes(key));
  if (unexpectedKey !== undefined) {
    return { kind: "dimensions-keys", key: unexpectedKey, message: `unexpected dimension "${unexpectedKey}"` };
  }
  if (!("installationId" in dimensions)) return { kind: "identity-missing", key: "installationId" };
  if (!("sessionId" in dimensions)) return { kind: "identity-missing", key: "sessionId" };
  for (const entryValue of Object.values(dimensions)) {
    const scalarOk =
      typeof entryValue === "boolean" ||
      (typeof entryValue === "number" && Number.isFinite(entryValue)) ||
      (typeof entryValue === "string" && entryValue.length > 0 && entryValue.length <= 128);
    if (!scalarOk) return { kind: "dimension-scalar", valuePreview: preview(entryValue) };
  }
  for (const idKey of ["installationId", "sessionId"]) {
    if (typeof dimensions[idKey] !== "string" || !SAFE_IDENTIFIER.test(dimensions[idKey])) {
      return { kind: "identity-format", key: idKey, valuePreview: preview(dimensions[idKey]) };
    }
  }
  for (const key of CONTEXT_KEYS) {
    if (!(key in dimensions)) continue;
    const drift = contextDrift(key, dimensions[key]);
    if (drift !== null) return drift;
  }
  for (const [key, entryValue] of Object.entries(dimensions)) {
    const vocabulary = vocabularies[key];
    if (vocabulary !== undefined && !vocabulary.includes(entryValue)) {
      return { kind: "event-vocabulary", key, valuePreview: preview(entryValue) };
    }
  }
  return null;
}

/**
 * Run the monitor over NDJSON inputs.
 * @returns {{summary: object, exitCode: number}} exit 0 = no drift, 1 = drift
 *   (including monitor self-check disagreements), 2 = usage/IO error.
 */
export async function runMonitor({ inputs, now = new Date(), maxSamples = DEFAULT_MAX_SAMPLES }) {
  // Fail-closed maxSamples (AID-492, D1 class): a NaN silently records zero
  // drift samples — losing the file:line evidence — so it is a usage error.
  if (!Number.isInteger(maxSamples) || maxSamples < 0) {
    return { summary: { error: `maxSamples must be an integer ≥ 0, got: ${maxSamples}` }, exitCode: 2 };
  }
  let entries;
  let perFile;
  try {
    const inputFiles = await collectInputFiles(inputs);
    const read = await readNdjsonEntries(inputFiles);
    entries = read.entries;
    perFile = read.files.map((file) => ({ name: file.name, lines: file.lines, validEvents: 0, driftCount: 0 }));
  } catch (error) {
    return { summary: { error: error instanceof Error ? error.message : String(error) }, exitCode: 2 };
  }
  const fileIndex = new Map(perFile.map((file, index) => [file.name, index]));
  const driftByKind = {};
  const samples = [];
  let totalLines = 0;
  let validEvents = 0;
  let driftCount = 0;

  for (const entry of entries) {
    totalLines += 1;
    const file = perFile[fileIndex.get(entry.file)];
    let drift = null;
    if (entry.parseError !== undefined) {
      drift = { kind: entry.parseError === "blank-line" ? "blank-line" : "invalid-json", message: entry.parseError };
    } else {
      drift = classifyEvent(entry.value);
      // Self-check: the classifier must agree with the collector on every line.
      if ((drift === null) !== validateAnalyticsEvent(entry.value)) {
        drift = { kind: "monitor-bug", message: "classifier disagrees with validateAnalyticsEvent" };
      }
    }
    if (drift === null) {
      validEvents += 1;
      file.validEvents += 1;
      continue;
    }
    driftCount += 1;
    file.driftCount += 1;
    driftByKind[drift.kind] = (driftByKind[drift.kind] ?? 0) + 1;
    if (samples.length < maxSamples) {
      const sample = { file: entry.file, line: entry.line, kind: drift.kind };
      if (drift.key !== undefined) sample.key = drift.key;
      if (drift.valuePreview !== undefined) sample.valuePreview = drift.valuePreview;
      if (drift.message !== undefined && drift.message !== "") sample.message = drift.message;
      samples.push(sample);
    }
  }

  const summary = {
    monitorVersion: MONITOR_VERSION,
    generatedAt: now.toISOString(),
    files: perFile,
    totalLines,
    validEvents,
    driftCount,
    driftByKind,
    samples,
  };
  return { summary, exitCode: driftCount > 0 ? 1 : 0 };
}

export function monitorCli(argv, { now = new Date() } = {}) {
  const args = argv.slice(2);
  const inputs = [];
  let output = null;
  let maxSamples = DEFAULT_MAX_SAMPLES;
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
    } else if (args[i] === "--max-samples") {
      if (option.error !== undefined) return usageError(option.error);
      const parsed = parseIntegerOption(option.value, 0);
      if (parsed.error !== undefined) return usageError(`invalid --max-samples: ${parsed.error}`);
      maxSamples = parsed.value;
      i += 1;
    } else if (args[i] === "--help") {
      process.stdout.write(usage());
      return Promise.resolve(0);
    } else {
      process.stderr.write(`unknown argument: ${args[i]}\n${usage()}`);
      return Promise.resolve(2);
    }
  }
  return runMonitor({ inputs, now, maxSamples }).then(async ({ summary, exitCode }) => {
    const serialized = `${JSON.stringify(summary, null, 2)}\n`;
    if (output !== null) {
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, serialized);
      process.stdout.write(
        `schema drift monitor: ${summary.driftCount} drift(s) across ${summary.totalLines} line(s); summary written to ${output}\n`,
      );
    } else {
      process.stdout.write(serialized);
    }
    if (exitCode === 1) {
      process.stderr.write(`schema drift detected: ${summary.driftCount} line(s) diverge from the closed vocabulary\n`);
    }
    return exitCode;
  });
}

function usage() {
  return [
    "usage: node learner/gate/analytics/schema_drift_monitor.mjs --input <dir|file.ndjson>[,...]",
    "  [--output summary.json] [--max-samples N]",
    "fail-closed: --max-samples must be an integer ≥ 0; a missing option value exits 2",
    "exit codes: 0 clean · 1 drift detected · 2 usage/IO error",
    "",
  ].join("\n");
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("schema_drift_monitor.mjs")) {
  monitorCli(process.argv).then((code) => {
    process.exitCode = code;
  });
}

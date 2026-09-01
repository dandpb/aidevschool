import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  classifyEvent,
  monitorCli,
  runMonitor,
} from "../analytics/schema_drift_monitor.mjs";
import { validateAnalyticsEvent } from "../netlify-functions/dojo-analytics-collector.mjs";

// AID-473 F2 (branch-prep under AID-487): the schema-drift monitor fails high
// (exit 1) the moment a received envelope diverges from the closed vocabularies
// canonical in engines/codexdojo-os-prototype/src/analytics/events.ts. The
// vocabularies are imported from the parity-locked collector projection
// (collectorParity.test.ts fails CI on events.ts drift), and the monitor
// cross-checks its own classifier against validateAnalyticsEvent on every
// line — a disagreement surfaces as kind "monitor-bug", never as silence.

const FIXTURES = join(import.meta.dirname, "fixtures/analytics");
const NOW = new Date("2026-09-18T00:00:00.000Z");

const VALID_EVENT = {
  schemaVersion: 1,
  eventId: "event-1",
  name: "mission.started",
  occurredAt: "2026-08-31T12:00:00.000Z",
  sequence: 1,
  dimensions: { installationId: "installation-1", sessionId: "session-1", mode: "initial" },
};

test("clean synthetic fixture passes with zero drift (exit 0)", async () => {
  const { summary, exitCode } = await runMonitor({ inputs: [join(FIXTURES, "synthetic")], now: NOW });
  assert.equal(exitCode, 0);
  assert.equal(summary.totalLines, 94);
  assert.equal(summary.validEvents, 94);
  assert.equal(summary.driftCount, 0);
  assert.deepEqual(summary.driftByKind, {});
});

test("drift fixture fails high with every divergence kind classified", async () => {
  const { summary, exitCode } = await runMonitor({ inputs: [join(FIXTURES, "drift")], now: NOW });
  assert.equal(exitCode, 1);
  assert.equal(summary.totalLines, 12);
  assert.equal(summary.validEvents, 1);
  assert.equal(summary.driftCount, 11);
  // No monitor-bug: the classifier agreed with the collector everywhere.
  assert.equal(summary.driftByKind["monitor-bug"], undefined);
  assert.deepEqual(summary.driftByKind, {
    "event-name": 1,
    "dimensions-keys": 1,
    "event-vocabulary": 1,
    "identity-missing": 1,
    "occurred-at": 1,
    sequence: 1,
    "invalid-json": 1,
    "envelope-keys": 1,
    "context-vocabulary": 1,
    "schema-version": 1,
    "identity-format": 1,
  });
  // Samples stay line-addressable and bounded.
  const sample = summary.samples[0];
  assert.equal(sample.file, "events-2026-08-05.ndjson");
  assert.equal(sample.line, 2);
  assert.equal(sample.kind, "event-name");
  assert.equal(sample.valuePreview, "mission.abandoned");
});

test("classifyEvent mirrors the collector verdict on the rejection tree", () => {
  assert.equal(classifyEvent(VALID_EVENT), null);
  assert.equal(validateAnalyticsEvent(VALID_EVENT), true);
  const mutations = [
    ["schema-version", { ...VALID_EVENT, schemaVersion: 2 }],
    ["event-id", { ...VALID_EVENT, eventId: "" }],
    ["event-name", { ...VALID_EVENT, name: "lesson_completed" }],
    ["occurred-at", { ...VALID_EVENT, occurredAt: "yesterday" }],
    ["sequence", { ...VALID_EVENT, sequence: 0 }],
    ["dimensions-keys", { ...VALID_EVENT, dimensions: { ...VALID_EVENT.dimensions, unknownKey: "x" } }],
    ["identity-missing", { ...VALID_EVENT, dimensions: { installationId: "installation-1" } }],
    ["identity-format", { ...VALID_EVENT, dimensions: { ...VALID_EVENT.dimensions, sessionId: "session 1" } }],
    ["context-vocabulary", { ...VALID_EVENT, dimensions: { ...VALID_EVENT.dimensions, trackId: "third-track" } }],
    ["event-vocabulary", { ...VALID_EVENT, dimensions: { ...VALID_EVENT.dimensions, mode: "hardcore" } }],
    ["not-an-object", "nope"],
    ["envelope-keys", { ...VALID_EVENT, source: "literacydojo" }],
  ];
  for (const [expectedKind, mutation] of mutations) {
    const drift = classifyEvent(mutation);
    assert.notEqual(drift, null, expectedKind);
    assert.equal(drift.kind, expectedKind);
    assert.equal(validateAnalyticsEvent(mutation), false, expectedKind);
  }
});

test("usage and IO errors exit 2 without throwing", async () => {
  const missing = await runMonitor({ inputs: [join(tmpdir(), "aid-473-f2-missing")], now: NOW });
  assert.equal(missing.exitCode, 2);
  assert.equal(await monitorCli(["node", "schema_drift_monitor.mjs"]), 2);
  assert.equal(await monitorCli(["node", "schema_drift_monitor.mjs", "--bogus"]), 2);
});

// AID-492 (QA AID-489 D2 + the D1 fail-open class in this CLI): a trailing
// option used to crash with `TypeError: Cannot read properties of undefined`
// (exit 1), and `--max-samples abc` became NaN, silently recording zero drift
// samples. Both are usage errors now: message + exit 2, no crash, no run.
test("cli fails closed on missing values and invalid --max-samples: exit 2 (QA AID-489 D2 + D1 class)", async () => {
  for (const flag of ["--input", "--output", "--max-samples"]) {
    assert.equal(await monitorCli(["node", "schema_drift_monitor.mjs", flag]), 2, flag);
  }
  const invalid = await monitorCli(
    ["node", "schema_drift_monitor.mjs", "--input", join(FIXTURES, "synthetic"), "--max-samples", "abc"],
    { now: NOW },
  );
  assert.equal(invalid, 2);
  assert.equal(
    await monitorCli(
      ["node", "schema_drift_monitor.mjs", "--input", join(FIXTURES, "synthetic"), "--max-samples", "-1"],
      { now: NOW },
    ),
    2,
  );
  // The library boundary rejects a NaN maxSamples instead of losing samples.
  const refused = await runMonitor({ inputs: [join(FIXTURES, "synthetic")], now: NOW, maxSamples: Number("abc") });
  assert.equal(refused.exitCode, 2);
  assert.match(refused.summary.error, /maxSamples must be an integer ≥ 0/);
  // Well-formed edge: zero samples is a legitimate request and still runs clean.
  const dir = await mkdtemp(join(tmpdir(), "aid-492-monitor-"));
  assert.equal(
    await monitorCli(
      ["node", "schema_drift_monitor.mjs", "--input", join(FIXTURES, "synthetic"), "--max-samples", "0", "--output", join(dir, "s.json")],
      { now: NOW },
    ),
    0,
  );
});

test("cli writes the summary to --output and bounds samples", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aid-473-f2-monitor-"));
  const output = join(dir, "summary.json");
  const code = await monitorCli(
    ["node", "schema_drift_monitor.mjs", "--input", join(FIXTURES, "drift"), "--output", output, "--max-samples", "2"],
    { now: NOW },
  );
  assert.equal(code, 1);
  const summary = JSON.parse(await readFile(output, "utf8"));
  assert.equal(summary.samples.length, 2);
  assert.equal(summary.driftCount, 11);
});

test("blank interior lines are drift, a trailing newline is not", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aid-473-f2-blank-"));
  const good = JSON.stringify(VALID_EVENT);
  await writeFile(join(dir, "events-2026-08-05.ndjson"), `${good}\n\n${good}\n`);
  const { summary, exitCode } = await runMonitor({ inputs: [dir], now: NOW });
  assert.equal(summary.totalLines, 3);
  assert.equal(summary.driftCount, 1);
  assert.equal(summary.driftByKind["blank-line"], 1);
  assert.equal(exitCode, 1);
});

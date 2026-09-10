import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runMonitor } from "../analytics/schema_drift_monitor.mjs";
import { validateLiteracyEvent } from "../netlify-functions/dojo-analytics-collector.mjs";

// F2 v4: o monitor aceita o vocabulário estendido (eventos de exposição nos 2
// envelopes + prop opcional `entry`) e o espelho literacy local não diverge do
// validador do coletor (self-check monitor-bug — inclui os eventos de revisão
// AID-915, cujo espelho estava ausente e seria classificado como bug).
// Diagnóstico R5: eventId não-UUID do OS conta sem falhar; prefixo probe. aceito.

const SYNTHETIC_V4 = new URL("./fixtures/analytics/synthetic-v4", import.meta.url).pathname;

const SESSION = "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d";

function literacyLine(event, props) {
  return JSON.stringify({
    schemaVersion: 2,
    source: "literacydojo",
    event,
    eventId: "0f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
    sessionId: SESSION,
    occurredAt: "2026-09-10T12:00:00.000Z",
    contentVersion: "monitor-v4",
    props,
  });
}

test("a fixture synthetic-v4 passa limpa (vocabulário estendido aceito nos 2 envelopes)", async () => {
  const { summary, exitCode } = await runMonitor({ inputs: [SYNTHETIC_V4], now: new Date("2026-09-18T00:00:00.000Z") });
  assert.equal(exitCode, 0);
  assert.equal(summary.driftCount, 0);
  assert.equal(summary.validOsEvents, 26);
  assert.equal(summary.validLiteracyEvents, 22);
  // Diagnóstico R5: eventIds OS não-UUID contados sem falhar; 1 com prefixo probe.
  assert.equal(summary.osEventIdDiagnostics.nonUuidEventIds, 26);
  assert.equal(summary.osEventIdDiagnostics.probePrefixedEventIds, 1);
});

test("self-check parity: o espelho literacy concorda com o coletor nos eventos de revisão (AID-915) e exposição (F2)", () => {
  for (const [event, props] of [
    ["review_started", { lessonId: "l02", intervalDays: 7, stage: 2 }],
    ["review_completed", { lessonId: "l02", score: 1 }],
    ["lesson_brief_viewed", { lessonId: "l02", lessonVersion: 3 }],
    ["activity_presented", { lessonId: "l02", activityType: "choice", activityIndex: 0 }],
    ["entry_viewed", { entry: "lesson-resume" }],
    ["entry_viewed", {}],
  ]) {
    const value = JSON.parse(literacyLine(event, props));
    assert.equal(validateLiteracyEvent(value), true, event);
  }
});

test("drift literacy: entry fora do vocabulário e activityIndex negativo falham alto com motivo classificado", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "drift-v4-"));
  t.after(async () => rm(dir, { recursive: true, force: true }));
  const lines = [
    literacyLine("entry_viewed", { entry: "deep-link" }),
    literacyLine("activity_presented", { lessonId: "l02", activityType: "choice", activityIndex: -1 }),
  ];
  await writeFile(join(dir, "events-2026-09-10.ndjson"), `${lines.join("\n")}\n`);
  const { summary, exitCode } = await runMonitor({ inputs: [dir], now: new Date("2026-09-18T00:00:00.000Z") });
  assert.equal(exitCode, 1);
  assert.equal(summary.driftCount, 2);
  const kinds = summary.samples.map((sample) => sample.kind);
  assert.ok(kinds.includes("event-vocabulary"));
  assert.ok(kinds.includes("props-value"));
});

test("eventId OS com prefixo probe. é aceito (convenção nova, R5) e não é drift", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "drift-v4-"));
  t.after(async () => rm(dir, { recursive: true, force: true }));
  const line = JSON.stringify({
    schemaVersion: 1,
    eventId: "probe.qa.a1246-watchdog",
    name: "onboarding.started",
    occurredAt: "2026-09-10T12:00:00.000Z",
    sequence: 1,
    dimensions: { installationId: "installation-1", sessionId: "session-1" },
  });
  await writeFile(join(dir, "events-2026-09-10.ndjson"), `${line}\n`);
  const { summary, exitCode } = await runMonitor({ inputs: [dir], now: new Date("2026-09-18T00:00:00.000Z") });
  assert.equal(exitCode, 0);
  assert.equal(summary.driftCount, 0);
  assert.equal(summary.osEventIdDiagnostics.nonUuidEventIds, 1);
  assert.equal(summary.osEventIdDiagnostics.probePrefixedEventIds, 1);
});

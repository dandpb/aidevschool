import assert from "node:assert/strict";
import test from "node:test";
import { runMonitor } from "../analytics/schema_drift_monitor.mjs";

// Monitor de drift com o envelope surfaces v3 (AID-987/T1b): linhas anônimas
// de dojotoday/voxeldojo/pixelquest são válidas; drift em qualquer vocabulário
// falha alto. O classificador continua auto-checado contra o validador do
// coletor em TODA linha (disparidade = "monitor-bug").

const FIXTURES = new URL("./fixtures/analytics/", import.meta.url);

test("aceita envelopes surfaces v3 e conta separadamente dos envelopes v1/v2", async () => {
  const { summary, exitCode } = await runMonitor({
    inputs: [new URL("synthetic-v3/events-2026-09-14.ndjson", FIXTURES).pathname],
  });
  assert.equal(exitCode, 0, JSON.stringify(summary.samples, null, 2));
  assert.equal(summary.validEvents, 4);
  assert.equal(summary.validSurfaceEvents, 4);
  assert.equal(summary.validOsEvents, 0);
  assert.equal(summary.validLiteracyEvents, 0);
  assert.equal(summary.driftCount, 0);
  assert.equal(summary.monitorVersion >= 3, true);
});

test("drift surfaces v3 falha alto (exit 1) com motivo classificado", async () => {
  const { summary, exitCode } = await runMonitor({
    inputs: [new URL("drift-v3/events-2026-09-14.ndjson", FIXTURES).pathname],
  });
  assert.equal(exitCode, 1);
  assert.equal(summary.driftCount, 2);
  assert.ok(summary.driftByKind["props-keys"] >= 1);
  assert.ok(summary.driftByKind["source"] >= 1);
  assert.equal(summary.driftByKind["monitor-bug"], undefined);
});

test("mistura v1 + v2 + v3 no mesmo input soma os três contadores", async () => {
  const { summary, exitCode } = await runMonitor({
    inputs: [
      new URL("synthetic/events-2026-07-13.ndjson", FIXTURES).pathname,
      new URL("synthetic-v2/events-2026-09-14.ndjson", FIXTURES).pathname,
      new URL("synthetic-v3/events-2026-09-14.ndjson", FIXTURES).pathname,
    ],
  });
  assert.equal(exitCode, 0, JSON.stringify(summary.samples, null, 2));
  assert.ok(summary.validOsEvents >= 1);
  assert.ok(summary.validLiteracyEvents >= 1);
  assert.ok(summary.validSurfaceEvents >= 1);
  assert.equal(summary.driftCount, 0);
});

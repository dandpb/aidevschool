import assert from "node:assert/strict";
import test from "node:test";
import { runMonitor } from "../analytics/schema_drift_monitor.mjs";

// Monitor de drift com os dois envelopes (ativação AID-913): linhas OS v1 e
// literacy v2 são válidas; drift em qualquer um dos vocabulários falha alto.

const FIXTURES = new URL("./fixtures/analytics/", import.meta.url);

test("aceita envelopes OS v1 e literacy v2 no mesmo input e conta por envelope", async () => {
  const { summary, exitCode } = await runMonitor({
    inputs: [new URL("synthetic-v2/events-2026-09-14.ndjson", FIXTURES).pathname],
  });
  assert.equal(exitCode, 0, JSON.stringify(summary.samples, null, 2));
  assert.equal(summary.validOsEvents, 0);
  assert.equal(summary.validLiteracyEvents, 8);
  assert.equal(summary.validEvents, 8);
  assert.equal(summary.driftCount, 0);
  // AID-987/T1b: o monitor aprendeu o envelope surfaces v3 (monitorVersion 3).
  assert.equal(summary.monitorVersion, 3);
});

test("drift literacy falha alto (exit 1) com motivo classificado", async () => {
  const { summary, exitCode } = await runMonitor({
    inputs: [new URL("drift-v2/events-2026-09-14.ndjson", FIXTURES).pathname],
  });
  assert.equal(exitCode, 1);
  assert.equal(summary.driftCount, 2);
  assert.ok(summary.driftByKind["props-keys"] >= 1 || summary.driftByKind["props-value"] >= 1);
  // Sem monitor-bug: o classificador concorda com o validador do coletor.
  assert.equal(summary.driftByKind["monitor-bug"], undefined);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { aggregateFunnel, renderMarkdownReport } from "../analytics/aggregate_funnel.mjs";

// Seção literacyFunnel do relatório (ativação AID-913): funil por sessão
// anônima efêmera, k-suppressão imutável, dedup por eventId do envelope v2.

const FIXTURE = new URL("./fixtures/analytics/synthetic/events-2026-09-14.ndjson", import.meta.url);

async function literacyEntries() {
  const raw = await readFile(FIXTURE, "utf8");
  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => ({ value: JSON.parse(line) }));
}

test("literacyFunnel agrega por sessão com dedup e alcance ordenado", async () => {
  const entries = await literacyEntries();
  const report = aggregateFunnel(entries, { k: 1 });
  const literacy = report.literacyFunnel;
  assert.equal(report.reportVersion, 3);
  assert.equal(literacy.envelope, "literacydojo v2");
  assert.equal(literacy.totalEvents, 8);
  assert.equal(literacy.totalSessions, 3);
  // Alcance ordenado: 3 sessões viram entry; só 1 chegou a tentar/concluir.
  assert.equal(literacy.overall.suppressed, undefined);
  assert.deepEqual(literacy.overall.counts, [3, 2, 1, 1]);
  // l01: 2 sessões iniciaram, 1 concluiu.
  assert.deepEqual(literacy.lessonCompletion.l01, { n: 2, completed: 1, completionRate: 0.5 });
  // 2 tentativas, 1 passou, 1 sessão com retry (2 tentativas na mesma lição).
  assert.deepEqual(literacy.attempts, { n: 1, submitted: 2, passed: 1, retrySessions: 1 });
  // Semana ISO da fixture: 2026-W38 (14–15/sep).
  assert.ok(literacy.byWeek["2026-W38"]);
});

test("k-suppressão: células com n<k mostram só o n", async () => {
  const entries = await literacyEntries();
  const report = aggregateFunnel(entries, { k: 5 });
  const literacy = report.literacyFunnel;
  assert.equal(literacy.overall.suppressed, true);
  assert.equal(literacy.overall.n, 3);
  assert.equal(literacy.lessonCompletion.l01.suppressed, true);
  assert.equal(literacy.attempts.suppressed, true);
  // OS: nenhum evento OS na fixture; fonte continua contando só o envelope OS.
  assert.equal(report.source.totalEvents, 0);
});

test("markdown renderiza a seção literacy sem identificadores", async () => {
  const entries = await literacyEntries();
  const report = aggregateFunnel(entries, { k: 1 });
  const markdown = renderMarkdownReport(report);
  assert.ok(markdown.includes("Literacy funnel"));
  assert.ok(markdown.includes("2026-W38"));
  assert.ok(!markdown.includes("b3d1a2c4"));
  assert.ok(!markdown.includes("sessionId"));
});

// E2E probe da ativação AID-913 (evidência de countersign QA).
//
// Percorre o pipeline completo em um único processo Node, sem rede:
//   1. coletor same-origin (handler real) aceitando batches OS v1 + literacy v2;
//   2. export GET autenticado por Bearer token produzindo NDJSON bruto;
//   3. schema_drift_monitor sobre o NDJSON exportado (exit 0 = sem drift);
//   4. aggregate_funnel produzindo o relatório com a seção literacyFunnel.
//
// Uso:  node learner/gate/analytics/probe_collector_export.mjs
// Exit: 0 = pipeline íntegro · 1 = asserção falhou (pare e reporte).

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCollectorHandler } from "../netlify-functions/dojo-analytics-collector.mjs";
import { runMonitor } from "./schema_drift_monitor.mjs";
import { runAggregation } from "./aggregate_funnel.mjs";

const NOW = new Date("2026-09-14T12:00:00.000Z");
const DAY = NOW.toISOString().slice(0, 10);
const TOKEN = "probe-export-token";
const PATH = "/__dojo/bridge/v1/analytics";

const UUID_SESSION = "b3d1a2c4-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const UUID_EVENT = "0f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b";

let failed = false;

function ok(condition, label) {
  if (!condition) {
    failed = true;
    console.error(`probe: FALHOU — ${label}`);
    return false;
  }
  console.log(`probe: ok — ${label}`);
  return true;
}

function literacyEvent(overrides = {}) {
  return {
    schemaVersion: 2,
    source: "literacydojo",
    event: "lesson_started",
    eventId: UUID_EVENT,
    sessionId: UUID_SESSION,
    occurredAt: NOW.toISOString(),
    contentVersion: "probe-v2",
    props: { lessonId: "l01", lessonVersion: 2 },
    ...overrides,
  };
}

function osBatch() {
  return {
    schemaVersion: 1,
    events: [
      {
        schemaVersion: 1,
        eventId: "probe-os-1",
        name: "onboarding.started",
        occurredAt: NOW.toISOString(),
        sequence: 1,
        dimensions: { installationId: "probe-install-1", sessionId: "probe-sess-1" },
      },
    ],
  };
}

function post(handler, body) {
  return handler(
    new Request(`https://site.example${PATH}`, {
      method: "POST",
      headers: { "sec-fetch-site": "same-origin" },
      body: JSON.stringify(body),
    }),
  );
}

const dir = await mkdtemp(join(tmpdir(), "aid913-probe-"));
try {
  // 1. Coletor: OS v1 + literacy v2 (+ corrida beacon/fetch simulada com o
  //    mesmo eventId, e um evento inválido que deve ser recusado).
  const backing = new (await import("../netlify-functions/dojo-analytics-collector.mjs"))
    .NdjsonFileSink({ baseDir: join(dir, "backing") });
  const handler = createCollectorHandler({ backing, exportToken: TOKEN, now: NOW });

  const osResponse = await post(handler, osBatch());
  ok(osResponse.status === 202, "batch OS v1 aceito (202)");
  ok((await osResponse.json()).acceptedEventIds.length === 1, "1 evento OS aceito");

  const literacyBatch = {
    schemaVersion: 2,
    source: "literacydojo",
    events: [
      literacyEvent({ event: "entry_viewed", props: {} }),
      literacyEvent({ eventId: "1f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b", event: "activity_attempted", props: { lessonId: "l01", activityType: "choice", passed: true } }),
      literacyEvent({ eventId: "2f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b", event: "lesson_completed", props: { lessonId: "l01", lessonVersion: 2, score: 1 } }),
      literacyEvent({ sessionId: "not-a-uuid" }),
    ],
  };
  const literacyResponse = await post(handler, literacyBatch);
  ok(literacyResponse.status === 202, "batch literacy v2 aceito (202)");
  const literacyIds = (await literacyResponse.json()).acceptedEventIds;
  ok(literacyIds.length === 3, "3 eventos literacy aceitos; inválido recusado na recepção");

  // Duplicata (mesmo eventId) em segundo POST — dedupe é do agregador, mas a
  // escrita no backing precisa ser determinística.
  await post(handler, { schemaVersion: 2, source: "literacydojo", events: [literacyBatch.events[0]] });

  // 2. Export autenticado → NDJSON.
  const exportResponse = await handler(
    new Request(`https://site.example${PATH}?from=${DAY}&to=${DAY}`, {
      method: "GET",
      headers: { authorization: `Bearer ${TOKEN}` },
    }),
  );
  ok(exportResponse.status === 200, "export GET 200 com Bearer token");
  const ndjson = await exportResponse.text();
  const exportedLines = ndjson.trim().split("\n");
  ok(exportedLines.length === 5, `NDJSON exportado com 5 linhas (OS 1 + literacy 4, incluindo a duplicata) — ${exportedLines.length}`);

  const ndjsonPath = join(dir, "export.ndjson");
  await writeFile(ndjsonPath, ndjson);

  // 3. Drift monitor sobre o NDJSON exportado.
  const monitor = await runMonitor({ inputs: [ndjsonPath], now: NOW });
  ok(monitor.exitCode === 0, `schema drift monitor exit 0 (${monitor.summary.validEvents} eventos válidos)`);
  ok(monitor.summary.validOsEvents === 1 && monitor.summary.validLiteracyEvents === 4,
    `contagem por envelope: OS ${monitor.summary.validOsEvents} + literacy ${monitor.summary.validLiteracyEvents} (duplicata incluída, dedupe é do agregador)`);

  // 4. Agregação com seção literacyFunnel (k mínimo de política).
  const aggregation = await runAggregation({ inputs: [ndjsonPath], k: 5, now: NOW });
  ok(aggregation.exitCode === 0, "aggregate_funnel exit 0");
  const report = aggregation.report;
  ok(report.reportVersion === 3, "reportVersion 3");
  ok(report.literacyFunnel.totalEvents === 3 && report.literacyFunnel.duplicateEvents === 1,
    "agregador deduplica por eventId (3 eventos pós-dedup, 1 linha removida)");
  ok(report.literacyFunnel.totalSessions === 1, "literacyFunnel enxerga a sessão anônima");
  ok(report.literacyFunnel.overall.n < 5 && report.literacyFunnel.overall.suppressed === true,
    "k≥5: célula abaixo do mínimo é suprimida (só o n é exposto)");
  ok(!ndjson.includes(UUID_SESSION) === false, "NDJSON bruto carrega a sessão (anônima, efêmera) para o operador");
  ok(!aggregation.markdown.includes(UUID_SESSION), "relatório publicado nunca contém identificador");
  if (failed) {
    console.error("\nprobe: pipeline com falhas (verifique os FALHOU acima).");
    process.exitCode = 1;
  } else {
    console.log("\nprobe: pipeline íntegro (coleta → export → drift → agregação).");
  }
} finally {
  await rm(dir, { recursive: true, force: true }).catch(() => undefined);
}

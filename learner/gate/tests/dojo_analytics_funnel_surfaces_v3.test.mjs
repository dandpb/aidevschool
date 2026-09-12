import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  aggregateFunnel,
  renderMarkdownReport,
} from "../analytics/aggregate_funnel.mjs";
import { collectInputFiles, readNdjsonEntries } from "../analytics/ndjson_input.mjs";

// AID-1525 (arquivo NOVO — protect-tests permite criar, não editar): o
// coletor live aceita o envelope surfaces v3 (AID-987/T1b — dojoToday/
// voxelDojo/PixelQuest) desde a ativação, mas a agregação do funil contava
// essas linhas válidas como `rejectedEvents` sem agregá-las. A seção
// condicional `surfacesFunnel` publica contagens por fonte apenas quando o
// input tem v3; inputs sem v3 produzem o mesmo relatório v4 de antes, byte a
// byte (travado aqui e pelo teste byte-identical do suite principal).
// Dataset hand-computed abaixo — cada número esperado conferido à mão.

const GENERATED_AT = new Date("2026-09-18T00:00:00.000Z");
const SYNTHETIC = join(import.meta.dirname, "fixtures/analytics/synthetic");

function surfaceEvent(overrides) {
  return {
    schemaVersion: 3,
    source: "dojotoday",
    event: "daily-view-open",
    eventId: "00000000-0000-4000-8000-000000000001",
    sessionId: "10000000-0000-4000-8000-000000000001",
    occurredAt: "2026-09-14T10:00:00Z",
    props: {},
    ...overrides,
  };
}

// 8 linhas válidas v3 (7 eventos únicos após dedup mesma fonte):
//   dojotoday: 2 eventos, 2 sessões (daily-view-open ×2, sendo 1 duplicada)
//   voxeldojo: 3 eventos, 2 sessões (voxel-loop-complete ×2, evidence-handoff ×1)
//   pixelquest: 2 eventos, 1 sessão (pixelquest-encounter-complete ×2)
// O eventId "…001" aparece em dojotoday E voxeldojo — fontes distintas são
// eventos distintos (a chave durável do coletor é dia/source/eventId).
function v3Entries() {
  return [
    surfaceEvent({}),
    surfaceEvent({ eventId: "00000000-0000-4000-8000-000000000002", sessionId: "10000000-0000-4000-8000-000000000002", occurredAt: "2026-09-14T11:00:00Z" }),
    // Duplicada beacon+fetch: mesma fonte, mesmo eventId — removida no dedup.
    surfaceEvent({ eventId: "00000000-0000-4000-8000-000000000002", sessionId: "10000000-0000-4000-8000-000000000002", occurredAt: "2026-09-14T11:00:00Z" }),
    surfaceEvent({
      source: "voxeldojo", event: "voxel-loop-complete", eventId: "00000000-0000-4000-8000-000000000001",
      sessionId: "10000000-0000-4000-8000-000000000003", occurredAt: "2026-09-14T10:01:00Z",
      props: { unitId: "U2-key-value-store", result: "completed" },
    }),
    surfaceEvent({
      source: "voxeldojo", event: "voxel-loop-complete", eventId: "00000000-0000-4000-8000-000000000011",
      sessionId: "10000000-0000-4000-8000-000000000004", occurredAt: "2026-09-15T10:01:00Z",
      props: { unitId: "U3-cdn-edge-cache", result: "failed" },
    }),
    surfaceEvent({
      source: "voxeldojo", event: "evidence-handoff", eventId: "00000000-0000-4000-8000-000000000012",
      sessionId: "10000000-0000-4000-8000-000000000003", occurredAt: "2026-09-14T10:01:01Z",
      props: { unitId: "U2-key-value-store" },
    }),
    surfaceEvent({
      source: "pixelquest", event: "pixelquest-encounter-complete", eventId: "00000000-0000-4000-8000-000000000020",
      sessionId: "10000000-0000-4000-8000-000000000005", occurredAt: "2026-09-14T10:02:00Z",
      props: { unitId: "U0-sonda-rate-limiter-robustness", result: "completed" },
    }),
    surfaceEvent({
      source: "pixelquest", event: "pixelquest-encounter-complete", eventId: "00000000-0000-4000-8000-000000000021",
      sessionId: "10000000-0000-4000-8000-000000000005", occurredAt: "2026-09-14T10:05:00Z",
      props: { unitId: "U1-load-balancer", result: "completed" },
    }),
  ].map((value) => ({ value }));
}

test("surfacesFunnel agrega o envelope v3 por fonte com dedup source/eventId", () => {
  const report = aggregateFunnel(v3Entries(), { now: GENERATED_AT });
  assert.equal(report.reportVersion, 4); // seção condicional dentro do contrato v4
  // Válidos v3 não são mais contados como rejeitados.
  assert.equal(report.source.rejectedEvents, 0);
  assert.equal(report.source.parseErrors, 0);
  // OS/literacy não têm eventos neste input.
  assert.equal(report.source.totalEvents, 0);
  assert.equal(report.literacyFunnel.totalEvents, 0);

  const funnel = report.surfacesFunnel;
  assert.equal(funnel.envelope, "surfaces v3 (AID-987/T1b)");
  assert.equal(funnel.totalEvents, 7);
  assert.equal(funnel.duplicateEvents, 1);
  assert.deepEqual(funnel.sources.dojotoday, {
    totalEvents: 2, sessions: 2, events: { "daily-view-open": 2 },
  });
  assert.deepEqual(funnel.sources.voxeldojo, {
    totalEvents: 3, sessions: 2,
    events: { "evidence-handoff": 1, "voxel-loop-complete": 2 },
  });
  assert.deepEqual(funnel.sources.pixelquest, {
    totalEvents: 2, sessions: 1, events: { "pixelquest-encounter-complete": 2 },
  });
});

test("sessões surfaces são contadas, nunca publicadas — nem sessionId nem eventId", () => {
  const report = aggregateFunnel(v3Entries(), { now: GENERATED_AT });
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes("00000000-0000-4000-8000"), false, "report leaks surfaces eventId");
  assert.equal(serialized.includes("10000000-0000-4000-8000"), false, "report leaks surfaces sessionId");
});

test("input sem v3 mantém o relatório v4 idêntico: chave surfacesFunnel omitida", async () => {
  // O fixture sintético comprometido (example report) não tem eventos v3 —
  // a seção condicional NÃO materializa e o relatório regenerado continua
  // byte-identical ao artefato comprometido (o suite principal trava isso;
  // aqui travamos a presença/ausência da chave e do markdown).
  const files = await collectInputFiles([SYNTHETIC]);
  const { entries } = await readNdjsonEntries(files);
  const report = aggregateFunnel(entries, { now: GENERATED_AT });
  assert.equal(report.surfacesFunnel, undefined);
  const markdown = renderMarkdownReport(report);
  assert.equal(markdown.includes("Surfaces funnel"), false);

  // Também sem nenhum evento:
  const empty = aggregateFunnel([], { now: GENERATED_AT });
  assert.equal(empty.surfacesFunnel, undefined);
  assert.equal(renderMarkdownReport(empty).includes("Surfaces funnel"), false);

  // O example report comprometido segue sem a seção (guarda de estabilidade).
  const committed = await readFile(
    new URL("./fixtures/analytics/example-funnel-report.json", import.meta.url),
    "utf8",
  );
  assert.equal(committed.includes("surfacesFunnel"), false);
});

test("seções v3/v4 permanecem idênticas com e sem linhas v3 no mesmo input (aditivo)", () => {
  const osEvent = {
    schemaVersion: 1, eventId: "os-evt-1", name: "onboarding.started", occurredAt: "2026-09-14T09:00:00Z",
    sequence: 1, dimensions: { installationId: "install-v5a", sessionId: "sess-v5a" },
  };
  const literacyEvent = {
    schemaVersion: 2, source: "literacydojo", event: "entry_viewed", eventId: "0aaaaaaa-0000-4000-8000-000000000001",
    sessionId: "0bbbbbbb-0000-4000-8000-000000000001", occurredAt: "2026-09-14T09:30:00Z",
    contentVersion: "v1", props: { entry: "home" },
  };
  const base = [osEvent, literacyEvent].map((value) => ({ value }));
  const withoutV3 = aggregateFunnel(base, { now: GENERATED_AT });
  const withV3 = aggregateFunnel([...base, ...v3Entries()], { now: GENERATED_AT });

  assert.equal(withoutV3.reportVersion, 4);
  assert.equal(withoutV3.surfacesFunnel, undefined);
  assert.equal(withV3.source.totalEvents, withoutV3.source.totalEvents);
  assert.equal(withV3.source.duplicateEvents, withoutV3.source.duplicateEvents);
  assert.equal(withV3.source.rejectedEvents, 0);
  assert.deepEqual(withV3.activationFunnel, withoutV3.activationFunnel);
  assert.deepEqual(withV3.retention, withoutV3.retention);
  assert.deepEqual(withV3.literacyFunnel, withoutV3.literacyFunnel);
  assert.deepEqual(withV3.activationDetail, withoutV3.activationDetail);
  assert.deepEqual(withV3.briefExposure, withoutV3.briefExposure);
  assert.deepEqual(withV3.probeClassification, withoutV3.probeClassification);
  // A seção nova enxerga apenas o envelope v3.
  assert.equal(withV3.surfacesFunnel.totalEvents, 7);
});

test("markdown publica a seção surfaces quando há v3 no input", () => {
  const markdown = renderMarkdownReport(aggregateFunnel(v3Entries(), { now: GENERATED_AT }));
  assert.match(markdown, /## Surfaces funnel \(envelope surfaces v3 — dojoToday · voxelDojo · PixelQuest, AID-987\/T1b\)/);
  assert.match(markdown, /\| dojotoday \| 2 \| 2 \| daily-view-open×2 \|/);
  assert.match(markdown, /\| voxeldojo \| 3 \| 2 \| evidence-handoff×1 · voxel-loop-complete×2 \|/);
  assert.match(markdown, /\| pixelquest \| 2 \| 1 \| pixelquest-encounter-complete×2 \|/);
});

test("linha v3 inválida continua rejeitada (fail-closed do vocabulário)", () => {
  const invalid = [
    // Evento fora do vocabulário fechado v3.
    surfaceEvent({ event: "totally-made-up-event" }),
    // Prop fora do vocabulário do evento.
    surfaceEvent({ props: { unitId: "U2-key-value-store" } }),
  ].map((value) => ({ value }));
  const report = aggregateFunnel(invalid, { now: GENERATED_AT });
  assert.equal(report.source.rejectedEvents, 2);
  assert.equal(report.surfacesFunnel, undefined);
});

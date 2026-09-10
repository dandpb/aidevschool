import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DWELL_BINS,
  aggregateFunnel,
  dwellBinLabel,
  probeMarkerFor,
  renderMarkdownReport,
} from "../analytics/aggregate_funnel.mjs";

// F2 v4 (spec AID-1218 R3–R5): seções NOVAS activationDetail/briefExposure/
// probeClassification + glossário binding. As seções v3 permanecem com
// definição e números idênticos para o mesmo input (R7d — travado pelo teste
// byte-identical do example report na suíte principal).

const FIXTURE = new URL("./fixtures/analytics/synthetic-v4/events-2026-09-16.ndjson", import.meta.url);

async function v4Entries() {
  const raw = await readFile(FIXTURE, "utf8");
  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => ({ value: JSON.parse(line) }));
}

test("activationDetail segmenta sessões OS first-visit × returning com alcance in-sessão", async () => {
  const report = aggregateFunnel(await v4Entries(), { k: 1 });
  assert.equal(report.reportVersion, 4);
  const overall = report.activationDetail.osSessions.overall;
  // 7 sessões OS: 4 first-visit (2 métricas + 2 sondas onboarding.started) e
  // 3 returning (journey.returned). Sondas permanecem nas seções (R7d).
  assert.equal(overall.n, 7);
  assert.equal(overall.firstVisit.sessions, 4);
  // Só as 2 sessões métricas completam onboarding (as 2 sondas emitem apenas
  // onboarding.started) — as sondas permanecem nas seções v3/v4 (R7d).
  assert.equal(overall.firstVisit.onboardingCompleted, 2);
  assert.equal(overall.firstVisit.missionStarted, 2);
  assert.equal(overall.firstVisit.missionCompleted, 2);
  assert.equal(overall.returning.sessions, 3);
  assert.equal(overall.returning.missionStarted, 3);
  assert.equal(overall.returning.missionCompleted, 0);
  assert.equal(overall.unclassified, undefined); // nenhum canário nesta fixture
});

test("activationDetail publica o split literacy da prop entry (R1), incluindo pré-v4 e canário", async () => {
  const report = aggregateFunnel(await v4Entries(), { k: 1 });
  const split = report.activationDetail.literacyEntrySplit.overall;
  assert.equal(split.n, 7); // 6 sessões métricas + 1 sonda sequencial
  assert.equal(split.byEntry.home.sessions, 2);
  assert.equal(split.byEntry["lesson-resume"].sessions, 2);
  assert.equal(split.byEntry.onboarding.sessions, 1);
  // s6 (entry sem prop) + sonda sequencial (props {}): "não instrumentado
  // (pré-v4)" — nunca 'unknown'.
  assert.equal(split.byEntry["not-instrumented-pre-v4"].sessions, 2);
  assert.equal(split.byEntry["no-entry-event"], undefined);
});

test("briefExposure literacy: segmentos R3, bins e medianas contínuas (b)/(c)", async () => {
  const report = aggregateFunnel(await v4Entries(), { k: 1 });
  const block = report.briefExposure.literacySessions;
  assert.equal(block.nSessionsWithStarted, 6);
  assert.equal(block.segments.exitedBrief, 2);
  assert.equal(block.segments.exitedFirstActivity, 2);
  assert.equal(block.segments.submittedFirst, 1);
  assert.equal(block.segments.residualNoBrief, 1);
  // (a) started→brief: todas <15s por construção (5 observados).
  assert.equal(block.dwellBins.startedToBrief.observed, 5);
  assert.equal(block.dwellBins.startedToBrief.bins["<15s"], 5);
  // (b) brief→1ª apresentação: 2× 30s (15-60s) + 1× 4min (1-5min).
  assert.equal(block.dwellBins.briefToFirstPresentation.observed, 3);
  assert.equal(block.dwellBins.briefToFirstPresentation.bins["15-60s"], 2);
  assert.equal(block.dwellBins.briefToFirstPresentation.bins["1-5min"], 1);
  // (c) apresentação→1ª submissão: 1× 6min (>5min).
  assert.equal(block.dwellBins.presentationToFirstSubmission.observed, 1);
  assert.equal(block.dwellBins.presentationToFirstSubmission.bins[">5min"], 1);
  // Medianas contínuas (b)/(c) — mediana de [30,30,240] é 30; (c) é 360.
  assert.equal(block.mediansSeconds.briefToFirstPresentation, 30);
  assert.equal(block.mediansSeconds.presentationToFirstSubmission, 360);
});

test("briefExposure hostedMissions: segmentos análogos no envelope OS (engineId=literacyDojo) com cobertura declarada", async () => {
  const report = aggregateFunnel(await v4Entries(), { k: 1 });
  const block = report.briefExposure.hostedMissions;
  assert.equal(block.nSessionsWithStarted, 5);
  assert.equal(block.segments.exitedFirstActivity, 2);
  assert.equal(block.segments.submittedFirst, 2);
  assert.equal(block.segments.residualNoBrief, 1);
  assert.equal(block.segments.exitedBrief, undefined); // zero cells omitted
  assert.ok(block.coverage.includes("voxelDojo"));
});

test("k≥5 suprime as células novas mantendo o n (declaração, não falha)", async () => {
  // k=10 (> n de cada corte da fixture) exerce a supressão sem enfraquecer o
  // piso k≥5 do tool (runAggregation continua recusando k<5).
  const report = aggregateFunnel(await v4Entries(), { k: 10 });
  assert.equal(report.activationDetail.osSessions.overall.suppressed, true);
  assert.equal(report.activationDetail.osSessions.overall.n, 7);
  assert.equal(report.briefExposure.literacySessions.nSessionsWithStarted.suppressed, true);
  assert.equal(report.briefExposure.literacySessions.nSessionsWithStarted.n, 6);
  assert.deepEqual(report.briefExposure.literacySessions.segments.exitedBrief, { suppressed: true, n: 2 });
  assert.deepEqual(report.briefExposure.literacySessions.mediansSeconds.briefToFirstPresentation, {
    suppressed: true,
    n: 3,
  });
});

test("probeClassification: marcadores determinísticos probe. + legados (diagnóstico, não remove das seções)", async () => {
  const report = aggregateFunnel(await v4Entries(), { k: 1 });
  const probes = report.probeClassification;
  assert.deepEqual(probes.markerRules, ["probe.", "aid###-", "qa-", "sequential-uuid"]);
  assert.equal(probes.counts.osEvents, 2);
  assert.equal(probes.counts.literacyEvents, 1);
  assert.equal(probes.counts.osInstallations, 2);
  assert.equal(probes.counts.literacySessions, 1);
  assert.equal(probes.counts.byMarker["probe."], 1);
  assert.equal(probes.counts.byMarker["aid###-"], 1);
  assert.equal(probes.counts.byMarker["sequential-uuid"], 1);
  // As seções continuam computadas sobre TODOS os eventos (R7d): as 2 sondas
  // onboarding.started permanecem contadas no activationDetail (n=7 acima).
});

test("glossário binding R1/R3/R4 vem no report e no markdown", async () => {
  const report = aggregateFunnel(await v4Entries(), { k: 1 });
  for (const key of [
    "entry.lesson-resume",
    "entry.absent-pre-v4",
    "briefExposure.exitedBrief",
    "briefExposure.exitedFirstActivity",
    "briefExposure.residualNoBrief",
    "briefExposure.startedToBrief",
    "o1.artifactMapping",
  ]) {
    assert.equal(typeof report.glossary[key], "string");
  }
  const markdown = renderMarkdownReport(report);
  assert.ok(markdown.includes("Glossário v4"));
  assert.ok(markdown.includes("Activation detail v4"));
  assert.ok(markdown.includes("Brief exposure v4"));
  assert.ok(markdown.includes("Probe classification v4"));
  assert.ok(markdown.includes("Pedido da Vila Lume"));
  assert.ok(markdown.includes("lesson-resume"));
});

test("o report v4 nunca publica identificadores da fixture", async () => {
  const report = aggregateFunnel(await v4Entries(), { k: 1 });
  const serialized = JSON.stringify(report);
  for (const prefix of ["installation-f2v4-", "session-f2v4-", "probe.qa.a1246", "aid000-os-", "0f960d", "evt-f2v4-"]) {
    assert.equal(serialized.includes(prefix), false, `report leaks identifier prefix: ${prefix}`);
  }
});

test("dwellBinLabel cobre os 4 bins do R3 e rejeita intervalo negativo", () => {
  assert.deepEqual(DWELL_BINS, ["<15s", "15-60s", "1-5min", ">5min"]);
  assert.equal(dwellBinLabel(14_999), "<15s");
  assert.equal(dwellBinLabel(15_000), "15-60s");
  assert.equal(dwellBinLabel(59_999), "15-60s");
  assert.equal(dwellBinLabel(60_000), "1-5min");
  assert.equal(dwellBinLabel(299_999), "1-5min");
  assert.equal(dwellBinLabel(300_000), ">5min");
  assert.equal(dwellBinLabel(-1), null);
});

test("probeMarkerFor: prefixo probe. vence pela ordem determinística da lista", () => {
  assert.equal(probeMarkerFor("probe.qa.x", "installation-1"), "probe.");
  assert.equal(probeMarkerFor("event-1", "aid960-os-smoke"), "aid###-");
  assert.equal(probeMarkerFor("event-1", "installation-1", "qa-a958-watchdog"), "qa-");
  assert.equal(probeMarkerFor("event-1", "3fa40000-0000-4000-8000-000000000001"), "sequential-uuid");
  assert.equal(probeMarkerFor("event-1", "installation-1"), null);
});

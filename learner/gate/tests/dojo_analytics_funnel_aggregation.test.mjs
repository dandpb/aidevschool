import assert from "node:assert/strict";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  aggregateCli,
  aggregateFunnel,
  isoWeekKey,
  runAggregation,
  withSourceFiles,
} from "../analytics/aggregate_funnel.mjs";
import { collectInputFiles, readNdjsonEntries } from "../analytics/ndjson_input.mjs";

// AID-473 F2 (branch-prep under AID-487): the offline aggregation turns the F1
// collector's day-rotated NDJSON into the k-anonymized D+1/D+7/D+21 retention
// funnel from AID-463 draft §2 (rev 40b963bf). The synthetic fixture encodes a
// hand-computed dataset: two publishable weekly cohorts, one cohort under the
// k threshold (suppressed), review-session returns, strict vs accumulated
// windows, and a wide-cohort-only installation. Analytics is not evidence.
//
// AID-675 F2b (spec AID-673 §2): reportVersion 2 adds eventId dedup and the
// D1/D2 cuts (trackEntrySplit, missionCompletion, activityFriction,
// verificationHealth, rendererDegraded, moduleCompletionMedian). The W37
// fixture group (install-a*/b*/c* on 2026-09-08..11) encodes the hand-computed
// new-section dataset, including two duplicated eventId lines (beacon+fetch
// race) and a dev-track mission absent from the ai-literacy catalog. Every
// expected number below was cross-checked by an independent recompute.

const FIXTURES = join(import.meta.dirname, "fixtures/analytics");
const SYNTHETIC = join(FIXTURES, "synthetic");
const GENERATED_AT = new Date("2026-09-18T00:00:00.000Z");

async function aggregateFixture(options = {}) {
  const { report } = await runAggregation({ inputs: [SYNTHETIC], now: GENERATED_AT, ...options });
  return report;
}

test("aggregates the synthetic fixture into the hand-computed funnel", async () => {
  const report = await aggregateFixture();
  assert.equal(report.reportVersion, 2);
  assert.equal(report.source.totalEvents, 212);
  assert.equal(report.source.duplicateEvents, 2);
  assert.equal(report.source.rejectedEvents, 0);
  assert.equal(report.source.parseErrors, 0);
  assert.equal(report.anonymity.identifiersPublished, false);
  assert.equal(report.anonymity.suppressedBuckets, 3);

  const cohorts = report.retention.cohorts;
  // W29: 5-installation narrow cohort with known returns.
  assert.deepEqual(
    Object.keys(cohorts["2026-W29"]),
    ["n", "D+1", "D+7", "D+21"],
  );
  assert.equal(cohorts["2026-W29"].n, 5);
  assert.deepEqual(cohorts["2026-W29"]["D+1"], {
    returned: 2, returnedRate: 0.4, returnedStrict: 2, returnedStrictRate: 0.4, reviewReturn: 0, reviewReturnRate: 0,
  });
  // i5 returns only at D+4: accumulated R7 counts it, strict R7 does not;
  // i1's D+8 session is a review session (review R7 = 1).
  assert.deepEqual(cohorts["2026-W29"]["D+7"], {
    returned: 4, returnedRate: 0.8, returnedStrict: 2, returnedStrictRate: 0.4, reviewReturn: 1, reviewReturnRate: 0.2,
  });
  assert.deepEqual(cohorts["2026-W29"]["D+21"], {
    returned: 4, returnedRate: 0.8, returnedStrict: 2, returnedStrictRate: 0.4, reviewReturn: 1, reviewReturnRate: 0.2,
  });
  // W33 has only 3 installations: suppressed, no per-window buckets published.
  assert.deepEqual(cohorts["2026-W33"], { suppressed: true, n: 3 });
  // W35: k1 returns with a review session at D+1; k4 returns only at D+21.
  assert.equal(cohorts["2026-W35"].n, 5);
  assert.deepEqual(cohorts["2026-W35"]["D+7"], {
    returned: 3, returnedRate: 0.6, returnedStrict: 1, returnedStrictRate: 0.2, reviewReturn: 1, reviewReturnRate: 0.2,
  });
  assert.deepEqual(cohorts["2026-W35"]["D+21"], {
    returned: 4, returnedRate: 0.8, returnedStrict: 1, returnedStrictRate: 0.2, reviewReturn: 1, reviewReturnRate: 0.2,
  });

  // Overall spans the suppressed cohort's installations too (n=30, k-satisfied);
  // the W37 group adds one D+1 accumulated+strict return (install-c1 on 09-11).
  const overall = report.retention.overall;
  assert.equal(overall.n, 30);
  assert.equal(overall["D+1"].returned, 6);
  assert.equal(overall["D+7"].returned, 10);
  assert.equal(overall["D+21"].returned, 11);
  assert.equal(overall["D+7"].returnedStrict, 4);
  assert.equal(overall["D+21"].reviewReturn, 2);
});

test("wide cohort (first onboarding.completed) reports the wider denominator", async () => {
  const report = await aggregateFixture();
  // install-i6 and install-m1 completed onboarding but never a mission.
  assert.equal(report.wideCohortRetention.cohorts["2026-W29"].n, 6);
  assert.equal(report.wideCohortRetention.cohorts["2026-W35"].n, 6);
  assert.equal(report.wideCohortRetention.overall.n, 32);
  assert.equal(report.retention.overall.n, 30);
});

test("activation funnel counts ordered stage reachability per week", async () => {
  const report = await aggregateFixture();
  assert.deepEqual(report.activationFunnel.cohorts["2026-W29"], { n: 6, counts: [6, 6, 5, 5] });
  assert.deepEqual(report.activationFunnel.cohorts["2026-W35"], { n: 6, counts: [6, 6, 5, 5] });
  assert.deepEqual(report.activationFunnel.cohorts["2026-W37"], { n: 17, counts: [17, 17, 17, 17] });
  assert.deepEqual(report.activationFunnel.cohorts["2026-W33"], { suppressed: true, n: 3 });
  assert.deepEqual(report.activationFunnel.overall, { n: 32, counts: [32, 32, 30, 30] });
});

test("the report never publishes installation, session, or event identifiers", async () => {
  const report = await aggregateFixture();
  const serialized = JSON.stringify(report);
  for (const prefix of ["install-", "session-", "s-i1", "s-a1", "s-c1", "evt-", "evt-f2b"]) {
    assert.equal(serialized.includes(prefix), false, `report leaks identifier prefix: ${prefix}`);
  }
});

test("committed example report regenerates byte-identically (no stale artifacts)", async () => {
  const files = await collectInputFiles([SYNTHETIC]);
  const { files: perFile, entries } = await readNdjsonEntries(files);
  const report = withSourceFiles(aggregateFunnel(entries, { now: GENERATED_AT }), perFile);
  const expectedJson = await readFile(join(FIXTURES, "example-funnel-report.json"), "utf8");
  assert.equal(`${JSON.stringify(report, null, 2)}\n`, expectedJson);
});

test("k override suppresses publishable cohorts; window override narrows buckets", async () => {
  const strict = await aggregateFixture({ k: 100 });
  assert.deepEqual(strict.retention.cohorts["2026-W29"], { suppressed: true, n: 5 });
  assert.equal(strict.anonymity.suppressedBuckets > 3, true);
  const singleWindow = await aggregateFixture({ windows: [1] });
  assert.deepEqual(Object.keys(singleWindow.retention.cohorts["2026-W29"]), ["n", "D+1"]);
  assert.deepEqual(singleWindow.parameters.windowsDays, [1]);
});

test("vocabulary-rejected and unparsable lines are counted, never aggregated", async () => {
  const { report } = await runAggregation({ inputs: [join(FIXTURES, "drift")], now: GENERATED_AT });
  assert.equal(report.source.totalEvents, 1);
  assert.equal(report.source.rejectedEvents, 10);
  assert.equal(report.source.parseErrors, 1);
});

test("isoWeekKey uses the ISO 8601 Thursday rule in UTC", () => {
  assert.equal(isoWeekKey(Date.parse("2026-07-13T00:00:00Z")), "2026-W29");
  assert.equal(isoWeekKey(Date.parse("2026-08-24T23:59:59Z")), "2026-W35");
  assert.equal(isoWeekKey(Date.parse("2026-01-01T12:00:00Z")), "2026-W01");
  // Friday 2027-01-01 belongs to 2026-W53 (the ISO year can differ from the calendar year).
  assert.equal(isoWeekKey(Date.parse("2027-01-01T12:00:00Z")), "2026-W53");
});

// --- AID-675 F2b (spec AID-673 §2): dedup + D1/D2 sections, reportVersion 2 ---

test("eventId duplicates are removed before any cut (ADR-0010 beacon+fetch race)", async () => {
  const report = await aggregateFixture();
  // The W37 fixture carries two duplicated lines (a structured_attempt.submitted
  // and a mission.completed). Without dedup the prompt_builder|l01 cell would
  // count 7 submitted events and totalEvents would be 214.
  assert.equal(report.source.duplicateEvents, 2);
  assert.equal(report.source.totalEvents, 212);
  assert.equal(report.activityFriction.attempts["prompt_builder|l01"].submitted, 6);
  assert.equal(report.missionCompletion.missions["game-02-warehouse"].started, 6);
  // Inline library boundary: an exact duplicate aggregates exactly once.
  const base = {
    schemaVersion: 1,
    eventId: "evt-dup-x",
    name: "hint.requested",
    occurredAt: "2026-09-08T09:00:00Z",
    sequence: 1,
    dimensions: { installationId: "install-x1", sessionId: "s-x1-1", mode: "hint", source: "provider", outcome: "answered" },
  };
  const doubled = aggregateFunnel(
    [{ value: base }, { value: { ...base } }],
    { now: GENERATED_AT },
  );
  assert.equal(doubled.source.totalEvents, 1);
  assert.equal(doubled.source.duplicateEvents, 1);
});

test("trackEntrySplit reports the weekly first-initial-start split, k-suppressed", async () => {
  const report = await aggregateFixture();
  const cohorts = report.trackEntrySplit.cohorts;
  assert.deepEqual(cohorts["2026-W29"], {
    n: 5,
    byTrack: { "ai-pratica": { installations: 3, rate: 0.6 }, dev: { installations: 2, rate: 0.4 } },
  });
  assert.deepEqual(cohorts["2026-W35"], {
    n: 5,
    byTrack: { "ai-pratica": { installations: 3, rate: 0.6 }, dev: { installations: 2, rate: 0.4 } },
  });
  assert.deepEqual(cohorts["2026-W37"], {
    n: 17,
    byTrack: { "ai-pratica": { installations: 11, rate: 0.6471 }, dev: { installations: 6, rate: 0.3529 } },
  });
  assert.deepEqual(cohorts["2026-W33"], { suppressed: true, n: 3 });
  // A missing trackId context never guesses: it reports an unknown bucket.
  function initialStart(installation, index) {
    return {
      value: {
        schemaVersion: 1,
        eventId: `evt-t-${installation}`,
        name: "mission.started",
        occurredAt: "2026-07-13T10:10:00Z",
        sequence: index,
        dimensions: { installationId: `install-${installation}`, sessionId: `s-${installation}-1`, mode: "initial" },
      },
    };
  }
  const unknownTrack = aggregateFunnel(
    ["u1", "u2", "u3", "u4", "u5"].map((installation, index) => initialStart(installation, index + 1)),
    { now: GENERATED_AT },
  );
  assert.deepEqual(unknownTrack.trackEntrySplit.cohorts["2026-W29"], {
    n: 5,
    byTrack: { unknown: { installations: 5, rate: 1 } },
  });
});

test("missionCompletion attributes per missionId, unattributed bucket, and suppression", async () => {
  const report = await aggregateFixture();
  const missions = report.missionCompletion.missions;
  assert.deepEqual(missions.l01, { started: 6, completed: 6, completionRate: 1 });
  assert.deepEqual(missions.l04, { started: 8, completed: 5, completionRate: 0.625 });
  assert.deepEqual(missions["game-02-warehouse"], { started: 6, completed: 6, completionRate: 1 });
  // Pre-F2b fixture events carry no missionId: one honest bucket, never guessed.
  assert.deepEqual(missions.unattributed, { started: 13, completed: 13, completionRate: 1 });
  assert.deepEqual(missions["os-l04-1"], { suppressed: true, n: 1 });
});

test("activityFriction reports pass rate per activityType × missionId plus mission-level friction", async () => {
  const report = await aggregateFixture();
  const { attempts, missionFriction } = report.activityFriction;
  assert.deepEqual(attempts["prompt_builder|l01"], { submitted: 6, passed: 4, passRate: 0.6667 });
  assert.deepEqual(attempts["rubric_review|l04"], { suppressed: true, n: 2 });
  assert.deepEqual(attempts["choice|unattributed"], { suppressed: true, n: 1 });
  assert.deepEqual(missionFriction.l01, { hintRequested: 5, retryRequested: { suppressed: true, n: 2 } });
  assert.deepEqual(missionFriction.unattributed, {
    hintRequested: { suppressed: true, n: 1 },
    retryRequested: { suppressed: true, n: 1 },
  });
});

test("verificationHealth counts states without a missionId cut", async () => {
  const report = await aggregateFixture();
  const { states, totalEvents } = report.verificationHealth;
  assert.equal(totalEvents, 20);
  assert.deepEqual(states.verified, { events: 6, installations: 6, share: 0.3 });
  assert.deepEqual(states.rejected, { events: 6, installations: 6, share: 0.3 });
  assert.deepEqual(states["gateway-unavailable"], { events: 6, installations: 6, share: 0.3 });
  assert.deepEqual(states.pending, { suppressed: true, n: 2 });
});

test("rendererDegraded counts per fallback with reasons and engineId context", async () => {
  const report = await aggregateFixture();
  const { fallbacks } = report.rendererDegraded;
  assert.deepEqual(fallbacks.dom, {
    events: 6,
    reasons: { "creation-failed": 6 },
    engineIds: { literacyDojo: 6 },
  });
  assert.deepEqual(fallbacks.canvas2d, { suppressed: true, n: 1 });
  assert.deepEqual(fallbacks.none, { suppressed: true, n: 2 });
});

test("moduleCompletionMedian maps missions via the live catalog and takes the median (D2)", async () => {
  const report = await aggregateFixture();
  const section = report.moduleCompletionMedian;
  assert.equal(section.catalog, "curriculum/ai-literacy/catalog.yaml");
  assert.equal(section.journey, "ia_pratica");
  assert.deepEqual(section.modules["mod-01"], { n: 6, completed: 6, completionRate: 1 });
  assert.deepEqual(section.modules["mod-02"], { n: 8, completed: 5, completionRate: 0.625 });
  assert.equal(section.medianCompletionRate, 0.8125);
  assert.equal(section.modulesPublished, 2);
  assert.equal(section.modulesSuppressed, 0);
  // os-l04-1 (legacy synthetic) and game-02-warehouse (dev track) have no
  // ai-literacy catalog mapping: counted, never assigned by guess.
  assert.equal(section.missionsWithoutModuleMapping, 2);
});

test("moduleCompletionMedian is fail-closed when the catalog is unavailable", async () => {
  const missing = await aggregateFixture({ catalogPath: join(tmpdir(), "aid-675-no-such-catalog.yaml") });
  assert.equal(missing.moduleCompletionMedian.unavailable, true);
  assert.match(missing.moduleCompletionMedian.reason, /catalog unavailable/);
  assert.equal(missing.moduleCompletionMedian.modules, undefined);
  assert.equal(missing.reportVersion, 2);
  // A present-but-empty catalog is also unavailable: never fabricate mappings.
  const dir = await mkdtemp(join(tmpdir(), "aid-675-catalog-"));
  const emptyCatalog = join(dir, "catalog.yaml");
  await writeFile(emptyCatalog, "schemaVersion: 1\nmodules: []\nlessons: []\n");
  const empty = await aggregateFixture({ catalogPath: emptyCatalog });
  assert.equal(empty.moduleCompletionMedian.unavailable, true);
  // The rest of the report is unaffected: the D2 section degrades alone.
  assert.equal(empty.source.totalEvents, 212);
  assert.deepEqual(empty.missionCompletion.missions.l01, { started: 6, completed: 6, completionRate: 1 });
});

test("markdown render includes the new F2b sections", async () => {
  const { markdown } = await runAggregation({ inputs: [SYNTHETIC], now: GENERATED_AT });
  for (const heading of [
    "## Track entry split (first mission.started{mode:initial} per installation)",
    "## Mission completion (per missionId context)",
    "## Activity friction (structured attempts per activityType × missionId)",
    "## Verification health (state_changed by state)",
    "## Renderer degradation (by fallback)",
    "## Module completion median — D2 (catalog: curriculum/ai-literacy/catalog.yaml)",
    "2 duplicate eventId line(s) removed",
    "Median completion rate across published modules: 81.3%",
  ]) {
    assert.equal(markdown.includes(heading), true, `markdown missing: ${heading}`);
  }
});

test("cli reports usage errors without throwing", async () => {
  const badPath = join(tmpdir(), "aid-473-f2-does-not-exist");
  assert.equal(await aggregateCli(["node", "aggregate_funnel.mjs", "--input", badPath]), 2);
  assert.equal(await aggregateCli(["node", "aggregate_funnel.mjs", "--bogus"]), 2);
});

// AID-492 (QA AID-489 D1): `--k abc` used to become k=NaN, `n < NaN` is always
// false, and k-anonymous suppression was silently OFF — the n=3 W33 cohort got
// published with rates and `parameters.kMinimum` serialized as null. Numeric
// options must now fail closed: usage error + exit 2, and no bucket (not even
// a suppressed one) is published anywhere.
test("cli fails closed on invalid numeric options: exit 2 and nothing published (QA AID-489 D1)", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aid-492-d1-"));
  const output = join(dir, "report.json");
  const markdown = join(dir, "report.md");
  const base = [
    "node", "aggregate_funnel.mjs",
    "--input", SYNTHETIC,
    "--now", GENERATED_AT.toISOString(),
    "--output", output, "--markdown", markdown,
  ];
  const invalid = [
    ["--k", "abc"], ["--k", ""], ["--k", "0"], ["--k", "-3"], ["--k", "1.5"], ["--k", "0x5"],
    ["--k", "4"], // below the AID-463 §3.0 day-1 floor: k≥5, even when well-formed
    ["--grace-days", "abc"], ["--grace-days", "0"], ["--grace-days", "2.5"],
    ["--windows", "abc"], ["--windows", "1,x,7"], ["--windows", "0,7"], ["--windows", "1,,7"],
    ["--now", "not-a-date"], ["--now", ""],
  ];
  for (const [flag, value] of invalid) {
    assert.equal(await aggregateCli([...base, flag, value]), 2, `expected exit 2 for ${flag} ${value}`);
  }
  // Nothing was aggregated or written: a fail-open run would have created both
  // artifacts (and published the n=3 W33 cohort when --k was the bad flag).
  assert.equal(await access(output).then(() => true, () => false), false, "report.json must not exist");
  assert.equal(await access(markdown).then(() => true, () => false), false, "report.md must not exist");
});

// AID-492 (QA AID-489 D2): a trailing option without a value used to crash the
// CLI with `TypeError: Cannot read properties of undefined` (exit 1) instead
// of the documented usage error + exit 2.
test("cli fails closed on missing option values: exit 2, no crash (QA AID-489 D2)", async () => {
  for (const flag of ["--input", "--output", "--markdown", "--k", "--grace-days", "--windows", "--now"]) {
    assert.equal(await aggregateCli(["node", "aggregate_funnel.mjs", flag]), 2, flag);
  }
});

test("library boundary is fail-closed too: aggregateFunnel throws, runAggregation refuses k<5 (QA AID-489 D1)", async () => {
  assert.throws(() => aggregateFunnel([], { k: Number("abc") }), TypeError);
  assert.throws(() => aggregateFunnel([], { k: 0 }), TypeError);
  assert.throws(() => aggregateFunnel([], { graceDays: Number("abc") }), TypeError);
  assert.throws(() => aggregateFunnel([], { windows: [1, Number("abc")] }), TypeError);
  assert.throws(() => aggregateFunnel([], { windows: [] }), TypeError);
  // The report-producing boundary enforces the §3.0 floor (k≥5), so even a
  // programmatic caller cannot generate a below-policy report.
  const refused = await runAggregation({ inputs: [SYNTHETIC], k: 4, now: GENERATED_AT });
  assert.equal(refused.exitCode, 2);
  assert.match(refused.report.error, /k must be an integer ≥ 5/);
  // Well-formed values keep working through the full CLI path.
  const dir = await mkdtemp(join(tmpdir(), "aid-492-ok-"));
  const output = join(dir, "report.json");
  assert.equal(
    await aggregateCli([
      "node", "aggregate_funnel.mjs", "--input", SYNTHETIC, "--k", "5",
      "--windows", "1,7,21", "--grace-days", "2", "--now", GENERATED_AT.toISOString(),
      "--output", output,
    ]),
    0,
  );
  const report = JSON.parse(await readFile(output, "utf8"));
  assert.equal(report.parameters.kMinimum, 5);
  assert.deepEqual(report.retention.cohorts["2026-W33"], { suppressed: true, n: 3 });
});

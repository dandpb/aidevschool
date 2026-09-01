import assert from "node:assert/strict";
import { access, mkdtemp, readFile } from "node:fs/promises";
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

const FIXTURES = join(import.meta.dirname, "fixtures/analytics");
const SYNTHETIC = join(FIXTURES, "synthetic");
const GENERATED_AT = new Date("2026-09-18T00:00:00.000Z");

async function aggregateFixture(options = {}) {
  const { report } = await runAggregation({ inputs: [SYNTHETIC], now: GENERATED_AT, ...options });
  return report;
}

test("aggregates the synthetic fixture into the hand-computed funnel", async () => {
  const report = await aggregateFixture();
  assert.equal(report.source.totalEvents, 94);
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

  // Overall spans the suppressed cohort's installations too (n=13, k-satisfied).
  const overall = report.retention.overall;
  assert.equal(overall.n, 13);
  assert.equal(overall["D+1"].returned, 5);
  assert.equal(overall["D+7"].returned, 9);
  assert.equal(overall["D+21"].returned, 10);
  assert.equal(overall["D+7"].returnedStrict, 4);
  assert.equal(overall["D+21"].reviewReturn, 2);
});

test("wide cohort (first onboarding.completed) reports the wider denominator", async () => {
  const report = await aggregateFixture();
  // install-i6 and install-m1 completed onboarding but never a mission.
  assert.equal(report.wideCohortRetention.cohorts["2026-W29"].n, 6);
  assert.equal(report.wideCohortRetention.cohorts["2026-W35"].n, 6);
  assert.equal(report.wideCohortRetention.overall.n, 15);
  assert.equal(report.retention.overall.n, 13);
});

test("activation funnel counts ordered stage reachability per week", async () => {
  const report = await aggregateFixture();
  assert.deepEqual(report.activationFunnel.cohorts["2026-W29"], { n: 6, counts: [6, 6, 5, 5] });
  assert.deepEqual(report.activationFunnel.cohorts["2026-W35"], { n: 6, counts: [6, 6, 5, 5] });
  assert.deepEqual(report.activationFunnel.cohorts["2026-W33"], { suppressed: true, n: 3 });
  assert.deepEqual(report.activationFunnel.overall, { n: 15, counts: [15, 15, 13, 13] });
});

test("the report never publishes installation, session, or event identifiers", async () => {
  const report = await aggregateFixture();
  const serialized = JSON.stringify(report);
  for (const prefix of ["install-", "session-", "s-i1", "evt-"]) {
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

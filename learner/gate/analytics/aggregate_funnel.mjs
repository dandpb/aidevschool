// Offline NDJSON → retention-funnel aggregation for the OS analytics collector
// (AID-473 F2, spec: AID-463 draft §2 rev 40b963bf).
//
// Reads the collector's day-rotated NDJSON (append-only, accepted events only)
// and emits an AGGREGATED, k-anonymized report. Non-negotiable boundaries:
//   - installationId/sessionId are never published; only counts and rates over
//     cohorts keyed by the ISO week of D0.
//   - buckets with fewer than k installations are suppressed (k≥5 from day 1).
//   - dimensions are closed-vocabulary enums by construction; no free text,
//     no IP, no user-agent, and no mastery state ever enter the report.
//   - analytics is not evidence; this tool never writes learner state.
//
// Funnel definitions (draft §2.1):
//   - narrow cohort: first `mission.completed {result:"completed"}` on UTC day D0.
//   - wide cohort (context): first `onboarding.completed` on D0.
//   - activation funnel: onboarding.started → onboarding.completed →
//     mission.started → mission.completed, per ISO week of first event,
//     counted with ordered reachability.
//   - return D+N accumulated (primary): any event at day offset 1..N+graceDays.
//   - return D+N strict (secondary): at least one event at offset N..N+graceDays.
//   - review return (H1): the returning event's session (sessionId group)
//     contains mission.started {mode:"review"} or review.started {reason:
//     "due"|"overdue"} — distinguishes "returned to review" from new content.
// The first cycle establishes the baseline; no external numeric target.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { validateAnalyticsEvent } from "../netlify-functions/dojo-analytics-collector.mjs";
import { collectInputFiles, readNdjsonEntries, resolveOutput } from "./ndjson_input.mjs";

export const REPORT_VERSION = 1;
export const DEFAULT_WINDOWS = [1, 7, 21];
export const DEFAULT_GRACE_DAYS = 2;
export const DEFAULT_K_MINIMUM = 5;
const ACTIVATION_STAGES = [
  { name: "onboarding.started" },
  { name: "onboarding.completed" },
  { name: "mission.started" },
  { name: "mission.completed", dimensions: { result: "completed" } },
];
const DAY_MS = 24 * 60 * 60 * 1000;

function utcDayStart(isoMs) {
  const date = new Date(isoMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** ISO-8601 week key ("2026-W29") using the Thursday rule, in UTC. */
export function isoWeekKey(isoMs) {
  const date = new Date(utcDayStart(isoMs));
  const dayNumber = (date.getUTCDay() + 6) % 7; // Monday = 0
  const thursday = new Date(date.getTime() + (3 - dayNumber) * DAY_MS);
  const januaryFirst = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.floor((thursday.getTime() - januaryFirst) / DAY_MS / 7) + 1;
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function rate(count, total) {
  return Math.round((count / total) * 10000) / 10000;
}

function matchesStage(event, stage) {
  if (event.name !== stage.name) return false;
  if (stage.dimensions === undefined) return true;
  return Object.entries(stage.dimensions).every(([key, value]) => event.dimensions[key] === value);
}

function eventTime(event) {
  return Date.parse(event.occurredAt);
}

/**
 * Aggregate validated events into the k-anonymized funnel report.
 * @param {Array<{value: object}>} entries parsed NDJSON entries (only lines the
 *   collector vocabulary accepts are aggregated; the rest are counted, never
 *   trusted — run schema_drift_monitor.mjs to see why a line was excluded).
 */
export function aggregateFunnel(entries, options = {}) {
  const k = options.k ?? DEFAULT_K_MINIMUM;
  const windows = [...(options.windows ?? DEFAULT_WINDOWS)].sort((a, b) => a - b);
  const graceDays = options.graceDays ?? DEFAULT_GRACE_DAYS;

  const accepted = [];
  let rejectedEvents = 0;
  let parseErrors = 0;
  for (const entry of entries) {
    if (entry.parseError !== undefined) {
      parseErrors += 1;
    } else if (validateAnalyticsEvent(entry.value)) {
      accepted.push(entry.value);
    } else {
      rejectedEvents += 1;
    }
  }
  accepted.sort((a, b) => eventTime(a) - eventTime(b) || a.sequence - b.sequence);

  // Group per installation, tag review sessions, remember first occurrence of
  // every stage, and record each event's day offset from its cohort D0.
  const installations = new Map();
  for (const event of accepted) {
    const id = event.dimensions.installationId;
    if (!installations.has(id)) {
      installations.set(id, { events: [], firstEventTime: eventTime(event), stageTimes: new Map() });
    }
    const installation = installations.get(id);
    installation.events.push(event);
    for (const stage of ACTIVATION_STAGES) {
      if (matchesStage(event, stage) && !installation.stageTimes.has(stage.name)) {
        installation.stageTimes.set(stage.name, eventTime(event));
      }
    }
  }
  const reviewSessions = new Set();
  for (const event of accepted) {
    const dimensions = event.dimensions;
    if (
      (event.name === "mission.started" && dimensions.mode === "review") ||
      (event.name === "review.started" && (dimensions.reason === "due" || dimensions.reason === "overdue"))
    ) {
      reviewSessions.add(`${dimensions.installationId}:${dimensions.sessionId}`);
    }
  }

  const narrow = new Map(); // week -> [{d0, installation}]
  const wide = new Map();
  const activation = new Map(); // week -> [{installation}]
  for (const [id, installation] of installations) {
    const firstEventWeek = isoWeekKey(installation.firstEventTime);
    if (!activation.has(firstEventWeek)) activation.set(firstEventWeek, []);
    activation.get(firstEventWeek).push(installation);
    const completedTime = firstTimeOf(installation, "onboarding.completed");
    if (completedTime !== undefined) {
      const week = isoWeekKey(completedTime);
      if (!wide.has(week)) wide.set(week, []);
      wide.get(week).push({ id, d0: utcDayStart(completedTime), installation });
    }
    const missionTime = firstMissionCompleted(installation);
    if (missionTime !== undefined) {
      const week = isoWeekKey(missionTime);
      if (!narrow.has(week)) narrow.set(week, []);
      narrow.get(week).push({ id, d0: utcDayStart(missionTime), installation });
    }
  }

  function retentionBucket(cohort) {
    const n = cohort.length;
    if (n < k) return { suppressed: true, n };
    const bucket = { n };
    for (const nDays of windows) {
      let returned = 0;
      let returnedStrict = 0;
      let reviewReturn = 0;
      for (const member of cohort) {
        const offsets = member.installation.events.map(
          (event) => (utcDayStart(eventTime(event)) - member.d0) / DAY_MS,
        );
        const inAccumulated = offsets.some((offset) => offset >= 1 && offset <= nDays + graceDays);
        const inStrict = offsets.some((offset) => offset >= nDays && offset <= nDays + graceDays);
        if (inAccumulated) returned += 1;
        if (inStrict) returnedStrict += 1;
        if (inAccumulated && returnedWithReview(member, nDays)) reviewReturn += 1;
      }
      bucket[`D+${nDays}`] = {
        returned,
        returnedRate: rate(returned, n),
        returnedStrict,
        returnedStrictRate: rate(returnedStrict, n),
        reviewReturn,
        reviewReturnRate: rate(reviewReturn, n),
      };
    }
    return bucket;
  }

  function returnedWithReview(member, nDays) {
    for (const event of member.installation.events) {
      const offset = (utcDayStart(eventTime(event)) - member.d0) / DAY_MS;
      if (offset < 1 || offset > nDays + graceDays) continue;
      if (reviewSessions.has(`${member.id}:${event.dimensions.sessionId}`)) return true;
    }
    return false;
  }

  const weeks = [...new Set([...narrow.keys(), ...wide.keys(), ...activation.keys()])].sort();
  const retention = { cohortDefinition: "first mission.completed{result:completed} on UTC day D0", cohorts: {} };
  const wideRetention = { cohortDefinition: "first onboarding.completed on UTC day D0", cohorts: {} };
  const activationFunnel = { stages: ACTIVATION_STAGES.map((stage) => stage.name), cohorts: {} };
  let suppressedBuckets = 0;
  for (const week of weeks) {
    const narrowCohort = narrow.get(week) ?? [];
    const wideCohort = wide.get(week) ?? [];
    const activationCohort = activation.get(week) ?? [];
    const narrowBucket = retentionBucket(narrowCohort);
    if (narrowBucket.suppressed === true) suppressedBuckets += 1;
    retention.cohorts[week] = narrowBucket;
    const wideBucket = retentionBucket(wideCohort);
    if (wideBucket.suppressed === true) suppressedBuckets += 1;
    wideRetention.cohorts[week] = wideBucket;
    const activationBucket = activationBucketFor(activationCohort, k);
    if (activationBucket.suppressed === true) suppressedBuckets += 1;
    activationFunnel.cohorts[week] = activationBucket;
  }
  const overallNarrow = retentionBucket([...narrow.values()].flat());
  const overallWide = retentionBucket([...wide.values()].flat());
  const overallActivation = activationBucketFor([...activation.values()].flat(), k);
  if (overallNarrow.suppressed === true) suppressedBuckets += 1;
  if (overallWide.suppressed === true) suppressedBuckets += 1;
  if (overallActivation.suppressed === true) suppressedBuckets += 1;

  return {
    reportVersion: REPORT_VERSION,
    generatedAt: (options.now ?? new Date()).toISOString(),
    parameters: {
      windowsDays: windows,
      graceDays,
      kMinimum: k,
      returnWindowAccumulated: "any event at day offset 1..N+graceDays",
      returnWindowStrict: "at least one event at day offset N..N+graceDays",
      reviewReturn: "returning event's session contains mission.started{mode:review} or review.started{reason:due|overdue}",
    },
    anonymity: { identifiersPublished: false, suppressionRule: "buckets with n<k are suppressed", suppressedBuckets },
    source: { files: [], totalEvents: accepted.length, rejectedEvents, parseErrors },
    activationFunnel: { ...activationFunnel, overall: overallActivation },
    retention: { ...retention, overall: overallNarrow },
    wideCohortRetention: { ...wideRetention, overall: overallWide },
  };
}

function firstTimeOf(installation, stageName) {
  return installation.stageTimes.get(stageName);
}

function firstMissionCompleted(installation) {
  return installation.stageTimes.get("mission.completed");
}

function activationBucketFor(cohort, k) {
  const n = cohort.length;
  if (n < k) return { suppressed: true, n };
  const counts = [];
  for (let index = 0; index < ACTIVATION_STAGES.length; index += 1) {
    // Ordered reachability: stage i counts when stages 0..i all occurred and
    // their first-occurrence times are non-decreasing.
    const reached = cohort.filter((installation) => {
      let previousTime = Number.NEGATIVE_INFINITY;
      for (let previous = 0; previous <= index; previous += 1) {
        const stageTime = installation.stageTimes.get(ACTIVATION_STAGES[previous].name);
        if (stageTime === undefined || stageTime < previousTime) return false;
        previousTime = stageTime;
      }
      return true;
    });
    counts.push(reached.length);
  }
  return { n, counts };
}

/** Attach per-file source stats (the entries carry provenance). */
export function withSourceFiles(report, files) {
  const sourceFiles = files.map((file) => ({ name: file.name, lines: file.lines }));
  return { ...report, source: { ...report.source, files: sourceFiles } };
}

function percent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function retentionRow(bucket, windows) {
  if (bucket.suppressed === true) return `suppressed (n=${bucket.n} < k)`;
  return windows
    .map((nDays) => {
      const window = bucket[`D+${nDays}`];
      return `R${nDays} ${percent(window.returnedRate)} (strict ${percent(window.returnedStrictRate)}, review ${window.reviewReturn})`;
    })
    .join(" · ");
}

/** Render the aggregated report as a human-readable Markdown summary. */
export function renderMarkdownReport(report) {
  const { parameters, source, retention, wideCohortRetention, activationFunnel } = report;
  const lines = [
    "# OS analytics — retention funnel (aggregated, k-anonymized)",
    "",
    `Generated ${report.generatedAt} · ${source.totalEvents} accepted events · ${source.files.length} file(s) · ${source.rejectedEvents} rejected, ${source.parseErrors} unparsable line(s) excluded`,
    "",
    `Windows: D+${parameters.windowsDays.join("/D+")} · grace ${parameters.graceDays}d · k≥${parameters.kMinimum} · identifiers never published · analytics ≠ evidence`,
    "",
    "## Retention — narrow cohort (first mission.completed)",
    "",
    "| cohort week | n | windows |",
    "| --- | --- | --- |",
  ];
  for (const [week, bucket] of Object.entries(retention.cohorts)) {
    lines.push(`| ${week} | ${bucket.suppressed === true ? "—" : bucket.n} | ${retentionRow(bucket, parameters.windowsDays)} |`);
  }
  lines.push(`| overall | ${retention.overall.suppressed === true ? "—" : retention.overall.n} | ${retentionRow(retention.overall, parameters.windowsDays)} |`);
  lines.push("", "## Retention — wide cohort (first onboarding.completed, context)", "", "| cohort week | n | windows |", "| --- | --- | --- |");
  for (const [week, bucket] of Object.entries(wideCohortRetention.cohorts)) {
    lines.push(`| ${week} | ${bucket.suppressed === true ? "—" : bucket.n} | ${retentionRow(bucket, parameters.windowsDays)} |`);
  }
  lines.push(`| overall | ${wideCohortRetention.overall.suppressed === true ? "—" : wideCohortRetention.overall.n} | ${retentionRow(wideCohortRetention.overall, parameters.windowsDays)} |`);
  lines.push(
    "",
    "## Activation funnel (per week of first event)",
    "",
    `| cohort week | n | ${activationFunnel.stages.join(" → ")} |`,
    "| --- | --- | --- |",
  );
  for (const [week, bucket] of Object.entries(activationFunnel.cohorts)) {
    const cells = bucket.suppressed === true ? `suppressed (n=${bucket.n} < k)` : bucket.counts.join(" → ");
    lines.push(`| ${week} | ${bucket.suppressed === true ? "—" : bucket.n} | ${cells} |`);
  }
  const overallCells =
    activationFunnel.overall.suppressed === true
      ? `suppressed (n=${activationFunnel.overall.n} < k)`
      : activationFunnel.overall.counts.join(" → ");
  lines.push(`| overall | ${activationFunnel.overall.suppressed === true ? "—" : activationFunnel.overall.n} | ${overallCells} |`);
  lines.push("", "Baseline cycle: the first report establishes the baseline; no external numeric target is claimed.", "");
  return lines.join("\n");
}

/**
 * Run the aggregation over NDJSON inputs.
 * @returns {{report: object, markdown: string, exitCode: number}} exit 0 on
 *   success (drift is reported, not fatal here — the monitor fails high),
 *   2 on usage/IO error.
 */
export async function runAggregation({ inputs, k, windows, graceDays, now = new Date() }) {
  let read;
  try {
    const inputFiles = await collectInputFiles(inputs);
    read = await readNdjsonEntries(inputFiles);
  } catch (error) {
    return { report: { error: error instanceof Error ? error.message : String(error) }, markdown: "", exitCode: 2 };
  }
  const report = withSourceFiles(aggregateFunnel(read.entries, { k, windows, graceDays, now }), read.files);
  return { report, markdown: renderMarkdownReport(report), exitCode: 0 };
}

export function aggregateCli(argv, { now = new Date() } = {}) {
  const args = argv.slice(2);
  const inputs = [];
  let output = null;
  let markdown = null;
  let k = DEFAULT_K_MINIMUM;
  let graceDays = DEFAULT_GRACE_DAYS;
  let windows = DEFAULT_WINDOWS;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--input") {
      inputs.push(...args[i + 1].split(","));
      i += 1;
    } else if (args[i] === "--output") {
      output = resolveOutput(args[i + 1]);
      i += 1;
    } else if (args[i] === "--markdown") {
      markdown = resolveOutput(args[i + 1]);
      i += 1;
    } else if (args[i] === "--k") {
      k = Number(args[i + 1]);
      i += 1;
    } else if (args[i] === "--grace-days") {
      graceDays = Number(args[i + 1]);
      i += 1;
    } else if (args[i] === "--windows") {
      windows = args[i + 1].split(",").map((value) => Number(value));
      i += 1;
    } else if (args[i] === "--now") {
      now = new Date(args[i + 1]);
      i += 1;
    } else if (args[i] === "--help") {
      process.stdout.write(usage());
      return Promise.resolve(0);
    } else {
      process.stderr.write(`unknown argument: ${args[i]}\n${usage()}`);
      return Promise.resolve(2);
    }
  }
  return runAggregation({ inputs, k, windows, graceDays, now }).then(async ({ report, markdown: rendered, exitCode }) => {
    if (exitCode !== 0) {
      process.stderr.write(`${report.error}\n`);
      return exitCode;
    }
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (output !== null) {
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
    }
    if (markdown !== null) {
      await mkdir(dirname(markdown), { recursive: true });
      await writeFile(markdown, rendered);
    }
    return 0;
  });
}

function usage() {
  return [
    "usage: node learner/gate/analytics/aggregate_funnel.mjs --input <dir|file.ndjson>[,...]",
    "  [--output report.json] [--markdown report.md] [--k 5] [--windows 1,7,21]",
    "  [--grace-days 2] [--now ISO8601]",
    "emits the k-anonymized D+1/D+7/D+21 retention funnel; identifiers are never published",
    "exit codes: 0 ok · 2 usage/IO error",
    "",
  ].join("\n");
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("aggregate_funnel.mjs")) {
  aggregateCli(process.argv).then((code) => {
    process.exitCode = code;
  });
}

import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import test from "node:test";
import { join } from "node:path";
import {
  ANALYTICS_BATCH_MAX_EVENTS,
  ANALYTICS_COLLECTOR_PATH,
  createCollectorHandler,
  isAnalyticsBatch,
  NdjsonFileSink,
  validateAnalyticsEvent,
} from "../netlify-functions/dojo-analytics-collector.mjs";

// AID-470 F1: the same-origin collector accepts exactly the OS analytics
// vocabulary (parity with src/analytics/events.ts, cross-checked by
// collectorParity.test.ts), appends accepted events as NDJSON, and keeps the
// emission boundary: the transport stays off unless VITE_ANALYTICS_ENDPOINT is
// configured at build time (never in this repo's build surfaces).

const VALID_EVENT = {
  schemaVersion: 1,
  eventId: "event-1",
  name: "onboarding.started",
  occurredAt: "2026-08-31T12:00:00.000Z",
  sequence: 1,
  dimensions: { installationId: "installation-1", sessionId: "session-1" },
};

function validEvent(overrides = {}) {
  return structuredClone({ ...VALID_EVENT, ...overrides });
}

function withDimensions(dimensions) {
  return validEvent({ dimensions: { ...VALID_EVENT.dimensions, ...dimensions } });
}

function post(body, headers = {}) {
  return new Request(`https://os.example${ANALYTICS_COLLECTOR_PATH}`, {
    method: "POST",
    headers: { "content-type": "application/json", "sec-fetch-site": "same-origin", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

class MemorySink {
  lines = [];

  async append(events) {
    this.lines.push(...events.map((event) => JSON.stringify(event)));
  }
}

test("accepts the canonical OS event shapes for every vocabulary dimension", () => {
  const named = (name, dimensions = {}) => validEvent({ name, dimensions: { ...VALID_EVENT.dimensions, ...dimensions } });
  const cases = [
    validEvent(),
    named("onboarding.started"),
    named("onboarding.completed"),
    named("onboarding.completed", { recommendationChanged: true }),
    named("onboarding.completed", { recommendationChanged: false }),
    named("journey.returned"),
    named("mission.started"),
    named("mission.started", { mode: "initial" }),
    named("mission.started", { mode: "review" }),
    named("mission.completed", { result: "completed" }),
    named("mission.completed", { result: "failed" }),
    named("structured_attempt.submitted", { activityType: "choice" }),
    named("structured_attempt.passed", { activityType: "prompt_builder" }),
    named("hint.requested", { mode: "question", source: "fallback", outcome: "quota-exhausted" }),
    named("retry.requested", { reason: "targeted-practice" }),
    named("review.started", { reason: "overdue" }),
    named("verification.state_changed", { state: "validating" }),
    named("verification.state_changed", { state: "verified", verdict: "PASS" }),
    named("renderer.degraded", { reason: "context-lost", fallback: "dom" }),
    // context keys are enriched into dimensions by the collector
    named("mission.started", { mode: "review", trackId: "ai-pratica", engineId: "literacyDojo", rendererMode: "webgl" }),
    named("mission.completed", { result: "completed", missionId: "os-01", missionRunId: "run-9", engineVersion: "1.2.3", contentVersion: "27" }),
    validEvent({ eventId: "e".repeat(128), sequence: 42, occurredAt: "2026-01-01T00:00:00+00:00" }),
  ];
  for (const event of cases) assert.equal(validateAnalyticsEvent(event), true, JSON.stringify(event));
});

test("rejects every violation of the closed envelope, vocabulary, and identity boundary", () => {
  const cases = [
    null,
    "event",
    validEvent({ schemaVersion: 2 }),
    validEvent({ eventId: "" }),
    validEvent({ eventId: "e".repeat(129) }),
    validEvent({ name: "lesson_completed" }),
    validEvent({ name: "mastered" }),
    validEvent({ occurredAt: "not-a-timestamp" }),
    validEvent({ sequence: 0 }),
    validEvent({ sequence: 1.5 }),
    validEvent({ extra: 1 }),
    { ...validEvent(), dimensions: undefined },
    { ...validEvent(), dimensions: [] },
    withDimensions({ freeText: "x".repeat(128) }),
    validEvent({ name: "onboarding.completed", dimensions: { ...VALID_EVENT.dimensions, recommendationChanged: "true" } }),
    validEvent({ name: "mission.started", dimensions: { ...VALID_EVENT.dimensions, mode: "review " } }),
    validEvent({ name: "mission.completed", dimensions: { ...VALID_EVENT.dimensions, result: "abandoned" } }),
    validEvent({ name: "verification.state_changed", dimensions: { ...VALID_EVENT.dimensions, state: "verified", verdict: "MAYBE" } }),
    validEvent({ name: "renderer.degraded", dimensions: { ...VALID_EVENT.dimensions, reason: "context-lost", fallback: "webgl" } }),
    withDimensions({ installationId: "installation 1" }),
    { ...validEvent(), dimensions: { installationId: "installation-1" } },
    { ...validEvent(), dimensions: { sessionId: "session-1" } },
    withDimensions({ trackId: "third-track" }),
    withDimensions({ engineId: "pixelDojo" }),
    withDimensions({ rendererMode: "webgpu" }),
    withDimensions({ deep: { nested: true } }),
    withDimensions({ list: ["a"] }),
    withDimensions({ empty: "" }),
    withDimensions({ huge: "y".repeat(129) }),
  ];
  for (const event of cases) assert.equal(validateAnalyticsEvent(event), false, JSON.stringify(event));
});

test("batch shape is closed: schemaVersion 1 and 1..100 events", () => {
  assert.equal(isAnalyticsBatch({ schemaVersion: 1, events: [VALID_EVENT] }), true);
  assert.equal(isAnalyticsBatch({ schemaVersion: 1, events: [] }), false);
  assert.equal(
    isAnalyticsBatch({ schemaVersion: 1, events: Array.from({ length: ANALYTICS_BATCH_MAX_EVENTS + 1 }, () => VALID_EVENT) }),
    false,
  );
  assert.equal(isAnalyticsBatch({ schemaVersion: 2, events: [VALID_EVENT] }), false);
  assert.equal(isAnalyticsBatch({ schemaVersion: 1, events: [VALID_EVENT], extra: true }), false);
});

test("handler gates: cross-origin, path, method, size, JSON, schema", async () => {
  const handler = createCollectorHandler({ sink: new MemorySink() });

  const crossOrigin = await handler(new Request(`https://os.example${ANALYTICS_COLLECTOR_PATH}`, {
    method: "POST",
    headers: { "sec-fetch-site": "cross-site" },
    body: "{}",
  }));
  assert.equal(crossOrigin.status, 403);
  assert.equal((await crossOrigin.json()).error, "origin-forbidden");

  const wrongPath = await handler(post("{}", { "x-nf-original-path": "/__dojo/bridge/v1/other" }));
  assert.equal(wrongPath.status, 404);

  const get = await handler(new Request(`https://os.example${ANALYTICS_COLLECTOR_PATH}`, {
    method: "GET",
    headers: { "sec-fetch-site": "same-origin" },
  }));
  assert.equal(get.status, 405);
  assert.equal(get.headers.get("allow"), "POST");

  const tooLarge = await handler(post(`${"x".repeat(65_537)}`));
  assert.equal(tooLarge.status, 413);

  const badJson = await handler(post("{not-json"));
  assert.equal(badJson.status, 400);

  const badSchema = await handler(post({ schemaVersion: 9, events: [VALID_EVENT] }));
  assert.equal(badSchema.status, 422);
  assert.equal((await badSchema.json()).error, "unsupported-schema");
});

test("handler accepts only valid events of a mixed batch and reports exactly their ids", async () => {
  const sink = new MemorySink();
  const handler = createCollectorHandler({ sink });
  const invalid = withDimensions({ result: "abandoned" });
  const response = await handler(post({
    schemaVersion: 1,
    events: [validEvent({ eventId: "event-1" }), invalid, validEvent({ eventId: "event-2", sequence: 2 })],
  }));
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { acceptedEventIds: ["event-1", "event-2"] });
  assert.equal(sink.lines.length, 2);
  assert.deepEqual(sink.lines.map((line) => JSON.parse(line).eventId), ["event-1", "event-2"]);
});

test("NdjsonFileSink appends one JSON line per event, rotating by UTC day, and prunes beyond retention", async () => {
  const baseDir = await mkdtemp(join(tmpdir(), "dojo-analytics-"));
  const sink = new NdjsonFileSink({ baseDir, retentionDays: 90 });
  const now = new Date("2026-08-31T10:00:00Z");
  await sink.append([validEvent({ eventId: "event-1" }), validEvent({ eventId: "event-2", sequence: 2 })], now);
  await sink.append([validEvent({ eventId: "event-3", sequence: 3 })], new Date("2026-08-31T23:30:00Z"));
  await sink.append([validEvent({ eventId: "event-4", sequence: 4 })], new Date("2026-09-01T00:30:00Z"));

  const day1 = await readFile(join(baseDir, "events-2026-08-31.ndjson"), "utf8");
  assert.deepEqual(day1.trim().split("\n").map((line) => JSON.parse(line).eventId), ["event-1", "event-2", "event-3"]);
  const day2 = await readFile(join(baseDir, "events-2026-09-01.ndjson"), "utf8");
  assert.deepEqual(day2.trim().split("\n").map((line) => JSON.parse(line).eventId), ["event-4"]);

  await writeFile(join(baseDir, "events-2026-05-01.ndjson"), "{}\n");
  await sink.prune(new Date("2026-08-31T10:00:00Z"));
  const remaining = (await readdir(baseDir)).sort();
  assert.deepEqual(remaining, ["events-2026-08-31.ndjson", "events-2026-09-01.ndjson"]);
});

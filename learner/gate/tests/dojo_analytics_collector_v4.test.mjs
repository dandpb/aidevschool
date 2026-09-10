import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYTICS_EVENT_NAMES,
  EVENT_VOCABULARIES,
  LITERACY_ENTRY_ROUTES,
  LITERACY_EVENT_NAMES,
  createCollectorHandler,
  isAnalyticsBatch,
  isLiteracyBatch,
  validateAnalyticsEvent,
  validateLiteracyEvent,
} from "../netlify-functions/dojo-analytics-collector.mjs";

// F2 `2026-09-10-entry-brief-instrumentation` (P4): o coletor espelha os
// novos nomes/props nos 2 validadores — OS v1 (+`mission.brief_viewed`,
// `activity.presented`) e literacy v2 (+`lesson_brief_viewed`,
// `activity_presented`, prop opcional `entry`). Envelope sem `entry`
// continua aceito (retro-compat); vocabulário aditivo apenas.

const SESSION = "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d";

function osEvent(overrides = {}) {
  return {
    schemaVersion: 1,
    eventId: "os-event-f2-1",
    name: "mission.brief_viewed",
    occurredAt: "2026-09-10T12:00:00.000Z",
    sequence: 1,
    dimensions: { installationId: "installation-1", sessionId: "session-1", engineId: "literacyDojo" },
    ...overrides,
  };
}

function literacyEvent(overrides = {}) {
  return {
    schemaVersion: 2,
    source: "literacydojo",
    event: "lesson_brief_viewed",
    eventId: "0f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
    sessionId: SESSION,
    occurredAt: "2026-09-10T12:00:00.000Z",
    contentVersion: "test-f2",
    props: { lessonId: "l02", lessonVersion: 3 },
    ...overrides,
  };
}

function post(handler, body) {
  return handler(
    new Request("https://site.example/__dojo/bridge/v1/analytics", {
      method: "POST",
      headers: { "sec-fetch-site": "same-origin" },
      body: JSON.stringify(body),
    }),
  );
}

test("OS v1: mission.brief_viewed e activity.presented são aceitos; vocabulário tem 14 nomes", () => {
  assert.equal(ANALYTICS_EVENT_NAMES.length, 14);
  assert.ok(ANALYTICS_EVENT_NAMES.includes("mission.brief_viewed"));
  assert.ok(ANALYTICS_EVENT_NAMES.includes("activity.presented"));
  assert.equal(validateAnalyticsEvent(osEvent()), true);
  assert.equal(
    validateAnalyticsEvent(osEvent({ eventId: "os-event-f2-2", name: "activity.presented", dimensions: { installationId: "installation-1", sessionId: "session-1", activityType: "choice" } })),
    true,
  );
  // activityType fora do vocabulário é rejeitado nos 2 lados da paridade.
  assert.equal(
    validateAnalyticsEvent(osEvent({ name: "activity.presented", dimensions: { installationId: "installation-1", sessionId: "session-1", activityType: "scroll" } })),
    false,
  );
  // brief sem dimensões próprias (só contexto enriquecido) é o formato válido.
  assert.deepEqual(EVENT_VOCABULARIES["mission.brief_viewed"], {});
});

test("literacy v2: lesson_brief_viewed e activity_presented são aceitos com props fechadas", () => {
  assert.equal(validateLiteracyEvent(literacyEvent()), true);
  assert.equal(
    validateLiteracyEvent(
      literacyEvent({
        event: "activity_presented",
        eventId: "1f1a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5c",
        props: { lessonId: "l02", activityType: "choice", activityIndex: 0 },
      }),
    ),
    true,
  );
  // activityIndex negativo / não inteiro e activityType fora do vocabulário.
  assert.equal(
    validateLiteracyEvent(
      literacyEvent({ event: "activity_presented", props: { lessonId: "l02", activityType: "choice", activityIndex: -1 } }),
    ),
    false,
  );
  assert.equal(
    validateLiteracyEvent(
      literacyEvent({ event: "activity_presented", props: { lessonId: "l02", activityType: "choice", activityIndex: 0.5 } }),
    ),
    false,
  );
  assert.equal(
    validateLiteracyEvent(
      literacyEvent({ event: "activity_presented", props: { lessonId: "l02", activityType: "scroll", activityIndex: 0 } }),
    ),
    false,
  );
  // brief sem lessonVersion (prop obrigatória) é rejeitado.
  assert.equal(
    validateLiteracyEvent(literacyEvent({ props: { lessonId: "l02" } })),
    false,
  );
});

test("entry_viewed: prop opcional `entry` com vocabulário fechado; ausência continua aceita (pré-v4)", () => {
  assert.deepEqual(LITERACY_ENTRY_ROUTES, ["home", "lesson-resume", "onboarding"]);
  // Sem a prop — envelope pré-v4 válido byte-a-byte.
  assert.equal(
    validateLiteracyEvent(literacyEvent({ event: "entry_viewed", props: {} })),
    true,
  );
  for (const entry of LITERACY_ENTRY_ROUTES) {
    assert.equal(
      validateLiteracyEvent(literacyEvent({ event: "entry_viewed", props: { entry } })),
      true,
      entry,
    );
  }
  assert.equal(
    validateLiteracyEvent(literacyEvent({ event: "entry_viewed", props: { entry: "deep-link" } })),
    false,
  );
  assert.equal(
    validateLiteracyEvent(literacyEvent({ event: "entry_viewed", props: { entry: "home", extra: 1 } })),
    false,
  );
});

test("o handler aceita batches end-to-end com os novos eventos dos 2 envelopes", async () => {
  const handler = createCollectorHandler({ backing: { append: async () => undefined, readRange: async () => [], prune: async () => undefined } });
  const osResponse = await post(handler, {
    schemaVersion: 1,
    events: [
      osEvent(),
      osEvent({ eventId: "os-event-f2-2", name: "activity.presented", dimensions: { installationId: "installation-1", sessionId: "session-1", activityType: "sort" } }),
    ],
  });
  assert.equal(osResponse.status, 202);
  assert.deepEqual((await osResponse.json()).acceptedEventIds, ["os-event-f2-1", "os-event-f2-2"]);

  const literacyResponse = await post(handler, {
    schemaVersion: 2,
    source: "literacydojo",
    events: [
      literacyEvent({ event: "entry_viewed", props: { entry: "lesson-resume" } }),
      literacyEvent(),
    ],
  });
  assert.equal(literacyResponse.status, 202);
  assert.equal((await literacyResponse.json()).acceptedEventIds.length, 2);
  assert.ok(isAnalyticsBatch({ schemaVersion: 1, events: [osEvent()] }));
  assert.ok(isLiteracyBatch({ schemaVersion: 2, source: "literacydojo", events: [literacyEvent()] }));
});

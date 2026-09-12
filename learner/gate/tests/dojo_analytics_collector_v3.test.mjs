import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  NdjsonFileSink,
  SURFACE_BATCH_SCHEMA_VERSION,
  SURFACE_EVENT_NAMES,
  SURFACE_EVENT_PROPS,
  SURFACE_RESULT_VALUES,
  SURFACE_SOURCES,
  createCollectorHandler,
  isSurfaceBatch,
  validateSurfaceEvent,
} from "../netlify-functions/dojo-analytics-collector.mjs";

// AID-987/T1b: o MESMO coletor AID-913 passa a aceitar o envelope anônimo
// "surfaces" v3 ({schemaVersion:3, source:"dojotoday"|"voxeldojo"|
// "pixelquest", events:[…]}) para o funil das superfícies programador
// (dojoToday/voxelDojo/PixelQuest). A emissão canônica vive em
// engines/shared/teaching-evidence/funnelTelemetry.ts; este teste trava o
// comportamento do lado recebedor E a paridade de vocabulário com o lado
// emissor (fail-closed em drift).

const FIXED_NOW = new Date("2026-09-07T12:00:00.000Z");
const SESSION = "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d";
const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");
const CANONICAL_EMITTER = join(
  REPO_ROOT,
  "engines",
  "shared",
  "teaching-evidence",
  "funnelTelemetry.ts",
);

function surfaceEvent(overrides = {}) {
  return {
    schemaVersion: 3,
    source: "voxeldojo",
    event: "voxel-loop-complete",
    eventId: "0f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
    sessionId: SESSION,
    occurredAt: "2026-09-07T12:00:00.000Z",
    props: { unitId: "U2-key-value-store", result: "completed" },
    ...overrides,
  };
}

function post(handler, body, headers = {}) {
  return handler(
    new Request("https://site.example/__dojo/bridge/v1/analytics", {
      method: "POST",
      headers: { "sec-fetch-site": "same-origin", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

test("aceita batch surfaces v3 válido e responde 202 com acceptedEventIds", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "collector-v3-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const handler = createCollectorHandler({
    backing: new NdjsonFileSink({ baseDir: dir }),
    now: FIXED_NOW,
  });
  const batch = {
    schemaVersion: SURFACE_BATCH_SCHEMA_VERSION,
    source: "dojotoday",
    events: [
      surfaceEvent({
        source: "dojotoday",
        event: "daily-view-open",
        props: {},
      }),
      surfaceEvent({
        eventId: "1f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
        source: "pixelquest",
        event: "pixelquest-encounter-complete",
        props: { unitId: "U0-sonda-rate-limiter-robustness", result: "failed" },
      }),
      surfaceEvent({
        eventId: "2f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
      }),
    ],
  };
  const response = await post(handler, batch);
  assert.equal(response.status, 202);
  const payload = await response.json();
  assert.equal(payload.acceptedEventIds.length, 3);
  const stored = await readFile(
    join(dir, `events-${FIXED_NOW.toISOString().slice(0, 10)}.ndjson`),
    "utf8",
  );
  assert.equal(stored.trim().split("\n").length, 3);
});

test("validação fail-closed: PII/free-text, prop indevida, vocabulário e formato", () => {
  // prop fora do vocabulário fechado do evento
  assert.equal(validateSurfaceEvent(surfaceEvent({ props: { unitId: "U2-key-value-store", result: "completed", freeText: "oi" } })), false);
  // texto livre em unitId (padrão de identificador seguro violado)
  assert.equal(validateSurfaceEvent(surfaceEvent({ props: { unitId: "lixo com espaço", result: "completed" } })), false);
  // resultado fora do vocabulário
  assert.equal(validateSurfaceEvent(surfaceEvent({ props: { unitId: "U2-key-value-store", result: "almost" } })), false);
  // source não declarado
  assert.equal(validateSurfaceEvent(surfaceEvent({ source: "minitown" })), false);
  // evento desconhecido
  assert.equal(validateSurfaceEvent(surfaceEvent({ event: "daily-view-close" })), false);
  // identidades não-uuid
  assert.equal(validateSurfaceEvent(surfaceEvent({ eventId: "not-a-uuid" })), false);
  assert.equal(validateSurfaceEvent(surfaceEvent({ sessionId: "not-a-uuid" })), false);
  // timestamp inválido
  assert.equal(validateSurfaceEvent(surfaceEvent({ occurredAt: "não é data" })), false);
  // prop obrigatória ausente (unitId de evidence-handoff)
  assert.equal(validateSurfaceEvent(surfaceEvent({ event: "evidence-handoff", props: {} })), false);
  // daily-view-open não aceita props
  assert.equal(validateSurfaceEvent(surfaceEvent({ event: "daily-view-open", props: {} })), true);
  assert.equal(validateSurfaceEvent(surfaceEvent({ event: "daily-view-open", props: { unitId: "U2-key-value-store" } })), false);
});

test("aceitação parcial e batch inválido", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "collector-v3-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const handler = createCollectorHandler({
    backing: new NdjsonFileSink({ baseDir: dir }),
    now: FIXED_NOW,
  });
  const response = await post(handler, {
    schemaVersion: SURFACE_BATCH_SCHEMA_VERSION,
    source: "voxeldojo",
    events: [
      surfaceEvent(),
      surfaceEvent({ eventId: "3f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b", props: { unitId: "U2-key-value-store", result: "nope" } }),
    ],
  });
  assert.equal(response.status, 202);
  assert.equal((await response.json()).acceptedEventIds.length, 1);

  // source inválido no envelope: não é batch surfaces nem outro envelope → 422
  assert.equal(isSurfaceBatch({ schemaVersion: 3, source: "minitown", events: [surfaceEvent()] }), false);
  const unknown = await post(handler, { schemaVersion: 3, source: "minitown", events: [surfaceEvent()] });
  assert.equal(unknown.status, 422);
});

test("cross-site continua proibido para o envelope v3", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "collector-v3-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const handler = createCollectorHandler({
    backing: new NdjsonFileSink({ baseDir: dir }),
    now: FIXED_NOW,
  });
  const response = await post(
    handler,
    { schemaVersion: SURFACE_BATCH_SCHEMA_VERSION, source: "dojotoday", events: [surfaceEvent({ source: "dojotoday", event: "daily-view-open", props: {} })] },
    { "sec-fetch-site": "cross-site" },
  );
  assert.equal(response.status, 403);
});

test("paridade de vocabulário com o emissor canônico (funnelTelemetry.ts)", async () => {
  const canonical = await readFile(CANONICAL_EMITTER, "utf8");
  const extractList = (name) => {
    const match = canonical.match(new RegExp(`${name}[^=]*=\\s*\\[([^\\]]+)\\]`));
    assert.ok(match !== null, `${name} não encontrado no emissor canônico`);
    return match[1]
      .split(",")
      .map((item) => item.trim().replace(/^"|"$/g, ""))
      .filter((item) => item.length > 0);
  };
  assert.deepEqual(
    extractList("export const FUNNEL_SOURCES"),
    [...SURFACE_SOURCES],
    "fontes divergem entre emissor e coletor",
  );
  assert.deepEqual(
    extractList("export const FUNNEL_EVENT_NAMES"),
    [...SURFACE_EVENT_NAMES],
    "nomes de evento divergem entre emissor e coletor",
  );
  assert.deepEqual(
    extractList("export const FUNNEL_RESULT_VALUES"),
    [...SURFACE_RESULT_VALUES],
    "valores de result divergem entre emissor e coletor",
  );
  // Props por evento: extrai o objeto FUNNEL_EVENT_PROPS literal do emissor.
  const propsBlock = canonical.match(/export const FUNNEL_EVENT_PROPS[^{]*(\{[\s\S]*?\n\})/);
  assert.ok(propsBlock !== null, "FUNNEL_EVENT_PROPS não encontrado no emissor canônico");
  for (const name of SURFACE_EVENT_NAMES) {
    const entry = propsBlock[1].match(new RegExp(`"${name}":\\s*\\[([^\\]]*)\\]`));
    assert.ok(entry !== null, `props de ${name} ausentes no emissor canônico`);
    const emitterProps = entry[1]
      .split(",")
      .map((item) => item.trim().replace(/^"|"$/g, ""))
      .filter((item) => item.length > 0);
    assert.deepEqual(
      emitterProps,
      [...SURFACE_EVENT_PROPS[name]],
      `props de ${name} divergem entre emissor e coletor`,
    );
  }
});

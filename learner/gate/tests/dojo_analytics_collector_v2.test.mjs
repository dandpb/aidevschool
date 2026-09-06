import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  BlobsEventStore,
  NdjsonFileSink,
  createCollectorHandler,
  isLiteracyBatch,
  validateLiteracyEvent,
} from "../netlify-functions/dojo-analytics-collector.mjs";

// Ativação AID-913: o coletor same-origin passa a aceitar TAMBÉM o envelope
// literacy v2 ({schemaVersion:2, source:"literacydojo", events:[…]}), com
// paridade com engines/literacyDojo/src/domain/analytics.ts, backing durável
// idempotente por eventId e export GET protegido por Bearer token.

const FIXED_NOW = new Date("2026-09-07T12:00:00.000Z");
const SESSION = "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d";

function literacyEvent(overrides = {}) {
  return {
    schemaVersion: 2,
    source: "literacydojo",
    event: "lesson_started",
    eventId: "0f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
    sessionId: SESSION,
    occurredAt: "2026-09-07T12:00:00.000Z",
    contentVersion: "test-v2",
    props: { lessonId: "l01", lessonVersion: 2 },
    ...overrides,
  };
}

function osEvent(overrides = {}) {
  return {
    schemaVersion: 1,
    eventId: "os-event-1",
    name: "onboarding.started",
    occurredAt: "2026-09-07T12:00:00.000Z",
    sequence: 1,
    dimensions: { installationId: "install-1", sessionId: "sess-1" },
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

test("aceita batch literacy v2 válido e responde 202 com acceptedEventIds", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "collector-v2-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const handler = createCollectorHandler({
    backing: new NdjsonFileSink({ baseDir: dir }),
    now: FIXED_NOW,
  });
  const batch = {
    schemaVersion: 2,
    source: "literacydojo",
    events: [
      literacyEvent(),
      literacyEvent({
        eventId: "1f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
        event: "activity_attempted",
        props: { lessonId: "l01", activityType: "choice", passed: false },
      }),
    ],
  };
  const response = await post(handler, batch);
  assert.equal(response.status, 202);
  const payload = await response.json();
  assert.deepEqual(payload.acceptedEventIds, [batch.events[0].eventId, batch.events[1].eventId]);
  const stored = await readFile(
    join(dir, `events-${FIXED_NOW.toISOString().slice(0, 10)}.ndjson`),
    "utf8",
  );
  assert.equal(stored.trim().split("\n").length, 2);
});

test("aceitação parcial: evento literacy inválido não é anexado", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "collector-v2-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const handler = createCollectorHandler({
    backing: new NdjsonFileSink({ baseDir: dir }),
    now: FIXED_NOW,
  });
  const response = await post(handler, {
    schemaVersion: 2,
    source: "literacydojo",
    events: [
      literacyEvent(),
      literacyEvent({ sessionId: "not-a-uuid" }),
      literacyEvent({ event: "activity_attempted", props: { lessonId: "l01", activityType: "free_text", passed: true } }),
      literacyEvent({ props: { lessonId: "l01", freeText: "tentativa de vazamento" } }),
    ],
  });
  assert.equal(response.status, 202);
  const payload = await response.json();
  assert.equal(payload.acceptedEventIds.length, 1);
});

test("envelope desconhecido continua 422 unsupported-schema", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "collector-v2-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const handler = createCollectorHandler({
    backing: new NdjsonFileSink({ baseDir: dir }),
    now: FIXED_NOW,
  });
  const response = await post(handler, { schemaVersion: 3, events: [literacyEvent()] });
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error, "unsupported-schema");
});

test("export GET exige Bearer token e devolve NDJSON do intervalo", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "collector-v2-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const backing = new NdjsonFileSink({ baseDir: dir });
  const handler = createCollectorHandler({ backing, exportToken: "secret-token", now: FIXED_NOW });
  await post(handler, {
    schemaVersion: 2,
    source: "literacydojo",
    events: [literacyEvent()],
  });

  const url = "https://site.example/__dojo/bridge/v1/analytics";
  const noToken = await handler(new Request(url, { method: "GET" }));
  assert.equal(noToken.status, 401);
  const wrongToken = await handler(
    new Request(url, { method: "GET", headers: { authorization: "Bearer wrong" } }),
  );
  assert.equal(wrongToken.status, 401);

  const disabled = createCollectorHandler({
    backing,
    exportToken: undefined,
    now: FIXED_NOW,
  });
  assert.equal((await disabled(new Request(url, { method: "GET" }))).status, 404);

  const ok = await handler(
    new Request(url, {
      method: "GET",
      headers: { authorization: "Bearer secret-token" },
    }),
  );
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("content-type"), "application/x-ndjson");
  const lines = (await ok.text()).trim().split("\n");
  assert.equal(lines.length, 1);
  assert.deepEqual(JSON.parse(lines[0]).props, { lessonId: "l01", lessonVersion: 2 });
});

test("BlobsEventStore é idempotente por dia/eventId e serve o export", async (t) => {
  const blobs = new Map();
  const fakeStore = {
    async setJSON(key, value) {
      blobs.set(key, JSON.stringify(value));
    },
    async get(key) {
      return blobs.get(key) ?? null;
    },
    async list({ prefix } = {}) {
      const keys = [...blobs.keys()].filter((key) => !prefix || key.startsWith(prefix));
      return { blobs: keys.map((key) => ({ key })) };
    },
    async delete(key) {
      blobs.delete(key);
    },
  };
  const store = new BlobsEventStore({ store: fakeStore });
  const event = literacyEvent();
  await store.append([event], FIXED_NOW);
  await store.append([event], FIXED_NOW); // corrida beacon+fetch: mesma chave
  assert.equal(blobs.size, 1);
  const lines = await store.readRange("2026-09-07", "2026-09-07");
  assert.equal(lines.length, 1);
  assert.deepEqual(JSON.parse(lines[0]), event);
});

// AID-961: a semântica do Blobs EDGE API de produção é o INVERSO do servidor
// local @netlify/blobs/server usado na prova do PR #280 — no edge,
// `directories:true` é listing DELIMITADO (0 blobs aninhados) e o flat COM
// prefixo é recursivo; no servidor local, `directories:true` é recursivo e o
// flat COM prefixo devolve VAZIO. O defeito live (export com 0 linhas nas 2
// superfícies, pin c2937e55) veio do readRange acreditar na semântica local.
// A única forma portável (recursiva e idêntica nas duas implementações) é o
// scan flat SEM prefixo + filtro de dia no cliente. Este fake EMULA o edge e
// falha fechado se qualquer caminho de leitura reintroduzir `directories` ou
// `prefix` na listagem.
function edgeSemanticsFakeStore(blobs, violations) {
  const keysMatching = (prefix) => [...blobs.keys()].filter((key) => !prefix || key.startsWith(prefix));
  return {
    async setJSON(key, value) {
      blobs.set(key, JSON.stringify(value));
    },
    async get(key) {
      return blobs.get(key) ?? null;
    },
    async list(options = {}) {
      const prefix = options.prefix ?? "";
      if (options.directories) {
        violations.push(`list({prefix:${JSON.stringify(prefix)}, directories:true}) — SEMÂNTICA EDGE: delimitado, devolve 0 blobs aninhados`);
        // Edge real (probe AID-961, drafts 6a9dbcbd…/6a9dbd4bd…): só entradas
        // de diretório do nível imediato, nenhum blob recursivo.
        const suffixes = new Set();
        for (const key of keysMatching(prefix)) {
          const rest = key.slice(prefix.length).replace(/^\//, "");
          const slash = rest.indexOf("/");
          suffixes.add(slash === -1 ? rest : `${rest.slice(0, slash)}/`);
        }
        return { blobs: [], directories: [...suffixes] };
      }
      if (prefix !== "") {
        // Servidor local real (probe first-hand AID-961): flat com prefixo
        // devolve VAZIO — depender disso aqui esconderia o defeito do CI.
        return { blobs: [] };
      }
      // Flat SEM prefixo = recursivo nas duas implementações (paginável por
      // cursor na API real) — a única forma portável.
      return { blobs: keysMatching("").map((key) => ({ key })) };
    },
    async delete(key) {
      blobs.delete(key);
    },
  };
}

test("AID-961: readRange usa scan flat SEM prefixo — nunca directories/prefix (semântica edge)", async () => {
  const blobs = new Map();
  const violations = [];
  const store = new BlobsEventStore({ store: edgeSemanticsFakeStore(blobs, violations) });
  await store.append([literacyEvent()], FIXED_NOW);
  await store.append([osEvent()], FIXED_NOW);
  const lines = await store.readRange("2026-09-07", "2026-09-07");
  assert.deepEqual(violations, [], "readRange não pode usar directories/prefix na listagem — semântica divergente entre edge e servidor local");
  assert.equal(lines.length, 2, "export deve servir os 2 envelopes (os + literacy) pelo scan flat com filtro de dia no cliente");
});

test("AID-961: prune também lista FLAT — sem directories:true — e deleta só fora da janela", async () => {
  const blobs = new Map();
  const violations = [];
  const store = new BlobsEventStore({
    store: edgeSemanticsFakeStore(blobs, violations),
    retentionDays: 90,
  });
  const oldDay = "2026-06-01";
  await store.append([literacyEvent()], new Date(`${oldDay}T12:00:00.000Z`));
  await store.append([literacyEvent({ eventId: "0f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5c" })], FIXED_NOW);
  await store.prune(FIXED_NOW);
  assert.deepEqual(violations, [], "prune não pode passar directories:true — varredura do store é a listagem flat");
  assert.deepEqual([...blobs.keys()].filter((key) => key.startsWith(oldDay)), [], "blob fora da janela de retenção deve ser deletado");
  assert.equal(blobs.size, 1, "blob dentro da janela permanece");
});

test("paridade: validateLiteracyEvent rejeita o que o emissor considera inválido", () => {
  assert.equal(validateLiteracyEvent(literacyEvent()), true);
  assert.equal(validateLiteracyEvent(literacyEvent({ source: "os" })), false);
  assert.equal(validateLiteracyEvent(literacyEvent({ event: "mastered" })), false);
  assert.equal(
    validateLiteracyEvent(
      literacyEvent({ event: "lesson_completed", props: { lessonId: "l01", lessonVersion: 2 } }),
    ),
    false,
  ); // score obrigatório ausente
  assert.equal(isLiteracyBatch({ schemaVersion: 2, source: "literacydojo", events: [literacyEvent()] }), true);
  assert.equal(isLiteracyBatch({ schemaVersion: 2, source: "literacydojo", events: [] }), false);
});

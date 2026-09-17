import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYTICS_EVENT_NAMES,
  CONTEXT_KEYS,
  CONTEXT_VOCABULARIES,
  EVENT_VOCABULARIES,
  LITERACY_ACTIVITY_TYPES,
  LITERACY_EVENT_NAMES,
  LITERACY_EVENT_PROPS,
  LITERACY_ENTRY_ROUTES,
  LITERACY_OPTIONAL_PROPS,
  SURFACE_EVENT_NAMES,
  SURFACE_EVENT_PROPS,
  SURFACE_RESULT_VALUES,
  SURFACE_SOURCES,
  validateAnalyticsEvent,
  validateLiteracyEvent,
  validateSurfaceEvent,
} from "../netlify-functions/dojo-analytics-collector.mjs";
import {
  loadVocabularies,
  parseVocabularyJson,
} from "../analytics/refresh_vocabularies.mjs";

// Consolidação dos emissores de analytics (2026-09-13): os vocabulários dos
// 3 envelopes são autoridade ÚNICA em
// engines/shared/teaching-evidence/vocabularies/{surfaces,literacy,os}.json.
// O coletor não pode importar fora do diretório de funções (deploy), então
// suas tabelas são GERADAS dos JSONs (refresh_vocabularies.mjs) e ESTE teste
// trava a igualdade TOTAL JSON↔tabelas + a direção da validação: um probe
// construído a partir de uma entrada do JSON é aceito; um probe com prop
// AUSENTE do JSON é rejeitado. Adicionar um evento novo passa a ser editar
// 1 JSON + rodar o refresh — o coletor segue sem edição manual.

const EVENT_ID = "0f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b";
const SESSION_ID = "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d";
const OCCURRED_AT = "2026-09-13T12:00:00.000Z";

const vocabularies = await loadVocabularies();
const { surfaces, literacy, os } = vocabularies;

function surfaceProbeProps(event) {
  const props = {};
  for (const key of surfaces.eventProps[event]) {
    props[key] = key === "result" ? surfaces.resultValues[0] : "U2-key-value-store";
  }
  return props;
}

function surfaceProbe(event, extraProps = {}) {
  return {
    schemaVersion: 3,
    source: surfaces.sources[0],
    event,
    eventId: EVENT_ID,
    sessionId: SESSION_ID,
    occurredAt: OCCURRED_AT,
    props: { ...surfaceProbeProps(event), ...extraProps },
  };
}

const LITERACY_PROP_VALUES = () => ({
  lessonId: "l01",
  lessonVersion: 1,
  score: 1,
  durationSeconds: 60,
  activityType: literacy.activityTypes[0],
  passed: true,
  route: "guided",
  intervalDays: 7,
  stage: 1,
  activityIndex: 0,
  entry: literacy.entryRoutes[0],
});

function literacyProbe(event, extraProps = {}) {
  const values = LITERACY_PROP_VALUES();
  const props = {};
  for (const key of literacy.eventProps[event]) {
    props[key] = values[key];
  }
  return {
    schemaVersion: 2,
    source: "literacydojo",
    event,
    eventId: EVENT_ID,
    sessionId: SESSION_ID,
    occurredAt: OCCURRED_AT,
    contentVersion: "vocabularies-test",
    props: { ...props, ...extraProps },
  };
}

function osProbe(name, extraDimensions = {}) {
  const dimensions = { installationId: "installation-1", sessionId: "session-1" };
  for (const [key, values] of Object.entries(os.eventVocabularies[name])) {
    dimensions[key] = values[0];
  }
  return {
    schemaVersion: 1,
    eventId: "vocabularies-probe-1",
    name,
    occurredAt: OCCURRED_AT,
    sequence: 1,
    dimensions: { ...dimensions, ...extraDimensions },
  };
}

test("surfaces vocabulary drives validator", () => {
  // Igualdade TOTAL (não amostrada) JSON↔tabelas derivadas do coletor.
  assert.deepEqual(SURFACE_EVENT_NAMES, surfaces.eventNames, "SURFACE_EVENT_NAMES deve espelhar surfaces.json");
  assert.deepEqual(SURFACE_SOURCES, surfaces.sources, "SURFACE_SOURCES deve espelhar surfaces.json");
  assert.deepEqual(SURFACE_EVENT_PROPS, surfaces.eventProps, "SURFACE_EVENT_PROPS deve espelhar surfaces.json");
  assert.deepEqual(SURFACE_RESULT_VALUES, surfaces.resultValues, "SURFACE_RESULT_VALUES deve espelhar surfaces.json");

  for (const event of surfaces.eventNames) {
    assert.equal(
      validateSurfaceEvent(surfaceProbe(event)),
      true,
      `probe construído de surfaces.json["${event}"] deve ser aceito`,
    );
    const rejected = validateSurfaceEvent(surfaceProbe(event, { __not_in_vocabulary__: "x" }));
    assert.equal(
      rejected,
      false,
      `probe com prop ausente de surfaces.json["${event}"] deve ser rejeitado (prop desconhecida)`,
    );
  }
});

test("literacy vocabulary drives validator", () => {
  assert.deepEqual(LITERACY_EVENT_NAMES, literacy.eventNames, "LITERACY_EVENT_NAMES deve espelhar literacy.json");
  assert.deepEqual(LITERACY_ENTRY_ROUTES, literacy.entryRoutes, "LITERACY_ENTRY_ROUTES deve espelhar literacy.json");
  assert.deepEqual(LITERACY_ACTIVITY_TYPES, literacy.activityTypes, "LITERACY_ACTIVITY_TYPES deve espelhar literacy.json");
  assert.deepEqual(LITERACY_EVENT_PROPS, literacy.eventProps, "LITERACY_EVENT_PROPS deve espelhar literacy.json");
  assert.deepEqual(LITERACY_OPTIONAL_PROPS, literacy.optionalProps, "LITERACY_OPTIONAL_PROPS deve espelhar literacy.json");

  for (const event of literacy.eventNames) {
    assert.equal(
      validateLiteracyEvent(literacyProbe(event)),
      true,
      `probe construído de literacy.json["${event}"] deve ser aceito`,
    );
    const rejected = validateLiteracyEvent(literacyProbe(event, { __not_in_vocabulary__: 1 }));
    assert.equal(
      rejected,
      false,
      `probe com prop ausente de literacy.json["${event}"] deve ser rejeitado (prop desconhecida)`,
    );
  }
});

test("os vocabulary drives validator", () => {
  assert.deepEqual(ANALYTICS_EVENT_NAMES, os.eventNames, "ANALYTICS_EVENT_NAMES deve espelhar os.json");
  assert.deepEqual(EVENT_VOCABULARIES, os.eventVocabularies, "EVENT_VOCABULARIES deve espelhar os.json");
  assert.deepEqual(CONTEXT_KEYS, os.contextKeys, "CONTEXT_KEYS deve espelhar os.json");
  assert.deepEqual(CONTEXT_VOCABULARIES, os.contextVocabularies, "CONTEXT_VOCABULARIES deve espelhar os.json");

  for (const name of os.eventNames) {
    assert.equal(
      validateAnalyticsEvent(osProbe(name)),
      true,
      `probe construído de os.json["${name}"] deve ser aceito`,
    );
    const rejected = validateAnalyticsEvent(osProbe(name, { __not_in_vocabulary__: "x" }));
    assert.equal(
      rejected,
      false,
      `probe com dimensão ausente de os.json["${name}"] deve ser rejeitado (prop desconhecida)`,
    );
  }
});

test("a fonte única falha fechado: chave duplicada num JSON de vocabulário é rejeitada", () => {
  // O "loader" é o par refresh_vocabularies.mjs + este teste: JSON.parse
  // colapsaria duplicatas silenciosamente; o parser estrito falha alto.
  assert.throws(() => parseVocabularyJson('{"eventNames":["a"],"eventNames":["b"]}', "dupe"), /duplicate key/);
  // Estrutura: cada tabela por-evento cobre exatamente os eventNames declarados.
  const sameKeySet = (table, names, file) => {
    assert.deepEqual(
      Object.keys(table).sort(),
      [...names].sort(),
      `${file}: chaves da tabela devem ser exatamente os eventNames`,
    );
  };
  sameKeySet(surfaces.eventProps, surfaces.eventNames, "surfaces.json");
  sameKeySet(literacy.eventProps, literacy.eventNames, "literacy.json");
  sameKeySet(literacy.optionalProps, literacy.eventNames, "literacy.json");
  sameKeySet(os.eventVocabularies, os.eventNames, "os.json");
});

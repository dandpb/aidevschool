import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { BlobsEventStore } from "../netlify-functions/dojo-analytics-collector.mjs";

// AID-961 (defect do redeploy AID-960/AID-956, pin c2937e55): o export live
// devolvia 0 linhas nas 2 superfícies. O `readRange` do PR #280 passava
// `directories:true` acreditando na semântica do servidor local
// `@netlify/blobs/server` (recursivo com a flag); no Blobs EDGE API de
// produção a semântica é a INVERSA — `directories:true` é listing DELIMITADO
// (0 blobs aninhados) — e o flat COM prefixo, que a issue mandava usar,
// devolve VAZIO no servidor local (probe first-hand:
// intent/AID-961-collector-export-flat-listing/evidence/local-server-listing-semantics.txt):
//
//   forma de list             servidor local     edge (produção)
//   flat, sem prefixo         todas as chaves    todas as chaves   <- portável
//   flat, com prefixo do dia  vazio              recursivo
//   directories:true          recursivo          delimitado, 0 blobs
//
// Este arquivo trava as invariantes do fix: os caminhos de leitura usam
// apenas o scan flat SEM prefixo (filtro de dia no cliente, como o prune),
// e os gaps de deploy da mesma onda (deps no staging; declarações fora do
// diretório deployável) não regrediem.

const ROOT = join(import.meta.dirname, "..", "..", "..");
const CANONICAL_FUNCTIONS = join(ROOT, "learner", "gate", "netlify-functions");
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
    contentVersion: "test-a961",
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

// Fake que EMULA as semânticas divergentes: `directories:true` = edge
// (delimitado, 0 blobs aninhados — probes live drafts 6a9dbcbd…/6a9dbd4bd…);
// flat com prefixo = servidor local (vazio); flat sem prefixo = recursivo nas
// duas implementações. Qualquer uso das formas divergentes é registrado como
// violação e falha o teste.
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
        const suffixes = new Set();
        for (const key of keysMatching(prefix)) {
          const rest = key.slice(prefix.length).replace(/^\//, "");
          const slash = rest.indexOf("/");
          suffixes.add(slash === -1 ? rest : `${rest.slice(0, slash)}/`);
        }
        return { blobs: [], directories: [...suffixes] };
      }
      if (prefix !== "") {
        violations.push(`list({prefix:${JSON.stringify(prefix)}}) — flat com prefixo devolve VAZIO no servidor local (semântica divergente)`);
        return { blobs: [] };
      }
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

test("AID-961: readRange filtra o intervalo de dias no cliente (scan do store inteiro)", async () => {
  const blobs = new Map();
  const violations = [];
  const store = new BlobsEventStore({ store: edgeSemanticsFakeStore(blobs, violations) });
  await store.append([literacyEvent()], new Date("2026-09-06T12:00:00.000Z"));
  await store.append([literacyEvent({ eventId: "0f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5c" })], new Date("2026-09-07T12:00:00.000Z"));
  const lines = await store.readRange("2026-09-07", "2026-09-07");
  assert.equal(lines.length, 1, "somente o dia pedido entra no export");
  assert.ok(lines[0].includes("0c1d2e3f4a5c"));
});

test("AID-961: prune também lista FLAT — sem directories/prefix — e deleta só fora da janela", async () => {
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
  assert.deepEqual(violations, [], "prune não pode usar directories/prefix na listagem — varredura do store é o scan flat");
  assert.deepEqual([...blobs.keys()].filter((key) => key.startsWith(oldDay)), [], "blob fora da janela de retenção deve ser deletado");
  assert.equal(blobs.size, 1, "blob dentro da janela permanece");
});

test("AID-961: o diretório canônico de funções é DEPLOYÁVEL — sem declarações .d.* (422 do deploy CLI)", async () => {
  const entries = await readdir(CANONICAL_FUNCTIONS, { withFileTypes: true });
  const declarations = entries
    .filter((entry) => entry.isFile() && /\.d\.(m|c)?(ts|js)$/.test(entry.name))
    .map((entry) => entry.name);
  assert.deepEqual(
    declarations,
    [],
    "declarações de tipo no dir de funções fazem o deploy CLI do literacy rejeitar TODO o diretório com 422 Incorrect function names — mantenha-as em learner/gate/analytics/ (padrão AID-961)",
  );
});

test("AID-961: o staging do OS embarca lockfile e instala as deps das funções (build-pilot-bundle.mjs)", async () => {
  const staging = await readFile(join(ROOT, "engines", "codexdojo-os-prototype", "scripts", "build-pilot-bundle.mjs"), "utf8");
  assert.ok(staging.includes("'package-lock.json'"), "staging deve copiar o package-lock.json para netlify/functions");
  // Deploy gap (a): `netlify deploy` resolve @netlify/blobs no bundle time e
  // falhou com "Could not resolve" sem install prévio — o staging é quem
  // instala as deps das funções (npm ci pinado pelo lockfile).
  assert.match(
    staging,
    /spawnSync\('npm', \['ci', '--ignore-scripts', '--no-audit', '--no-fund'\]/,
    "staging deve rodar npm ci dentro de netlify/functions (AID-961)",
  );
});

test("AID-961: nenhuma chamada store.list do coletor usa directories (barreira estática)", async () => {
  const collector = await readFile(join(CANONICAL_FUNCTIONS, "dojo-analytics-collector.mjs"), "utf8");
  // O comportamento é travado ponta-a-ponta em verify_deployed_blobs.mjs
  // (probe com o edge emulado) e nos testes acima; este scan é a barreira
  // estática de cheap-fail no review.
  assert.doesNotMatch(
    collector,
    /\.list\(\{[^}]*directories/,
    "store.list com directories tem semântica divergente edge vs servidor local (defect AID-961) — use o scan flat sem prefixo",
  );
});

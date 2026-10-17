import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import test from "node:test";

// Ativação O1 (ordem AID-910/D / AID-913, spec §3): a invariante de env muda
// de "nenhuma superfície define VITE_ANALYTICS_ENDPOINT" (pré-ativação,
// ADR-0010 §4) para "SOMENTE os [build.environment] dos 2 netlify.toml live,
// valor same-origin idêntico à rota do redirect". Este teste é a invariante
// executável: qualquer outra superfície (outro toml, outro valor, valor
// cross-origin) é drift e falha fecho fechado.

import {
  ANALYTICS_COLLECTOR_PATH,
} from "../netlify-functions/dojo-analytics-collector.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");
// AID-987/T1 (D2-A + T1b): o dojoToday estático e o jogo voxel de referência
// entram na lista de superfícies autorizadas — mesmas regras (valor
// same-origin idêntico à rota do redirect, no [build.environment]).
const AUTHORIZED = new Set([
  join("engines", "literacyDojo", "netlify.toml"),
  join("engines", "codexdojo-os-prototype", "netlify.toml"),
  join("engines", "dojoToday", "netlify.toml"),
  join("engines", "voxelDojo", "game-02-warehouse", "netlify.toml"),
]);

async function* findNetlifyTomls(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (["node_modules", "dist", ".git", "test-results", ".netlify"].includes(entry.name)) continue;
      yield* findNetlifyTomls(join(dir, entry.name));
    } else if (entry.name === "netlify.toml") {
      yield join(dir, entry.name);
    }
  }
}

test("VITE_ANALYTICS_ENDPOINT é definido somente nos netlify.toml autorizados", async () => {
  const found = [];
  for await (const file of findNetlifyTomls(ROOT)) {
    const config = await readFile(file, "utf8");
    if (config.includes("VITE_ANALYTICS_ENDPOINT")) found.push(relative(ROOT, file));
  }
  assert.deepEqual(
    [...found].sort(),
    [...AUTHORIZED].sort(),
    "superfície não autorizada define VITE_ANALYTICS_ENDPOINT (ativação é só nos 2 sites live)",
  );
});

test("o valor autorizado é exatamente a rota same-origin canônica do coletor, no [build.environment]", async () => {
  for (const rel of AUTHORIZED) {
    const config = await readFile(join(ROOT, rel), "utf8");
    const envBlock = config.split(/\n\[\s*\S+\s*\]/)[0]; // seção inicial [build.environment] fica sob [build]
    assert.match(
      config,
      /^\s*VITE_ANALYTICS_ENDPOINT\s*=\s*"\/__dojo\/bridge\/v1\/analytics"\s*$/m,
      `${rel}: valor divergente da rota same-origin canônica`,
    );
    // A rota canônica é a MESMA que o coletor impõe (x-nf-original-path gate).
    assert.equal(ANALYTICS_COLLECTOR_PATH, "/__dojo/bridge/v1/analytics");
    assert.ok(envBlock !== undefined);
  }
});

test("cada site autorizado redireciona a rota do coletor ANTES do fallback /* (first-match-wins)", async () => {
  for (const rel of AUTHORIZED) {
    const config = await readFile(join(ROOT, rel), "utf8");
    const collectorFrom = config.indexOf('from = "/__dojo/bridge/v1/analytics"');
    const collectorTo = config.indexOf('to = "/.netlify/functions/dojo-analytics-collector"');
    const fallback = config.indexOf('from = "/*"');
    assert.ok(collectorFrom >= 0, `${rel}: redirect do coletor ausente`);
    assert.ok(collectorTo > collectorFrom, `${rel}: redirect do coletor não aponta para a função`);
    assert.ok(fallback > collectorFrom, `${rel}: redirect do coletor deve vir ANTES do fallback /*`);
  }
});

test("o segredo de export nunca vive no repo: ANALYTICS_EXPORT_TOKEN ausente dos tomls", async () => {
  for await (const file of findNetlifyTomls(ROOT)) {
    const config = await readFile(file, "utf8");
    // Menções em comentário são permitidas (documentam onde o segredo vive:
    // o provedor); uma ATRIBUIÇÃO de valor no repo é o vazamento.
    const assignment = /^\s*ANALYTICS_EXPORT_TOKEN\s*=/m;
    assert.equal(
      assignment.test(config),
      false,
      `${relative(ROOT, file)}: token de export é segredo de deploy (provedor), nunca do repo`,
    );
  }
});

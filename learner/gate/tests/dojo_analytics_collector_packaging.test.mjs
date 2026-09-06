import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

// AID-947 (defecto de durabilidade do countersign AID-940): o backing live do
// coletor era o NDJSON /tmp efêmero nas 2 superfícies porque (1) a dependência
// @netlify/blobs nunca era empacotada — import dinâmico de bare specifier é
// opaco ao bundler de funções — e (2) o default export deployado construía o
// handler SEM backing. Este teste é a invariante executável de empacotamento:
// qualquer regressão nesse caminho (dependência ausente, wrapper sem import
// estático, projeção OS dessincronizada, default export sem seleção durável)
// falha fechado aqui, antes do deploy.

const ROOT = join(import.meta.dirname, "..", "..", "..");
const CANONICAL_FUNCTIONS = join(ROOT, "learner", "gate", "netlify-functions");
const STAGED_FUNCTIONS = join(ROOT, "engines", "codexdojo-os-prototype", "netlify", "functions");
const BLOBS_MODULE = "@netlify/blobs";

async function readText(path) {
  return readFile(path, "utf8");
}

test("o diretório canônico de funções declara @netlify/blobs com versão exata", async () => {
  const manifest = JSON.parse(await readText(join(CANONICAL_FUNCTIONS, "package.json")));
  const version = manifest.dependencies?.[BLOBS_MODULE];
  assert.equal(typeof version, "string", "package.json das funções deve declarar dependencies['@netlify/blobs']");
  assert.match(
    version,
    /^\d+\.\d+\.\d+$/,
    "versão deve ser pin exato (sem ranges) para bundle de função reproduzível",
  );
});

test("o wrapper netlify-blobs-runtime.mjs é o ÚNICO import estático de @netlify/blobs do repo", async () => {
  const wrapper = await readText(join(CANONICAL_FUNCTIONS, "netlify-blobs-runtime.mjs"));
  assert.match(
    wrapper,
    new RegExp(`export \\{ getStore \\} from "${BLOBS_MODULE.replace("/", "\\/")}"`),
    "wrapper deve reexportar getStore via import estático (traçável pelo bundler)",
  );
});

test("o coletor carrega o cliente Blobs pelo wrapper (import dinâmico, nunca bare specifier)", async () => {
  const collector = await readText(join(CANONICAL_FUNCTIONS, "dojo-analytics-collector.mjs"));
  assert.ok(
    !collector.includes('import("@netlify/blobs"') && !collector.includes(`"${BLOBS_MODULE}"`),
    "coletor não deve importar @netlify/blobs por bare specifier (opaco ao bundler — AID-947)",
  );
  assert.match(
    collector,
    /import\(\s*\/\* @vite-ignore \*\/\s*"\.\/netlify-blobs-runtime\.mjs"\s*\)/,
    "BlobsEventStore.create deve carregar o wrapper dinamicamente (fallback gracioso em vite/vitest)",
  );
});

test("o default export deployado seleciona o backing durável (createAnalyticsBacking)", async () => {
  const collector = await readText(join(CANONICAL_FUNCTIONS, "dojo-analytics-collector.mjs"));
  assert.match(
    collector,
    /export default async function deployedHandler/,
    "default export deve ser o handler deployado com seleção de backing",
  );
  assert.match(
    collector,
    /createAnalyticsBacking\(\)\.then\(\(\{ store \}\) =>\s*createCollectorHandler\(\{ backing: store \}\)\)/,
    "default export deve construir o handler com o backing escolhido (não NDJSON incondicional)",
  );
});

test("a projeção OS netlify/functions, quando presente, é cópia fiel do canônico", async (t) => {
  // A projeção é artefato de build (gitignored): o deploy OS a regenera via
  // build-pilot-bundle.mjs. O check de paridade roda onde a projeção exista
  // (builds locais/pós-staging) para pegar drift de operador; em checkout
  // limpo de CI a garantia vem do teste do staging script abaixo.
  const staged = await import("node:fs/promises").then((fs) => fs.stat(STAGED_FUNCTIONS).then(() => true, () => false));
  if (!staged) return t.skip("projeção OS ausente (checkout limpo — staging garantido pelo teste do script)");
  for (const file of ["netlify-blobs-runtime.mjs", "package.json", "dojo-analytics-collector.mjs"]) {
    const canonical = await readText(join(CANONICAL_FUNCTIONS, file));
    const stagedContent = await readText(join(STAGED_FUNCTIONS, file));
    assert.equal(stagedContent, canonical, `projeção OS dessincronizada para ${file} — rode o staging de build-pilot-bundle`);
  }
});

test("o staging do OS embarca wrapper, manifest E lockfile, e instala as deps (build-pilot-bundle.mjs)", async () => {
  const staging = await readText(join(ROOT, "engines", "codexdojo-os-prototype", "scripts", "build-pilot-bundle.mjs"));
  for (const file of ["netlify-blobs-runtime.mjs", "package.json", "package-lock.json"]) {
    assert.ok(staging.includes(`'${file}'`), `staging deve copiar ${file} para netlify/functions`);
  }
  // AID-961 deploy gap (a): `netlify deploy` resolve @netlify/blobs no bundle
  // time e falhou com "Could not resolve" sem install prévio — o staging é
  // quem instala as deps das funções (npm ci pinado pelo lockfile).
  assert.match(
    staging,
    /spawnSync\('npm', \['ci', '--ignore-scripts', '--no-audit', '--no-fund'\]/,
    "staging deve rodar npm ci dentro de netlify/functions (AID-961)",
  );
});

test("AID-961: o diretório canônico de funções é DEPLOYÁVEL — sem declarações .d.* (422 do deploy CLI)", async () => {
  const fs = await import("node:fs/promises");
  const entries = await fs.readdir(CANONICAL_FUNCTIONS, { withFileTypes: true });
  const declarations = entries
    .filter((entry) => entry.isFile() && /\.d\.(m|c)?(ts|js)$/.test(entry.name))
    .map((entry) => entry.name);
  assert.deepEqual(
    declarations,
    [],
    "declarações de tipo no dir de funções fazem o deploy CLI do literacy rejeitar TODO o diretório com 422 Incorrect function names — mova para learner/gate/analytics/ (padrão AID-961)",
  );
  // A semântica de listagem do fix AID-961 (scan flat sem prefixo) não pode
  // regredir para `directories` em nenhuma chamada store.list do coletor —
  // o comportamento é travado ponta-a-ponta em verify_deployed_blobs.mjs
  // (probe edge) e no teste v2 (fake edge-semântico); este scan é a barreira
  // estática de cheap-fail no review.
  const collector = await readText(join(CANONICAL_FUNCTIONS, "dojo-analytics-collector.mjs"));
  assert.doesNotMatch(
    collector,
    /\.list\(\{[^}]*directories/,
    "store.list com directories tem semântica divergente edge vs servidor local (defect AID-961) — use o scan flat sem prefixo",
  );
});

test("cada superfície aponta o diretório de funções correto no netlify.toml", async () => {
  const literacy = await readText(join(ROOT, "engines", "literacyDojo", "netlify.toml"));
  const os = await readText(join(ROOT, "engines", "codexdojo-os-prototype", "netlify.toml"));
  assert.match(literacy, /^\s*functions = "..\/..\/learner\/gate\/netlify-functions"\s*$/m,
    "literacy deve servir as funções canônicas diretamente");
  assert.match(os, /^\s*functions = "netlify\/functions"\s*$/m,
    "OS deve servir a projeção staged dentro do site root");
});

test("a raiz do repo NÃO é um projeto Node (package.json só no diretório de funções)", async () => {
  const rootManifest = await readFile(join(ROOT, "package.json"), "utf8").catch(() => null);
  assert.equal(rootManifest, null, "repo root não pode ganhar package.json (anti-padrão do guarda-chuva)");
});

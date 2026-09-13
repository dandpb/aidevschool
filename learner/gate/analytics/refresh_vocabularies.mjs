// Vocabulary binding refresh for the analytics collector (consolidação dos
// emissores de analytics, 2026-09-13).
//
// The single hand-written vocabulary authority is
// engines/shared/teaching-evidence/vocabularies/{os,literacy,surfaces}.json.
// The deployed collector (learner/gate/netlify-functions/
// dojo-analytics-collector.mjs) cannot import across the functions-dir
// boundary (Netlify bundler; the OS pilot deploys a byte-identical staged
// copy — see the checklist Landing row "Collector binding mechanism"), so its
// validator tables live as a GENERATED block inside the function, delimited
// by per-producer sentinels. This script is the only writer of that block:
//
//   node learner/gate/analytics/refresh_vocabularies.mjs          # rewrite
//   node learner/gate/analytics/refresh_vocabularies.mjs --check  # CI gate
//
// Total JSON↔tables equality is locked by
// learner/gate/tests/dojo_analytics_vocabularies.test.mjs (C1); this script
// additionally fails high on structural drift and duplicate JSON keys.
//
// Boundary: analytics is not evidence; this tool never writes learner state.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, "..", "..", "..");
export const VOCABULARIES_DIR = join(REPO_ROOT, "engines", "shared", "teaching-evidence", "vocabularies");
const COLLECTOR_PATH = join(REPO_ROOT, "learner", "gate", "netlify-functions", "dojo-analytics-collector.mjs");
const STAGED_COLLECTOR_PATH = join(
  REPO_ROOT, "engines", "codexdojo-os-prototype", "netlify", "functions", "dojo-analytics-collector.mjs",
);

export function parseVocabularyJson(text, label) {
  let index = 0;

  function fail(message) {
    throw new Error(`${label}: ${message} at offset ${index}`);
  }
  function skipWhitespace() {
    while (index < text.length && /\s/.test(text[index])) index += 1;
  }
  function readString() {
    if (text[index] !== '"') fail("expected string");
    index += 1;
    let out = "";
    while (index < text.length && text[index] !== '"') {
      const ch = text[index];
      if (ch === "\\") {
        const esc = text[index + 1];
        if (esc === undefined) fail("unterminated escape");
        if (esc === "u") {
          const hex = text.slice(index + 2, index + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail("bad \\u escape");
          out += String.fromCharCode(Number.parseInt(hex, 16));
          index += 6;
          continue;
        }
        const simple = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
        if (!(esc in simple)) fail(`bad escape \\${esc}`);
        out += simple[esc];
        index += 2;
        continue;
      }
      if (ch < " ") fail("control character in string");
      out += ch;
      index += 1;
    }
    if (text[index] !== '"') fail("unterminated string");
    index += 1;
    return out;
  }
  function readValue() {
    skipWhitespace();
    const ch = text[index];
    if (ch === '"') return readString();
    if (ch === "{") {
      index += 1;
      const out = {};
      skipWhitespace();
      if (text[index] === "}") {
        index += 1;
        return out;
      }
      for (;;) {
        skipWhitespace();
        const key = readString();
        if (key in out) fail(`duplicate key "${key}"`);
        skipWhitespace();
        if (text[index] !== ":") fail("expected ':'");
        index += 1;
        out[key] = readValue();
        skipWhitespace();
        if (text[index] === ",") {
          index += 1;
          continue;
        }
        if (text[index] === "}") {
          index += 1;
          return out;
        }
        fail("expected ',' or '}'");
      }
    }
    if (ch === "[") {
      index += 1;
      const out = [];
      skipWhitespace();
      if (text[index] === "]") {
        index += 1;
        return out;
      }
      for (;;) {
        out.push(readValue());
        skipWhitespace();
        if (text[index] === ",") {
          index += 1;
          continue;
        }
        if (text[index] === "]") {
          index += 1;
          return out;
        }
        fail("expected ',' or ']'");
      }
    }
    for (const [literal, value] of [["true", true], ["false", false], ["null", null]]) {
      if (text.startsWith(literal, index)) {
        index += literal.length;
        return value;
      }
    }
    const number = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(index));
    if (number === null) fail("unexpected token");
    index += number[0].length;
    return Number(number[0]);
  }

  const parsed = readValue();
  skipWhitespace();
  if (index !== text.length) fail("trailing content after value");
  return parsed;
}

function isStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string");
}

function sameKeySet(names, table) {
  const nameSet = new Set(names);
  const keySet = new Set(Object.keys(table));
  if (nameSet.size !== keySet.size) return false;
  for (const name of nameSet) {
    if (!keySet.has(name)) return false;
  }
  return true;
}

export function validateOsVocabulary(vocab) {
  if (!isStringArray(vocab.eventNames)) throw new Error("os.json: eventNames must be a non-empty string array");
  if (vocab.eventVocabularies === undefined || typeof vocab.eventVocabularies !== "object") {
    throw new Error("os.json: eventVocabularies must be an object");
  }
  if (!sameKeySet(vocab.eventNames, vocab.eventVocabularies)) {
    throw new Error("os.json: eventVocabularies keys must equal eventNames");
  }
  for (const [name, dimensions] of Object.entries(vocab.eventVocabularies)) {
    for (const [dimension, values] of Object.entries(dimensions)) {
      if (!Array.isArray(values) || values.length === 0) {
        throw new Error(`os.json: eventVocabularies["${name}"]["${dimension}"] must be a non-empty array`);
      }
    }
  }
  if (!isStringArray(vocab.contextKeys)) throw new Error("os.json: contextKeys must be a non-empty string array");
  if (vocab.contextVocabularies === undefined || typeof vocab.contextVocabularies !== "object") {
    throw new Error("os.json: contextVocabularies must be an object");
  }
  const contextKeySet = new Set(vocab.contextKeys);
  for (const [key, values] of Object.entries(vocab.contextVocabularies)) {
    if (!contextKeySet.has(key)) throw new Error(`os.json: contextVocabularies key "${key}" is not a contextKey`);
    if (!isStringArray(values)) throw new Error(`os.json: contextVocabularies["${key}"] must be a non-empty string array`);
  }
  return vocab;
}

export function validateLiteracyVocabulary(vocab) {
  if (!isStringArray(vocab.eventNames)) throw new Error("literacy.json: eventNames must be a non-empty string array");
  for (const table of ["eventProps", "optionalProps"]) {
    if (vocab[table] === undefined || typeof vocab[table] !== "object") {
      throw new Error(`literacy.json: ${table} must be an object`);
    }
    if (!sameKeySet(vocab.eventNames, vocab[table])) {
      throw new Error(`literacy.json: ${table} keys must equal eventNames`);
    }
  }
  for (const [name, allowed] of Object.entries(vocab.eventProps)) {
    for (const optional of vocab.optionalProps[name]) {
      if (!allowed.includes(optional)) {
        throw new Error(`literacy.json: optionalProps["${name}"] includes "${optional}" which is not an eventProp`);
      }
    }
  }
  if (!isStringArray(vocab.entryRoutes)) throw new Error("literacy.json: entryRoutes must be a non-empty string array");
  if (!isStringArray(vocab.activityTypes)) {
    throw new Error("literacy.json: activityTypes must be a non-empty string array");
  }
  return vocab;
}

export function validateSurfacesVocabulary(vocab) {
  if (!isStringArray(vocab.sources)) throw new Error("surfaces.json: sources must be a non-empty string array");
  if (!isStringArray(vocab.eventNames)) {
    throw new Error("surfaces.json: eventNames must be a non-empty string array");
  }
  if (vocab.eventProps === undefined || typeof vocab.eventProps !== "object") {
    throw new Error("surfaces.json: eventProps must be an object");
  }
  if (!sameKeySet(vocab.eventNames, vocab.eventProps)) {
    throw new Error("surfaces.json: eventProps keys must equal eventNames");
  }
  if (!isStringArray(vocab.resultValues)) {
    throw new Error("surfaces.json: resultValues must be a non-empty string array");
  }
  return vocab;
}

export async function loadVocabularies(dir = VOCABULARIES_DIR) {
  const read = async (name) => parseVocabularyJson(await readFile(join(dir, `${name}.json`), "utf8"), name);
  return {
    os: validateOsVocabulary(await read("os")),
    literacy: validateLiteracyVocabulary(await read("literacy")),
    surfaces: validateSurfacesVocabulary(await read("surfaces")),
  };
}

const BLOCK_HEADER = (producer, source) =>
  `// >>> BEGIN GENERATED VOCABULARIES:${producer} — do not edit by hand.\n` +
  `// GENERATED from engines/shared/teaching-evidence/vocabularies/${source} —\n` +
  `// refresh: node learner/gate/analytics/refresh_vocabularies.mjs`;

const generatedBlock = (producer, source, tables) => {
  const lines = [BLOCK_HEADER(producer, source)];
  for (const [name, value] of tables) {
    lines.push(`export const ${name} = ${JSON.stringify(value, null, 2)};`);
  }
  lines.push(`// <<< END GENERATED VOCABULARIES:${producer}`);
  return lines.join("\n");
};

export function renderOsBlock(vocab) {
  return generatedBlock("os", "os.json", [
    ["ANALYTICS_EVENT_NAMES", vocab.eventNames],
    ["EVENT_VOCABULARIES", vocab.eventVocabularies],
    ["CONTEXT_KEYS", vocab.contextKeys],
    ["CONTEXT_VOCABULARIES", vocab.contextVocabularies],
  ]);
}

export function renderLiteracyBlock(vocab) {
  return generatedBlock("literacy", "literacy.json", [
    ["LITERACY_EVENT_NAMES", vocab.eventNames],
    ["LITERACY_ENTRY_ROUTES", vocab.entryRoutes],
    ["LITERACY_ACTIVITY_TYPES", vocab.activityTypes],
    ["LITERACY_EVENT_PROPS", vocab.eventProps],
    ["LITERACY_OPTIONAL_PROPS", vocab.optionalProps],
  ]);
}

export function renderSurfacesBlock(vocab) {
  return generatedBlock("surfaces", "surfaces.json", [
    ["SURFACE_SOURCES", vocab.sources],
    ["SURFACE_EVENT_NAMES", vocab.eventNames],
    ["SURFACE_EVENT_PROPS", vocab.eventProps],
    ["SURFACE_RESULT_VALUES", vocab.resultValues],
  ]);
}

const BLOCK_PATTERN = (producer) =>
  new RegExp(`// >>> BEGIN GENERATED VOCABULARIES:${producer}[\\s\\S]*?// <<< END GENERATED VOCABULARIES:${producer}`);

/** Replace (or insert) the three generated blocks in the collector source. */
export function applyVocabularyBlocks(source, { os, literacy, surfaces }) {
  let next = source;
  for (const [producer, block, anchor] of [
    ["os", renderOsBlock(os), "// --- OS envelope validation"],
    ["literacy", renderLiteracyBlock(literacy), "// --- literacy envelope validation"],
    ["surfaces", renderSurfacesBlock(surfaces), "// --- surfaces envelope validation"],
  ]) {
    const pattern = BLOCK_PATTERN(producer);
    if (pattern.test(next)) {
      next = next.replace(pattern, block);
      continue;
    }
    const anchorIndex = next.indexOf(anchor);
    if (anchorIndex === -1) throw new Error(`collector anchor not found for ${producer}: ${anchor}`);
    next = next.slice(0, anchorIndex) + block + "\n\n" + next.slice(anchorIndex);
  }
  return next;
}

async function refreshFile(path, vocabularies) {
  const source = await readFile(path, "utf8");
  const next = applyVocabularyBlocks(source, vocabularies);
  if (next === source) return false;
  await writeFile(path, next, "utf8");
  return true;
}

export async function refreshCollector({ check = false } = {}) {
  const vocabularies = await loadVocabularies();
  const targets = [COLLECTOR_PATH, STAGED_COLLECTOR_PATH];
  let stale = false;
  for (const path of targets) {
    let source;
    try {
      source = await readFile(path, "utf8");
    } catch {
      continue; // staged OS projection only exists after build:pilot
    }
    if (applyVocabularyBlocks(source, vocabularies) !== source) {
      stale = true;
      if (check) {
        console.error(`stale vocabulary block: ${path} — rerun node learner/gate/analytics/refresh_vocabularies.mjs`);
        continue;
      }
      await refreshFile(path, vocabularies);
      console.log(`refreshed: ${path}`);
    }
  }
  return { stale };
}

const invokedDirectly = process.argv[1] !== undefined && process.argv[1].endsWith("refresh_vocabularies.mjs");
if (invokedDirectly) {
  const check = process.argv.includes("--check");
  refreshCollector({ check })
    .then(({ stale }) => {
      if (check && stale) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}

#!/usr/bin/env node
// doc-test: extrai blocos ```js de um Markdown e executa cada linha `expr // => valor` com assert.
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const file = process.argv[2] ?? 'API.md';
const md = await readFile(file, 'utf8');

const code = ["import assert from 'node:assert/strict';"];
let inJs = false;
md.split('\n').forEach((line, i) => {
  if (/^```js\b/.test(line.trim())) { inJs = true; return; }
  if (line.trim() === '```') { inJs = false; return; }
  if (!inJs) return;
  const m = line.match(/^(.*?\S)\s*\/\/\s*=>\s*(.+)$/);
  if (!m) { code.push(line); return; }
  const expr = m[1].replace(/;$/, '');
  const expected = m[2].trim();
  const label = JSON.stringify(`${file}:${i + 1}  ${line.trim()}`);
  const check = expected === 'throws'
    ? `assert.throws(() => (${expr}))`
    : `assert.deepStrictEqual((${expr}), (${expected}))`;
  code.push(`try { ${check}; globalThis.__ok++; } catch (e) { globalThis.__fail.push(${label} + '\\n       ' + ('actual' in e ? 'código devolve: ' + JSON.stringify(e.actual) + '  |  doc afirma: ' + JSON.stringify(e.expected) : e.message.split('\\n')[0])); }`);
});

globalThis.__ok = 0;
globalThis.__fail = [];
const tmp = join(dirname(resolve(file)), `.doctest-${process.pid}.mjs`);
await writeFile(tmp, code.join('\n'));
try { await import(pathToFileURL(tmp)); } finally { await unlink(tmp); }

const { __ok: ok, __fail: fail } = globalThis;
for (const f of fail) console.error(`FAIL ${f}`);
console.log(`doc-test: ${ok + fail.length} exemplos em ${file} — ${ok} ok, ${fail.length} falha(s)`);
process.exit(fail.length ? 1 : 0);

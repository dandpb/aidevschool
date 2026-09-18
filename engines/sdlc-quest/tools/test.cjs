#!/usr/bin/env node
'use strict';
/** Enumerates tests rather than relying on shell globs (portable to Windows). */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const STRINGS = {
  pt: {
    none: 'Nenhum teste encontrado.',
    usage: 'Uso: node tools/test.cjs [--lang pt|en]\nExecuta todos os arquivos tests/*.test.cjs com o runner nativo do Node, sem curingas de shell.'
  },
  en: {
    none: 'No tests found.',
    usage: 'Usage: node tools/test.cjs [--lang pt|en]\nRuns every tests/*.test.cjs file with the Node built-in runner; no shell globs involved.'
  }
};
function parseArgs(args) {
  let lang = 'pt', help = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lang') {
      const value = args[i + 1];
      if (value !== 'pt' && value !== 'en') throw new Error('Argumento não suportado: --lang ' + (value === undefined ? '' : value) + '. Use --lang pt ou --lang en.');
      lang = value; i += 1;
    } else if (args[i] === '--help') help = true;
    else throw new Error('Argumento não suportado: ' + args[i]);
  }
  return { help, lang };
}
function main(args) {
  let opts;
  try { opts = parseArgs(args); }
  catch (error) { console.error(error.message); return 64; }
  const strings = STRINGS[opts.lang];
  if (opts.help) { console.log(strings.usage); return 0; }
  const tests = fs.readdirSync(path.join(root, 'tests')).filter(f => f.endsWith('.test.cjs')).sort().map(f => path.join('tests', f));
  if (!tests.length) { console.error(strings.none); return 1; }
  const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: root, stdio: 'inherit', shell: false });
  if (result.error) console.error(result.error.message);
  return result.status === 0 && !result.error ? 0 : 1;
}
if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { parseArgs, main };

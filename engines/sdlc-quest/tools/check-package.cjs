#!/usr/bin/env node
'use strict';
/** Verifies the shipped bytes. Run before editing or regenerating evidence. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const STRINGS = {
  pt: {
    invalid: 'Manifesto inválido.', outside: 'Caminho fora do pacote.',
    missing: name => `${name} (ausente)`, changed: name => `${name} (alterado)`,
    ok: count => `${count} arquivos conferidos. Hashes iguais ao manifesto local.`,
    note: 'O manifesto não é uma assinatura. Edições e novas execuções podem alterar arquivos.',
    fail: 'Verificação do pacote:'
  },
  en: {
    invalid: 'Invalid manifest.', outside: 'Path outside the package.',
    missing: name => `${name} (missing)`, changed: name => `${name} (changed)`,
    ok: count => `${count} files verified. Hashes match the local manifest.`,
    note: 'The manifest is not a signature. Edits and new runs may change files.',
    fail: 'Package verification:'
  }
};
function parseArgs(args) {
  let lang = 'pt';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lang') {
      const value = args[i + 1];
      if (value !== 'pt' && value !== 'en') throw new Error('Argumento não suportado: --lang ' + (value === undefined ? '' : value) + '. Use --lang pt ou --lang en.');
      lang = value; i += 1;
    } else throw new Error('Argumento não suportado: ' + args[i]);
  }
  return { lang };
}
function main(args) {
  let strings;
  try { strings = STRINGS[parseArgs(args).lang]; }
  catch (error) { console.error(error.message); return 64; }
  try {
    const lines = fs.readFileSync(path.join(root, 'SHA256SUMS.txt'), 'utf8').trim().split('\n');
    let checked = 0;
    const failed = [];
    for (const line of lines) {
      const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
      if (!match) throw new Error(strings.invalid);
      const filename = path.resolve(root, match[2]);
      const relative = path.relative(root, filename);
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(strings.outside);
      if (!fs.existsSync(filename) || !fs.lstatSync(filename).isFile()) failed.push(strings.missing(match[2]));
      else {
        const hash = crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
        if (hash !== match[1]) failed.push(strings.changed(match[2]));
      }
      checked++;
    }
    if (failed.length) throw new Error(failed.join('\n'));
    console.log(strings.ok(checked));
    console.log(strings.note);
    return 0;
  } catch (error) { console.error(strings.fail, error.message); return 1; }
}
if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { parseArgs, main };

#!/usr/bin/env node
'use strict';
/** Verifies the shipped bytes. Run before editing or regenerating evidence. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
try {
  const lines = fs.readFileSync(path.join(root, 'SHA256SUMS.txt'), 'utf8').trim().split('\n');
  let checked = 0;
  const failed = [];
  for (const line of lines) {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    if (!match) throw new Error('Manifesto inválido.');
    const filename = path.resolve(root, match[2]);
    const relative = path.relative(root, filename);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Caminho fora do pacote.');
    if (!fs.existsSync(filename) || !fs.lstatSync(filename).isFile()) failed.push(match[2] + ' (ausente)');
    else {
      const hash = crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
      if (hash !== match[1]) failed.push(match[2] + ' (alterado)');
    }
    checked++;
  }
  if (failed.length) throw new Error(failed.join('\n'));
  console.log(`${checked} arquivos conferidos. Hashes iguais ao manifesto local.`);
  console.log('O manifesto não é uma assinatura. Edições e novas execuções podem alterar arquivos.');
} catch (error) { console.error('Verificação do pacote:', error.message); process.exitCode = 1; }

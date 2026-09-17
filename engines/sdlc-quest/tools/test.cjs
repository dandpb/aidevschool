#!/usr/bin/env node
'use strict';
/** Enumerates tests rather than relying on shell globs (portable to Windows). */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const tests = fs.readdirSync(path.join(root, 'tests')).filter(f => f.endsWith('.test.cjs')).sort().map(f => path.join('tests', f));
if (!tests.length) { console.error('Nenhum teste encontrado.'); process.exitCode = 1; }
else {
  const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: root, stdio: 'inherit', shell: false });
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status === 0 && !result.error ? 0 : 1;
}

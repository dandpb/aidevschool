import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { parseDuracao } from '../src/duracao.js';

const CLI = new URL('../src/cli.js', import.meta.url).pathname;

test('BUG-001 (regressão): "m" sem dígitos antes deve ser rejeitado', () => {
  for (const ruim of ['1hm', '2hm', '10hm']) {
    assert.throws(() => parseDuracao(ruim), /inválida/, `deveria rejeitar "${ruim}"`);
  }
});

test('BUG-001 (regressão): CLI rejeita "1hm" com exit code 1', () => {
  const r = spawnSync(process.execPath, [CLI, '2h', '1hm', '30m'], { encoding: 'utf8' });
  assert.equal(r.status, 1, `esperava exit 1, veio ${r.status} (stdout: ${r.stdout.trim()})`);
  assert.match(r.stderr, /1hm/);
});

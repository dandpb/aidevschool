import { test } from 'node:test';
import assert from 'node:assert';
import { formatDuracao } from '../src/formatador.mjs';

test('formatDuracao formata minutos em h/m', () => {
  assert.strictEqual(formatDuracao(120), '2h');
  assert.strictEqual(formatDuracao(45), '45m');
  assert.strictEqual(formatDuracao(90), '1h30m');
  assert.strictEqual(formatDuracao(0), '0m');
});

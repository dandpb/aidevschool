import { test } from 'node:test';
import assert from 'node:assert';
import { somaDuracoes } from '../src/index.mjs';

test('somaDuracoes soma e formata múltiplas durações', () => {
  assert.strictEqual(somaDuracoes(['1h30m', '45m']), '2h15m');
  assert.strictEqual(somaDuracoes(['30m', '30m']), '1h');
});

test('somaDuracoes propaga erro de entrada inválida', () => {
  assert.throws(() => somaDuracoes(['1h', 'xx']), /Duração inválida/);
});

import { test } from 'node:test';
import assert from 'node:assert';
import { parseDuracao } from '../src/parser.mjs';

test('parseDuracao converte horas e minutos', () => {
  assert.strictEqual(parseDuracao('2h'), 120);
  assert.strictEqual(parseDuracao('45m'), 45);
  assert.strictEqual(parseDuracao('1h30m'), 90);
});

test('parseDuracao rejeita entrada inválida', () => {
  assert.throws(() => parseDuracao('abc'), /Duração inválida/);
  assert.throws(() => parseDuracao(''), /Duração inválida/);
});

// Teste-prova do achado crítico da revisão (/revisar):
// mediaDuracoes([]) divide 0/0 e retorna "NaNm" em vez de sinalizar erro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mediaDuracoes } from '../src/duracao.js';

test('PROVA-CRÍTICO: mediaDuracoes([]) deve lançar Error, nunca retornar "NaNm"', () => {
  assert.throws(() => mediaDuracoes([]), /vazia/);
});

test('COBERTURA: lista com um único elemento retorna o próprio valor', () => {
  assert.equal(mediaDuracoes(['45m']), '45m');
});

test('COBERTURA: média não-inteira é arredondada para minuto inteiro', () => {
  // (60 + 1) / 2 = 30.5 → arredonda para 31m (nunca "30.5m")
  assert.equal(mediaDuracoes(['1h', '1m']), '31m');
});

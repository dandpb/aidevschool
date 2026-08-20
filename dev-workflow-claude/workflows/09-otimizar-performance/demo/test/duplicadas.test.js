import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encontrarDuplicadas } from '../src/duplicadas.js';

const r = (projeto, duracao) => ({ projeto, duracao });

test('REQ-D1: detecta combinações projeto+duração repetidas', () => {
  const registros = [
    r('site', '1h30m'),
    r('api', '45m'),
    r('site', '1h30m'), // duplicada de [0]
    r('api', '2h'),
    r('api', '45m'), // duplicada de [1]
  ];
  assert.deepEqual(encontrarDuplicadas(registros), [r('site', '1h30m'), r('api', '45m')]);
});

test('REQ-D2: retorna a primeira ocorrência, uma vez só, na ordem de entrada', () => {
  const registros = [r('a', '1h'), r('a', '1h'), r('a', '1h'), r('b', '2h'), r('b', '2h')];
  assert.deepEqual(encontrarDuplicadas(registros), [r('a', '1h'), r('b', '2h')]);
});

test('REQ-D3: sem duplicadas → lista vazia; não confunde chaves parciais', () => {
  assert.deepEqual(encontrarDuplicadas([]), []);
  // mesmo projeto com durações diferentes / mesma duração em projetos diferentes: NÃO é duplicata
  const registros = [r('site', '1h'), r('site', '2h'), r('api', '1h')];
  assert.deepEqual(encontrarDuplicadas(registros), []);
});

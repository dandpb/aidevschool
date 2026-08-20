import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarRelatorio } from '../src/relatorio.js';

// Reprodução mínima do bug diagnosticado em DIAGNOSTICO.md.
// FALHA de propósito enquanto o bug existir: resumoDoProjeto (src/sessoes.js)
// devolve a MESMA referência do cache e gerarRelatorio (src/relatorio.js) a
// muta ao descontar pausas — cada chamada subtrai as pausas de novo.
// Fora da suíte de regressão (npm test); a correção estará certa quando
// `node --test test/reproducao-bug.test.js` passar sem tocar neste arquivo.
test('reprodução mínima: relatório do mesmo projeto é estável entre chamadas', () => {
  const primeira = gerarRelatorio('cliente-a');
  const segunda = gerarRelatorio('cliente-a');
  assert.equal(segunda, primeira);
});

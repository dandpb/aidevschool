import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarRelatorio } from '../src/relatorio.js';

// cliente-a: 2h30m + 3h + 2h = 7h30m (450m) trabalhadas, 1h (60m) de pausas.
test('REQ-5: relatório desconta pausas do total', () => {
  assert.equal(gerarRelatorio('cliente-a'), 'cliente-a: 3 sessões, 6h30m trabalhadas');
});

test('REQ-6: projeto desconhecido lança Error citando o nome', () => {
  assert.throws(() => gerarRelatorio('nao-existe'), /nao-existe/);
});

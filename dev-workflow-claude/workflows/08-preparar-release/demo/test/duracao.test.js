import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { parseDuracao, formatDuracao } from '../src/duracao.js';

const CLI = new URL('../src/cli.js', import.meta.url).pathname;

test('REQ-1: aceita horas, minutos e formato composto', () => {
  assert.equal(parseDuracao('2h'), 120);
  assert.equal(parseDuracao('45m'), 45);
  assert.equal(parseDuracao('1h30m'), 90);
});

test('REQ-5: aceita dias como jornada de 8h', () => {
  assert.equal(parseDuracao('1d'), 480);
  assert.equal(parseDuracao('1d2h30m'), 630);
});

test('REQ-6: tolera espaços em volta da duração', () => {
  assert.equal(parseDuracao(' 1h30m '), 90);
});

test('REQ-2: entrada inválida lança Error citando o texto', () => {
  for (const ruim of ['abc', '', 'h30', '30', '1m30h']) {
    assert.throws(() => parseDuracao(ruim), Error, `deveria rejeitar "${ruim}"`);
  }
  assert.throws(() => parseDuracao('abc'), /abc/);
});

test('REQ-3: formatDuracao faz o caminho inverso', () => {
  assert.equal(formatDuracao(90), '1h30m');
  assert.equal(formatDuracao(120), '2h');
  assert.equal(formatDuracao(45), '45m');
});

test('REQ-7: CLI --help imprime uso e sai com 0', () => {
  const saida = execFileSync(process.execPath, [CLI, '--help'], { encoding: 'utf8' });
  assert.match(saida, /Uso: tempo/);
});

test('REQ-4: CLI soma durações e imprime o total', () => {
  const saida = execFileSync(process.execPath, [CLI, '1h30m', '45m'], { encoding: 'utf8' });
  assert.equal(saida.trim(), 'Total: 2h15m');
});

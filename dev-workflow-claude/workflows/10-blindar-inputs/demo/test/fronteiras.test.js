// Testes de regressão do /blindar: cada caso abaixo era um CRASH (stack trace cru)
// encontrado pelo mini-fuzz (tools/fuzz.mjs) na fronteira --arquivo.
// Contrato: exit 1 + mensagem clara em stderr, NUNCA stack trace.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CLI = new URL('../src/cli.js', import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), 'fronteiras-'));

function roda(...args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
}

function assertErroControlado(r, trechoEsperado) {
  assert.equal(r.status, 1, 'deve sair com exit code 1');
  assert.match(r.stderr, trechoEsperado, 'mensagem deve orientar o usuário');
  assert.doesNotMatch(r.stderr, /\n\s+at\s|node:internal/, 'stderr não pode conter stack trace');
}

function arquivo(nome, conteudo) {
  const p = join(dir, nome);
  writeFileSync(p, conteudo);
  return p;
}

test('FUZZ-1: arquivo inexistente → erro controlado (era ENOENT cru)', () => {
  assertErroControlado(roda('--arquivo', join(dir, 'nao-existe.json')), /Não consegui ler o arquivo/);
});

test('FUZZ-2: --arquivo sem caminho → erro controlado (era ENOENT cru)', () => {
  assertErroControlado(roda('--arquivo'), /caminho do arquivo faltando/);
});

test('FUZZ-3: JSON malformado → erro controlado (era SyntaxError crua)', () => {
  assertErroControlado(roda('--arquivo', arquivo('mal.json', '{registros: [')), /JSON inválido/);
});

test('FUZZ-4: arquivo vazio → erro controlado (era SyntaxError crua)', () => {
  assertErroControlado(roda('--arquivo', arquivo('vazio.json', '')), /JSON inválido/);
});

test('FUZZ-5: JSON que não é lista → erro controlado (era TypeError .reduce)', () => {
  assertErroControlado(roda('--arquivo', arquivo('obj.json', '{"duracao":"1h"}')), /lista de registros/);
});

test('FUZZ-6: campo duracao faltando → erro controlado (era TypeError .trim)', () => {
  assertErroControlado(roda('--arquivo', arquivo('sem.json', '[{"descricao":"reunião"}]')), /Registro #1 inválido/);
});

test('FUZZ-7: duracao com tipo errado (número) → erro controlado (era TypeError)', () => {
  assertErroControlado(roda('--arquivo', arquivo('num.json', '[{"duracao":90}]')), /Registro #1 inválido/);
});

test('FUZZ-8: registro null na lista → erro controlado (era TypeError)', () => {
  assertErroControlado(roda('--arquivo', arquivo('null.json', '[null]')), /Registro #1 inválido/);
});

test('FUZZ-9: duracao com emoji → erro controlado citando o valor', () => {
  assertErroControlado(roda('--arquivo', arquivo('emoji.json', '[{"duracao":"1h🔥"}]')), /Duração inválida/);
});

test('FUZZ-10: caminho feliz da fronteira continua funcionando', () => {
  const p = arquivo('ok.json', '[{"duracao":"1h30m"},{"duracao":"45m"}]');
  const r = roda('--arquivo', p);
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), 'Total (2 registros): 2h15m');
});

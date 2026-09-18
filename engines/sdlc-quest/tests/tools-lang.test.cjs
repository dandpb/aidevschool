'use strict';
/* Tools bilingual contract (C11): every tool accepts --lang pt|en (pt default),
 * prints English console chrome under --lang en, and rejects any other value with
 * exit 64 keeping the "Argumento não suportado" pattern. Gate exit codes 0/1/2 stay.
 * Synchronous spawnSync per tool; serve and check-package are covered on the
 * rejection path and parse validation only — no server is started here. */
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const gate = require('../tools/quest-gate.cjs');
const serve = require('../tools/serve.cjs');
const checkPackage = require('../tools/check-package.cjs');
const testTool = require('../tools/test.cjs');
const run = (tool, args) => spawnSync(process.execPath, [path.join('tools', tool), ...args], { cwd: ROOT, encoding: 'utf8' });

test('--lang en accepted', () => {
  const gateHelp = run('quest-gate.cjs', ['--help', '--lang', 'en']);
  assert.equal(gateHelp.status, 0);
  assert.match(gateHelp.stdout, /Usage: node tools\/quest-gate\.cjs/);
  assert.doesNotMatch(gateHelp.stdout, /Uso:/);
  const testHelp = run('test.cjs', ['--help', '--lang', 'en']);
  assert.equal(testHelp.status, 0);
  assert.match(testHelp.stdout, /Usage: node tools\/test\.cjs/);
  assert.doesNotMatch(testHelp.stdout, /Uso:/);
  assert.equal(gate.parseArgs(['--lang', 'en']).lang, 'en');
  assert.equal(gate.parseArgs([]).lang, 'pt');
  assert.equal(testTool.parseArgs(['--lang', 'en']).lang, 'en');
  assert.equal(testTool.parseArgs([]).lang, 'pt');
  assert.equal(checkPackage.parseArgs(['--lang', 'en']).lang, 'en');
  assert.equal(checkPackage.parseArgs([]).lang, 'pt');
  assert.equal(serve.parseArgs(['--lang', 'en'], {}).lang, 'en');
  assert.equal(serve.parseArgs(['--lang', 'pt'], {}).lang, 'pt');
  assert.equal(serve.parseArgs([], {}).lang, 'pt');
});

test('--lang xx rejected exit 64', () => {
  for (const tool of ['quest-gate.cjs', 'test.cjs', 'serve.cjs', 'check-package.cjs']) {
    const rejected = run(tool, ['--lang', 'xx']);
    assert.equal(rejected.status, 64, tool);
    assert.match(rejected.stderr, /Argumento não suportado/, tool);
  }
  assert.throws(() => gate.parseArgs(['--lang', 'xx']), /Argumento não suportado/);
  assert.throws(() => testTool.parseArgs(['--lang', 'xx']), /Argumento não suportado/);
  assert.throws(() => checkPackage.parseArgs(['--lang', 'xx']), /Argumento não suportado/);
  assert.throws(() => serve.parseArgs(['--lang', 'xx'], {}), /Argumento não suportado/);
  assert.throws(() => gate.parseArgs(['--lang']), /Argumento não suportado/);
});

test('gate exit codes preserved', () => {
  assert.equal(gate.releaseExitCode(true, false), 0);
  assert.equal(gate.releaseExitCode(false, false), 1);
  assert.equal(gate.releaseExitCode(true, true), 2);
  assert.equal(gate.releaseExitCode(false, true), 1);
  assert.equal(gate.parseArgs(['--require-release', '--lang', 'en']).requireRelease, true);
  assert.throws(() => gate.parseArgs(['--skip-tests']));
  const rejected = run('quest-gate.cjs', ['--skip-tests']);
  assert.equal(rejected.status, 64);
  assert.match(rejected.stderr, /Argumento não suportado/);
});

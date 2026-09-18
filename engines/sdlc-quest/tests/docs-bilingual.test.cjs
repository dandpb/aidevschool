'use strict';
/* Docs bilingual contract (C12/C13): README, TLC-GUIDE and HARNESS-GUIDE are
 * English-primary; each carries a "Leia em português" link line to an integral
 * .pt-BR.md mirror of the previous Portuguese text. EN and PT keep the same
 * heading sequence, and the mirrors must contain the current PT lines verbatim
 * (sampled anchors below). */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(ROOT, name), 'utf8');
const headings = text => [...text.matchAll(/^(#{1,6}) .+$/gm)].map(m => m[1].length);

test('readme en-primary with pt mirror', () => {
  const en = read('README.md'), pt = read('README.pt-BR.md');
  const firstLine = en.split('\n')[0];
  assert.match(firstLine, /Leia em português/);
  assert.match(firstLine, /\]\(README\.pt-BR\.md\)/);
  assert.ok(fs.existsSync(path.join(ROOT, 'README.pt-BR.md')));
  assert.deepEqual(headings(en), headings(pt));
  assert.ok(pt.includes('A campanha e a oficina TLC são educativas. O ZIP **não instala nem redistribui uma instalação oficial** de `tlc-discover`, `tlc-plan`, `tlc-implement` ou `the-judge`. O comando e os prompts da entrega anterior estão em `TLC-GUIDE.md` e no jogo; nenhuma instalação acontece ao iniciar.'));
  assert.ok(pt.includes('Nada aqui executa agentes remotos, revisões reais de PR, merge ou deploy. O servidor e o runner locais não são uma sandbox nem uma barreira externa de segurança.'));
  assert.ok(pt.includes('# SDLC Quest v1.3 — pacote local completo'));
});

test('tlc-guide en with pt mirror', () => {
  const en = read('TLC-GUIDE.md'), pt = read('TLC-GUIDE.pt-BR.md');
  assert.ok(fs.existsSync(path.join(ROOT, 'TLC-GUIDE.pt-BR.md')));
  assert.match(en, /Leia em português.*TLC-GUIDE\.pt-BR\.md/);
  assert.deepEqual(headings(en), headings(pt));
  for (const sample of ['# SDLC Quest v1.2 — Guia da Oficina TLC', '## tlc-discover', '## the-judge', '## Limites que continuam valendo', '## Atribuição']) {
    assert.ok(pt.includes(sample), sample);
  }
});

test('harness-guide en with pt mirror', () => {
  const en = read('HARNESS-GUIDE.md'), pt = read('HARNESS-GUIDE.pt-BR.md');
  assert.ok(fs.existsSync(path.join(ROOT, 'HARNESS-GUIDE.pt-BR.md')));
  assert.match(en, /Leia em português.*HARNESS-GUIDE\.pt-BR\.md/);
  assert.deepEqual(headings(en), headings(pt));
  for (const sample of ['# SDLC Quest v1.3 — execução, gates e evidências', '## Estado da integração', '## Uso no jogo', '## Limites']) {
    assert.ok(pt.includes(sample), sample);
  }
});

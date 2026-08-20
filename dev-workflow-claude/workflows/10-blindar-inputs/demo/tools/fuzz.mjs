#!/usr/bin/env node
// Mini-fuzz caseiro: roda o CLI com entradas hostis e classifica cada caso.
// ok = exit 0 | erro-controlado = exit != 0 sem stack trace | CRASH = stack trace cru
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CLI = new URL('../src/cli.js', import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), 'fuzz-'));
const arquivo = (nome, conteudo) => { const p = join(dir, nome); writeFileSync(p, conteudo); return p; };

const casos = [
  ['argv vazio', ['']],
  ['argv unicode/emoji', ['1h💥m']],
  ['argv caractere de controle', ['1h\x07m']],
  ['argv número gigante', ['999999999999999999999h']],
  ['argv string enorme', ['h'.repeat(100_000)]],
  ['argv parece flag', ['--ajuda']],
  ['argv só traços', ['--']],
  ['arquivo inexistente', ['--arquivo', join(dir, 'nao-existe.json')]],
  ['arquivo sem caminho', ['--arquivo']],
  ['JSON malformado', ['--arquivo', arquivo('a.json', '{registros: [')]],
  ['JSON vazio', ['--arquivo', arquivo('b.json', '')]],
  ['JSON não é lista', ['--arquivo', arquivo('c.json', '{"duracao":"1h"}')]],
  ['campo duracao faltando', ['--arquivo', arquivo('d.json', '[{"descricao":"reunião"}]')]],
  ['duracao com tipo errado', ['--arquivo', arquivo('e.json', '[{"duracao":90}]')]],
  ['duracao com emoji', ['--arquivo', arquivo('f.json', '[{"duracao":"1h🔥"}]')]],
  ['registro null na lista', ['--arquivo', arquivo('g.json', '[null]')]],
];

let crashes = 0;
for (const [nome, args] of casos) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  const temStack = /\n\s+at\s|node:internal/.test(r.stderr);
  const status = r.status === 0 ? 'ok' : temStack ? 'CRASH' : 'erro-controlado';
  if (status === 'CRASH') crashes++;
  console.log(`${status.padEnd(15)} ${nome}${status === 'CRASH' ? '\n  └─ ' + r.stderr.trim().split('\n')[0] : ''}`);
}
rmSync(dir, { recursive: true, force: true });
console.log(`\nResultado: ${casos.length} casos, ${crashes} CRASH(es)`);
process.exit(crashes === 0 ? 0 : 1);

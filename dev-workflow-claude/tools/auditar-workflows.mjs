#!/usr/bin/env node
// Auditoria da biblioteca: reexecuta o bloco "## Como reproduzir" de cada fluxo
// (workflows/*/RESULTADO.md e exemplo-pratico/README.md).
// Contrato (CLAUDE.md, regra 2): UM bloco bash, caminhos relativos a esta raiz,
// terminando com exit 0. Bloco ausente ou com caminho absoluto = falha.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url))); // dev-workflow-claude/
const dirs = [
  'exemplo-pratico',
  ...readdirSync(join(RAIZ, 'workflows')).sort().map((d) => join('workflows', d)),
];

console.log(`AUDITORIA — reexecutando "Como reproduzir" de ${dirs.length} fluxos\n`);
let falhas = 0;
for (const dir of dirs) {
  const arquivo = ['RESULTADO.md', 'README.md'].map((f) => join(RAIZ, dir, f)).find(existsSync);
  const secao = arquivo && readFileSync(arquivo, 'utf8').split(/^## Como reproduzir/m)[1];
  const bloco = secao && secao.match(/```(?:bash|sh)?\n([\s\S]*?)```/);
  if (!bloco) {
    falhas++;
    console.log(`✘ ${dir} — sem bloco "## Como reproduzir" (RESULTADO.md/README.md)`);
    continue;
  }
  if (/\/(Users|home)\//.test(bloco[1])) {
    falhas++;
    console.log(`✘ ${dir} — bloco frágil: caminho absoluto (regra 2: relativo à raiz)`);
    continue;
  }
  const t0 = Date.now();
  try {
    execSync(bloco[1], { cwd: RAIZ, shell: '/bin/bash', stdio: 'pipe', timeout: 120_000 });
    console.log(`✔ ${dir} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (e) {
    falhas++;
    console.log(`✘ ${dir} — exit ${e.status ?? '?'}`);
    const saida = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim().split('\n').slice(-12);
    console.log(saida.map((l) => `    ${l}`).join('\n'));
  }
}
console.log(`\n${dirs.length - falhas}/${dirs.length} fluxos reproduzem${falhas ? ` — ${falhas} FALHA(S)` : ' — biblioteca saudável'}`);
process.exit(falhas ? 1 : 0);

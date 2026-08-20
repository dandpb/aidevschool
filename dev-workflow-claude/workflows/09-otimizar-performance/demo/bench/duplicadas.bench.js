// Benchmark reproduzível de encontrarDuplicadas.
// Dados determinísticos (LCG com seed fixa), N fixo, 5 rodadas, reporta mediana.
import { performance } from 'node:perf_hooks';
import { encontrarDuplicadas } from '../src/duplicadas.js';

const N = 20000;
const RODADAS = 5;

// Gerador pseudo-aleatório determinístico (mesmos dados em toda execução).
let seed = 42;
function rand(max) {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed % max;
}

const registros = [];
for (let i = 0; i < N; i++) {
  registros.push({
    projeto: `projeto-${rand(120)}`,
    duracao: `${1 + rand(8)}h${rand(60)}m`,
  });
}

let resultado;
const tempos = [];
for (let r = 0; r < RODADAS; r++) {
  const t0 = performance.now();
  resultado = encontrarDuplicadas(registros);
  tempos.push(performance.now() - t0);
}

tempos.sort((a, b) => a - b);
const mediana = tempos[Math.floor(RODADAS / 2)];

console.log(`benchmark: encontrarDuplicadas | N=${N} | rodadas=${RODADAS}`);
console.log(`tempos ordenados (ms): ${tempos.map((t) => t.toFixed(1)).join(', ')}`);
console.log(`mediana: ${mediana.toFixed(1)} ms`);
console.log(`duplicadas encontradas: ${resultado.length}`);

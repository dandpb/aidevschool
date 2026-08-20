#!/usr/bin/env node
import { parseDuracao, formatDuracao } from './duracao.js';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Uso: tempo <duração...>   ex.: tempo 1h30m 45m 1d\nFormatos: Nd (dia útil de 8h), Nh, Nm e combinações (1d2h30m).');
  process.exit(0);
}
if (args.length === 0) {
  console.error('Uso: tempo <duração...>   ex.: tempo 1h30m 45m');
  process.exit(1);
}

try {
  const total = args.reduce((soma, arg) => soma + parseDuracao(arg), 0);
  console.log(`Total: ${formatDuracao(total)}`);
} catch (erro) {
  console.error(erro.message);
  process.exit(1);
}

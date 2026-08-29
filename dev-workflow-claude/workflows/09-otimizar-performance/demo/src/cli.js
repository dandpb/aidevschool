#!/usr/bin/env node
import { parseDuracao, formatDuracao } from './duracao.js';

const args = process.argv.slice(2);
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

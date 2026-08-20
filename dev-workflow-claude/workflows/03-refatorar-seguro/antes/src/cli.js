#!/usr/bin/env node
import { parseDuracao } from './duracao.js';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Uso: tempo <duração...>   ex.: tempo 1h30m 45m');
  process.exit(1);
}

try {
  const total = args.reduce((soma, arg) => soma + parseDuracao(arg), 0);
  const h = Math.floor(total / 60);
  const min = total % 60;
  let texto;
  if (h && min) texto = `${h}h${min}m`;
  else if (h) texto = `${h}h`;
  else texto = `${min}m`;
  console.log(`Total: ${texto}`);
} catch (erro) {
  console.error(erro.message);
  process.exit(1);
}

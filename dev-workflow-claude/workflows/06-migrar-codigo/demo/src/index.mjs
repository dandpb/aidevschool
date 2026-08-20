import { parseDuracao } from './parser.mjs';
import { formatDuracao } from './formatador.mjs';

export function somaDuracoes(textos) {
  const total = textos.reduce((soma, t) => soma + parseDuracao(t), 0);
  return formatDuracao(total);
}

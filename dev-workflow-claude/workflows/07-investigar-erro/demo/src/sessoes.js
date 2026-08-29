import { parseDuracao } from './duracao.js';

// Sessões de trabalho registradas (fixture embutida; num projeto real
// viriam de um arquivo NDJSON ou de um banco).
const SESSOES = [
  { projeto: 'cliente-a', duracao: '2h30m', pausa: '15m' },
  { projeto: 'cliente-a', duracao: '3h', pausa: '30m' },
  { projeto: 'cliente-a', duracao: '2h', pausa: '15m' },
  { projeto: 'cliente-b', duracao: '1h45m', pausa: '5m' },
];

// Cache para não recalcular o resumo a cada refresh do painel.
const cache = new Map();

export function resumoDoProjeto(projeto) {
  if (!cache.has(projeto)) {
    const sessoes = SESSOES.filter((s) => s.projeto === projeto);
    if (sessoes.length === 0) {
      throw new Error(`Projeto desconhecido: "${projeto}"`);
    }
    cache.set(projeto, {
      projeto,
      sessoes: sessoes.length,
      minutos: sessoes.reduce((total, s) => total + parseDuracao(s.duracao), 0),
      pausas: sessoes.reduce((total, s) => total + parseDuracao(s.pausa), 0),
    });
  }
  return cache.get(projeto);
}

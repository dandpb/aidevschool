import { formatDuracao } from './duracao.js';
import { resumoDoProjeto } from './sessoes.js';

export function gerarRelatorio(projeto, { descontarPausas = true } = {}) {
  const resumo = resumoDoProjeto(projeto);
  if (descontarPausas) {
    resumo.minutos -= resumo.pausas;
  }
  return `${resumo.projeto}: ${resumo.sessoes} sessões, ${formatDuracao(resumo.minutos)} trabalhadas`;
}

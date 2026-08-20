#!/usr/bin/env node
// Painel de acompanhamento: imprime o relatório do projeto N vezes,
// simulando o refresh de um dashboard num processo de longa duração.
import { gerarRelatorio } from './relatorio.js';

const [projeto = 'cliente-a', vezes = '3'] = process.argv.slice(2);
for (let i = 1; i <= Number(vezes); i++) {
  console.log(`[refresh ${i}] ${gerarRelatorio(projeto)}`);
}

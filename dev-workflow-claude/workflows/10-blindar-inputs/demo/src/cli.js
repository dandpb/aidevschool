#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parseDuracao, formatDuracao } from './duracao.js';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Uso: tempo <duração...>          ex.: tempo 1h30m 45m');
  console.error('     tempo --arquivo <registros.json>');
  process.exit(1);
}

// Fronteira: registros vindos de um arquivo JSON. Tudo validado na entrada;
// qualquer problema vira mensagem clara + exit 1, nunca stack trace.
function somarArquivo(caminho) {
  if (!caminho) throw new Error('Uso: tempo --arquivo <registros.json> (caminho do arquivo faltando)');

  let texto;
  try {
    texto = readFileSync(caminho, 'utf8');
  } catch {
    throw new Error(`Não consegui ler o arquivo "${caminho}" (existe e tem permissão de leitura?)`);
  }

  let registros;
  try {
    registros = JSON.parse(texto);
  } catch (erro) {
    throw new Error(`JSON inválido em "${caminho}": ${erro.message}`);
  }

  if (!Array.isArray(registros)) {
    throw new Error(`"${caminho}" deve conter uma lista de registros, ex.: [{"duracao":"1h30m"}]`);
  }

  let total = 0;
  registros.forEach((r, i) => {
    if (r === null || typeof r !== 'object' || typeof r.duracao !== 'string') {
      throw new Error(`Registro #${i + 1} inválido: precisa do campo "duracao" como string (ex.: "1h30m")`);
    }
    total += parseDuracao(r.duracao); // parseDuracao já rejeita formatos ruins com mensagem clara
  });
  return { total, quantidade: registros.length };
}

try {
  if (args[0] === '--arquivo') {
    const { total, quantidade } = somarArquivo(args[1]);
    console.log(`Total (${quantidade} registros): ${formatDuracao(total)}`);
  } else {
    const total = args.reduce((soma, arg) => soma + parseDuracao(arg), 0);
    console.log(`Total: ${formatDuracao(total)}`);
  }
} catch (erro) {
  console.error(erro.message);
  process.exit(1);
}

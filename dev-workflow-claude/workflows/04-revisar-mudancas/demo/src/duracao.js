const PADRAO = /^(?:(\d+)h)?(?:(\d+)m)?$/;

export function parseDuracao(texto) {
  const m = PADRAO.exec(texto);
  if (!m || (m[1] === undefined && m[2] === undefined)) {
    throw new Error(`Duração inválida: "${texto}" (use formatos como 2h, 45m, 1h30m)`);
  }
  return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
}

export function mediaDuracoes(textos) {
  if (textos.length === 0) throw new Error('mediaDuracoes: lista vazia');
  const total = textos.reduce((soma, t) => soma + parseDuracao(t), 0);
  return formatDuracao(Math.round(total / textos.length));
}

export function formatDuracao(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h && m) return `${h}h${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

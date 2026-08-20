const PADRAO = /^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?$/;
const MINUTOS_POR_DIA = 8 * 60; // dia útil de 8h

export function parseDuracao(texto) {
  const m = PADRAO.exec(String(texto).trim());
  if (!m || (m[1] === undefined && m[2] === undefined && m[3] === undefined)) {
    throw new Error(`Duração inválida: "${texto}" (use formatos como 2h, 45m, 1h30m, 1d)`);
  }
  return Number(m[1] ?? 0) * MINUTOS_POR_DIA + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

export function formatDuracao(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h && m) return `${h}h${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

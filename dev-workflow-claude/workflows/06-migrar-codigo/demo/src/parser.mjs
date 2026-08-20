const PADRAO = /^(?:(\d+)h)?(?:(\d+)m)?$/;

export function parseDuracao(texto) {
  const m = PADRAO.exec(texto);
  if (!m || (m[1] === undefined && m[2] === undefined)) {
    throw new Error(`Duração inválida: "${texto}" (use formatos como 2h, 45m, 1h30m)`);
  }
  return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
}

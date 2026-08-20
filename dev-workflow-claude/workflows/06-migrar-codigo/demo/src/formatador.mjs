export function formatDuracao(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h && m) return `${h}h${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

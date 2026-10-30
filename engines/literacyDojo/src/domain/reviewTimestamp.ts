/** Instante ISO com fuso explícito; dados legados inválidos não viram uma data inventada. */
export function parseReviewTimestamp(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  if (!match) return null;
  const [, y, m, d, h, min, sec, zone] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (Number(h) > 23 || Number(min) > 59 || Number(sec) > 59) return null;
  if (zone !== "Z" && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4, 6)) > 59)) return null;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  const result = Date.parse(value);
  return Number.isFinite(result) ? result : null;
}

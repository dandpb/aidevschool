/** Alterna a presença de um id numa lista imutável de seleção (checkbox). */
export function toggleId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

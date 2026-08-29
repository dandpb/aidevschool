// Encontra registros de tempo duplicados (mesmo projeto + mesma duração).
// Retorna a PRIMEIRA ocorrência de cada combinação que aparece mais de uma vez,
// na ordem em que aparece na lista.
// O(n): uma passada conta ocorrências por chave, outra coleta as primeiras ocorrências.
export function encontrarDuplicadas(registros) {
  const chave = (r) => `${r.projeto}\u0000${r.duracao}`;

  const contagem = new Map();
  for (const r of registros) {
    const k = chave(r);
    contagem.set(k, (contagem.get(k) ?? 0) + 1);
  }

  const duplicadas = [];
  const emitidas = new Set();
  for (const r of registros) {
    const k = chave(r);
    if (contagem.get(k) > 1 && !emitidas.has(k)) {
      emitidas.add(k);
      duplicadas.push(r);
    }
  }
  return duplicadas;
}

/**
 * Identidade anônima de analytics (emenda ADR-0009 via AID-913).
 *
 * `sessionId` é EFÊMERO: gerado uma vez por page load, vive só em memória,
 * nunca é persistido nem enviado a lugar algum fora do envelope de analytics.
 * `eventId` é um UUID por evento, usado apenas para deduplicação na
 * recepção (corrida beacon/fetch). Nenhum dos dois identifica a pessoa —
 * a fronteira de privacidade do ADR-0009 é inviolável.
 */

export type AnalyticsIdentity = {
  /** Fixo por page load. */
  readonly sessionId: string;
  /** Novo UUID por evento. */
  nextEventId(): string;
};

function randomUuid(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") {
    return cryptoRef.randomUUID();
  }
  // Fallback RFC 4122 v4 (ambientes sem randomUUID); mesma garantia de
  // anonimato — nada identificável, apenas aleatoriedade local.
  const bytes = new Uint8Array(16);
  if (cryptoRef && typeof cryptoRef.getRandomValues === "function") {
    cryptoRef.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

export function createAnalyticsIdentity(uuid: () => string = randomUuid): AnalyticsIdentity {
  const sessionId = uuid();
  return {
    sessionId,
    nextEventId: () => uuid(),
  };
}

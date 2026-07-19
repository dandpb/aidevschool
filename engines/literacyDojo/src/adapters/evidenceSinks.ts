import type { EvidenceSink } from "../application/ports";
import type { LiteracyEvidenceRecord } from "../domain/evidence";

/** Emite a evidência no console (canal padrão do MVP — estruturada, sem texto livre). */
export class ConsoleEvidenceSink implements EvidenceSink {
  emit(record: LiteracyEvidenceRecord): void {
    console.info("[literacy-evidence]", JSON.stringify(record));
  }
}

/** Coleta a evidência em memória — canal de teste. */
export class InMemoryEvidenceSink implements EvidenceSink {
  readonly records: LiteracyEvidenceRecord[] = [];

  emit(record: LiteracyEvidenceRecord): void {
    this.records.push(record);
  }
}

declare global {
  interface Window {
    __literacydojo?: { evidence: LiteracyEvidenceRecord[] };
  }
}

/**
 * Ponte de depuração/teste e2e: espelha cada registro em
 * window.__literacydojo.evidence e em sessionStorage["literacydojo:evidence"]
 * (sobrevive a reloads) para o Playwright capturar e validar o envelope.
 * Só é instalada em modo dev (ver src/app/services.ts); os dados permanecem
 * no navegador da pessoa.
 */
export class DevtoolsBridgeEvidenceSink implements EvidenceSink {
  constructor(private readonly delegate: EvidenceSink) {}

  emit(record: LiteracyEvidenceRecord): void {
    this.delegate.emit(record);
    if (typeof window !== "undefined") {
      window.__literacydojo = window.__literacydojo ?? { evidence: [] };
      window.__literacydojo.evidence.push(record);
      try {
        const key = "literacydojo:evidence";
        const existing = JSON.parse(window.sessionStorage.getItem(key) ?? "[]") as unknown[];
        existing.push(record);
        window.sessionStorage.setItem(key, JSON.stringify(existing));
      } catch {
        // sessionStorage cheio ou indisponível não pode bloquear a lição.
      }
    }
  }
}

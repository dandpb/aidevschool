import type { EvidenceRecord } from "./game/evidence/emitter"

declare global {
  interface Window {
    // In-page evidence channel. Set once when the wave resolves.
    __gameEvidence?: EvidenceRecord
  }
}

export {}

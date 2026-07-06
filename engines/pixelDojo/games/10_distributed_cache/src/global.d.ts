import type { RingKeeperEvidenceRecord } from "./game/evidence"

declare global {
  interface Window {
    // Single-record in-page evidence channel. Set once when the wave resolves.
    // The smoke run scrapes the matching `EVIDENCE ` console line as the
    // durable signal; this attribute is the in-page mirror.
    __gameEvidence?: RingKeeperEvidenceRecord
    // Smoke-test debug hook.
    __ringKeeperDebug?: {
      readonly stepIndex: () => number
      readonly finished: () => boolean
      readonly strategy: () => string
    }
  }
}

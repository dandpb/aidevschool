import type { BreakerEvidenceRecord } from "./game/evidence"

declare global {
  interface Window {
    // Single-record in-page evidence channel. Set once when the wave resolves.
    // The smoke run scrapes the matching `EVIDENCE ` console line as the
    // durable signal; this attribute is the in-page mirror.
    __gameEvidence?: BreakerEvidenceRecord
    // Smoke-test debug hook.
    __breakerDebug?: {
      readonly state: () => string
      readonly pulseIndex: () => number
      readonly thresholdCrossed: () => boolean
      readonly cooldownDone: () => boolean
      readonly finished: () => boolean
    }
  }
}

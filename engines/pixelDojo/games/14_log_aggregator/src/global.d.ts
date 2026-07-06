import type { LogAggregatorEvidenceRecord } from "./game/evidence"

declare global {
  interface Window {
    // Single-record in-page evidence channel. Set once when the wave
    // resolves. The smoke run scrapes the matching `EVIDENCE ` console line
    // as the durable signal; this attribute is the in-page mirror.
    __gameEvidence?: LogAggregatorEvidenceRecord
    // Debug hook used by the smoke spec to wait for the contract phase
    // without racing the render loop.
    __logRiverDebug?: {
      readonly phase: () => string
      readonly contractPrompt: () => string | null
      readonly finished: () => boolean
    }
  }
}

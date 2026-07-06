import type { LoadBalancerEvidenceRecord } from "./game/evidence"

declare global {
  interface Window {
    // Single-record in-page evidence channel. Set once when the wave resolves.
    // The smoke run scrapes the matching `EVIDENCE ` console line as the
    // durable signal; this attribute is the in-page mirror.
    __gameEvidence?: LoadBalancerEvidenceRecord
    // Smoke-test debug hook: observes the game's phase machine so the spec can
    // drive deterministic waits (e.g. wait for "stalled" before pressing R).
    __trafficForgeDebug?: {
      readonly orbIndex: () => number
      readonly phase: () => string
      readonly stalled: () => boolean
      readonly finished: () => boolean
    }
  }
}

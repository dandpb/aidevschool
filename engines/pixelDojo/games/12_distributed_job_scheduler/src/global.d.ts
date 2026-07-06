import type { RaftRingEvidenceRecord } from "./game/evidence"

declare global {
  interface Window {
    // Single-record in-page evidence channel. Set once when the wave resolves.
    // The smoke run scrapes the matching `EVIDENCE ` console line as the
    // durable signal; this attribute is the in-page mirror.
    __gameEvidence?: RaftRingEvidenceRecord
    // Smoke-test debug hook: read-only view of the live cluster for
    // assertions during the smoke run. The smoke spec prefers real keyboard
    // input (it proves the input layer), but this is here as a fallback.
    __raftDebug?: {
      readonly leader: () => number | null
      readonly token: () => number
      readonly target: () => number
      readonly finished: () => boolean
    }
  }
}

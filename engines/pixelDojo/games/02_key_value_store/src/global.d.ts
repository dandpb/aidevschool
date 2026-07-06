import type { KvEvidenceRecord } from "./game/evidence"

declare global {
  interface Window {
    // Single-record in-page evidence channel. Set once when the wave resolves.
    // The smoke run scrapes the matching `EVIDENCE ` console line as the
    // durable signal; this attribute is the in-page mirror.
    __gameEvidence?: KvEvidenceRecord
    // Smoke-test debug hook: resolve the current op at the correct shelf
    // without driving input events. The smoke spec prefers real keyboard input
    // (it proves the input layer), but this is here as a fallback.
    __kvDebug?: {
      readonly opIndex: () => number
      readonly targetShelf: () => number
      readonly finished: () => boolean
    }
  }
}

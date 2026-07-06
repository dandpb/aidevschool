import type { TimelineTowerEvidenceRecord } from "./game/evidence"

declare global {
  interface Window {
    // Last-emitted evidence record (single-record contract for the smoke).
    __gameEvidence?: TimelineTowerEvidenceRecord
    // Append-only in-page channel for the run history.
    __timelineTowerEvidence?: readonly TimelineTowerEvidenceRecord[]
    __timelineTowerDebug?: {
      getState: () => string
      getMetrics: () => Record<string, unknown>
      press: (key: string) => void
      replay: () => void
    }
  }
}

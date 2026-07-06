import type { ByteStreamEvidenceRecord } from "./game/evidence/types"

declare global {
  interface Window {
    // Append-only in-page evidence channel — captured by the Playwright
    // smoke run and persisted to .logs/evidence.ndjson (one JSON object per
    // completed wave attempt).
    __byteStreamEvidence?: readonly ByteStreamEvidenceRecord[]
    // Single-record slot mirroring the latest emitted record. Read by
    // stdout-scraping harnesses that want the most recent wave result.
    __gameEvidence?: ByteStreamEvidenceRecord
    // Debug hooks for the Playwright smoke run.
    __byteStreamDebug?: {
      readonly getState: () => unknown
      readonly getEvidence: () => readonly ByteStreamEvidenceRecord[] | undefined
      readonly press: (action: "slice" | "trap" | "cancel" | "reject") => void
      readonly setAim: (deltaDeg: number) => void
    }
  }
}

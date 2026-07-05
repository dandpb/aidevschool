import type { PixelQuestEvidenceRecord } from "./game/evidence/types"

declare global {
  interface Window {
    // Append-only in-page evidence channel. Every emitted record is pushed
    // here by src/game/evidence/emitter.ts; the Playwright smoke run persists
    // it as NDJSON to .logs/evidence.ndjson (see ../EVIDENCE_CONTRACT.md).
    __pixelQuestEvidence?: readonly PixelQuestEvidenceRecord[]
    __pixelQuestDebug?: {
      completeEncounter: () => PixelQuestEvidenceRecord
      enterRegion: (regionId: string) => void
      getEvidence: () => readonly PixelQuestEvidenceRecord[] | undefined
      getMode: () => string
      getPhase: () => string
      getPlayerTile: () => { x: number; y: number }
    }
  }
}

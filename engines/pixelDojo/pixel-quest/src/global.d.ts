import type { PixelQuestEvidenceRecord } from "./game/evidence/types"

declare global {
  interface Window {
    __pixelQuestEvidence?: PixelQuestEvidenceRecord
    __pixelQuestDebug?: {
      completeEncounter: () => PixelQuestEvidenceRecord
      enterRegion: (regionId: string) => void
      getEvidence: () => PixelQuestEvidenceRecord | undefined
      getMode: () => string
      getPhase: () => string
      getPlayerTile: () => { x: number; y: number }
    }
  }
}

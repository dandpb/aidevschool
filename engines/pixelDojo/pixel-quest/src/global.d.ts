import type { PixelQuestEvidenceRecord } from "./game/evidence/types"

declare global {
  interface Window {
    __pixelQuestEvidence?: PixelQuestEvidenceRecord
    __pixelQuestDebug?: {
      completeEncounter: () => PixelQuestEvidenceRecord
      getEvidence: () => PixelQuestEvidenceRecord | undefined
      getMode: () => string
      getPlayerTile: () => { x: number; y: number }
    }
  }
}

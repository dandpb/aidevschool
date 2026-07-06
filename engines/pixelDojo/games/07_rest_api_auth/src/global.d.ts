import type { EvidenceRecord } from "./game/evidence/emitter"
import type { GameState, GateKind } from "./game/logic"

declare global {
  interface Window {
    // In-page evidence channel. Set once when the wave resolves.
    __gameEvidence?: EvidenceRecord
    __aegisEvidence?: EvidenceRecord
    // Debug surface used by the Playwright smoke to drive the wave without
    // fragile keyboard navigation. Internally calls the same pure logic.
    __aegisDebug?: {
      composeCanonical: () => void
      openPortal: () => void
      getState: () => GameState
      placeSelected: () => void
      recallLastGate: () => void
      cycleDockSelection: (direction: 1 | -1) => void
      selectedGate: () => GateKind | null
    }
  }
}

// Window-side test hook typings. The __taskForge hook is declared in main.ts
// (where the GameController type is concrete); this file only declares the
// evidence channel that the smoke spec reads without importing app code.
import type { EvidenceRecord } from "./game/evidence/emit"

declare global {
  interface Window {
    /** Most recently emitted evidence record (single-record wave). */
    __gameEvidence?: EvidenceRecord
  }
}

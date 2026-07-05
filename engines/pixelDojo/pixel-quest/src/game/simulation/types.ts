import type {
  ContentPack,
  Position,
  Region,
  RegionGate,
  RegionNpc,
  TileKind,
} from "../../content/types"
import type { PixelQuestEvidenceRecord } from "../evidence/types"
import type { GamePhase } from "../phases/types"
import type { ReviewTrack } from "../review/types"

export type Direction = "north" | "south" | "east" | "west"

export type WorldMode =
  | "briefing"
  | "skill-orbit"
  | "world"
  | "dialogue"
  | "practice"
  | "encounter"
  | "circuit-breaker"
  | "auth-gate"
  | "journal"
  | "help"

/**
 * Modes that project a 3D encounter scene. Adding a new duel-style mode
 * (e.g. another 3D encounter) means adding it here — every router check
 * keys off this predicate.
 */
export function isEncounterMode(mode: WorldMode): boolean {
  return mode === "encounter" || mode === "circuit-breaker" || mode === "auth-gate"
}

export type Interaction =
  | {
      readonly kind: "npc"
      readonly npc: RegionNpc
    }
  | {
      readonly kind: "gate"
      readonly gate: RegionGate
      readonly unlocked: boolean
    }
  | {
      readonly kind: "none"
    }

export type PlayerState = {
  readonly position: Position
  readonly facing: Direction
}

export type QuestProgress = {
  readonly completedUnitIds: readonly string[]
  readonly phase: GamePhase
  readonly reviewTrack: ReviewTrack
  readonly latestEvidence?: PixelQuestEvidenceRecord
}

export type SkillOrbitReturnMode = "briefing" | "world"

export type SkillOrbitState = {
  readonly selectedUnitId: string
  readonly returnMode: SkillOrbitReturnMode
}

export type WorldState = {
  readonly pack: ContentPack
  readonly region: Region
  readonly player: PlayerState
  readonly progress: QuestProgress
  readonly skillOrbit: SkillOrbitState
  readonly mode: WorldMode
}

export type TileView = {
  readonly position: Position
  readonly kind: TileKind
}

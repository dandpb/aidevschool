import type {
  ContentPack,
  Position,
  Region,
  RegionGate,
  RegionNpc,
  TileKind,
} from "../../content/types"
import type { PixelQuestEvidenceRecord } from "../evidence/types"

export type Direction = "north" | "south" | "east" | "west"

export type WorldMode = "world" | "dialogue" | "encounter" | "journal"

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
  readonly latestEvidence?: PixelQuestEvidenceRecord
}

export type WorldState = {
  readonly pack: ContentPack
  readonly region: Region
  readonly player: PlayerState
  readonly progress: QuestProgress
  readonly mode: WorldMode
}

export type TileView = {
  readonly position: Position
  readonly kind: TileKind
}

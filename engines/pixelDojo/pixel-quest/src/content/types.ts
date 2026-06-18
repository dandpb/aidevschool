export type Position = {
  readonly x: number
  readonly y: number
}

export type TileCode = "." | "#" | "L" | "G" | "T" | "W"

export type TileKind = "floor" | "wall" | "lab" | "gate" | "terminal" | "water"

export type RegionMap = {
  readonly width: number
  readonly height: number
  readonly tiles: readonly string[]
}

export type RegionNpc = {
  readonly id: string
  readonly name: string
  readonly role: string
  readonly position: Position
  readonly dialogueRef: string
  readonly encounterId: string
}

export type RegionGate = {
  readonly id: string
  readonly position: Position
  readonly requiresUnitId: string
  readonly lockedLabel: string
  readonly unlockedLabel: string
}

export type Region = {
  readonly id: string
  readonly name: string
  readonly project: string
  readonly start: Position
  readonly map: RegionMap
  readonly npcs: readonly RegionNpc[]
  readonly gates: readonly RegionGate[]
}

export type EvidenceContract = {
  readonly kind: "pixelquest-token-bucket"
  readonly minGoodAdmits: number
  readonly maxAbusiveAdmitted: number
  readonly maxObservedRateMultiplier: number
}

export type UnitDefinition = {
  readonly unit_id: string
  readonly project: string
  readonly concept: string
  readonly prerequisites: readonly string[]
  readonly encounter_ids: readonly string[]
  readonly evidence_contract: EvidenceContract
}

export type TokenBucketRequestType = "legit" | "abuse"

export type TokenBucketRequest = {
  readonly type: TokenBucketRequestType
  readonly at: number
}

export type TokenBucketEncounter = {
  readonly id: string
  readonly kind: "token_bucket"
  readonly title: string
  readonly unit_id: string
  readonly capacity: number
  readonly refillRate: number
  readonly targetRate: number
  readonly heatMax: number
  readonly heatPerLegitAdmit: number
  readonly heatPerAbuseAdmit: number
  readonly requests: readonly TokenBucketRequest[]
}

export type EncounterDefinition = TokenBucketEncounter

export type AssetManifest = {
  readonly tiles: readonly string[]
  readonly sprites: readonly string[]
  readonly audio: readonly string[]
}

export type ContentPack = {
  readonly id: string
  readonly version: string
  readonly title: string
  readonly regions: readonly Region[]
  readonly units: readonly UnitDefinition[]
  readonly encounters: readonly EncounterDefinition[]
  readonly assets: AssetManifest
}

export type LoadedContentPack = {
  readonly pack: ContentPack
  readonly dialogues: Readonly<Record<string, string>>
}

export const tileLegend: Readonly<Record<TileCode, TileKind>> = {
  ".": "floor",
  "#": "wall",
  L: "lab",
  G: "gate",
  T: "terminal",
  W: "water",
}

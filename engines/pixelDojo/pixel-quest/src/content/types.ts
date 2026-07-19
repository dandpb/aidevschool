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
  readonly nextRegionId?: string
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

export type TokenBucketContract = {
  readonly kind: "pixelquest-token-bucket"
  readonly minGoodAdmits: number
  readonly maxAbusiveAdmitted: number
  readonly maxObservedRateMultiplier: number
}

export type RouteHealthContract = {
  readonly kind: "pixelquest-route-health"
  readonly minRouted: number
  readonly maxBadRoutes: number
}

export type PolicyGateContract = {
  readonly kind: "pixelquest-policy-gate"
  readonly minAllowed: number
  readonly maxPolicyLeaks: number
}

export type SequenceContract = {
  readonly kind: "pixelquest-sequence-flow"
  readonly minAdvanced: number
  readonly maxGuardsMissed: number
}

// task_queue: retry / backpressure / dead-letter-queue. Pass thresholds are
// centralized here (anti-drift invariant — see TOKEN_BUCKET_CONTRACT comment).
export type TaskQueueContract = {
  readonly kind: "pixelquest-task-queue"
  readonly minProcessed: number
  readonly maxPoisonRetried: number
  readonly maxBackpressurePeak: number
}

export type EvidenceContract =
  | TokenBucketContract
  | RouteHealthContract
  | PolicyGateContract
  | SequenceContract
  | TaskQueueContract

// Single source of truth for each encounter kind's pass thresholds. Each
// constant is referenced by both the declared unit contract
// (curriculumPack.makeUnit) and the runtime pass-rule (the matching
// buildEvidence) so the two cannot drift (see TECH_DEBT_AUDIT_2026-06-28.md,
// D10). Previously only token-bucket had a contract; the other three kinds
// hardcoded thresholds inside their buildEvidence. Centralizing them is the
// anti-drift invariant extended to all kinds.
export const TOKEN_BUCKET_CONTRACT = {
  minGoodAdmits: 8,
  maxAbusiveAdmitted: 0,
  maxObservedRateMultiplier: 1.35,
} as const

// Pass thresholds for the task_queue encounter. Used by both the unit contract
// (curriculumPack.evidenceContractFor) and the runtime pass-rule
// (taskQueueOutcome) so the two cannot drift.
// - minProcessed: minimum legit jobs a passing run must process (in practice
//   all of them, since pass also requires legitRetried === 0).
// - maxPoisonRetried: how many poison-job retries (admits) are tolerated
//   across the whole stream before the run overheats.
// - maxBackpressurePeak: the queue depth must never exceed this cap.
export const TASK_QUEUE_CONTRACT = {
  minProcessed: 8,
  maxPoisonRetried: 3,
  maxBackpressurePeak: 4,
} as const

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
  readonly label?: string
}

export type TokenBucketEncounter = {
  readonly id: string
  readonly kind: "token_bucket"
  readonly title: string
  readonly unit_id: string
  readonly project: string
  readonly concept: string
  readonly mechanicName: string
  readonly resourceName: string
  readonly goodRequestLabel: string
  readonly badRequestLabel: string
  readonly admitActionLabel: string
  readonly rejectActionLabel: string
  readonly practiceTitle: string
  readonly practiceText: string
  readonly capacity: number
  readonly refillRate: number
  readonly targetRate: number
  readonly heatMax: number
  readonly heatPerLegitAdmit: number
  readonly heatPerAbuseAdmit: number
  readonly requests: readonly TokenBucketRequest[]
}

export type SequenceStepType = "advance" | "guard"

export type SequenceStep = {
  readonly type: SequenceStepType
  readonly label: string
}

export type SequenceEncounter = {
  readonly id: string
  readonly kind: "sequence_flow"
  readonly title: string
  readonly unit_id: string
  readonly project: string
  readonly concept: string
  readonly mechanicName: string
  readonly resourceName: string
  readonly goodRequestLabel: string
  readonly badRequestLabel: string
  readonly admitActionLabel: string
  readonly rejectActionLabel: string
  readonly practiceTitle: string
  readonly practiceText: string
  readonly steps: readonly SequenceStep[]
  readonly minAdvanced: number
  readonly maxGuardsMissed: number
}

export type RouteCheckType = "healthy" | "unhealthy"

export type RouteCheck = {
  readonly type: RouteCheckType
  readonly label: string
}

export type RouteHealthEncounter = {
  readonly id: string
  readonly kind: "route_health"
  readonly title: string
  readonly unit_id: string
  readonly project: string
  readonly concept: string
  readonly mechanicName: string
  readonly resourceName: string
  readonly goodRequestLabel: string
  readonly badRequestLabel: string
  readonly admitActionLabel: string
  readonly rejectActionLabel: string
  readonly practiceTitle: string
  readonly practiceText: string
  readonly checks: readonly RouteCheck[]
  readonly minRouted: number
  readonly maxBadRoutes: number
}

export type PolicyCheckType = "allowed" | "denied"

export type PolicyCheck = {
  readonly type: PolicyCheckType
  readonly label: string
  readonly scope: string
}

export type PolicyGateEncounter = {
  readonly id: string
  readonly kind: "policy_gate"
  readonly title: string
  readonly unit_id: string
  readonly project: string
  readonly concept: string
  readonly mechanicName: string
  readonly resourceName: string
  readonly goodRequestLabel: string
  readonly badRequestLabel: string
  readonly admitActionLabel: string
  readonly rejectActionLabel: string
  readonly practiceTitle: string
  readonly practiceText: string
  readonly checks: readonly PolicyCheck[]
  readonly minAllowed: number
  readonly maxPolicyLeaks: number
}

export type TaskQueueJobType = "legit" | "poison"

export type TaskQueueJob = {
  readonly type: TaskQueueJobType
  readonly at: number
  readonly label?: string
}

// task_queue encounter: a stream of jobs arrives (legit vs poison). The player
// chooses process (admit) / dead-letter (reject); retry is modeled as admitting
// a poison job, which keeps it in the queue and builds backpressure — each job
// is ONE dispatch decision because the shared core advances one item per action
// (see the action-mapping comment in game/encounters/taskQueue.ts). The correct
// play is to process every legit job and dead-letter every poison job on sight.
// Backpressure rises when jobs arrive faster than they are processed.
export type TaskQueueEncounter = {
  readonly id: string
  readonly kind: "task_queue"
  readonly title: string
  readonly unit_id: string
  readonly project: string
  readonly concept: string
  readonly mechanicName: string
  readonly resourceName: string
  readonly goodRequestLabel: string
  readonly badRequestLabel: string
  readonly admitActionLabel: string
  readonly rejectActionLabel: string
  readonly practiceTitle: string
  readonly practiceText: string
  readonly maxRetries: number
  readonly arrivalRate: number
  readonly processRate: number
  readonly jobs: readonly TaskQueueJob[]
}

export type EncounterDefinition =
  | TokenBucketEncounter
  | SequenceEncounter
  | RouteHealthEncounter
  | PolicyGateEncounter
  | TaskQueueEncounter

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

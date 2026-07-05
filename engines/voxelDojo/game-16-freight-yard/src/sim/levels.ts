import {
  type Assignment,
  appendMany,
  assignPartitions,
  type Consumer,
  type ConsumerGroup,
  createGroup,
  createLog,
  type Log,
  type Message,
  partitionOf,
  partitionTail,
  rebalance,
  replay,
} from "./queue"
import { keyStream, mulberry32 } from "./rng"

export type LevelId = "L1" | "L2" | "L3" | "L4"

export interface LevelConfig {
  id: LevelId
  title: string
  lesson: string
  seed: number
  /** number of partition lanes */
  partitionCount: number
  /** messages preloaded into the log (the freight cars on the tracks) */
  messageCount: number
  /** fraction of messages that share a few hot keys (so multiple cars stack in one lane) */
  hotKeyFrac: number
  /** number of consumer crews in the group at level start */
  crewCount: number
  /** scripted membership event applied mid-level (L3) */
  event: "none" | "join" | "leave"
  passRule: string
}

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "L1",
    title: "Route the freight",
    lesson:
      "A message's key hashes to one partition: hash(key) % N. Same key ⇒ same lane, every time.",
    seed: 11,
    partitionCount: 4,
    messageCount: 8,
    hotKeyFrac: 0,
    crewCount: 1,
    event: "none",
    passRule: "Predict which lane each incoming freight car lands on (≥80% accuracy).",
  },
  {
    id: "L2",
    title: "Consumer crews",
    lesson:
      "A crew owns a subset of lanes. Every lane has exactly one owner; every crew gets work.",
    seed: 22,
    partitionCount: 6,
    messageCount: 24,
    hotKeyFrac: 0.2,
    crewCount: 3,
    event: "none",
    passRule: "Hand every lane to exactly one crew, no lane orphaned or doubled-up.",
  },
  {
    id: "L3",
    title: "Rebalance",
    lesson:
      "When a crew joins or leaves, lanes reassign — but committed offsets stay put (keyed by lane).",
    seed: 33,
    partitionCount: 6,
    messageCount: 24,
    hotKeyFrac: 0.2,
    crewCount: 3,
    event: "join",
    passRule: "Predict the new owner of each reassigned lane; offsets must survive.",
  },
  {
    id: "L4",
    title: "Replay",
    lesson: "Rewind a lane's offset cursor and the old freight cars roll by again, in order.",
    seed: 44,
    partitionCount: 4,
    messageCount: 20,
    hotKeyFrac: 0.4,
    crewCount: 2,
    event: "none",
    passRule: "Pick the rewind point and predict exactly which cars replay.",
  },
] as const

export function levelConfig(id: LevelId): LevelConfig {
  const cfg = LEVELS.find((l) => l.id === id)
  if (!cfg) throw new Error(`unknown level ${id}`)
  return cfg
}

export function crewsFor(count: number): Consumer[] {
  return Array.from({ length: count }, (_, i) => ({ id: `crew-${i}` }))
}

/** Deterministic log preloaded with `cfg.messageCount` keys for the level. */
export function logFor(cfg: LevelConfig): Log {
  const keys = keyStream(mulberry32(cfg.seed), cfg.messageCount, cfg.hotKeyFrac)
  return appendMany(
    createLog(cfg.partitionCount),
    keys.map((k) => ({ key: k, payload: k })),
  )
}

export interface WaveOutcome {
  pass: boolean
  metrics: Record<string, number | boolean>
}

// ───────────────────────── L1: route the freight ─────────────────────────

/** L1: active recall on partition routing. */
export function evaluateRoute(correct: number, total: number): WaveOutcome {
  const accuracy = total === 0 ? 0 : correct / total
  return {
    pass: accuracy >= 0.8,
    metrics: { route_predictions: total, route_accuracy: round2(accuracy) },
  }
}

/** Truth for L1: the partition a key hashes to (used by HUD hint + smoke test). */
export function routeTruth(key: string, partitionCount: number): number {
  return partitionOf(key, partitionCount)
}

// ───────────────────────── L2: consumer crews ─────────────────────────

/**
 * L2: did the player's assignment hand every partition to exactly one crew (complete),
 * with every crew getting ≥1 partition (fair)?
 */
export function evaluateAssignment(
  assignment: Assignment,
  partitionCount: number,
  consumers: readonly Consumer[],
): WaveOutcome {
  const complete =
    assignment.size === partitionCount && [...assignment.keys()].length === partitionCount
  let orphans = 0
  for (let p = 0; p < partitionCount; p++) if (assignment.get(p) === undefined) orphans++
  const owners = new Set(assignment.values())
  const validOwners = [...owners].every((id) => consumers.some((c) => c.id === id))
  const crewsServed = owners.size
  const fair = crewsServed === consumers.length
  return {
    pass: complete && orphans === 0 && validOwners && fair,
    metrics: {
      lanes_assigned: assignment.size,
      lanes_total: partitionCount,
      lanes_orphaned: orphans,
      crews_served: crewsServed,
      crews_total: consumers.length,
      assignment_valid: validOwners && complete,
    },
  }
}

/** The canonical round-robin assignment the level demonstrates (a "show the answer" aid). */
export function canonicalAssignment(
  partitionCount: number,
  consumers: readonly Consumer[],
): Assignment {
  return assignPartitions(partitionCount, consumers, "round-robin")
}

// ───────────────────────── L3: rebalance ─────────────────────────

export interface RebalancePuzzle {
  group: ConsumerGroup
  log: Log
  /** the membership change: consumers after the event */
  after: Consumer[]
  /** the ground-truth new assignment (partitions → owner), computed by the deterministic sim */
  actualAssignment: Assignment
  /** true when every committed offset survived the rebalance (the invariant) */
  offsetsPreserved: boolean
}

/**
 * Build the L3 puzzle: a group with some consumed work, then a scripted join (or leave).
 * Returns the before-state and the ground-truth after-state.
 */
export function buildRebalancePuzzle(cfg: LevelConfig, event: "join" | "leave"): RebalancePuzzle {
  const log = logFor(cfg)
  const beforeCrews = crewsFor(cfg.crewCount)
  let group = createGroup("g1", beforeCrews, cfg.partitionCount)
  // consume roughly half of each lane so offsets are non-trivial
  for (let p = 0; p < cfg.partitionCount; p++) {
    const tail = partitionTail(log, p)
    const consume = Math.floor(tail / 2)
    for (let i = 0; i < consume; i++) group = { ...group, offsets: bumpOffset(group.offsets, p) }
  }
  const offsetsBefore = new Map(group.offsets)
  const after =
    event === "join"
      ? [...beforeCrews, { id: `crew-${cfg.crewCount}` }]
      : beforeCrews.slice(0, Math.max(1, beforeCrews.length - 1))
  const rebalanced = rebalance(group, after)
  const offsetsPreserved = [...rebalanced.offsets.entries()].every(
    ([p, o]) => offsetsBefore.get(p) === o,
  )
  return { group, log, after, actualAssignment: rebalanced.assignment, offsetsPreserved }
}

/**
 * L3: the player predicts the new owner of every partition after a join/leave.
 * `predicted` is partition → crewId. We check it matches the deterministic rebalance AND that
 * offsets were preserved (the rebalance invariant — true by construction in the sim).
 */
export function evaluateRebalance(args: {
  predicted: ReadonlyMap<number, string>
  actual: Assignment
  offsetsPreserved: boolean
  partitionCount: number
}): WaveOutcome {
  let correct = 0
  let scored = 0
  for (let p = 0; p < args.partitionCount; p++) {
    const pred = args.predicted.get(p)
    if (pred === undefined) continue
    scored++
    if (pred === args.actual.get(p)) correct++
  }
  const accuracy = scored === 0 ? 0 : correct / scored
  const predictedAll = args.predicted.size === args.partitionCount
  return {
    pass: predictedAll && accuracy >= 0.8 && args.offsetsPreserved,
    metrics: {
      lanes_predicted: args.predicted.size,
      lanes_total: args.partitionCount,
      prediction_accuracy: round2(accuracy),
      offsets_preserved: args.offsetsPreserved,
      predicted_all_lanes: predictedAll,
    },
  }
}

// ───────────────────────── L4: replay ─────────────────────────

export interface ReplayPuzzle {
  log: Log
  group: ConsumerGroup
  partition: number
  /** where the group's cursor sits now (consume point) */
  currentOffset: number
  /** the ground-truth set of messages that will replay from `rewindTo` to the tail */
  actual: Message[]
}

/**
 * Build the L4 puzzle: pick the busiest lane, consume to its tail, then the player rewinds to
 * `rewindTo` and must predict which cars replay.
 */
export function buildReplayPuzzle(cfg: LevelConfig, rewindTo: number): ReplayPuzzle {
  const log = logFor(cfg)
  const group = createGroup("g1", crewsFor(cfg.crewCount), cfg.partitionCount)
  // pick the busiest partition
  let partition = 0
  let best = -1
  for (let p = 0; p < cfg.partitionCount; p++) {
    const t = partitionTail(log, p)
    if (t > best) {
      best = t
      partition = p
    }
  }
  const currentOffset = partitionTail(log, partition) // fully consumed
  const actual = replay(log, new Map([[partition, rewindTo]]))
  return { log, group, partition, currentOffset, actual }
}

/**
 * L4: the player predicts the set of offsets that will replay from `rewindTo` on `partition`.
 * We check the predicted offset set equals the ground truth (replay preserves within-partition order).
 * The truth is recomputed from the puzzle's log + the live `rewindTo`, so it reflects whatever the
 * player last dialed — not the rewind point the puzzle was originally built with.
 */
export function evaluateReplay(args: {
  predictedOffsets: number[]
  partition: number
  rewindTo: number
  puzzle: ReplayPuzzle
}): WaveOutcome {
  const truth = replay(args.puzzle.log, new Map([[args.partition, args.rewindTo]]))
    .filter((m) => m.partition === args.partition)
    .map((m) => m.offset)
    .sort((a, b) => a - b)
  const predicted = [...args.predictedOffsets].sort((a, b) => a - b)
  const correctCount = predicted.filter((o) => truth.includes(o)).length
  const accuracy = truth.length === 0 ? 1 : correctCount / truth.length
  const exact = predicted.length === truth.length && predicted.every((o, i) => o === truth[i])
  return {
    pass: exact || (accuracy >= 0.8 && predicted.length === truth.length),
    metrics: {
      lane: args.partition,
      rewind_to: args.rewindTo,
      cars_replayed: truth.length,
      cars_predicted: predicted.length,
      replay_accuracy: round2(accuracy),
      replay_exact: exact,
    },
  }
}

// ───────────────────────── helpers ─────────────────────────

function bumpOffset(offsets: ReadonlyMap<number, number>, partition: number): Map<number, number> {
  const next = new Map(offsets)
  next.set(partition, (next.get(partition) ?? 0) + 1)
  return next
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

import {
  ack,
  ackOrder,
  ackUntilQuorum,
  type Commit,
  commit,
  isCommitted,
  type Node,
  type Partition,
  partition,
  propose,
  quorumOf,
  tryCommitInPartition,
} from "./consensus"
import { mulberry32, type Rng } from "./rng"

export type LevelId = "L1" | "L2" | "L3" | "L4"

export interface LevelConfig {
  id: LevelId
  title: string
  lesson: string
  /** cluster size for this level (always odd in L1/L2 so quorum is a clean majority) */
  clusterSize: number
  /** the config key being changed this level */
  key: string
  /** the new value being proposed */
  newValue: string
  /** RNG seed controlling which nodes ack first */
  seed: number
  /** which nodes are watchers, by key set (for L2). key = nodeId */
  watchers: Record<string, string[]>
  /** partition split for L3 (nodeIds on the side under examination) */
  partitionSide: string[]
  passRule: string
}

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "L1",
    title: "Reach quorum",
    lesson:
      "A value is only the truth once a MAJORITY of lighthouses have acked. Watch the beams sweep — the commit flashes when > half align.",
    clusterSize: 5,
    key: "heading",
    newValue: "045",
    seed: 11,
    watchers: {},
    partitionSide: [],
    passRule: "Predict how many acks it takes to commit, then drive the acks to quorum.",
  },
  {
    id: "L2",
    title: "Watchers",
    lesson:
      "Nodes can WATCH a key. On commit — and only on commit — subscribed watchers light up. A mere proposal notifies no one.",
    clusterSize: 5,
    key: "heading",
    newValue: "090",
    seed: 22,
    watchers: { "lh-0": ["heading"], "lh-1": ["heading"], "lh-2": ["colour"] },
    partitionSide: [],
    passRule: "Predict which watchers light up on commit (only those subscribed to this key).",
  },
  {
    id: "L3",
    title: "Partition",
    lesson:
      "A network split. Only the side holding a MAJORITY can commit; the minority side cannot — that is split-brain prevention.",
    clusterSize: 5,
    key: "heading",
    newValue: "120",
    seed: 33,
    watchers: {},
    partitionSide: ["lh-0", "lh-1"],
    passRule: "Predict which side of the split can commit (the majority side), and which cannot.",
  },
  {
    id: "L4",
    title: "Re-merge",
    lesson:
      "The partition heals. The stale minority nodes catch up to the committed value — quorum is what let the truth survive the split.",
    clusterSize: 5,
    key: "heading",
    newValue: "180",
    seed: 44,
    watchers: {},
    partitionSide: ["lh-0"],
    passRule: "After the heal, sync the stale node to the committed value.",
  },
] as const

export function levelConfig(id: LevelId): LevelConfig {
  const cfg = LEVELS.find((l) => l.id === id)
  if (!cfg) throw new Error(`unknown level ${id}`)
  return cfg
}

export function makeNodes(n: number): Node[] {
  return Array.from({ length: n }, (_, i) => ({ id: `lh-${i}` }))
}

export function rngFor(cfg: LevelConfig): Rng {
  return mulberry32(cfg.seed)
}

/** The deterministic order in which nodes ack this level's proposal. */
export function ackOrderFor(cfg: LevelConfig): string[] {
  return ackOrder(makeNodes(cfg.clusterSize), rngFor(cfg))
}

export interface WaveOutcome {
  pass: boolean
  metrics: Record<string, number | boolean>
}

/**
 * L1 — Reach quorum. The player must (a) predict the quorum size correctly and (b) actually
 * drive the acks to reach quorum. "Playing it right" proves they understand that quorum,
 * not unanimity, is the commit threshold.
 */
export function evaluateQuorum(args: {
  cfg: LevelConfig
  predictedQuorum: number
  ackedNodeIds: readonly string[]
}): WaveOutcome {
  const truth = quorumOf(args.cfg.clusterSize)
  const predictedOk = args.predictedQuorum === truth
  const reached = isCommitted(
    ackMany(
      propose(makeNodes(args.cfg.clusterSize), args.cfg.key, args.cfg.newValue),
      args.ackedNodeIds,
    ),
    args.cfg.clusterSize,
  )
  return {
    pass: predictedOk && reached,
    metrics: {
      cluster_size: args.cfg.clusterSize,
      quorum_required: truth,
      quorum_predicted_ok: predictedOk,
      acks_given: args.ackedNodeIds.length,
      committed: reached,
    },
  }
}

/**
 * L2 — Watchers. The player must predict the exact set of watcher nodeIds that will light up
 * on commit (only those subscribed to the changed key), then commit and confirm.
 */
export function evaluateWatchers(args: {
  cfg: LevelConfig
  predictedLit: readonly string[]
  ackedNodeIds: readonly string[]
}): WaveOutcome {
  const nodes = makeNodes(args.cfg.clusterSize)
  const ballot = ackMany(propose(nodes, args.cfg.key, args.cfg.newValue), args.ackedNodeIds)
  const reached = isCommitted(ballot, args.cfg.clusterSize)
  const c = reached ? commit(ballot) : null
  const actualLit = c ? subscribedWatchers(c, args.cfg.watchers).sort() : ([] as string[]).sort()
  const predicted = [...new Set(args.predictedLit)].sort()
  const predictionOk = reached && JSON.stringify(predicted) === JSON.stringify(actualLit)
  return {
    pass: predictionOk,
    metrics: {
      watchers_total: Object.keys(args.cfg.watchers).length,
      watchers_predicted: predicted.length,
      watchers_actual: actualLit.length,
      watcher_set_ok: predictionOk,
      committed: reached,
    },
  }
}

/**
 * L3 — Partition. The player must correctly predict which side can commit. The majority side
 * can; the minority side cannot. "Playing it right" = naming the majority side.
 */
export function evaluatePartition(args: {
  cfg: LevelConfig
  predictedMajoritySide: "left" | "right"
}): WaveOutcome {
  const nodes = makeNodes(args.cfg.clusterSize)
  const p = partition(nodes, args.cfg.partitionSide)
  const leftCan = tryCommitInPartition(p.side, p.totalN)
  const rightCan = tryCommitInPartition(p.other, p.totalN)
  // exactly one side should be able to commit on these configs
  const majoritySide: "left" | "right" = leftCan ? "left" : "right"
  const predictedOk = args.predictedMajoritySide === majoritySide
  return {
    pass: predictedOk && leftCan !== rightCan,
    metrics: {
      cluster_size: args.cfg.clusterSize,
      left_size: p.side.length,
      right_size: p.other.length,
      quorum: quorumOf(args.cfg.clusterSize),
      left_can_commit: leftCan,
      right_can_commit: rightCan,
      majority_predicted_ok: predictedOk,
    },
  }
}

/** Convenience: the partition for a level (used by the scene + HUD). */
export function partitionFor(cfg: LevelConfig): Partition {
  return partition(makeNodes(cfg.clusterSize), cfg.partitionSide)
}

/**
 * L4 — Re-merge. The partition heals. The player must identify the stale node(s) and sync
 * them to the committed value. "Playing it right" proves the heal completes by applying the
 * truth the quorum protected.
 */
export function evaluateRemerge(args: {
  cfg: LevelConfig
  committedValue: string
  syncedNodeIds: readonly string[]
}): WaveOutcome {
  // the partition side are the nodes that were disconnected; they are the stale candidates
  const p = partitionFor(args.cfg)
  const staleIds = new Set(p.side.map((n) => n.id))
  const toSync = [...staleIds]
  const predictedToSync = new Set(args.syncedNodeIds)
  // correct sync set = exactly the stale nodes
  const setOk = toSync.every((id) => predictedToSync.has(id))
  const valueOk = args.committedValue === args.cfg.newValue
  return {
    pass: setOk && valueOk,
    metrics: {
      stale_nodes: toSync.length,
      synced_nodes: args.syncedNodeIds.length,
      sync_set_ok: setOk,
      committed_value_ok: valueOk,
    },
  }
}

/** Build a Watcher list from the level's watcher map. */
function subscribedWatchers(c: Commit, map: Record<string, string[]>): string[] {
  const out: string[] = []
  for (const [nodeId, keys] of Object.entries(map)) {
    if (keys.includes(c.key)) out.push(nodeId)
  }
  return out
}

function ackMany(ballot: ReturnType<typeof propose>, ids: readonly string[]): typeof ballot {
  let b = ballot
  for (const id of ids) b = ack(b, id)
  return b
}

export { ackUntilQuorum, commit, propose, quorumOf }

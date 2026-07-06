// Pure consensus/quorum logic for the Quorum Citadel teaching game.
//
// No three.js, no DOM — fully deterministic. Both the renderer (main.ts) and
// the unit tests import from here so the rules of the simulation are anchored
// in one place. The mechanic encodes the curriculum's primary learning
// objective (curriculum/17_distributed_config_service/docs/spec.md): a write
// commits only after a Raft-style quorum of sentinels acknowledges it, no
// unauthorized write is admitted, and partitioned writes never reach quorum.

export type SentinelId = "leader" | "followerA" | "followerB"

export type Sentinel = {
  readonly id: SentinelId
  readonly alive: boolean
  readonly acked: boolean
}

export type WriteOrb = {
  readonly id: string
  readonly value: string
  readonly version: number
  readonly authorized: boolean
  readonly partitioned: boolean
}

// A wave is a deterministic sequence of write orbs the player must steer
// through consensus. Two orbs are traps: one unauthorized (ACL), one
// partitioned (no quorum). The wave's contract mirrors the plan slice
// example (5 writes, 1 unauthorized, 1 partition event, 3 watchers).
export const WAVE_ORBS: readonly WriteOrb[] = [
  { id: "w1", value: "payments.retry_limit=4", version: 1, authorized: true, partitioned: false },
  { id: "w2", value: "feature.shipping_v2=true", version: 2, authorized: true, partitioned: false },
  { id: "w3", value: "payments.fee=0.99", version: 3, authorized: true, partitioned: false },
  { id: "w4", value: "admin.debug=true", version: 4, authorized: false, partitioned: false },
  { id: "w5", value: "cache.ttl=30", version: 5, authorized: true, partitioned: true },
] as const

export const WAVE_TARGET_COMMITS = 3
export const WAVE_WATCHERS_SUBSCRIBED = 3
export const WAVE_PARTITION_EVENTS = 1

// Simulated latencies (millisecond magnitudes shown on the HUD bars and
// recorded in evidence). Consensus is visibly heavier than watch-notify, so
// the catalog's comparison question has a clear answer.
export const SIM_CONSENSUS_P95_MS = 1200
export const SIM_WATCH_NOTIFY_P95_MS = 295
export const NOTIFY_BUDGET_MS = 350

// Quorum size for an alive cluster of N: floor(N/2) + 1 (Raft majority).
export function quorumRequired(aliveCount: number): number {
  if (aliveCount <= 0) return Number.POSITIVE_INFINITY
  return Math.floor(aliveCount / 2) + 1
}

export function aliveCount(sentinels: readonly Sentinel[]): number {
  return sentinels.filter((s) => s.alive).length
}

export function ackedCount(sentinels: readonly Sentinel[]): number {
  return sentinels.filter((s) => s.alive && s.acked).length
}

// Initial 3-node cluster: all alive, none acked yet.
export function freshCluster(): Sentinel[] {
  return [
    { id: "leader", alive: true, acked: false },
    { id: "followerA", alive: true, acked: false },
    { id: "followerB", alive: true, acked: false },
  ]
}

export type CommitResult =
  | { readonly kind: "commit"; readonly orb: WriteOrb; readonly acks: number }
  | { readonly kind: "no-quorum"; readonly orb: WriteOrb; readonly acks: number }
  | { readonly kind: "acl-leak"; readonly orb: WriteOrb }

export type RejectResult =
  | { readonly kind: "rejected-acl"; readonly orb: WriteOrb }
  | { readonly kind: "rejected-partition"; readonly orb: WriteOrb }
  | { readonly kind: "rejected-good"; readonly orb: WriteOrb }

// Trying to commit a write orb through the cluster. ACKs auto-collect from
// every alive sentinel that can be reached (partitioned orb ⇒ leader only).
// Returns:
//   - "commit"    ⇒ authorized + reached quorum (majority of alive)
//   - "no-quorum" ⇒ authorized but reachable ACKs < quorum (no split-brain)
//   - "acl-leak"  ⇒ unauthorized orb was proposed (ACL gate bypassed)
export function tryCommit(orb: WriteOrb, sentinels: readonly Sentinel[]): CommitResult {
  if (!orb.authorized) {
    return { kind: "acl-leak", orb }
  }
  const aliveTotal = aliveCount(sentinels)
  // A partitioned orb can only reach the leader itself (1 ACK).
  // A non-partitioned orb auto-collects ACKs from every alive sentinel.
  const reachableAcks = orb.partitioned ? 1 : aliveTotal
  if (reachableAcks >= quorumRequired(aliveTotal)) {
    return { kind: "commit", orb, acks: reachableAcks }
  }
  return { kind: "no-quorum", orb, acks: reachableAcks }
}

// Rejecting the targeted orb. The reason is decided by the orb's own trap
// flags so the metrics record correctly partitions ACL denials vs partition
// rejections vs accidental "good" rejections (the player rejected a healthy
// write, which is not a fail but a wasted proposal slot).
export function reject(orb: WriteOrb): RejectResult {
  if (!orb.authorized) {
    return { kind: "rejected-acl", orb }
  }
  if (orb.partitioned) {
    return { kind: "rejected-partition", orb }
  }
  return { kind: "rejected-good", orb }
}

export type Metrics = {
  readonly kind: "threejs-quorum-consensus"
  readonly writes_proposed: number
  readonly writes_committed_quorum: number
  readonly writes_committed_no_quorum: number
  readonly writes_rejected_partition: number
  readonly partition_events_total: number
  readonly writes_rejected_acl: number
  readonly acl_leaked: number
  readonly watchers_subscribed: number
  readonly watchers_notified_in_budget: number
  readonly watchers_notified_late: number
  readonly watchers_missed: number
  readonly fresh_reads_served: number
  readonly stale_reads_served: number
  readonly rollbacks_committed: number
  readonly leader_failovers_handled: number
  readonly consensus_p95_ms: number
  readonly watch_notify_p95_ms: number
  readonly monolith_damage: number
}

export function freshMetrics(): Metrics {
  return {
    kind: "threejs-quorum-consensus",
    writes_proposed: 0,
    writes_committed_quorum: 0,
    writes_committed_no_quorum: 0,
    writes_rejected_partition: 0,
    partition_events_total: WAVE_PARTITION_EVENTS,
    writes_rejected_acl: 0,
    acl_leaked: 0,
    watchers_subscribed: WAVE_WATCHERS_SUBSCRIBED,
    watchers_notified_in_budget: 0,
    watchers_notified_late: 0,
    watchers_missed: 0,
    fresh_reads_served: 0,
    stale_reads_served: 0,
    rollbacks_committed: 0,
    leader_failovers_handled: 0,
    consensus_p95_ms: SIM_CONSENSUS_P95_MS,
    watch_notify_p95_ms: SIM_WATCH_NOTIFY_P95_MS,
    monolith_damage: 0,
  }
}

// Apply a commit result to the metrics. The renderer calls this when the
// player presses Z (PRIMARY POSITIVE) on the targeted orb.
export function applyCommit(metrics: Metrics, result: CommitResult): Metrics {
  const watchersPerCommit = WAVE_WATCHERS_SUBSCRIBED
  switch (result.kind) {
    case "commit":
      return {
        ...metrics,
        writes_proposed: metrics.writes_proposed + 1,
        writes_committed_quorum: metrics.writes_committed_quorum + 1,
        watchers_notified_in_budget: metrics.watchers_notified_in_budget + watchersPerCommit,
        fresh_reads_served: metrics.fresh_reads_served + 1,
      }
    case "no-quorum":
      // Player forced a write through without majority = split-brain.
      return {
        ...metrics,
        writes_proposed: metrics.writes_proposed + 1,
        writes_committed_no_quorum: metrics.writes_committed_no_quorum + 1,
        monolith_damage: metrics.monolith_damage + 1,
      }
    case "acl-leak":
      return {
        ...metrics,
        writes_proposed: metrics.writes_proposed + 1,
        acl_leaked: metrics.acl_leaked + 1,
        monolith_damage: metrics.monolith_damage + 1,
      }
  }
}

// Apply a reject result to the metrics. The renderer calls this when the
// player presses X (PRIMARY DEFENSIVE) on the targeted orb.
export function applyReject(metrics: Metrics, result: RejectResult): Metrics {
  switch (result.kind) {
    case "rejected-acl":
      return {
        ...metrics,
        writes_proposed: metrics.writes_proposed + 1,
        writes_rejected_acl: metrics.writes_rejected_acl + 1,
      }
    case "rejected-partition":
      return {
        ...metrics,
        writes_proposed: metrics.writes_proposed + 1,
        writes_rejected_partition: metrics.writes_rejected_partition + 1,
      }
    case "rejected-good":
      // Healthy write wrongly rejected — counts as proposed but neither
      // committed nor traps. Not a fail condition, just wasted throughput.
      return {
        ...metrics,
        writes_proposed: metrics.writes_proposed + 1,
      }
  }
}

// The pass rule lifted verbatim from the plan slice (section 6 / section 11).
// Every line guards one curriculum invariant: no split-brain, no ACL leak,
// every partition rejected, every authorized watcher notified inside the
// budget with zero misses, no stale read, no monolith damage, AND both
// latency bars recorded so the catalog's comparison question is answered.
export type GateCheck = {
  readonly name: string
  readonly passed: boolean
}

export function gateChecks(metrics: Metrics, target: number): GateCheck[] {
  return [
    {
      name: "writes_committed_no_quorum===0",
      passed: metrics.writes_committed_no_quorum === 0,
    },
    { name: "acl_leaked===0", passed: metrics.acl_leaked === 0 },
    {
      name: "writes_rejected_partition===partition_events_total",
      passed: metrics.writes_rejected_partition === metrics.partition_events_total,
    },
    {
      name: "watchers_notified_late===0",
      passed: metrics.watchers_notified_late === 0,
    },
    { name: "watchers_missed===0", passed: metrics.watchers_missed === 0 },
    { name: "stale_reads_served===0", passed: metrics.stale_reads_served === 0 },
    { name: "monolith_damage===0", passed: metrics.monolith_damage === 0 },
    {
      name: `writes_committed_quorum>=${target}`,
      passed: metrics.writes_committed_quorum >= target,
    },
    {
      name: "consensus_p95_ms>0",
      passed: metrics.consensus_p95_ms > 0,
    },
    {
      name: "watch_notify_p95_ms>0",
      passed: metrics.watch_notify_p95_ms > 0,
    },
  ]
}

export function passRule(metrics: Metrics, target: number): boolean {
  return gateChecks(metrics, target).every((check) => check.passed)
}

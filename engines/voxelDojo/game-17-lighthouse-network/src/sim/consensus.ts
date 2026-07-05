import { type Rng, shuffle } from "./rng"

/**
 * Consensus quorum + watch/notify — the ONE concept of LIGHTHOUSE NETWORK.
 *
 * A config value change is only "the truth" once a MAJORITY of nodes (a quorum) have
 * acknowledged it. Until then it is a mere proposal. A minority partition can never reach
 * quorum, so two sides of a network split can never both commit conflicting values
 * (split-brain prevention). Once committed, watchers subscribed to that key are notified.
 *
 * Pure functions only. No Three.js imports — this module is unit-tested in Vitest without a GPU.
 */

/** A lighthouse / consensus node. */
export interface Node {
  id: string
}

/** Runtime knowledge a node holds: the last committed value it has applied, or null. */
export interface NodeState {
  id: string
  /** last committed value this node has seen & applied, or null if it has seen none */
  value: string | null
}

/**
 * An in-flight proposal. A ballot is the proposal plus the set of nodes that have acked it.
 * It becomes a Commit once `isCommitted` flips true.
 */
export interface Ballot {
  key: string
  value: string
  /** total cluster size the quorum is measured against (constant for the ballot's life) */
  n: number
  /** nodeIds that have acknowledged this proposal */
  acks: ReadonlySet<string>
}

/** A committed value — the truth. Materialised from a ballot the instant it reaches quorum. */
export interface Commit {
  key: string
  value: string
  n: number
  /** minimum acks required to commit: floor(n/2) + 1 */
  quorum: number
  /** the nodeIds that acked (≥ quorum of them) */
  acks: readonly string[]
}

/** A watcher subscribed to one or more keys; notified when a commit lands on a watched key. */
export interface Watcher {
  nodeId: string
  /** keys this watcher wants commit notifications for */
  keys: ReadonlySet<string>
}

/** Quorum = strict majority = floor(n/2) + 1. */
export function quorumOf(n: number): number {
  return Math.floor(n / 2) + 1
}

/**
 * Open a new ballot for `(key, value)` against a cluster of `nodes`.
 * No acks yet — this is the proposal phase. The value is NOT the truth until committed.
 */
export function propose(nodes: readonly Node[], key: string, value: string): Ballot {
  return { key, value, n: nodes.length, acks: new Set<string>() }
}

/** Record a node's acknowledgement of a ballot. Idempotent: acking twice is a no-op. */
export function ack(ballot: Ballot, nodeId: string): Ballot {
  if (ballot.acks.has(nodeId)) return ballot
  return { ...ballot, acks: new Set(ballot.acks).add(nodeId) }
}

/** How many nodes have acked so far. */
export function ackCount(ballot: Ballot): number {
  return ballot.acks.size
}

/**
 * Is the ballot committed? Strictly MORE than half the cluster must have acked.
 * `acks > n/2` ⟺ `acks >= floor(n/2)+1` ⟺ quorum reached. This is the line that makes a
 * value "the truth".
 */
export function isCommitted(ballot: Ballot, n: number = ballot.n): boolean {
  return ballot.acks.size > n / 2
}

/** How many MORE acks are needed to reach quorum (never negative). */
export function acksNeeded(ballot: Ballot): number {
  return Math.max(0, quorumOf(ballot.n) - ballot.acks.size)
}

/** Materialise a committed ballot into a Commit. Throws if not actually committed. */
export function commit(ballot: Ballot): Commit {
  if (!isCommitted(ballot)) {
    throw new Error(`ballot for ${ballot.key}=${ballot.value} has not reached quorum`)
  }
  return {
    key: ballot.key,
    value: ballot.value,
    n: ballot.n,
    quorum: quorumOf(ballot.n),
    acks: [...ballot.acks],
  }
}

export interface Partition {
  /** the side that initiated / is being asked about */
  side: Node[]
  /** everyone else — the other side of the split */
  other: Node[]
  /** total cluster size (side + other) */
  totalN: number
}

/**
 * Split a cluster into two partitions. `sideIds` are the nodeIds on the side under
 * examination; every other node lands on `other`. This is the split-brain setup.
 */
export function partition(nodes: readonly Node[], sideIds: readonly string[]): Partition {
  const sideSet = new Set(sideIds)
  const side: Node[] = []
  const other: Node[] = []
  for (const n of nodes) (sideSet.has(n.id) ? side : other).push(n)
  return { side, other, totalN: nodes.length }
}

/**
 * Can a partition side commit on its own? Only if it holds a MAJORITY of the whole cluster.
 * A minority side (size ≤ totalN/2) can never commit — that is split-brain prevention:
 * no two disjoint minorities can both "win".
 */
export function tryCommitInPartition(group: readonly Node[], totalN: number): boolean {
  return group.length > totalN / 2
}

/**
 * Notify the watchers subscribed to the committed key. Returns the set of watcher nodeIds
 * that should light up. A watcher only fires on COMMIT — never on a mere proposal — because
 * a proposed-but-uncommitted value is not yet "the truth".
 */
export function notifyWatchers(c: Commit, watchers: readonly Watcher[]): string[] {
  const out: string[] = []
  for (const w of watchers) {
    if (w.keys.has(c.key)) out.push(w.nodeId)
  }
  return out
}

/** Is a node stale relative to the committed value? (It holds something else, or nothing.) */
export function isStale(node: NodeState, committedValue: string): boolean {
  return node.value !== committedValue
}

/** A partitioned / disconnected node catches up: it applies the committed value. */
export function syncNode(node: NodeState, c: Commit): NodeState {
  return { ...node, value: c.value }
}

/**
 * Deterministic ack order — given a seed, the SAME nodes always ack in the SAME order.
 * This makes "which beams sweep first" replayable: same seed ⇒ same animation ⇒ same truth.
 */
export function ackOrder(nodes: readonly Node[], rng: Rng): string[] {
  return shuffle(
    nodes.map((n) => n.id),
    rng,
  )
}

/** Convenience: ack every node in the given (deterministic) order, stopping right after quorum. */
export function ackUntilQuorum(
  ballot: Ballot,
  order: readonly string[],
): { ballot: Ballot; commit: Commit | null } {
  let b = ballot
  let commit: Commit | null = null
  for (const id of order) {
    b = ack(b, id)
    if (isCommitted(b)) {
      commit = commitOf(b)
      break
    }
  }
  return { ballot: b, commit }
}

function commitOf(ballot: Ballot): Commit {
  return {
    key: ballot.key,
    value: ballot.value,
    n: ballot.n,
    quorum: quorumOf(ballot.n),
    acks: [...ballot.acks],
  }
}

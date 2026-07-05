/**
 * Headless message-queue simulation core.
 *
 * The ONE concept: a partitioned append-only log.
 *   • A message belongs to exactly one partition: `partitionOf(key) = hash(key) % N`.
 *   • Within a partition, order is preserved (offsets are per-partition, 0-based, monotonic).
 *   • A consumer group owns a subset of partitions (1 partition → exactly 1 consumer in the group).
 *   • Offsets are per-partition-per-group cursors. They survive rebalance because they are keyed by
 *     partition, not by consumer — so a new owner simply picks up the same cursor.
 *   • Replay = rewind a partition's offset and re-read; within-partition order is preserved.
 *
 * Deterministic, no Three.js imports, unit-testable in Vitest. The scene only renders state.
 */

// ───────────────────────── stable hash ─────────────────────────

/** FNV-1a 32-bit. */
function fnv1a(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Murmur3 finalizer — full avalanche, so keys spread evenly across partitions. */
function fmix32(h: number): number {
  let x = h
  x ^= x >>> 16
  x = Math.imul(x, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return x >>> 0
}

/** Stable, well-distributed 32-bit hash. Same key ⇒ same hash ⇒ same partition. */
export function stableHash(input: string): number {
  return fmix32(fnv1a(input))
}

// ───────────────────────── types ─────────────────────────

/** One appended freight car. `offset` is its 0-based position within its partition. */
export interface Message {
  /** Global monotonic append id (cross-partition append order). */
  id: number
  key: string
  payload: string
  partition: number
  offset: number
}

/** Append-only log partitioned into `partitionCount` lanes. */
export interface Log {
  partitionCount: number
  messages: readonly Message[]
  nextId: number
}

export interface Consumer {
  id: string
}

/** partition → owning consumerId (within one group). Each partition has exactly one owner. */
export type Assignment = ReadonlyMap<number, string>

/** partition → committed offset (count of messages consumed). Cursor lives on the partition. */
export type OffsetMap = ReadonlyMap<number, number>

export type AssignStrategy = "round-robin" | "range"

/** A consumer group: its members, which partitions each owns, and a per-partition offset cursor. */
export interface ConsumerGroup {
  id: string
  consumers: readonly Consumer[]
  assignment: Assignment
  offsets: OffsetMap
}

// ───────────────────────── log / partitioning ─────────────────────────

export function createLog(partitionCount: number): Log {
  if (partitionCount <= 0) throw new Error("partition count must be positive")
  return { partitionCount, messages: [], nextId: 0 }
}

/** Which partition does `key` land on? Stable: same key + same N ⇒ same partition. */
export function partitionOf(key: string, n: number): number {
  if (n <= 0) throw new Error("partition count must be positive")
  return stableHash(key) % n
}

/**
 * Append a message to the log. It lands in `partitionOf(key)` and receives the next
 * within-partition offset, so order within a partition is exactly append order.
 * Returns a NEW log (append-only ⇒ immutable update).
 */
export function appendLog(log: Log, key: string, payload: string): Log {
  const partition = partitionOf(key, log.partitionCount)
  const offset = countInPartition(log, partition)
  const msg: Message = { id: log.nextId, key, payload, partition, offset }
  return { ...log, messages: [...log.messages, msg], nextId: log.nextId + 1 }
}

/** Append many (key, payload) pairs in order. Helper for deterministic level setup. */
export function appendMany(
  log: Log,
  entries: ReadonlyArray<{ key: string; payload: string }>,
): Log {
  let out = log
  for (const e of entries) out = appendLog(out, e.key, e.payload)
  return out
}

function countInPartition(log: Log, partition: number): number {
  let n = 0
  for (const m of log.messages) if (m.partition === partition) n++
  return n
}

/** All messages in a partition, in offset order (i.e. append order). */
export function partitionSlice(log: Log, partition: number): Message[] {
  const out: Message[] = []
  for (const m of log.messages) if (m.partition === partition) out.push(m)
  // messages are stored in append order, which is already offset order; stable sort keeps it.
  out.sort((a, b) => a.offset - b.offset)
  return out
}

/** How many messages has a partition received (= its high-watermark / tail length). */
export function partitionTail(log: Log, partition: number): number {
  return countInPartition(log, partition)
}

// ───────────────────────── assignment ─────────────────────────

/**
 * Assign every partition to exactly one consumer (1-to-1 from partition's side).
 * Consumers are sorted by id first, so the result is deterministic regardless of input order.
 *
 * - "round-robin" (default): partition p → consumers[p % len]. Clean interleaved ownership.
 * - "range": partition the index range [0, N) into `len` contiguous blocks.
 *
 * Guarantees: every partition 0..N-1 is assigned (no orphan); no partition is assigned twice
 * (no double-assignment).
 */
export function assignPartitions(
  partitionCount: number,
  consumers: readonly Consumer[],
  strategy: AssignStrategy = "round-robin",
): Assignment {
  if (consumers.length === 0) throw new Error("need at least one consumer to assign partitions")
  const ids = [...consumers].map((c) => c.id).sort()
  const out = new Map<number, string>()
  if (strategy === "range") {
    for (let p = 0; p < partitionCount; p++) {
      // Evenly distribute the contiguous range; remainder partitions go to the first consumers.
      const owner = ids[
        Math.min(ids.length - 1, Math.floor((p * ids.length) / partitionCount))
      ] as string
      out.set(p, owner)
    }
  } else {
    for (let p = 0; p < partitionCount; p++) out.set(p, ids[p % ids.length] as string)
  }
  return out
}

/** True when an assignment covers every partition exactly once (no orphan, no double-assign). */
export function isCompleteAssignment(assignment: Assignment, partitionCount: number): boolean {
  if (assignment.size !== partitionCount) return false
  for (let p = 0; p < partitionCount; p++) if (!assignment.has(p)) return false
  return true // Map keys are unique, so size === partitionCount already rules out double-assignment
}

// ───────────────────────── consumer group / offsets ─────────────────────────

/** Build a fresh group: partitions assigned, all cursors at 0 (nothing consumed yet). */
export function createGroup(
  id: string,
  consumers: readonly Consumer[],
  partitionCount: number,
  strategy: AssignStrategy = "round-robin",
): ConsumerGroup {
  const assignment = assignPartitions(partitionCount, consumers, strategy)
  const offsets = new Map<number, number>()
  for (let p = 0; p < partitionCount; p++) offsets.set(p, 0)
  return { id, consumers: [...consumers], assignment, offsets }
}

/**
 * Messages this group has NOT yet consumed across the partitions it owns (offset → tail), in order.
 *
 * For the single-group freight-yard sim every assigned partition is in-scope. In a multi-group
 * extension the caller would filter `assignment` to partitions whose owner belongs to this group.
 */
export function pendingForGroup(log: Log, group: ConsumerGroup): Message[] {
  const out: Message[] = []
  for (const partition of group.assignment.keys()) {
    const from = group.offsets.get(partition) ?? 0
    for (const m of partitionSlice(log, partition)) if (m.offset >= from) out.push(m)
  }
  // preserve append (id) order across partitions; within a partition this is offset order
  out.sort((a, b) => a.id - b.id)
  return out
}

/**
 * Advance the group's committed offset for `partition` by `n` (bounded by the partition tail
 * when `tail` is provided, so the cursor never runs past the log end). Offsets are per-partition.
 */
export function advanceOffset(
  group: ConsumerGroup,
  partition: number,
  n: number,
  tail?: number,
): ConsumerGroup {
  const cur = group.offsets.get(partition) ?? 0
  const next = tail === undefined ? cur + n : Math.min(cur + n, tail)
  const offsets = new Map(group.offsets)
  offsets.set(partition, Math.max(0, next))
  return { ...group, offsets }
}

/** Rewind a partition's cursor back to `toOffset` (the replay starting point). */
export function rewindOffset(
  group: ConsumerGroup,
  partition: number,
  toOffset: number,
): ConsumerGroup {
  const offsets = new Map(group.offsets)
  offsets.set(partition, Math.max(0, toOffset))
  return { ...group, offsets }
}

/**
 * Rebalance: membership changed (consumer joined or left). Partitions are reassigned across the
 * new members — but **committed offsets are preserved**, because they are keyed by partition, not
 * by consumer. The new owner of a partition simply continues at the same cursor.
 *
 * Corresponds to the sketch `rebalance(prevConsumers, newConsumers, partitions)`: the previous
 * consumers + committed offsets + partition count are all carried by `group`.
 */
export function rebalance(
  group: ConsumerGroup,
  newConsumers: readonly Consumer[],
  strategy: AssignStrategy = "round-robin",
): ConsumerGroup {
  const assignment = assignPartitions(
    // partition count is recoverable from the cursor set
    group.offsets.size,
    newConsumers,
    strategy,
  )
  // offsets map is carried over verbatim — this is the rebalance invariant
  return { ...group, consumers: [...newConsumers], assignment, offsets: group.offsets }
}

// ───────────────────────── replay ─────────────────────────

/**
 * Replay: re-deliver messages. For each partition `p` listed in `fromOffset`, re-read from
 * `fromOffset[p]` to the tail of that partition, in within-partition (offset) order.
 *
 * Partitions absent from `fromOffset` are not re-read. Returns messages merged in global append
 * (id) order; within any single partition the original offset order is preserved — that is the
 * replay guarantee.
 */
export function replay(log: Log, fromOffset: ReadonlyMap<number, number>): Message[] {
  const out: Message[] = []
  for (const [partition, from] of fromOffset) {
    for (const m of partitionSlice(log, partition)) if (m.offset >= from) out.push(m)
  }
  out.sort((a, b) => a.id - b.id)
  return out
}

/** Convenience: replay a single partition from `fromOffset` to its tail, in offset order. */
export function replayPartition(log: Log, partition: number, fromOffset: number): Message[] {
  return partitionSlice(log, partition).filter((m) => m.offset >= fromOffset)
}

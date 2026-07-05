import { describe, expect, it } from "vitest"
import {
  advanceOffset,
  appendLog,
  assignPartitions,
  createGroup,
  createLog,
  isCompleteAssignment,
  type Log,
  partitionOf,
  partitionSlice,
  partitionTail,
  pendingForGroup,
  rebalance,
  replay,
  replayPartition,
  rewindOffset,
  stableHash,
} from "./queue"
import { keyStream, mulberry32 } from "./rng"

const CREWS = ["c-0", "c-1", "c-2"].map((id) => ({ id }))

function fill(log: Log, keys: readonly string[]): Log {
  let out = log
  for (const k of keys) out = appendLog(out, k, `payload-${k}`)
  return out
}

describe("partitioning & within-partition order (the L1 lesson)", () => {
  it("same key ⇒ same partition (stable), and hash spreads keys across partitions", () => {
    expect(partitionOf("user-42", 4)).toBe(partitionOf("user-42", 4))
    const parts = new Set<string>()
    for (const k of keyStream(mulberry32(1), 500)) parts.add(String(partitionOf(k, 4)))
    expect(parts.size).toBe(4) // all four partitions get traffic
  })

  it("within a partition, offsets are 0,1,2,… and reflect append order", () => {
    const log = fill(createLog(3), ["a", "b", "c", "a", "a", "d"])
    // every message is filed into the partition its key hashes to
    for (const m of log.messages) {
      expect(m.partition).toBe(partitionOf(m.key, log.partitionCount))
    }
    // and within each partition the offset is the message's 0-based rank in append order
    for (let p = 0; p < log.partitionCount; p++) {
      const slice = partitionSlice(log, p)
      for (let i = 0; i < slice.length; i++) expect(slice[i]?.offset).toBe(i)
    }
  })

  it("the same key appended repeatedly stacks in one partition in order", () => {
    const log = fill(createLog(4), ["hot", "hot", "hot"])
    const slice = partitionSlice(log, partitionOf("hot", 4))
    expect(slice).toHaveLength(3)
    expect(slice.map((m) => m.offset)).toEqual([0, 1, 2])
    expect(new Set(slice.map((m) => m.partition))).toHaveLength(1)
  })
})

describe("rebalance keeps committed offsets and reassigns partitions 1-to-1 (the L3 lesson)", () => {
  it("a new consumer joins: partitions get reassigned, but committed offsets survive", () => {
    let log = createLog(4)
    log = fill(log, keyStream(mulberry32(7), 60))
    // group of 2 consumers, consume a bit (advance cursors on every partition)
    let group = createGroup("g1", CREWS.slice(0, 2), log.partitionCount)
    for (let p = 0; p < log.partitionCount; p++) {
      const tail = partitionTail(log, p)
      group = advanceOffset(group, p, Math.floor(tail / 2), tail)
    }
    const offsetsBefore = new Map(group.offsets)
    const beforeOwners = [...group.assignment.entries()].sort((a, b) => a[0] - b[0])

    // a 3rd consumer joins → rebalance
    group = rebalance(group, CREWS.slice(0, 3))

    // offsets are preserved verbatim (the rebalance invariant)
    expect([...group.offsets.entries()]).toEqual([...offsetsBefore.entries()])
    // partitions are reassigned across the now-larger crew
    const afterOwners = [...group.assignment.entries()].sort((a, b) => a[0] - b[0])
    expect(afterOwners.some((_, i) => afterOwners[i]?.[1] !== beforeOwners[i]?.[1])).toBe(true)
    // all three consumers get at least one partition
    expect(new Set(group.assignment.values()).size).toBe(3)
  })

  it("rebalance never orphans a partition and never double-assigns one", () => {
    let log = createLog(6)
    log = fill(log, keyStream(mulberry32(3), 40))
    let group = createGroup("g1", CREWS.slice(0, 2), log.partitionCount)
    group = rebalance(group, CREWS) // 2 → 3 consumers
    expect(isCompleteAssignment(group.assignment, log.partitionCount)).toBe(true)
    expect(group.assignment.size).toBe(log.partitionCount)
    for (let p = 0; p < log.partitionCount; p++) {
      expect(group.assignment.get(p)).toBeDefined()
    }
  })

  it("rebalance on leave preserves committed offsets (the departing consumer's cursors stay)", () => {
    let log = createLog(4)
    log = fill(log, keyStream(mulberry32(9), 50))
    let group = createGroup("g1", CREWS.slice(0, 3), log.partitionCount)
    for (let p = 0; p < log.partitionCount; p++) {
      group = advanceOffset(group, p, 2, partitionTail(log, p))
    }
    const offsetsBefore = new Map(group.offsets)
    // one consumer leaves → 3 → 2
    group = rebalance(group, CREWS.slice(0, 2))
    expect([...group.offsets.entries()]).toEqual([...offsetsBefore.entries()])
    expect(isCompleteAssignment(group.assignment, log.partitionCount)).toBe(true)
  })
})

describe("replay re-delivers from an old offset in within-partition order (the L4 lesson)", () => {
  it("rewinding an offset and replaying re-delivers exactly the messages after it, in order", () => {
    const keys = ["a", "b", "a", "c", "a", "b", "a"]
    let log = createLog(3)
    log = fill(log, keys)
    const pHot = partitionOf("a", log.partitionCount)
    const slice = partitionSlice(log, pHot)
    const allOffsets = slice.map((m) => m.offset)
    expect(allOffsets.length).toBeGreaterThanOrEqual(3)

    // group has consumed up to offset 1 on pHot → replay from 1 should re-deliver offset 1..end
    const replayed = replayPartition(log, pHot, 1)
    expect(replayed.map((m) => m.offset)).toEqual(allOffsets.filter((o) => o >= 1))
    expect(replayed.every((m) => m.partition === pHot)).toBe(true)
    // within-partition order preserved: offsets come back strictly increasing
    for (let i = 1; i < replayed.length; i++) {
      expect(replayed[i]?.offset).toBeGreaterThan(replayed[i - 1]?.offset ?? -1)
    }
  })

  it("replay across the whole group: rewind → re-read → same messages, same per-partition order", () => {
    const keys = keyStream(mulberry32(11), 40)
    let log = createLog(4)
    log = fill(log, keys)
    let group = createGroup("g1", CREWS.slice(0, 2), log.partitionCount)
    // fully consume
    for (let p = 0; p < log.partitionCount; p++) {
      group = advanceOffset(group, p, partitionTail(log, p), partitionTail(log, p))
    }
    expect(pendingForGroup(log, group)).toHaveLength(0)
    // rewind every partition to 0 → replay should give back ALL messages
    const fromOffset = new Map<number, number>()
    for (let p = 0; p < log.partitionCount; p++) fromOffset.set(p, 0)
    const replayed = replay(log, fromOffset)
    expect(replayed.map((m) => m.id)).toEqual(log.messages.map((m) => m.id))
    // within each partition the offset sequence is still 0,1,2,…
    for (let p = 0; p < log.partitionCount; p++) {
      const part = replayed.filter((m) => m.partition === p)
      for (let i = 0; i < part.length; i++) expect(part[i]?.offset).toBe(i)
    }
  })

  it("rewind on a live group then advance delivers the same records it would have originally", () => {
    const keys = ["x", "y", "x", "z", "x"]
    let log = createLog(3)
    log = fill(log, keys)
    const pX = partitionOf("x", log.partitionCount)
    let group = createGroup("g1", CREWS.slice(0, 1), log.partitionCount)
    // consume up to the tail
    group = advanceOffset(group, pX, partitionTail(log, pX), partitionTail(log, pX))
    expect(pendingForGroup(log, group).filter((m) => m.partition === pX)).toHaveLength(0)
    // rewind to 1
    group = rewindOffset(group, pX, 1)
    const again = pendingForGroup(log, group).filter((m) => m.partition === pX)
    const original = partitionSlice(log, pX).filter((m) => m.offset >= 1)
    expect(again.map((m) => m.offset)).toEqual(original.map((m) => m.offset))
  })
})

describe("assignment strategies & invariants", () => {
  it("round-robin interleaves; range produces contiguous blocks", () => {
    const rr = assignPartitions(6, CREWS, "round-robin")
    const rng = assignPartitions(6, CREWS, "range")
    expect(isCompleteAssignment(rr, 6)).toBe(true)
    expect(isCompleteAssignment(rng, 6)).toBe(true)
    // round robin: partitions 0,3 → c-0 ; 1,4 → c-1 ; 2,5 → c-2 (after sort by id)
    expect(rr.get(0)).toBe("c-0")
    expect(rr.get(3)).toBe("c-0")
    // range block boundaries: 6 partitions over 3 consumers → 2 each
    expect(rng.get(0)).toBe("c-0")
    expect(rng.get(1)).toBe("c-0")
    expect(rng.get(2)).toBe("c-1")
  })

  it("zero consumers throws", () => {
    expect(() => assignPartitions(3, [])).toThrow("at least one consumer")
  })
})

describe("stableHash sanity", () => {
  it("is deterministic and 32-bit", () => {
    expect(stableHash("hello")).toBe(stableHash("hello"))
    expect(stableHash("hello")).not.toBe(stableHash("hellp"))
    expect(stableHash("hello")).toBeGreaterThanOrEqual(0)
    expect(stableHash("hello")).toBeLessThan(0x100000000)
  })
})

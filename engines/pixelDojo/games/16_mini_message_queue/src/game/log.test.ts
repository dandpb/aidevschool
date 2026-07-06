import { describe, expect, it } from "vitest"
import { buildEvidence, type MessageQueueEvidenceRecord } from "./evidence"
import {
  type ConsumerGroupId,
  keyColorToPartition,
  LAG_TIDE_NEVER,
  MessageQueue,
  type PartitionId,
  type PendingOrb,
} from "./log"
import { buildLevel2Wave, L2_COMMIT_TARGET, L2_LAG_TOLERANCE, PARTITION_COLORS } from "./wave"

function makeQueue(retentionSeconds = LAG_TIDE_NEVER): MessageQueue {
  return new MessageQueue({
    partitionColors: PARTITION_COLORS,
    consumerGroups: [
      { id: 0, partition: 0 },
      { id: 1, partition: 1 },
    ],
    lagMaxTolerance: L2_LAG_TOLERANCE,
    retentionAdvanceSeconds: retentionSeconds,
    replayWindow: 4,
  })
}

function makeOrb(color: string, keyPartition: PartitionId, deadline = 10): PendingOrb {
  return { keyColor: color, keyPartition, explicitPartition: null, deadline }
}

describe("keyColorToPartition", () => {
  it("maps each color to its lane index", () => {
    expect(keyColorToPartition("#f06292", PARTITION_COLORS)).toBe(0)
    expect(keyColorToPartition("#66bb6a", PARTITION_COLORS)).toBe(1)
    expect(keyColorToPartition("#4fc3f7", PARTITION_COLORS)).toBe(2)
  })

  it("falls back to lane 0 for an unknown color", () => {
    expect(keyColorToPartition("#ffffff", PARTITION_COLORS)).toBe(0)
  })
})

describe("MessageQueue.append (RF-005/006)", () => {
  it("appends orbs at nextOffset (gap-free, monotonic)", () => {
    const q = makeQueue()
    q.loadWave([makeOrb("#f06292", 0), makeOrb("#f06292", 0), makeOrb("#66bb6a", 1)])
    const r0 = q.produce(0)
    const r1 = q.produce(0)
    const r2 = q.produce(1)
    if (!r0.ok || !r1.ok || !r2.ok) throw new Error("expected all produces to succeed")
    expect(r0.offset).toBe(0)
    expect(r1.offset).toBe(1)
    expect(r2.offset).toBe(0)
    const snap = q.snapshot
    expect(snap.partitions[0]?.nextOffset).toBe(2)
    expect(snap.partitions[1]?.nextOffset).toBe(1)
    expect(snap.partitions[2]?.nextOffset).toBe(0)
    expect(snap.messages_produced).toBe(3)
    expect(snap.correct_routes).toBe(3)
    expect(snap.ordering_violations).toBe(0)
  })

  it("counts a misroute without advancing nextOffset (RF-004)", () => {
    const q = makeQueue()
    q.loadWave([makeOrb("#f06292", 0)])
    const wrong = q.produce(1) // lane 1 ≠ key color (lane 0)
    expect(wrong.ok).toBe(false)
    if (!wrong.ok) {
      expect(wrong.reason).toBe("misroute")
      expect(wrong.expectedPartition).toBe(0)
      expect(wrong.chosenPartition).toBe(1)
    }
    const snap = q.snapshot
    expect(snap.misroutes).toBe(1)
    expect(snap.partitions[0]?.nextOffset).toBe(0)
    expect(snap.partitions[1]?.nextOffset).toBe(0)
    // The orb stays on the platform so the player can retry.
    expect(snap.pendingOrb).not.toBeNull()
  })
})

describe("MessageQueue consumer cursors (RF-008/009/010)", () => {
  it("fetch brightens, commit advances (next-to-deliver semantics)", () => {
    const q = makeQueue()
    q.loadWave([
      makeOrb("#f06292", 0),
      makeOrb("#f06292", 0),
      makeOrb("#f06292", 0),
      makeOrb("#f06292", 0),
    ])
    q.produce(0)
    q.produce(0)
    q.produce(0)
    q.produce(0)
    const g0: ConsumerGroupId = 0

    // Fetch without commit — cursor does not advance (at-least-once trap).
    const f1 = q.fetch(g0)
    expect(f1.ok).toBe(true)
    if (f1.ok) expect(f1.offset).toBe(0)
    let snap = q.snapshot
    expect(snap.consumerGroups[0]?.committedOffset).toBe(0)
    expect(snap.consumerGroups[0]?.fetchedOffset).toBe(0)

    // Commit — cursor advances to 1, lag drops.
    const c1 = q.commit(g0)
    expect(c1.ok).toBe(true)
    if (c1.ok) expect(c1.advancedTo).toBe(1)
    snap = q.snapshot
    expect(snap.consumerGroups[0]?.committedOffset).toBe(1)
    expect(snap.consumerGroups[0]?.fetchedOffset).toBeNull()
    expect(snap.commits).toBe(1)
    // No group lag tick has occurred beyond the immediate recompute — lag is
    // (4 - 1) = 3 just after this commit.
    expect(snap.consumerGroups[0]?.lag).toBe(3)
  })

  it("fetch on an empty log returns log_empty (FR-008 cursor at end)", () => {
    const q = makeQueue()
    q.loadWave([])
    const r = q.fetch(0)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe("log_empty")
  })

  it("commit without a fetch in flight is rejected (at-least-once)", () => {
    const q = makeQueue()
    q.loadWave([makeOrb("#f06292", 0)])
    q.produce(0)
    const r = q.commit(0)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe("no_fetch_in_flight")
  })
})

describe("MessageQueue replay (RF-011)", () => {
  it("rewinds the cursor and counts a replay", () => {
    const q = makeQueue()
    q.loadWave([
      makeOrb("#f06292", 0),
      makeOrb("#f06292", 0),
      makeOrb("#f06292", 0),
      makeOrb("#f06292", 0),
    ])
    for (let i = 0; i < 4; i += 1) q.produce(0)
    q.fetch(0)
    q.commit(0)
    q.fetch(0)
    q.commit(0)
    expect(q.snapshot.consumerGroups[0]?.committedOffset).toBe(2)
    const r = q.replay(0, 1)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.fromOffset).toBe(2)
      expect(r.toOffset).toBe(1)
    }
    const snap = q.snapshot
    expect(snap.consumerGroups[0]?.committedOffset).toBe(1)
    expect(snap.replays).toBe(1)
    expect(snap.replay_faults).toBe(0)
  })

  it("clamps rewind to the configured replay window", () => {
    const q = makeQueue()
    q.loadWave([
      makeOrb("#f06292", 0),
      makeOrb("#f06292", 0),
      makeOrb("#f06292", 0),
      makeOrb("#f06292", 0),
      makeOrb("#f06292", 0),
      makeOrb("#f06292", 0),
    ])
    for (let i = 0; i < 6; i += 1) q.produce(0)
    for (let i = 0; i < 5; i += 1) {
      q.fetch(0)
      q.commit(0)
    }
    expect(q.snapshot.consumerGroups[0]?.committedOffset).toBe(5)
    // Ask for rewind 99 — clamped to replayWindow=4.
    const r = q.replay(0, 99)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.toOffset).toBe(1)
  })
})

describe("MessageQueue retention (RF-012)", () => {
  it("dissolves slots below beginningOffset when the tide advances", () => {
    const q = makeQueue(2) // tide every 2 seconds
    q.loadWave([makeOrb("#f06292", 0, 100), makeOrb("#f06292", 0, 100), makeOrb("#f06292", 0, 100)])
    q.produce(0)
    q.produce(0)
    q.produce(0)
    expect(q.snapshot.partitions[0]?.nextOffset).toBe(3)
    // Tide advances at t=2.
    q.tick(2)
    expect(q.snapshot.partitions[0]?.beginningOffset).toBe(1)
    expect(q.snapshot.partitions[0]?.slots[0]).toBeNull()
    expect(q.snapshot.partitions[0]?.slots[1]).not.toBeNull()
  })

  it("raises a retention_fault when fetching below beginningOffset", () => {
    const q = makeQueue(2)
    q.loadWave([makeOrb("#f06292", 0, 100), makeOrb("#f06292", 0, 100)])
    q.produce(0)
    q.produce(0)
    // Cursor parked at offset 0 — tide moves past it.
    q.tick(2)
    expect(q.snapshot.partitions[0]?.beginningOffset).toBe(1)
    const r = q.fetch(0)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe("retention_fault")
    expect(q.snapshot.retention_faults).toBe(1)
  })
})

describe("MessageQueue lag (FR-014)", () => {
  it("tracks lag = latest − committed and surfaces lag_peak", () => {
    const q = makeQueue()
    q.loadWave([
      makeOrb("#f06292", 0, 100),
      makeOrb("#f06292", 0, 100),
      makeOrb("#f06292", 0, 100),
      makeOrb("#f06292", 0, 100),
    ])
    for (let i = 0; i < 4; i += 1) q.produce(0)
    const snap = q.snapshot
    expect(snap.consumerGroups[0]?.lag).toBe(4)
    expect(snap.lag_peak).toBe(4)
  })
})

describe("buildEvidence gate", () => {
  function playThrough() {
    const wave = buildLevel2Wave()
    const q = new MessageQueue({
      partitionColors: wave.partitionColors,
      consumerGroups: wave.consumerGroups,
      lagMaxTolerance: wave.lagMaxTolerance,
      retentionAdvanceSeconds: wave.retentionAdvanceSeconds,
      replayWindow: wave.replayWindow,
    })
    q.loadWave(wave.inboundOrbs)
    // Interleave produce ↔ commit so lag stays low.
    const groupByPartition = new Map<number, number>()
    for (const g of wave.consumerGroups) groupByPartition.set(g.partition, g.id)
    for (let i = 0; i < wave.inboundOrbs.length; i += 1) {
      const orb = wave.inboundOrbs[i]
      if (orb === undefined) continue
      const partition = orb.keyPartition
      q.produce(partition)
      const gid = groupByPartition.get(partition)
      if (gid !== undefined) {
        q.fetch(gid)
        q.commit(gid)
      }
    }
    return { wave, snapshot: q.snapshot }
  }

  it("passes when every orb is produced and every group commits past target", () => {
    const { wave, snapshot } = playThrough()
    const record = buildEvidence({
      snapshot,
      level: wave.level,
      commitTarget: wave.commitTarget,
    }) as MessageQueueEvidenceRecord
    expect(record.pass).toBe(true)
    expect(record.metrics.kind).toBe("threejs-message-queue")
    expect(record.metrics.messages_inbound).toBe(12)
    expect(record.metrics.messages_produced).toBe(12)
    expect(record.metrics.correct_routes).toBe(12)
    expect(record.metrics.misroutes).toBe(0)
    expect(record.metrics.ordering_violations).toBe(0)
    expect(record.metrics.commits).toBe(8)
    expect(record.metrics.commits).toBeGreaterThanOrEqual(L2_COMMIT_TARGET)
    expect(record.metrics.lag_peak).toBeLessThanOrEqual(L2_LAG_TOLERANCE)
    expect(record.metrics.retention_faults).toBe(0)
    expect(record.metrics.replay_faults).toBe(0)
    expect(record.metrics.deadline_misses).toBe(0)
    expect(record.unit_id).toBe("16_mini_message_queue")
    expect(record.encounter_id).toBe("encounter-16_mini_message_queue")
  })

  it("fails when a misroute taints the wave", () => {
    const wave = buildLevel2Wave()
    const q = new MessageQueue({
      partitionColors: wave.partitionColors,
      consumerGroups: wave.consumerGroups,
      lagMaxTolerance: wave.lagMaxTolerance,
      retentionAdvanceSeconds: wave.retentionAdvanceSeconds,
      replayWindow: wave.replayWindow,
    })
    q.loadWave(wave.inboundOrbs)
    // First orb to lane 0; force a misroute into lane 1.
    q.produce(1)
    const record = buildEvidence({
      snapshot: q.snapshot,
      level: wave.level,
      commitTarget: wave.commitTarget,
    })
    expect(record.pass).toBe(false)
    expect(record.metrics.misroutes).toBe(1)
  })
})

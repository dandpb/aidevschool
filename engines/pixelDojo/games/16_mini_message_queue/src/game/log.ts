// Mini Message Queue — core deterministic logic.
//
// One concept (per docs/plans/16_mini_message_queue.md): log-structured storage
// with partitioned ordered offsets. The rules mirrored here:
//   RF-001 — a topic is N parallel append-only logs (partitions).
//   RF-004 — producers route by key→partition (key hash → color → lane).
//   RF-005/006/NFR-005 — append-only, gap-free, monotonic offsets; the orb
//                        always snaps into nextOffset, never reorders/skips.
//   RF-008 — consumer group = independent cursor; many groups read the same
//            partition at different speeds.
//   RF-009/010 — committed offset = next to deliver; fetch ≠ commit (at-least-once).
//   RF-011 — replay = reposition cursor backward along the retained log.
//   RF-012 — retention drops old offsets so the log is bounded; reading a
//            non-retained offset raises offset_no_longer_retained.
//   FR-014 — lag = latest − committed; the segment glows red.
//
// This module is pure (no DOM, no three.js). The scene (src/scene/) and the
// Playwright smoke (playwright/smoke.spec.ts) read state via `subscribe` and
// the test hook `window.__messageQueue`.

export type PartitionId = number
export type ConsumerGroupId = number

export const LAG_TIDE_NEVER = Number.POSITIVE_INFINITY

export interface ConsumerGroupConfig {
  readonly id: ConsumerGroupId
  readonly partition: PartitionId
}

export interface PendingOrb {
  /** Color of the key tag — determines the lane it must be routed down. */
  readonly keyColor: string
  /** Partition the key hashes to (matches keyColor in this wave). */
  readonly keyPartition: PartitionId
  /** Optional explicit partition stamp (override > key). null in L2 wave. */
  readonly explicitPartition: PartitionId | null
  /** Virtual-time deadline for produce. */
  readonly deadline: number
}

export interface SlotState {
  readonly offset: number
  readonly keyColor: string
  /** Per consumer-group fetch flag (brightens when fetched). */
  readonly fetchedBy: readonly boolean[]
  /** Per consumer-group commit flag (dims when committed). */
  readonly committedBy: readonly boolean[]
}

export interface PartitionState {
  readonly id: PartitionId
  readonly color: string
  readonly nextOffset: number
  /** Lowest retained offset; slots below are dissolved by the retention tide. */
  readonly beginningOffset: number
  readonly slots: readonly (SlotState | null)[]
}

export interface ConsumerGroupState {
  readonly id: ConsumerGroupId
  readonly partition: PartitionId
  /** Committed offset = next to deliver (cursor sits on this slot). */
  readonly committedOffset: number
  /** Pending fetch offset (null when no fetch in flight). */
  readonly fetchedOffset: number | null
  readonly lag: number
}

export interface MessageQueueSnapshot {
  readonly partitions: readonly PartitionState[]
  readonly consumerGroups: readonly ConsumerGroupState[]
  readonly pendingOrb: PendingOrb | null
  readonly mode: "routing" | "consuming"
  readonly messages_inbound: number
  readonly messages_produced: number
  readonly correct_routes: number
  readonly misroutes: number
  readonly ordering_violations: number
  readonly commits: number
  readonly lag_peak: number
  readonly lag_max_tolerance: number
  readonly replays: number
  readonly replay_faults: number
  readonly retention_faults: number
  readonly deadline_misses: number
  readonly waveDone: boolean
}

export interface MessageQueueOptions {
  readonly partitionColors: readonly string[]
  readonly consumerGroups: readonly ConsumerGroupConfig[]
  readonly lagMaxTolerance: number
  readonly retentionAdvanceSeconds: number
  readonly replayWindow: number
}

export type ProduceOutcome =
  | { readonly ok: true; readonly partition: PartitionId; readonly offset: number }
  | {
      readonly ok: false
      readonly reason: "no_orb" | "misroute" | "deadline_missed"
      readonly expectedPartition: PartitionId
      readonly chosenPartition: PartitionId
    }

export type FetchOutcome =
  | { readonly ok: true; readonly partition: PartitionId; readonly offset: number }
  | {
      readonly ok: false
      readonly reason: "no_group" | "log_empty" | "retention_fault"
      readonly groupId?: ConsumerGroupId
    }

export type CommitOutcome =
  | { readonly ok: true; readonly partition: PartitionId; readonly advancedTo: number }
  | { readonly ok: false; readonly reason: "no_fetch_in_flight" | "no_group" }

export type ReplayOutcome =
  | { readonly ok: true; readonly fromOffset: number; readonly toOffset: number }
  | { readonly ok: false; readonly reason: "no_group" | "replay_fault"; readonly toOffset?: number }

/**
 * Deterministic key→partition hash used in this wave. The player maps the
 * orb's color tag onto the matching-color lane; we precompute it as
 * `keyPartition` on the orb so the rule is unambiguous for both UI and tests.
 */
export function keyColorToPartition(
  keyColor: string,
  partitionColors: readonly string[],
): PartitionId {
  const idx = partitionColors.indexOf(keyColor)
  return idx < 0 ? 0 : idx
}

export class MessageQueue {
  private readonly partitionColors: readonly string[]
  private readonly groupConfigs: readonly ConsumerGroupConfig[]
  private readonly lagMaxTolerance: number
  private readonly retentionAdvanceSeconds: number
  private readonly replayWindow: number

  private partitions: PartitionState[]
  private groups: ConsumerGroupState[]
  private pendingOrb: PendingOrb | null = null
  private mode: "routing" | "consuming" = "routing"

  private inbound: PendingOrb[] = []
  private messages_inbound = 0
  private messages_produced = 0
  private correct_routes = 0
  private misroutes = 0
  private ordering_violations = 0
  private commits = 0
  private lag_peak = 0
  private replays = 0
  private replay_faults = 0
  private retention_faults = 0
  private deadline_misses = 0
  private waveDone = false

  private now = 0
  private readonly listeners: Array<(s: MessageQueueSnapshot) => void> = []

  constructor(opts: MessageQueueOptions) {
    this.partitionColors = opts.partitionColors
    this.groupConfigs = opts.consumerGroups
    this.lagMaxTolerance = opts.lagMaxTolerance
    this.retentionAdvanceSeconds = opts.retentionAdvanceSeconds
    this.replayWindow = opts.replayWindow

    this.partitions = this.partitionColors.map((color, id) => ({
      id,
      color,
      nextOffset: 0,
      beginningOffset: 0,
      slots: [],
    }))
    const groupCount = this.groupConfigs.length
    this.groups = this.groupConfigs.map((g) => ({
      id: g.id,
      partition: g.partition,
      committedOffset: 0,
      fetchedOffset: null,
      lag: 0,
    }))
    void groupCount
  }

  get snapshot(): MessageQueueSnapshot {
    return {
      partitions: this.partitions,
      consumerGroups: this.groups,
      pendingOrb: this.pendingOrb,
      mode: this.mode,
      messages_inbound: this.messages_inbound,
      messages_produced: this.messages_produced,
      correct_routes: this.correct_routes,
      misroutes: this.misroutes,
      ordering_violations: this.ordering_violations,
      commits: this.commits,
      lag_peak: this.lag_peak,
      lag_max_tolerance: this.lagMaxTolerance,
      replays: this.replays,
      replay_faults: this.replay_faults,
      retention_faults: this.retention_faults,
      deadline_misses: this.deadline_misses,
      waveDone: this.waveDone,
    }
  }

  subscribe(fn: (s: MessageQueueSnapshot) => void): void {
    this.listeners.push(fn)
    fn(this.snapshot)
  }

  private emit(): void {
    const s = this.snapshot
    for (const fn of this.listeners) fn(s)
  }

  /** Expose the deterministic key→partition rule for HUD previews + tests. */
  partitionForKeyColor(keyColor: string): PartitionId {
    return keyColorToPartition(keyColor, this.partitionColors)
  }

  /** Number of inbound orbs still queued behind the platform orb. */
  get inboundQueueDepth(): number {
    return this.inbound.length
  }

  /** Load the wave's inbound orb stream and prime the first platform orb. */
  loadWave(orbs: readonly PendingOrb[]): void {
    this.inbound = [...orbs]
    this.messages_inbound = orbs.length
    this.primeNextOrb()
    this.emit()
  }

  /** Move the queue forward; expire the platform orb if its deadline elapsed. */
  tick(dt = 1): void {
    this.now += dt
    this.checkRetentionTide()
    this.checkDeadline()
    this.emit()
  }

  private primeNextOrb(): void {
    if (this.pendingOrb !== null) return
    const next = this.inbound.shift()
    if (next === undefined) {
      this.pendingOrb = null
      // No more orbs to route — flip into consuming mode if not already.
      this.mode = "consuming"
      return
    }
    this.pendingOrb = next
  }

  private checkDeadline(): void {
    if (this.pendingOrb === null) return
    if (this.now >= this.pendingOrb.deadline) {
      this.deadline_misses += 1
      // The orb expired; prime the next one (the wave continues).
      this.pendingOrb = null
      this.primeNextOrb()
    }
  }

  private checkRetentionTide(): void {
    if (this.retentionAdvanceSeconds === LAG_TIDE_NEVER) return
    if (this.now === 0) return
    if (this.now % this.retentionAdvanceSeconds !== 0) return
    // Tide advances `beginningOffset` by 1 on each partition that has data.
    this.partitions = this.partitions.map((p) => {
      if (p.beginningOffset >= p.nextOffset) return p
      const newBegin = p.beginningOffset + 1
      const slots = p.slots.map((slot, idx) => (idx < newBegin ? null : slot))
      return { ...p, beginningOffset: newBegin, slots }
    })
    // Cursors whose committed offset falls behind the tide are NOT auto-faulted;
    // the fault surfaces on the next fetch (offset_no_longer_retained).
    this.recomputeGroupLags()
  }

  /**
   * Produce the platform orb into the chosen partition lane. The orb only
   * lands at nextOffset; misroutes bounce it back to the platform (the
   * platform orb stays so the player can try again — but the misroute is
   * counted and taints the wave's `misroutes` invariant).
   */
  produce(chosenPartition: PartitionId): ProduceOutcome {
    const orb = this.pendingOrb
    if (orb === null) {
      return { ok: false, reason: "no_orb", expectedPartition: -1, chosenPartition }
    }
    const expected = orb.explicitPartition !== null ? orb.explicitPartition : orb.keyPartition
    if (chosenPartition !== expected) {
      this.misroutes += 1
      // The orb stays on the platform; the player can try again, but the wave
      // is already tainted (misroutes must be 0 to pass).
      return { ok: false, reason: "misroute", expectedPartition: expected, chosenPartition }
    }
    // Append at nextOffset — gap-free, monotonic, no reorder (structural).
    const target = this.partitions[chosenPartition]
    if (target === undefined) {
      return { ok: false, reason: "misroute", expectedPartition: expected, chosenPartition }
    }
    const offset = target.nextOffset
    if (offset !== target.nextOffset) {
      // Defensive: structural ordering invariant tripped.
      this.ordering_violations += 1
    }
    const groupCount = this.groupConfigs.length
    const newSlot: SlotState = {
      offset,
      keyColor: orb.keyColor,
      fetchedBy: new Array<boolean>(groupCount).fill(false),
      committedBy: new Array<boolean>(groupCount).fill(false),
    }
    const slots = [...target.slots]
    while (slots.length <= offset) slots.push(null)
    slots[offset] = newSlot
    this.partitions = this.partitions.map((p, i) =>
      i === chosenPartition
        ? { ...p, nextOffset: offset + 1, slots: slots as (SlotState | null)[] }
        : p,
    )
    this.messages_produced += 1
    this.correct_routes += 1
    this.pendingOrb = null
    this.recomputeGroupLags()
    // Successful produce flips focus into consuming mode (player can fetch/commit).
    this.mode = "consuming"
    this.primeNextOrb()
    if (this.pendingOrb === null) this.mode = "consuming"
    else this.mode = "routing"
    this.emit()
    return { ok: true, partition: chosenPartition, offset }
  }

  /**
   * Fetch the orb at the cursor of group `groupId`. Cursor sits on the slot
   * it will read NEXT (committed offset). Fetching brightens the orb but does
   * not advance the cursor — at-least-once semantics.
   */
  fetch(groupId: ConsumerGroupId): FetchOutcome {
    const gIdx = this.groupConfigs.findIndex((g) => g.id === groupId)
    const g = this.groups[gIdx]
    if (g === undefined) return { ok: false, reason: "no_group", groupId }
    const part = this.partitions[g.partition]
    if (part === undefined) return { ok: false, reason: "no_group", groupId }
    // Retention check — cursor sat behind the tide.
    if (g.committedOffset < part.beginningOffset) {
      this.retention_faults += 1
      this.emit()
      return { ok: false, reason: "retention_fault", groupId }
    }
    if (g.committedOffset >= part.nextOffset) {
      return { ok: false, reason: "log_empty", groupId }
    }
    const offset = g.committedOffset
    const slots = [...part.slots]
    while (slots.length <= offset) slots.push(null)
    const slot = slots[offset]
    if (slot === null || slot === undefined) {
      return { ok: false, reason: "log_empty", groupId }
    }
    const newFetched = [...slot.fetchedBy]
    newFetched[gIdx] = true
    slots[offset] = { ...slot, fetchedBy: newFetched }
    this.partitions = this.partitions.map((p, i) =>
      i === part.id ? { ...p, slots: slots as (SlotState | null)[] } : p,
    )
    this.groups = this.groups.map((gg, i) => (i === gIdx ? { ...gg, fetchedOffset: offset } : gg))
    this.emit()
    return { ok: true, partition: part.id, offset }
  }

  /**
   * Commit the in-flight fetch: advance the cursor one slot forward, mark the
   * slot committed for that group (orb dims), reduce that group's lag.
   */
  commit(groupId: ConsumerGroupId): CommitOutcome {
    const gIdx = this.groupConfigs.findIndex((g) => g.id === groupId)
    const g = this.groups[gIdx]
    if (g === undefined) return { ok: false, reason: "no_group" }
    if (g.fetchedOffset === null) return { ok: false, reason: "no_fetch_in_flight" }
    const part = this.partitions[g.partition]
    if (part === undefined) return { ok: false, reason: "no_group" }
    const offset = g.fetchedOffset
    const slots = [...part.slots]
    const slot = slots[offset]
    if (slot !== null && slot !== undefined) {
      const newCommitted = [...slot.committedBy]
      newCommitted[gIdx] = true
      const newFetched = [...slot.fetchedBy]
      newFetched[gIdx] = false
      slots[offset] = { ...slot, committedBy: newCommitted, fetchedBy: newFetched }
    }
    const advancedTo = offset + 1
    this.partitions = this.partitions.map((p, i) =>
      i === part.id ? { ...p, slots: slots as (SlotState | null)[] } : p,
    )
    this.groups = this.groups.map((gg, i) =>
      i === gIdx ? { ...gg, committedOffset: advancedTo, fetchedOffset: null } : gg,
    )
    this.commits += 1
    this.recomputeGroupLags()
    this.emit()
    return { ok: true, partition: part.id, advancedTo }
  }

  /**
   * Replay: rewind the focused group's cursor backward along the retained
   * log. Used for re-delivery; bounded by the wave's replay window. A rewind
   * below `beginningOffset` raises a replay_fault.
   */
  replay(groupId: ConsumerGroupId, rewind = 1): ReplayOutcome {
    const gIdx = this.groupConfigs.findIndex((g) => g.id === groupId)
    const g = this.groups[gIdx]
    if (g === undefined) return { ok: false, reason: "no_group" }
    const part = this.partitions[g.partition]
    if (part === undefined) return { ok: false, reason: "no_group" }
    const bounded = Math.max(0, Math.min(rewind, this.replayWindow))
    const target = Math.max(0, g.committedOffset - bounded)
    if (target < part.beginningOffset) {
      this.replay_faults += 1
      this.emit()
      return { ok: false, reason: "replay_fault", toOffset: target }
    }
    const from = g.committedOffset
    this.groups = this.groups.map((gg, i) =>
      i === gIdx ? { ...gg, committedOffset: target, fetchedOffset: null } : gg,
    )
    this.replays += 1
    this.recomputeGroupLags()
    this.emit()
    return { ok: true, fromOffset: from, toOffset: target }
  }

  /** Player chose to drop the platform orb (counts as deadline miss). */
  dropPendingOrb(): void {
    if (this.pendingOrb === null) return
    this.deadline_misses += 1
    this.pendingOrb = null
    this.primeNextOrb()
    this.emit()
  }

  private recomputeGroupLags(): void {
    let peak = this.lag_peak
    this.groups = this.groups.map((g) => {
      const part = this.partitions[g.partition]
      if (part === undefined) return g
      const lag = Math.max(0, part.nextOffset - g.committedOffset)
      if (lag > peak) peak = lag
      return { ...g, lag }
    })
    this.lag_peak = peak
  }

  /** Mark the wave done — called by the controller when the win rule fires. */
  markDone(): void {
    this.waveDone = true
    this.emit()
  }
}

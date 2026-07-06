// WaveController — orchestrates one playthrough of a WaveContract.
//
// Owns the MessageQueue instance, exposes a small public API for the scene/HUD
// (and the deterministic Playwright test hook), and is the single emit point.
// The scene/UI never call buildEvidence directly — they call `tryEmit()` once
// the player has produced every orb and committed past the wave's target.

import { buildEvidence, emitEvidence, type MessageQueueEvidenceRecord } from "./evidence"
import {
  type CommitOutcome,
  type ConsumerGroupId,
  type FetchOutcome,
  MessageQueue,
  type PartitionId,
  type PendingOrb,
  type ProduceOutcome,
  type ReplayOutcome,
} from "./log"
import type { WaveContract } from "./wave"

export class WaveController {
  private readonly mq: MessageQueue
  private readonly wave: WaveContract
  private evidenceEmitted = false
  private readonly listeners: Array<(c: WaveController) => void> = []

  constructor(wave: WaveContract) {
    this.wave = wave
    this.mq = new MessageQueue({
      partitionColors: wave.partitionColors,
      consumerGroups: wave.consumerGroups,
      lagMaxTolerance: wave.lagMaxTolerance,
      retentionAdvanceSeconds: wave.retentionAdvanceSeconds,
      replayWindow: wave.replayWindow,
    })
    this.mq.loadWave(wave.inboundOrbs)
  }

  get snapshot() {
    return this.mq.snapshot
  }

  get messageQueue(): MessageQueue {
    return this.mq
  }

  get waveContract(): WaveContract {
    return this.wave
  }

  get hasEmitted(): boolean {
    return this.evidenceEmitted
  }

  get pendingOrb(): PendingOrb | null {
    return this.snapshot.pendingOrb
  }

  /** Partition the platform orb must be routed to (for HUD highlight). */
  get expectedPartition(): PartitionId {
    const orb = this.snapshot.pendingOrb
    if (orb === null) return -1
    return orb.explicitPartition !== null ? orb.explicitPartition : orb.keyPartition
  }

  subscribe(fn: (c: WaveController) => void): void {
    this.listeners.push(fn)
    fn(this)
    this.mq.subscribe(() => {
      for (const l of this.listeners) l(this)
    })
  }

  produce(chosenPartition: PartitionId): ProduceOutcome {
    return this.mq.produce(chosenPartition)
  }

  fetch(groupId: ConsumerGroupId): FetchOutcome {
    return this.mq.fetch(groupId)
  }

  commit(groupId: ConsumerGroupId): CommitOutcome {
    return this.mq.commit(groupId)
  }

  replay(groupId: ConsumerGroupId, rewind = 1): ReplayOutcome {
    return this.mq.replay(groupId, rewind)
  }

  tick(dt = 1): void {
    this.mq.tick(dt)
  }

  dropPendingOrb(): void {
    this.mq.dropPendingOrb()
  }

  /**
   * Emit evidence once the wave is fully played out. Returns the record or
   * null if the wave isn't done yet (every orb produced AND commits past the
   * wave's commit target).
   */
  tryEmit(): MessageQueueEvidenceRecord | null {
    if (this.evidenceEmitted) return null
    const s = this.snapshot
    const produced = s.messages_produced === s.messages_inbound
    const committed = s.commits >= this.wave.commitTarget
    if (!produced || !committed) return null
    const record = buildEvidence({
      snapshot: s,
      level: this.wave.level,
      commitTarget: this.wave.commitTarget,
    })
    emitEvidence(record)
    this.evidenceEmitted = true
    this.mq.markDone()
    return record
  }
}

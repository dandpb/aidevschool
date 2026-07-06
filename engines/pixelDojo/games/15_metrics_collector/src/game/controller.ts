// WaveController — orchestrates one playthrough of a WaveContract.
//
// Owns the Observatory instance, the not-yet-routed observation queue, and
// the single emit point. The scene/UI never call buildEvidence directly —
// they call `tryEmit()` once the player has routed every orb, answered every
// percentile query, and acked the resolved alert.

import { buildEvidence, emitEvidence, type MetricsEvidenceRecord } from "./evidence"
import { Observatory, type RouteResult } from "./observatory"
import type { WaveContract } from "./wave"

export class WaveController {
  private readonly observatory: Observatory
  private readonly wave: WaveContract
  private observationQueue: number[]
  private evidenceEmitted = false
  private readonly listeners: Array<(c: WaveController) => void> = []

  constructor(wave: WaveContract) {
    this.wave = wave
    this.observatory = new Observatory({
      windowSeconds: wave.windowSeconds,
      alertHoldSeconds: wave.holdSeconds,
    })
    this.observationQueue = [...wave.observations]
    for (const p of wave.percentileQueries) this.observatory.queuePercentile(p)
  }

  get snapshot() {
    return this.observatory.snapshot
  }

  get observatoryInstance(): Observatory {
    return this.observatory
  }

  get waveContract(): WaveContract {
    return this.wave
  }

  get pendingObservations(): readonly number[] {
    return this.observationQueue
  }

  get nextObservation(): number | null {
    const head = this.observationQueue[0]
    return head === undefined ? null : head
  }

  get hasEmitted(): boolean {
    return this.evidenceEmitted
  }

  subscribe(fn: (c: WaveController) => void): void {
    this.listeners.push(fn)
    fn(this)
    this.observatory.subscribe(() => {
      for (const l of this.listeners) l(this)
    })
  }

  /** Route the queued head orb. With no bucket arg, auto-picks the correct bucket (test hook). */
  routeNext(chosenBucketIdx?: number): RouteResult {
    const value = this.observationQueue.shift()
    if (value === undefined) {
      return { accepted: false, correct: false, expectedIdx: -1, overflow: false }
    }
    return this.observatory.routeObservation(value, chosenBucketIdx)
  }

  setAlertThreshold(bucketIdx: number): void {
    this.observatory.setAlertThreshold(bucketIdx)
  }

  answerPercentile(bucketIdx: number): void {
    this.observatory.answerPercentile(bucketIdx)
  }

  tick(dt = 1): void {
    this.observatory.tick(dt)
  }

  ackAlert(): void {
    this.observatory.ackAlert()
  }

  /**
   * Emit evidence once the wave is fully played out. Returns the record or
   * null if the wave isn't done yet (queue empty, all percentile queries
   * answered, alert acked).
   */
  tryEmit(): MetricsEvidenceRecord | null {
    if (this.evidenceEmitted) return null
    const s = this.observatory.snapshot
    const queueEmpty = this.observationQueue.length === 0
    const queriesDone = s.pendingPercentileQueries.length === 0
    if (!queueEmpty || !queriesDone || !s.acked) return null
    const record = buildEvidence({
      snapshot: s,
      bucketPlan: this.wave.bucketBounds,
      requestedThresholdLeIdx: this.wave.alertThresholdIdx,
      windowSeconds: this.wave.windowSeconds,
    })
    emitEvidence(record)
    this.evidenceEmitted = true
    return record
  }
}

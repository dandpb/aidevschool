// Metrics Observatory — core deterministic logic.
//
// One concept, three rules (per docs/plans/15_metrics_collector.md):
//   RF-003 — observation routed to smallest `le >= value` bucket.
//   RF-008/9 — percentile = rank-lookup on cumulative bucket counts.
//   RF-014/5 — alert lifecycle pending -> firing -> resolved over a window.
//
// This module is pure (no DOM, no three.js). The scene (src/scene/) and the
// Playwright smoke (playwright/smoke.spec.ts) read this state via `subscribe`
// and the test hook `window.__metricsObservatory`. The smoke drives the loop
// deterministically; a human player uses the keyboard.

export const BUCKET_BOUNDS = [5, 10, 25, 50, 100, 250, 500, Infinity] as const
export const BUCKET_COUNT = BUCKET_BOUNDS.length
export const PLUS_INF_IDX = BUCKET_COUNT - 1

export type AlertState = "inactive" | "pending" | "firing" | "resolved"

export interface Observation {
  readonly t: number
  readonly value: number
  /** -1 if the player dropped the orb into the wrong bucket (rejected). */
  readonly bucketIdx: number
  readonly accepted: boolean
}

export interface PercentileAnswer {
  readonly p: number
  readonly correctIdx: number
  readonly answeredIdx: number
  readonly correct: boolean
}

export interface ObservatorySnapshot {
  readonly observations: readonly Observation[]
  readonly bucketCounts: readonly number[]
  readonly cumulativeCounts: readonly number[]
  readonly total: number
  readonly sumRecorded: number
  readonly sumObserved: number
  readonly windowSeconds: number
  readonly now: number
  /** -1 if threshold not yet set. */
  readonly alertThresholdLeIdx: number
  readonly alertHoldSeconds: number
  readonly alertState: AlertState
  readonly alertTimeInState: number
  readonly alertLifecycle: readonly AlertState[]
  readonly pendingPercentileQueries: readonly number[]
  readonly answeredPercentileQueries: readonly PercentileAnswer[]
  readonly obsTotal: number
  readonly obsBucketedCorrect: number
  readonly obsMisbucketed: number
  readonly percentileQueriesTotal: number
  readonly percentileQueriesCorrect: number
  readonly percentileQueriesWrong: number
  readonly overflowDrops: number
  readonly acked: boolean
}

export interface ObservatoryOptions {
  readonly windowSeconds?: number
  readonly alertHoldSeconds?: number
  readonly maxQueueLength?: number
}

export interface RouteResult {
  readonly accepted: boolean
  readonly correct: boolean
  readonly expectedIdx: number
  readonly overflow: boolean
}

export interface AnswerResult {
  readonly correct: boolean
  readonly expected: number
  readonly answered: number
}

/** Smallest bucket index whose upper bound `le` is `>= value`. +Inf always qualifies. */
export function bucketForValue(value: number): number {
  for (let i = 0; i < BUCKET_COUNT; i += 1) {
    const bound = BUCKET_BOUNDS[i]
    if (bound !== undefined && value <= bound) return i
  }
  return PLUS_INF_IDX
}

/**
 * Percentile bucket index from cumulative counts: the smallest index whose
 * cumulative count is `>= ceil(p * total)`. Returns -1 when there is no data.
 * Mirrors Prometheus histogram_quantile's bucket-pick (no interpolation here —
 * the lesson is "percentile = rank on the cumulative ribbon", NFR-005).
 */
export function percentileBucket(
  cumulativeCounts: readonly number[],
  total: number,
  p: number,
): number {
  if (total <= 0) return -1
  const rank = Math.ceil(p * total)
  for (let i = 0; i < BUCKET_COUNT; i += 1) {
    const cum = cumulativeCounts[i]
    if (cum !== undefined && cum >= rank) return i
  }
  return PLUS_INF_IDX
}

export class Observatory {
  private observations: Observation[] = []
  private bucketCounts: number[] = new Array<number>(BUCKET_COUNT).fill(0)
  private cumulativeCounts: number[] = new Array<number>(BUCKET_COUNT).fill(0)
  private total = 0
  private sumRecorded = 0
  private sumObserved = 0
  private readonly windowSeconds: number
  private readonly alertHoldSeconds: number
  private readonly maxQueueLength: number
  private now = 0
  private alertThresholdLeIdx = -1
  private alertState: AlertState = "inactive"
  private alertTimeInState = 0
  private alertLifecycle: AlertState[] = []
  private pendingPercentileQueries: number[] = []
  private answeredPercentileQueries: PercentileAnswer[] = []
  private obsTotal = 0
  private obsBucketedCorrect = 0
  private obsMisbucketed = 0
  private percentileQueriesTotal = 0
  private percentileQueriesCorrect = 0
  private percentileQueriesWrong = 0
  private overflowDrops = 0
  private acked = false
  private listeners: Array<(s: ObservatorySnapshot) => void> = []

  constructor(opts: ObservatoryOptions = {}) {
    this.windowSeconds = opts.windowSeconds ?? 30
    this.alertHoldSeconds = opts.alertHoldSeconds ?? 4
    this.maxQueueLength = opts.maxQueueLength ?? 64
  }

  get snapshot(): ObservatorySnapshot {
    return {
      observations: this.observations,
      bucketCounts: this.bucketCounts,
      cumulativeCounts: this.cumulativeCounts,
      total: this.total,
      sumRecorded: this.sumRecorded,
      sumObserved: this.sumObserved,
      windowSeconds: this.windowSeconds,
      now: this.now,
      alertThresholdLeIdx: this.alertThresholdLeIdx,
      alertHoldSeconds: this.alertHoldSeconds,
      alertState: this.alertState,
      alertTimeInState: this.alertTimeInState,
      alertLifecycle: this.alertLifecycle,
      pendingPercentileQueries: this.pendingPercentileQueries,
      answeredPercentileQueries: this.answeredPercentileQueries,
      obsTotal: this.obsTotal,
      obsBucketedCorrect: this.obsBucketedCorrect,
      obsMisbucketed: this.obsMisbucketed,
      percentileQueriesTotal: this.percentileQueriesTotal,
      percentileQueriesCorrect: this.percentileQueriesCorrect,
      percentileQueriesWrong: this.percentileQueriesWrong,
      overflowDrops: this.overflowDrops,
      acked: this.acked,
    }
  }

  subscribe(fn: (s: ObservatorySnapshot) => void): void {
    this.listeners.push(fn)
    fn(this.snapshot)
  }

  private emit(): void {
    const snap = this.snapshot
    for (const fn of this.listeners) fn(snap)
  }

  /** Expose the deterministic routing rule for HUD previews and tests. */
  bucketFor(value: number): number {
    return bucketForValue(value)
  }

  /** Expose the percentile rule for HUD highlights and tests. */
  queryPercentile(p: number): number {
    return percentileBucket(this.cumulativeCounts, this.total, p)
  }

  setAlertThreshold(bucketIdx: number): void {
    if (bucketIdx < 0 || bucketIdx >= BUCKET_COUNT) return
    this.alertThresholdLeIdx = bucketIdx
    this.emit()
  }

  queuePercentile(p: number): void {
    this.pendingPercentileQueries.push(p)
    this.emit()
  }

  /**
   * Player commits a bucket answer for the next pending percentile query.
   * Pops the queued head; computes the expected bucket from the cumulative
   * ribbon at that percentile. Records correct/wrong.
   */
  answerPercentile(bucketIdx: number): AnswerResult {
    const head = this.pendingPercentileQueries.shift()
    const queuedP = head ?? 0.95
    const expected = this.queryPercentile(queuedP)
    const correct = expected === bucketIdx
    this.answeredPercentileQueries.push({
      p: queuedP,
      correctIdx: expected,
      answeredIdx: bucketIdx,
      correct,
    })
    this.percentileQueriesTotal += 1
    if (correct) this.percentileQueriesCorrect += 1
    else this.percentileQueriesWrong += 1
    this.emit()
    return { correct, expected, answered: bucketIdx }
  }

  /**
   * Route an observation. If `chosenBucketIdx` is omitted (auto-route via API)
   * or matches the smallest-`le`-≥-value rule, the observation is accepted and
   * counted. A wrong choice rejects the orb (misbucketed), and its value is
   * NOT added to `sumRecorded` — teaching that a real recorder's `sum` is only
   * correct when every observation lands in a bucket.
   */
  routeObservation(value: number, chosenBucketIdx?: number): RouteResult {
    if (this.observations.length >= this.maxQueueLength) {
      this.overflowDrops += 1
      this.emit()
      return { accepted: false, correct: false, expectedIdx: -1, overflow: true }
    }
    const expectedIdx = bucketForValue(value)
    const correct = chosenBucketIdx === undefined || chosenBucketIdx === expectedIdx
    this.obsTotal += 1
    this.sumObserved += value
    if (correct) {
      this.obsBucketedCorrect += 1
      this.sumRecorded += value
      this.observations.push({ t: this.now, value, bucketIdx: expectedIdx, accepted: true })
    } else {
      this.obsMisbucketed += 1
      this.observations.push({ t: this.now, value, bucketIdx: -1, accepted: false })
    }
    this.recompute()
    this.emit()
    return { accepted: correct, correct, expectedIdx, overflow: false }
  }

  private recompute(): void {
    const counts = new Array<number>(BUCKET_COUNT).fill(0)
    for (const o of this.observations) {
      if (!o.accepted) continue
      const c = counts[o.bucketIdx]
      if (c !== undefined) counts[o.bucketIdx] = c + 1
    }
    let cum = 0
    const cumulative = counts.map((c) => {
      cum += c
      return cum
    })
    this.bucketCounts = counts
    this.cumulativeCounts = cumulative
    this.total = this.observations.filter((o) => o.accepted).length
  }

  /**
   * Advance virtual time. Observations older than `now - windowSeconds` slide
   * out of the active window (mirroring a Prometheus range query, RF-007/008).
   * The alert FSM then evaluates the p95 bucket over the active window.
   */
  tick(dt = 1): void {
    this.now += dt
    const cutoff = this.now - this.windowSeconds
    this.observations = this.observations.filter((o) => o.t >= cutoff)
    this.recompute()
    if (this.alertThresholdLeIdx >= 0) {
      this.alertTimeInState += dt
      const p95Idx = this.queryPercentile(0.95)
      const breaching = this.total > 0 && p95Idx > this.alertThresholdLeIdx
      switch (this.alertState) {
        case "inactive":
          if (breaching) this.transitionAlert("pending")
          break
        case "pending":
          if (!breaching) this.transitionAlert("inactive")
          else if (this.alertTimeInState >= this.alertHoldSeconds) this.transitionAlert("firing")
          break
        case "firing":
          if (!breaching) this.transitionAlert("resolved")
          break
        case "resolved":
          // stays resolved until the player acks
          break
      }
    }
    this.emit()
  }

  private transitionAlert(next: AlertState): void {
    const prev = this.alertState
    if (prev === next) return
    this.alertState = next
    this.alertTimeInState = 0
    // Track only the firing-cycle states; reset if a pending never fires.
    if (next === "pending" && prev === "inactive") {
      this.alertLifecycle = ["pending"]
    } else if (next === "firing" && prev === "pending") {
      const last = this.alertLifecycle[this.alertLifecycle.length - 1]
      if (last === "pending") this.alertLifecycle.push("firing")
    } else if (next === "resolved" && prev === "firing") {
      const last = this.alertLifecycle[this.alertLifecycle.length - 1]
      if (last === "firing") this.alertLifecycle.push("resolved")
    } else if (next === "inactive" && prev === "pending") {
      this.alertLifecycle = []
    }
    // inactive-after-resolved (post-ack) keeps the lifecycle record intact.
  }

  /**
   * Acknowledge the alert. Only valid in `resolved` state — acking during
   * pending/firing is a no-op (the lesson: the runbook fires after resolved,
   * never before). A successful ack reopens the alert channel for new waves.
   */
  ackAlert(): { valid: boolean; reason: string } {
    if (this.alertState !== "resolved") {
      return { valid: false, reason: `cannot ack in state ${this.alertState}` }
    }
    this.acked = true
    this.transitionAlert("inactive")
    this.emit()
    return { valid: true, reason: "acked" }
  }

  getWindow(): number {
    return this.windowSeconds
  }

  getAlertState(): AlertState {
    return this.alertState
  }
}

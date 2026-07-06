import { emitEvidence } from "../evidence/emit"
import {
  type AlertState,
  bucketIndex,
  type Histogram,
  makeHistogram,
  percentile,
  record,
  setAlert,
} from "../sim/histogram"
import {
  contrastDistributions,
  type DistributionPair,
  evaluateAlertPrediction,
  evaluateBucketPrediction,
  evaluateDistributionChoice,
  evaluatePercentileBucket,
  filledHistogram,
  LEVELS,
  type LevelConfig,
  type LevelId,
  type LevelOutcome,
  levelConfig,
  N_BUCKETS,
  samplesFor,
} from "../sim/levels"

export type Phase = "briefing" | "predicting" | "cleared" | "failed"

export interface GameState {
  level: LevelConfig
  phase: Phase
  /** The histogram the player observes (pre-filled on L2/L3; grows drip-by-drip on L1). */
  histogram: Histogram
  /** L1: the next sample index to drip in. */
  pendingIndex: number
  /** L1: count of correct bucket predictions. */
  correctBuckets: number
  /** L3: the SLO the player set (null until set). */
  setSlo: number | null
  /** L3: has the player predicted the alert fires? */
  predictedFiring: boolean | null
  /** L4: the two contrast distributions. */
  distributions: DistributionPair[]
  lastMetrics: Record<string, number | boolean | string> | null
}

export type Listener = (state: GameState) => void

/**
 * OBSERVATORY state machine.
 *
 * Phases per level:
 * - L1: briefing → predicting (drip samples, predict each bucket) → cleared/failed
 * - L2: briefing → predicting (predict which bucket the p95 sits in) → cleared/failed
 * - L3: briefing → predicting (set SLO + predict firing) → cleared/failed
 * - L4: briefing → predicting (pick which distribution alerts) → cleared/failed
 *
 * All randomness flows from the level seed via `samplesFor`, so the same level is replayable and
 * the Playwright smoke can drive the public API deterministically.
 */
export class GameController {
  private state: GameState
  private listeners: Listener[] = []

  constructor(level: LevelId = "L1") {
    this.state = this.freshState(levelConfig(level))
  }

  private freshState(cfg: LevelConfig): GameState {
    const histogram = cfg.id === "L1" ? makeHistogram(N_BUCKETS) : filledHistogram(cfg)
    return {
      level: cfg,
      phase: "briefing",
      histogram,
      pendingIndex: 0,
      correctBuckets: 0,
      setSlo: null,
      predictedFiring: null,
      distributions: cfg.id === "L4" ? contrastDistributions(cfg.sampleCount) : [],
      lastMetrics: null,
    }
  }

  get snapshot(): GameState {
    return this.state
  }

  subscribe(fn: Listener): void {
    this.listeners.push(fn)
    fn(this.state)
  }

  private commit(): void {
    for (const fn of this.listeners) fn(this.state)
  }

  start(): void {
    this.state.phase = "predicting"
    this.commit()
  }

  loadLevel(level: LevelId): void {
    this.state = this.freshState(levelConfig(level))
    this.commit()
  }

  nextLevel(): void {
    const idx = LEVELS.findIndex((l) => l.id === this.state.level.id)
    const next = LEVELS[idx + 1]
    if (next) this.loadLevel(next.id)
  }

  retry(): void {
    this.loadLevel(this.state.level.id)
    this.start()
  }

  // ── L1: drip samples and predict buckets ──────────────────────────────────

  /** The value of the sample the player must predict next (test hook + HUD hint). */
  pendingSampleValue(): number {
    const samples = samplesFor(this.state.level)
    return samples[this.state.pendingIndex] ?? NaN
  }

  /** Ground-truth bucket for the pending sample (test hook + HUD hint). */
  truthBucket(): number {
    return bucketIndex(this.state.histogram, this.pendingSampleValue())
  }

  /** Predict the bucket of the pending sample; it then drips into the histogram. */
  predictBucket(bucket: number): void {
    if (this.state.level.id !== "L1" || this.state.phase !== "predicting") return
    const value = this.pendingSampleValue()
    if (Number.isNaN(value)) return
    const truth = bucketIndex(this.state.histogram, value)
    if (bucket === truth) this.state.correctBuckets++
    record(this.state.histogram, value)
    this.state.pendingIndex++
    if (this.state.pendingIndex >= this.state.level.sampleCount) {
      this.finish(evaluateBucketPrediction(this.state.correctBuckets, this.state.level.sampleCount))
      return
    }
    this.commit()
  }

  // ── L2: predict which bucket the watched percentile sits in ───────────────

  /** Predict the bucket the p95 contour falls into. */
  predictPercentileBucket(bucket: number): void {
    if (this.state.level.id !== "L2" || this.state.phase !== "predicting") return
    const out = evaluatePercentileBucket({
      predictedBucket: bucket,
      histogram: this.state.histogram,
      watchP: this.state.level.watchP,
    })
    this.finish(out)
  }

  // ── L3: set the SLO plane and predict whether the alert fires ─────────────

  /** Drag the SLO plane to `value` (0..1). Recolors the plane live via the listener. */
  setSloValue(value: number): void {
    if (this.state.level.id !== "L3" || this.state.phase !== "predicting") return
    this.state.setSlo = value
    this.commit()
  }

  /** Predict whether the alert fires for the set SLO; resolves the wave. */
  predictFiring(fires: boolean): void {
    if (this.state.level.id !== "L3" || this.state.phase !== "predicting") return
    const target = this.state.level.slo
    if (target === null) return
    this.state.predictedFiring = fires
    const out = evaluateAlertPrediction({
      setSlo: this.state.setSlo ?? 0,
      targetSlo: target,
      predictedFiring: fires,
      histogram: this.state.histogram,
      watchP: this.state.level.watchP,
    })
    this.finish(out)
  }

  // ── L4: pick which contrast distribution alerts ───────────────────────────

  /** Pick the distribution predicted to alert under the SLO. */
  pickDistribution(id: string): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "predicting") return
    const target = this.state.level.slo
    if (target === null) return
    const out = evaluateDistributionChoice({
      chosenId: id,
      distributions: this.state.distributions,
      slo: target,
      watchP: this.state.level.watchP,
    })
    this.finish(out)
  }

  // ── readouts for the scene/HUD ────────────────────────────────────────────

  /** The watched percentile value for the live histogram (the contour ring position). */
  watchedPercentile(): number {
    return percentile(this.state.histogram, this.state.level.watchP)
  }

  /** Alert state for the live histogram + a candidate SLO (the plane color truth). */
  alertFor(slo: number): AlertState {
    return setAlert(this.state.histogram, slo, this.state.level.watchP)
  }

  /** L4 readout: the id of the contrast distribution whose watched percentile exceeds the SLO. */
  alertingDistributionId(): string | null {
    const slo = this.state.level.slo
    if (slo === null) return null
    const alerting = this.state.distributions.find(
      (d) => percentile(d.histogram, this.state.level.watchP) > slo,
    )
    return alerting?.id ?? null
  }

  private finish(out: LevelOutcome): void {
    this.state.lastMetrics = out.metrics
    this.state.phase = out.pass ? "cleared" : "failed"
    emitEvidence(this.state.level.id, out.pass, out.metrics)
    this.commit()
  }
}

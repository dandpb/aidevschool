import { emitEvidence } from "../evidence/emit"
import {
  bufferedJobOverflows,
  evaluateBoundedMemory,
  evaluateChunkTune,
  evaluateOverflowPrediction,
  LEVELS,
  type LevelConfig,
  type LevelId,
  levelConfig,
  type UploadJob,
  type WaveOutcome,
} from "../sim/levels"

export type Phase = "briefing" | "predicting" | "resolving" | "cleared" | "failed"

export interface GameState {
  level: LevelConfig
  phase: Phase
  /** the upload job for this wave */
  job: UploadJob
  /** L3: the player's chosen chunk size (mutable via the dial) */
  tunedChunkSize: number
  /** L3: the player's predicted peak memory */
  predictedPeak: number | null
  /** L1/L4: the player's overflow prediction (true = will overflow) */
  predictedOverflow: boolean | null
  /** L2: the player's bounded-memory prediction (true = stays bounded) */
  predictedBounded: boolean | null
  lastMetrics: Record<string, number | boolean | string> | null
}

export type Listener = (state: GameState) => void

/**
 * PIPELINE PLANT state machine.
 *
 * Phases per level:
 * - L1: briefing → predicting (predict overflow) → cleared/failed
 * - L2: briefing → predicting (predict bounded) → cleared/failed
 * - L3: briefing → predicting (tune chunk, predict peak, lock in) → cleared/failed
 * - L4: briefing → predicting (predict overflow under backpressure) → cleared/failed
 *
 * All scenario parameters flow from the level seed via `levelConfig`, so the same level is
 * replayable and the Playwright smoke can drive the public API deterministically.
 */
export class GameController {
  private state: GameState
  private listeners: Listener[] = []

  constructor(level: LevelId = "L1") {
    this.state = this.freshState(levelConfig(level))
  }

  private freshState(cfg: LevelConfig): GameState {
    return {
      level: cfg,
      phase: "briefing",
      job: { ...cfg.job },
      tunedChunkSize: cfg.job.chunkSize,
      predictedPeak: null,
      predictedOverflow: null,
      predictedBounded: null,
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

  // ── L1 / L4: predict overflow (yes/no) ─────────────────────────────────────

  /** Predict whether the buffered upload overflows the tank. */
  predictOverflow(willOverflow: boolean): void {
    if (this.state.phase !== "predicting") return
    if (this.state.level.mode !== "buffered") return
    this.state.predictedOverflow = willOverflow
    const out = evaluateOverflowPrediction({
      job: this.state.job,
      backpressure: this.state.level.backpressure,
      predictedOverflow: willOverflow,
    })
    this.finish(out)
  }

  // ── L2: predict bounded memory ─────────────────────────────────────────────

  /** Predict that streaming keeps peak memory bounded (no overflow). */
  predictBounded(bounded: boolean): void {
    if (this.state.phase !== "predicting") return
    if (this.state.level.mode !== "streaming" || this.state.level.chunkUnlocked) return
    this.state.predictedBounded = bounded
    const out = evaluateBoundedMemory({ job: this.state.job, predictedBounded: bounded })
    this.finish(out)
  }

  // ── L3: tune chunk size + predict peak ─────────────────────────────────────

  /** L3 — chunk dial. Updates the live job so the scene shows the chunk change. */
  setChunkSize(chunk: number): void {
    if (!this.state.level.chunkUnlocked || this.state.phase !== "predicting") return
    this.state.tunedChunkSize = chunk
    this.state.job = { ...this.state.job, chunkSize: chunk }
    this.commit()
  }

  /** L3 — lock in the chosen chunk size and predicted peak; judged. */
  lockInPeak(predictedPeak: number): void {
    if (this.state.level.id !== "L3" || this.state.phase !== "predicting") return
    this.state.predictedPeak = predictedPeak
    const out = evaluateChunkTune({
      job: this.state.job,
      chunkSize: this.state.tunedChunkSize,
      predictedPeak,
    })
    this.finish(out)
  }

  /** Ground-truth: does the buffered job overflow? (HUD hint + smoke test truth.) */
  bufferedOverflows(): boolean {
    return bufferedJobOverflows(this.state.job, this.state.level.backpressure)
  }

  private finish(out: WaveOutcome): void {
    this.state.lastMetrics = out.metrics
    this.state.phase = out.pass ? "cleared" : "failed"
    emitEvidence(this.state.level.id, out.pass, out.metrics)
    this.commit()
  }
}

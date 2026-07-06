import { emitEvidence } from "../evidence/emit"
import {
  buildLayers,
  buildWave,
  evaluatePredictions,
  evaluateReorder,
  LEVELS,
  type LevelConfig,
  type LevelId,
  levelConfig,
  type PredictionTarget,
  type ReorderTask,
  type WaveRequest,
} from "../sim/levels"
import { type Layer, type PipelineResult, runPipeline } from "../sim/middleware"

export type Phase = "briefing" | "predicting" | "resolving" | "cleared" | "failed"

/** The layer order the player sees / edits (L4 starts scrambled). */
export type LayerOrder = readonly string[]

export interface GameState {
  level: LevelConfig
  phase: Phase
  /** the deterministic wave of requests for this level */
  wave: WaveRequest[]
  /** index of the request the player is currently predicting */
  pendingIndex: number
  /** per-request prediction target the player chose (grows as they predict) */
  predictions: PredictionTarget[]
  /** the canonical wall order, or the player's reorder (L4) */
  order: LayerOrder
  /** the last request's resolved outcome (for the scene's flash animation) */
  lastResolved: { index: number; result: PipelineResult; prediction: PredictionTarget } | null
  lastMetrics: Record<string, number | boolean | string> | null
}

export type Listener = (state: GameState) => void

const CANONICAL_ORDER = ["logging", "auth", "rate-limit"]

/**
 * CHECKPOINT CITY state machine.
 *
 * Phases per level:
 * - L1/L2/L3: briefing → predicting (predict each request's gate) → cleared/failed
 * - L4: briefing → predicting (reorder the walls, predict the probe + extras) → cleared/failed
 *
 * The wave is deterministic (seeded), so the Playwright smoke can drive the public API truth and
 * the scene/HUD re-derive the same answers.
 */
export class GameController {
  private state: GameState
  private listeners: Listener[] = []

  constructor(level: LevelId = "L1") {
    this.state = this.freshState(levelConfig(level))
  }

  private freshState(cfg: LevelConfig): GameState {
    const order = cfg.id === "L4" && cfg.reorder ? cfg.reorder.given : CANONICAL_ORDER
    return {
      level: cfg,
      phase: "briefing",
      wave: buildWave(cfg),
      pendingIndex: 0,
      predictions: [],
      order,
      lastResolved: null,
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

  // ── predict the pending request's gate (L1/L2/L3) or probe/extras (L4) ─────

  /** Predict the outcome of the pending request. Resolves under the current (player) order. */
  predict(target: PredictionTarget): void {
    if (this.state.phase !== "predicting") return
    const pending = this.state.wave[this.state.pendingIndex]
    if (!pending) return
    const result = runPipeline(this.layerStack(), pending.request)
    this.state.predictions.push(target)
    this.state.lastResolved = { index: this.state.pendingIndex, result, prediction: target }
    this.state.pendingIndex += 1
    if (this.state.pendingIndex >= this.state.wave.length) {
      this.finishWave()
    }
    this.commit()
  }

  // ── L4: reorder the walls ─────────────────────────────────────────────────

  /** Move the wall at `from` to `to` in the visible order (L4 only). */
  moveLayer(from: number, to: number): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "predicting") return
    if (from < 0 || from >= this.state.order.length) return
    if (to < 0 || to >= this.state.order.length) return
    const order = [...this.state.order]
    const [moved] = order.splice(from, 1)
    if (moved === undefined) return
    order.splice(to, 0, moved)
    this.state.order = order
    this.commit()
  }

  /** Commit the current order as the player's reorder answer (L4). */
  commitReorder(probePrediction: PredictionTarget): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "predicting") return
    const task = this.state.level.reorder
    if (!task) return
    this.state.predictions = [probePrediction]
    this.state.lastResolved = {
      index: 0,
      result: runPipeline(this.layerStack(), task.probe),
      prediction: probePrediction,
    }
    this.state.pendingIndex = this.state.wave.length // the wave IS the reorder + probe prediction
    this.finishWave()
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  /** Build a fresh Layer stack from the current (player-visible) order. */
  layerStack(): Layer[] {
    return buildLayers(this.state.level.secret, this.state.level.rateCap, [...this.state.order])
  }

  /** Ground-truth answer for the pending request (test hook + HUD hint). */
  pendingAnswer(): PredictionTarget | null {
    const pending = this.state.wave[this.state.pendingIndex]
    return pending ? pending.answer : null
  }

  /** The reorder task for the current level, if any. */
  reorderTask(): ReorderTask | null {
    return this.state.level.reorder
  }

  private finishWave(): void {
    const cfg = this.state.level
    let pass: boolean
    let metrics: Record<string, number | boolean | string>
    if (cfg.id === "L4") {
      const task = cfg.reorder
      const probePrediction = this.state.predictions[0] ?? "auth"
      const out = task
        ? evaluateReorder({ task, playerOrder: [...this.state.order], probePrediction })
        : { pass: false, metrics: { error: "no reorder task" } }
      pass = out.pass
      metrics = out.metrics
    } else {
      const out = evaluatePredictions(this.state.wave, this.state.predictions)
      pass = out.pass
      metrics = out.metrics
    }
    this.state.lastMetrics = metrics
    this.state.phase = pass ? "cleared" : "failed"
    emitEvidence(cfg.id, pass, metrics)
    this.commit()
  }
}

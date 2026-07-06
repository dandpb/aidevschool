import { emitEvidence } from "../evidence/emit"
import {
  evaluateConvergence,
  evaluateDyePath,
  evaluateFilter,
  evaluateTrace,
  eventsFor,
  LEVELS,
  type LevelConfig,
  type LevelId,
  levelConfig,
  logsFor,
  type WaveOutcome,
} from "../sim/levels"
import { collectTrace, type LogRecord, type StageEvent, traceSources } from "../sim/pipeline"

export type Phase = "briefing" | "predicting" | "resolving" | "cleared" | "failed"

export interface GameState {
  level: LevelConfig
  phase: Phase
  /** all logs that will flow through the delta this wave */
  logs: LogRecord[]
  /** the full stage-event log (globally monotonic flow order) */
  events: StageEvent[]
  /** the prompt queue for this level (log ids the player must answer about) */
  prompts: string[]
  /** index of the current prompt */
  promptIndex: number
  /** L1/L2: per-log-id answer the player gave (source id, or pass/drop bool) */
  sourceAnswers: Record<string, string>
  filterAnswers: Record<string, boolean>
  /** L3: the source the player injected dye at */
  injectSource: string | null
  /** L3: the set of sources the player predicts the dye will reach */
  predictedDyeSources: string[]
  /** L4: the set of log ids the player collected into the trace */
  collectedLogIds: string[]
  lastMetrics: Record<string, number | boolean | string> | null
}

export type Listener = (state: GameState) => void

/**
 * RIVER DELTA state machine.
 *
 * Phases per level:
 * - L1: briefing → predicting (predict source per prompt log) → cleared/failed
 * - L2: briefing → predicting (predict pass/drop per prompt log) → cleared/failed
 * - L3: briefing → predicting (inject source + predict dye path) → cleared/failed
 * - L4: briefing → predicting (collect the trace) → cleared/failed
 *
 * All randomness flows from the level seed, so the same level is replayable and
 * the Playwright smoke can drive the public API deterministically.
 */
export class GameController {
  private state: GameState
  private listeners: Listener[] = []

  constructor(level: LevelId = "L1") {
    this.state = this.freshState(levelConfig(level))
  }

  private freshState(cfg: LevelConfig): GameState {
    const logs = logsFor(cfg)
    const events = eventsFor(cfg)
    // Prompt queue: a deterministic subset of log ids. For L1/L2 we prompt on
    // every log so the player reads convergence / filter semantics directly.
    // For L3/L4 there is one composite prompt (inject / collect).
    const prompts = cfg.id === "L1" || cfg.id === "L2" ? logs.map((l) => l.logId) : []
    return {
      level: cfg,
      phase: "briefing",
      logs,
      events,
      prompts,
      promptIndex: 0,
      sourceAnswers: {},
      filterAnswers: {},
      injectSource: null,
      predictedDyeSources: [],
      collectedLogIds: [],
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

  // ── ground-truth helpers (test hook + HUD hints) ────────────────────────────

  /** The source a given log entered from (L1 truth). */
  sourceOf(logId: string): string | null {
    const log = this.state.logs.find((l) => l.logId === logId)
    return log?.source ?? null
  }

  /** True iff the log reached the sink (L2 truth: passed the filter). */
  logReached(logId: string): boolean {
    const last = this.lastEventFor(logId)
    return last?.stage === "sink"
  }

  private lastEventFor(logId: string): StageEvent | null {
    let last: StageEvent | null = null
    for (const e of this.state.events) {
      if (e.logId === logId) last = e
    }
    return last
  }

  /** The set of sources the trace id actually flows through (L3 truth). */
  traceSourceSet(): string[] {
    return traceSources(collectTrace(this.state.events, this.state.level.traceId))
  }

  /** The exact set of log ids in the trace (L4 truth). */
  traceLogIds(): string[] {
    const trace = collectTrace(this.state.events, this.state.level.traceId)
    return [...new Set(trace.map((e) => e.logId))]
  }

  // ── L1: predict the source of the current prompt log ───────────────────────

  /** Predict that the current prompt log entered from `sourceId`. */
  predictSource(sourceId: string): void {
    if (this.state.level.id !== "L1" || this.state.phase !== "predicting") return
    const logId = this.state.prompts[this.state.promptIndex]
    if (logId === undefined) return
    this.state.sourceAnswers[logId] = sourceId
    this.advancePrompt()
  }

  /** Predict for an explicit log id (used by the scene click on a log-craft). */
  predictSourceFor(logId: string, sourceId: string): void {
    if (this.state.level.id !== "L1" || this.state.phase !== "predicting") return
    if (!this.state.prompts.includes(logId)) return
    this.state.sourceAnswers[logId] = sourceId
    if (logId === this.state.prompts[this.state.promptIndex]) this.advancePrompt()
    else this.commit()
  }

  private advancePrompt(): void {
    this.state.promptIndex++
    if (this.state.promptIndex >= this.state.prompts.length) {
      this.resolveL1()
    } else {
      this.commit()
    }
  }

  private resolveL1(): void {
    const truth: Record<string, string> = {}
    for (const log of this.state.logs) truth[log.logId] = log.source
    const out = evaluateConvergence({
      predictions: this.state.sourceAnswers,
      truth,
      promptCount: this.state.prompts.length,
    })
    this.finish(out)
  }

  // ── L2: predict pass/drop for the current prompt log ───────────────────────

  /** Predict whether the current prompt log passes the filter (`passed`) or is dropped. */
  predictFilter(passed: boolean): void {
    if (this.state.level.id !== "L2" || this.state.phase !== "predicting") return
    const logId = this.state.prompts[this.state.promptIndex]
    if (logId === undefined) return
    this.state.filterAnswers[logId] = passed
    this.advanceFilterPrompt()
  }

  predictFilterFor(logId: string, passed: boolean): void {
    if (this.state.level.id !== "L2" || this.state.phase !== "predicting") return
    if (!this.state.prompts.includes(logId)) return
    this.state.filterAnswers[logId] = passed
    if (logId === this.state.prompts[this.state.promptIndex]) this.advanceFilterPrompt()
    else this.commit()
  }

  private advanceFilterPrompt(): void {
    this.state.promptIndex++
    if (this.state.promptIndex >= this.state.prompts.length) {
      this.resolveL2()
    } else {
      this.commit()
    }
  }

  private resolveL2(): void {
    const out = evaluateFilter({
      predictions: this.state.filterAnswers,
      events: this.state.events,
      promptLogIds: this.state.prompts,
    })
    this.finish(out)
  }

  // ── L3: inject dye + predict the dyed path ─────────────────────────────────

  /** Inject the trace id at `sourceId` (the dye source). */
  injectDye(sourceId: string): void {
    if (this.state.level.id !== "L3" || this.state.phase !== "predicting") return
    this.state.injectSource = sourceId
    this.commit()
  }

  /** Toggle a source in the predicted dye path (L3). */
  togglePredictedDyeSource(sourceId: string): void {
    if (this.state.level.id !== "L3" || this.state.phase !== "predicting") return
    if (this.state.injectSource === null) return
    const set = new Set(this.state.predictedDyeSources)
    if (set.has(sourceId)) set.delete(sourceId)
    else set.add(sourceId)
    this.state.predictedDyeSources = [...set]
    this.commit()
  }

  /** Lock in the L3 dye-path prediction. */
  lockInDyePath(): void {
    if (this.state.level.id !== "L3" || this.state.phase !== "predicting") return
    if (this.state.injectSource === null) return
    const out = evaluateDyePath({
      events: this.state.events,
      traceId: this.state.level.traceId,
      predictedSources: this.state.predictedDyeSources,
      injectSource: this.state.injectSource,
    })
    this.finish(out)
  }

  // ── L4: collect the trace ──────────────────────────────────────────────────

  /** Toggle a log id in/out of the collected trace (L4). */
  toggleCollectedLog(logId: string): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "predicting") return
    const set = new Set(this.state.collectedLogIds)
    if (set.has(logId)) set.delete(logId)
    else set.add(logId)
    this.state.collectedLogIds = [...set]
    this.commit()
  }

  /** Lock in the L4 collected trace. */
  lockInTrace(): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "predicting") return
    const out = evaluateTrace({
      events: this.state.events,
      traceId: this.state.level.traceId,
      collectedLogIds: this.state.collectedLogIds,
    })
    this.finish(out)
  }

  // ── finish ─────────────────────────────────────────────────────────────────

  private finish(out: WaveOutcome): void {
    this.state.lastMetrics = out.metrics
    this.state.phase = out.pass ? "cleared" : "failed"
    emitEvidence(this.state.level.id, out.pass, out.metrics)
    this.commit()
  }
}

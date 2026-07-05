import { emitEvidence } from "../evidence/emit"
import { ringHash } from "../sim/hash"
import {
  evaluatePredictions,
  evaluateSkewFix,
  evaluateTopologyChange,
  keysFor,
  LEVELS,
  type LevelConfig,
  type LevelId,
  levelConfig,
  makeStations,
} from "../sim/levels"
import {
  type Assignment,
  anchorsOf,
  assign,
  loadOf,
  loadSkew,
  movedKeys,
  ownerOf,
  type Station,
} from "../sim/ring"

export type Phase = "briefing" | "predicting" | "resolving" | "cleared" | "failed"

export interface GameState {
  level: LevelConfig
  phase: Phase
  stations: Station[]
  keys: string[]
  assignment: Assignment
  /** L1 */
  pendingKeyIndex: number
  correctPredictions: number
  /** L2/L4 */
  incoming: Station | null
  actualLoserId: string | null
  predictedLoserId: string | null
  /** L4 */
  contrastAnswers: { consistent: number | null; modulo: number | null }
  lastMetrics: Record<string, number | boolean> | null
}

export type Listener = (state: GameState) => void

/** Correct multiple-choice answers for L4 (moved fraction going 4 → 5 stations). */
export const CONTRAST_OPTIONS = [0.2, 0.5, 0.8] as const
export const CONTRAST_CORRECT = { consistent: 0.2, modulo: 0.8 } as const

export class GameController {
  private state: GameState
  private listeners: Listener[] = []

  constructor(level: LevelId = "L1") {
    this.state = this.freshState(levelConfig(level))
  }

  private freshState(cfg: LevelConfig): GameState {
    const vnodes = cfg.id === "L2" ? 32 : 1
    const stations = makeStations(cfg.startStations, vnodes)
    const keys = keysFor(cfg)
    return {
      level: cfg,
      phase: "briefing",
      stations,
      keys,
      assignment: assign(cfg.id === "L1" ? [] : keys, stations),
      pendingKeyIndex: 0,
      correctPredictions: 0,
      incoming: cfg.event === "join" ? { id: "st-new", vnodes } : null,
      actualLoserId: null,
      predictedLoserId: null,
      contrastAnswers: { consistent: null, modulo: null },
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
    if (this.state.incoming && !this.state.level.moduloMode) {
      this.state.actualLoserId = this.computeBiggestLoser()
    }
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

  /** L1 — player predicts the owner of the pending key, then it docks. */
  predictOwner(stationId: string): void {
    if (this.state.level.id !== "L1" || this.state.phase !== "predicting") return
    const key = this.state.keys[this.state.pendingKeyIndex]
    if (key === undefined) return
    const truth = ownerOf(ringHash(key), anchorsOf(this.state.stations))
    if (truth === stationId) this.state.correctPredictions++
    const docked = new Map(this.state.assignment)
    docked.set(key, truth)
    this.state.assignment = docked
    this.state.pendingKeyIndex++
    if (this.state.pendingKeyIndex >= this.state.keys.length) {
      this.finishWave(evaluatePredictions(this.state.correctPredictions, this.state.keys.length))
    }
    this.commit()
  }

  /** L2/L4 — player predicts which station loses the most keys to the incoming one. */
  predictLoser(stationId: string): void {
    if (this.state.phase !== "predicting" || !this.state.incoming) return
    this.state.predictedLoserId = stationId
    this.resolveTopologyChange()
  }

  /** L4 — multiple-choice moved-fraction answers; both must be set before the storm resolves. */
  answerContrast(mode: "consistent" | "modulo", value: number): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "predicting") return
    this.state.contrastAnswers[mode] = value
    const { consistent, modulo } = this.state.contrastAnswers
    if (consistent !== null && modulo !== null) {
      this.state.predictedLoserId = this.state.actualLoserId = "n/a"
      this.resolveTopologyChange()
    } else {
      this.commit()
    }
  }

  /** L3 — vnode dial. Recomputes assignment live so the scene shows the skew changing. */
  setVnodes(v: number): void {
    if (!this.state.level.vnodesUnlocked || this.state.phase !== "predicting") return
    this.state.stations = this.state.stations.map((s) => ({ ...s, vnodes: v }))
    this.state.assignment = assign(this.state.keys, this.state.stations)
    this.commit()
  }

  /** L3 — lock in the current topology and be judged. */
  lockIn(): void {
    if (this.state.level.id !== "L3" || this.state.phase !== "predicting") return
    this.finishWave(evaluateSkewFix(this.state.keys, this.state.stations))
    this.commit()
  }

  retry(): void {
    this.loadLevel(this.state.level.id)
    this.start()
  }

  /** Ground truth for a key's owner on the current ring (used by HUD hints and the smoke test). */
  ownerOfKey(key: string): string {
    return ownerOf(ringHash(key), anchorsOf(this.state.stations))
  }

  currentSkew(): number {
    return loadSkew(this.state.assignment, this.state.stations)
  }

  loads(): Map<string, number> {
    return loadOf(this.state.assignment, this.state.stations)
  }

  private computeBiggestLoser(): string {
    const incoming = this.state.incoming
    if (!incoming) throw new Error("no incoming station")
    const before = assign(this.state.keys, this.state.stations)
    const after = assign(this.state.keys, [...this.state.stations, incoming])
    const lost = new Map<string, number>()
    for (const k of movedKeys(before, after)) {
      const owner = before.get(k)
      if (owner) lost.set(owner, (lost.get(owner) ?? 0) + 1)
    }
    let best = ""
    let bestN = -1
    for (const [id, n] of lost) {
      if (n > bestN) {
        best = id
        bestN = n
      }
    }
    return best
  }

  private resolveTopologyChange(): void {
    const incoming = this.state.incoming
    if (!incoming || this.state.actualLoserId === null) return
    this.state.phase = "resolving"
    const before = [...this.state.stations]
    const after = [...before, incoming]
    const { consistent, modulo } = this.state.contrastAnswers
    const contrastStated =
      consistent === CONTRAST_CORRECT.consistent && modulo === CONTRAST_CORRECT.modulo
    const outcome = evaluateTopologyChange({
      keys: this.state.keys,
      before,
      after,
      moduloMode: this.state.level.moduloMode,
      predictedLoserId: this.state.predictedLoserId,
      actualLoserId: this.state.actualLoserId,
      contrastStated,
    })
    this.state.stations = after
    this.state.assignment = assign(this.state.keys, after)
    this.finishWave(outcome)
    this.commit()
  }

  private finishWave(outcome: { pass: boolean; metrics: Record<string, number | boolean> }): void {
    this.state.lastMetrics = outcome.metrics
    this.state.phase = outcome.pass ? "cleared" : "failed"
    emitEvidence(this.state.level.id, outcome.pass, outcome.metrics)
  }
}

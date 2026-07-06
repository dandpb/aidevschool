import { emitEvidence } from "../evidence/emit"
import { bucketOf, type HashStrength } from "../sim/hash"
import {
  type CrudProbe,
  evaluateCrud,
  evaluateShelfPredictions,
  evaluateSkewFix,
  evaluateTtl,
  keysFor,
  LEVELS,
  type LevelConfig,
  type LevelId,
  levelConfig,
  storeFor,
} from "../sim/levels"
import {
  type Clock,
  createStore,
  del,
  type Entry,
  get,
  loadPerShelf,
  loadSkew,
  put,
  readdress,
  type Store,
  sweepExpired,
} from "../sim/store"

export type Phase = "briefing" | "predicting" | "resolving" | "cleared" | "failed"

export interface GameState {
  level: LevelConfig
  phase: Phase
  store: Store<string>
  /** injected clock state (ms); the controller owns advancing it deterministically. */
  now: number
  keys: string[]
  /** L1 — index of the next key to predict the shelf for. */
  pendingIndex: number
  correctPredictions: number
  /** L1 — the player's recorded shelf predictions (key → predicted shelf). */
  shelfPredictions: ReadonlyArray<{ key: string; shelf: number }>
  /** L2 — index of the next get-probe; L3 — same probes but the clock has decayed some. */
  crudIndex: number
  crudProbes: CrudProbe[]
  /** L3 — the player's predicted expired-count before the sweep. */
  predictedSwept: number | null
  /** L4 — current shelf count dial (rehashes the store live). */
  lastMetrics: Record<string, number | boolean> | null
}

export type Listener = (state: GameState) => void

export class GameController {
  private state: GameState
  private listeners: Listener[] = []

  constructor(level: LevelId = "L1") {
    this.state = this.freshState(levelConfig(level))
  }

  private freshState(cfg: LevelConfig): GameState {
    // L1 streams crates one-by-one into an empty store; other levels pre-load the store so the
    // probes have something to read.
    if (cfg.id === "L1") {
      const store = createStore<string>(cfg.startShelves, cfg.startStrength)
      return {
        level: cfg,
        phase: "briefing",
        store,
        now: 0,
        keys: [],
        pendingIndex: 0,
        correctPredictions: 0,
        shelfPredictions: [],
        crudIndex: 0,
        crudProbes: [],
        predictedSwept: null,
        lastMetrics: null,
      }
    }
    // L2/L3/L4: pre-load the store with the level's key stream (deterministic).
    const built = storeFor(cfg, (_key, i) => `crate-${i}`)
    // advance the clock a touch past the longest possible deadline so L3 crates are decayed
    const decayed = cfg.id === "L3" ? cfg.ttlMs * cfg.keyCount + cfg.crateTtlMs + 1 : built.clock()
    return {
      level: cfg,
      phase: "briefing",
      store: built.store,
      now: decayed,
      keys: built.keys,
      pendingIndex: 0,
      correctPredictions: 0,
      shelfPredictions: [],
      crudIndex: 0,
      crudProbes: [],
      predictedSwept: null,
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

  private clock(): Clock {
    return () => this.state.now
  }

  start(): void {
    this.state.phase = "predicting"
    if (this.state.level.id === "L1") {
      // materialize the stream now so the HUD/scene can render it as it docks
      this.state.keys = keysFor(this.state.level)
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

  /** Ground truth: the shelf a key hashes to on the current store (uses the store's hash strength). */
  shelfOfKey(key: string): number {
    return bucketOf(key, this.state.store.shelfCount, this.state.store.hashStrength)
  }

  /** L1 — player predicts the shelf for the pending key, then the crate docks there. */
  predictShelf(shelf: number): void {
    if (this.state.level.id !== "L1" || this.state.phase !== "predicting") return
    const key = this.state.keys[this.state.pendingIndex]
    if (key === undefined) return
    const truth = this.shelfOfKey(key)
    if (truth === shelf) this.state.correctPredictions++
    // remember the player's actual prediction so the evaluator scores the player, not the truth
    this.state.shelfPredictions = [...this.state.shelfPredictions, { key, shelf }]
    // the picker-bot docks the crate on its hashed shelf (the store is the source of truth)
    put(this.state.store, key, `crate-${this.state.pendingIndex}`, this.clock())
    this.state.pendingIndex++
    if (this.state.pendingIndex >= this.state.keys.length) {
      this.finishWave(
        evaluateShelfPredictions(this.state.shelfPredictions, this.state.store.shelfCount),
      )
    }
    this.commit()
  }

  /** L2/L3 — player answers whether the next key's get returns the value (true) or null (false). */
  answerGet(predictedAlive: boolean): void {
    if (this.state.phase !== "predicting") return
    if (this.state.level.id !== "L2" && this.state.level.id !== "L3") return
    const key = this.state.keys[this.state.crudIndex]
    if (key === undefined) return
    this.state.crudProbes = [...this.state.crudProbes, { key, predictedAlive }]
    this.state.crudIndex++
    if (this.state.crudIndex >= this.state.keys.length) {
      // L3: after the probes, the player predicts how many expired crates the sweep reclaims.
      if (this.state.level.id === "L3") {
        this.commit()
        return
      }
      this.finishWave(evaluateCrud(this.state.store, this.state.crudProbes, this.clock()))
    }
    this.commit()
  }

  /** L3 — player predicts how many crates the sweep reclaims, then it runs. */
  predictSwept(count: number): void {
    if (this.state.level.id !== "L3" || this.state.phase !== "predicting") return
    if (this.state.crudIndex < this.state.keys.length) return
    this.state.predictedSwept = count
    this.finishWave(evaluateTtl(this.state.store, this.state.crudProbes, count, this.clock()))
    this.commit()
  }

  /** L4 — dial the hash strength up; re-address live so the scene shows the skew changing. */
  setHashStrength(strength: HashStrength): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "predicting") return
    const clamped =
      strength === "full" ? "full" : Math.max(1, Math.min(this.state.level.maxStrength, strength))
    this.state.store = readdress(this.state.store, { hashStrength: clamped })
    this.commit()
  }

  /** L4 — lock in the current hash strength and be judged on skew. */
  lockIn(): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "predicting") return
    this.finishWave(evaluateSkewFix(this.state.store, this.clock()))
    this.commit()
  }

  retry(): void {
    this.loadLevel(this.state.level.id)
    this.start()
  }

  currentSkew(): number {
    return loadSkew(this.state.store, this.clock())
  }

  /** Per-shelf live key counts (length === shelfCount). */
  loads(): number[] {
    return loadPerShelf(this.state.store, this.clock())
  }

  /** key → shelf over live entries (scene + HUD). */
  shelfAssignment(): Map<string, number> {
    const out = new Map<string, number>()
    const t = this.state.now
    for (const [key, entry] of this.state.store.entries) {
      const live = entry.deadline === null || entry.deadline > t
      if (live)
        out.set(key, bucketOf(key, this.state.store.shelfCount, this.state.store.hashStrength))
    }
    return out
  }

  /** Live entries (scene + HUD). */
  liveEntries(): Map<string, Entry<string>> {
    const out = new Map<string, Entry<string>>()
    const t = this.state.now
    for (const [key, entry] of this.state.store.entries) {
      const live = entry.deadline === null || entry.deadline > t
      if (live) out.set(key, entry)
    }
    return out
  }

  /** Ground-truth get — used by the HUD hint and the smoke test. */
  getTruth(key: string): string | null {
    return get(this.state.store, key, this.clock())
  }

  /** Ground-truth del — exposed for completeness / future CRUD expansion. */
  delTruth(key: string): boolean {
    return del(this.state.store, key, this.clock())
  }

  /** Run a sweep now (no judgement) — exposed for the scene's sweep animation trigger. */
  sweepNow(): string[] {
    return sweepExpired(this.state.store, this.clock())
  }

  private finishWave(outcome: { pass: boolean; metrics: Record<string, number | boolean> }): void {
    this.state.lastMetrics = outcome.metrics
    this.state.phase = outcome.pass ? "cleared" : "failed"
    emitEvidence(this.state.level.id, outcome.pass, outcome.metrics)
  }
}

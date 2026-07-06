import { emitEvidence } from "../evidence/emit"
import {
  buildState,
  evaluateConnectedPrediction,
  evaluateDeliveryPrediction,
  evaluateRecovery,
  evaluateSurvivorPrediction,
  LEVELS,
  type LevelConfig,
  type LevelId,
  levelConfig,
  type StationSpec,
  type WaveOutcome,
} from "../sim/levels"
import {
  type BroadcastResult,
  broadcast,
  connect,
  createState,
  type RelayState,
  subscribe,
  sweepDead,
} from "../sim/relay"

export type Phase = "briefing" | "predicting" | "resolving" | "cleared" | "failed"

export interface GameState {
  level: LevelConfig
  phase: Phase
  /** the scripted stations for this wave */
  stations: StationSpec[]
  /** the live sim state (connected + subscribed clients) */
  state: RelayState
  /** ids the player has toggled into their predicted set */
  predicted: Set<string>
  /** L4: has the player performed the reconnect yet? */
  reconnected: boolean
  /** the channel a broadcast fires on (L2/L4) */
  broadcastChannel: string
  /** the most recent broadcast result (for the scene to animate + the HUD to show) */
  lastBroadcast: BroadcastResult | null
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
    return {
      level: cfg,
      phase: "briefing",
      stations: cfg.stations,
      state: buildState(cfg),
      predicted: new Set<string>(),
      reconnected: false,
      broadcastChannel: cfg.broadcastChannel,
      lastBroadcast: null,
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

  /** L1/L2/L3 — toggle a station in/out of the predicted set. */
  togglePredict(stationId: string): void {
    if (this.state.phase !== "predicting") return
    if (this.state.predicted.has(stationId)) this.state.predicted.delete(stationId)
    else this.state.predicted.add(stationId)
    this.commit()
  }

  /** L1/L2/L3 — lock in the prediction and be judged against the sim. */
  submit(): void {
    if (this.state.phase !== "predicting") return
    this.state.phase = "resolving"
    const cfg = this.state.level
    const predicted = [...this.state.predicted].sort()
    let outcome: WaveOutcome
    if (cfg.id === "L1") {
      outcome = evaluateConnectedPrediction(cfg, predicted)
      this.state.lastBroadcast = null
    } else if (cfg.id === "L2") {
      outcome = evaluateDeliveryPrediction(cfg, predicted)
      this.state.lastBroadcast = broadcast(this.state.state, cfg.broadcastChannel, "m", cfg.now)
    } else {
      outcome = evaluateSurvivorPrediction(cfg, predicted)
      // visualize the sweep: re-run it on the live state
      const { state: swept } = sweepDead(this.state.state, cfg.now, cfg.timeoutMs)
      this.state.lastBroadcast = broadcast(swept, cfg.broadcastChannel, "m", cfg.now)
    }
    this.finishWave(outcome)
    this.commit()
  }

  /** L4 — reconnect the dropped station, then confirm it rejoins the fan-out. */
  reconnect(stationId: string): void {
    if (this.state.phase !== "predicting" || this.state.level.id !== "L4") return
    this.state.reconnected = true
    this.state.phase = "resolving"
    const outcome = evaluateRecovery({ cfg: this.state.level, reconnectedId: stationId })
    // reflect the recovery in the live state for the scene
    let s = this.state.state
    s = connect(s, stationId, this.state.level.now)
    s = subscribe(s, stationId, this.state.broadcastChannel)
    this.state.state = s
    this.state.lastBroadcast = broadcast(s, this.state.broadcastChannel, "m", this.state.level.now)
    this.finishWave(outcome)
    this.commit()
  }

  retry(): void {
    this.loadLevel(this.state.level.id)
    this.start()
  }

  /** Ground truth sets for HUD hints and the smoke test. */
  truthConnected(): string[] {
    return [...this.state.state.clients.keys()].sort()
  }

  truthDelivery(): string[] {
    return broadcast(this.state.state, this.state.broadcastChannel, "m", this.state.level.now)
      .deliveredTo
  }

  truthSurvivors(): string[] {
    const { dropped } = sweepDead(
      this.state.state,
      this.state.level.now,
      this.state.level.timeoutMs,
    )
    return this.state.stations
      .filter((st) => st.connected && !dropped.includes(st.id))
      .map((st) => st.id)
      .sort()
  }

  truthReconnectTarget(): string | null {
    return this.state.level.reconnectTarget
  }

  /** Build the empty predicted state for the scene/HUD. Exposed for tests. */
  static emptyState(): RelayState {
    return createState()
  }

  private finishWave(outcome: WaveOutcome): void {
    this.state.lastMetrics = outcome.metrics
    this.state.phase = outcome.pass ? "cleared" : "failed"
    emitEvidence(this.state.level.id, outcome.pass, outcome.metrics)
  }
}

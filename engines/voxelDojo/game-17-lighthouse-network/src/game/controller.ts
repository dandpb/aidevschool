import { emitEvidence } from "../evidence/emit"
import {
  ack,
  type Commit,
  commit,
  isCommitted,
  propose,
  quorumOf,
  syncNode,
  tryCommitInPartition,
} from "../sim/consensus"
import {
  ackOrderFor,
  evaluatePartition,
  evaluateQuorum,
  evaluateRemerge,
  evaluateWatchers,
  type LevelConfig,
  type LevelId,
  levelConfig,
  makeNodes,
  partitionFor,
  type WaveOutcome,
} from "../sim/levels"

export type Phase = "briefing" | "predicting" | "resolving" | "cleared" | "failed"

export interface GameState {
  level: LevelConfig
  phase: Phase
  /** nodeIds that have acked the current proposal so far (live) */
  ackedNodeIds: string[]
  /** the deterministic order acks would arrive in (for the scene's sweep animation) */
  ackOrder: string[]
  /** the committed value once quorum reached, else null */
  committedValue: string | null
  /** nodeIds the player has marked as the predicted lit watchers (L2) */
  predictedLit: string[]
  /** predicted quorum size (L1) */
  predictedQuorum: number
  /** predicted majority side (L3) */
  predictedSide: "left" | "right" | null
  /** nodeIds the player has synced (L4) */
  syncedNodeIds: string[]
  /** last computed node values (after sync / re-merge) */
  nodeValues: Record<string, string | null>
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
    const nodeValues: Record<string, string | null> = {}
    for (const n of makeNodes(cfg.clusterSize)) nodeValues[n.id] = null
    return {
      level: cfg,
      phase: "briefing",
      ackedNodeIds: [],
      ackOrder: ackOrderFor(cfg),
      committedValue: null,
      predictedLit: [],
      predictedQuorum: 0,
      predictedSide: null,
      syncedNodeIds: [],
      nodeValues,
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

  private commit_notify(): void {
    for (const fn of this.listeners) fn(this.state)
  }

  start(): void {
    this.state.phase = "predicting"
    this.commit_notify()
  }

  loadLevel(level: LevelId): void {
    this.state = this.freshState(levelConfig(level))
    this.commit_notify()
  }

  nextLevel(): void {
    const order: LevelId[] = ["L1", "L2", "L3", "L4"]
    const idx = order.indexOf(this.state.level.id)
    const next = order[idx + 1]
    if (next) this.loadLevel(next)
  }

  /** Ground-truth quorum for this level's cluster (HUD hint + smoke truth). */
  quorumRequired(): number {
    return quorumOf(this.state.level.clusterSize)
  }

  /** L1 — set the predicted quorum size. */
  setPredictedQuorum(n: number): void {
    if (this.state.phase !== "predicting") return
    this.state.predictedQuorum = n
    this.commit_notify()
  }

  /**
   * Click a lighthouse to ACK it. Builds the ballot live so the scene can sweep beams.
   * The moment quorum is reached we materialise the commit (the flash).
   */
  ackNode(nodeId: string): void {
    if (this.state.phase !== "predicting") return
    if (this.state.ackedNodeIds.includes(nodeId)) return
    if (this.state.committedValue !== null) return // already committed
    this.state.ackedNodeIds = [...this.state.ackedNodeIds, nodeId]
    const ballot = this.buildBallot()
    if (isCommitted(ballot, this.state.level.clusterSize)) {
      this.state.committedValue = this.state.level.newValue
    }
    this.commit_notify()
  }

  /** L2 — toggle a watcher as predicted-to-light-up. */
  togglePredictedWatcher(nodeId: string): void {
    if (this.state.phase !== "predicting") return
    this.state.predictedLit = this.state.predictedLit.includes(nodeId)
      ? this.state.predictedLit.filter((id) => id !== nodeId)
      : [...this.state.predictedLit, nodeId]
    this.commit_notify()
  }

  /** L3 — set the predicted majority side. */
  setPredictedSide(side: "left" | "right"): void {
    if (this.state.phase !== "predicting") return
    this.state.predictedSide = side
    this.commit_notify()
  }

  /** L4 — toggle a node as synced to the committed value. */
  toggleSynced(nodeId: string): void {
    if (this.state.phase !== "predicting") return
    this.state.syncedNodeIds = this.state.syncedNodeIds.includes(nodeId)
      ? this.state.syncedNodeIds.filter((id) => id !== nodeId)
      : [...this.state.syncedNodeIds, nodeId]
    this.state.nodeValues = {
      ...this.state.nodeValues,
      [nodeId]: this.state.level.newValue,
    }
    this.commit_notify()
  }

  /** Lock in the current level's prediction and be judged. */
  resolve(): void {
    if (this.state.phase !== "predicting") return
    let outcome: WaveOutcome
    if (this.state.level.id === "L1") {
      outcome = evaluateQuorum({
        cfg: this.state.level,
        predictedQuorum: this.state.predictedQuorum,
        ackedNodeIds: this.state.ackedNodeIds,
      })
    } else if (this.state.level.id === "L2") {
      outcome = evaluateWatchers({
        cfg: this.state.level,
        predictedLit: this.state.predictedLit,
        ackedNodeIds: this.state.ackedNodeIds,
      })
    } else if (this.state.level.id === "L3") {
      outcome = evaluatePartition({
        cfg: this.state.level,
        predictedMajoritySide: this.state.predictedSide ?? "left",
      })
    } else {
      outcome = evaluateRemerge({
        cfg: this.state.level,
        committedValue: this.state.level.newValue,
        syncedNodeIds: this.state.syncedNodeIds,
      })
    }
    this.finishWave(outcome)
    this.commit_notify()
  }

  retry(): void {
    this.loadLevel(this.state.level.id)
    this.start()
  }

  /** Convenience for the scene: the live ballot for rendering beam alignment. */
  buildBallot() {
    let b = propose(
      makeNodes(this.state.level.clusterSize),
      this.state.level.key,
      this.state.level.newValue,
    )
    for (const id of this.state.ackedNodeIds) b = ack(b, id)
    return b
  }

  /** L3 partition info for the scene (left = partitionSide, right = everyone else). */
  currentPartition() {
    return partitionFor(this.state.level)
  }

  /** For HUD: which side (if any) can commit. */
  sideCanCommit(side: "left" | "right"): boolean {
    const p = this.currentPartition()
    const group = side === "left" ? p.side : p.other
    return tryCommitInPartition(group, p.totalN)
  }

  /** The actual Commit object once quorum reached (for watcher notify + scene flash). */
  currentCommit(): Commit | null {
    const ballot = this.buildBallot()
    if (!isCommitted(ballot, this.state.level.clusterSize)) return null
    return commit(ballot)
  }

  private finishWave(outcome: WaveOutcome): void {
    this.state.lastMetrics = outcome.metrics
    this.state.phase = outcome.pass ? "cleared" : "failed"
    emitEvidence(this.state.level.id, outcome.pass, outcome.metrics)
  }
}

export { commit, syncNode }

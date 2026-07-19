import { emitEvidence } from "../evidence/emit"
import { allDone, canLaunch, type Job, readyJobs, topoOrder } from "../sim/dag"
import {
  type ClusterState,
  type ElectionResult,
  electTerm,
  killLeader,
  type Station,
} from "../sim/election"
import {
  evaluateDagRun,
  evaluateLeaderPrediction,
  evaluateRecovery,
  evaluateSuccession,
  LEVELS,
  type LevelConfig,
  type LevelId,
  type LevelOutcome,
  levelConfig,
} from "../sim/levels"

export type Phase =
  | "briefing"
  | "predicting" // predict the leader (L1/L2) or launch jobs (L3/L4)
  | "resolving" // election/kill animation window — brief, logic settles here
  | "cleared"
  | "failed"

export interface GameState {
  level: LevelConfig
  phase: Phase
  /** live station roster (drops the killed leader on L2/L4) */
  stations: Station[]
  /** the current election result (leader, term, votes) */
  election: ElectionResult | null
  /** true once the player has predicted the current leader (L1/L2 gate) */
  leaderPredicted: boolean
  predictedLeaderId: string | null
  /** frozen copy of the pre-kill leader prediction (L2/L4 succession evaluation) */
  firstPredictedLeaderId: string | null
  /** L2/L4: leader killed, awaiting succession */
  killedLeaderId: string | null
  /** DAG progress (L3/L4) */
  jobs: Job[]
  completed: Set<string>
  /** the order the player launched jobs in (for evaluation) */
  launchOrder: string[]
  lastMetrics: Record<string, number | boolean | string> | null
}

export type Listener = (state: GameState) => void

/**
 * MISSION CONTROL state machine.
 *
 * Phases per level:
 * - L1: briefing → predicting (predict leader) → cleared/failed
 * - L2: briefing → predicting (predict leader → kill → predict successor) → cleared/failed
 * - L3: briefing → predicting (launch jobs in topo order) → cleared/failed
 * - L4: briefing → predicting (launch some jobs → kill → resume) → cleared/failed
 *
 * All randomness flows from the level seed via `electTerm`, so the same level is replayable and
 * the Playwright smoke can drive the public API deterministically.
 */
export class GameController {
  private state: GameState
  private listeners: Listener[] = []

  constructor(level: LevelId = "L1") {
    this.state = this.freshState(levelConfig(level))
  }

  private freshState(cfg: LevelConfig): GameState {
    const stations: Station[] = cfg.stations.map((id) => ({ id }))
    const election = electTerm(stations, cfg.seed)
    return {
      level: cfg,
      phase: "briefing",
      stations,
      election,
      leaderPredicted: false,
      predictedLeaderId: null,
      firstPredictedLeaderId: null,
      killedLeaderId: null,
      jobs: cfg.jobs.map((j) => ({ ...j, deps: [...j.deps] })),
      completed: new Set<string>(),
      launchOrder: [],
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

  /** The ground-truth elected leader for the current term (test hook + HUD hint). */
  currentLeaderId(): string | null {
    return this.state.election?.leaderId ?? null
  }

  currentTerm(): number {
    return this.state.election?.term ?? 0
  }

  /** Jobs safe to launch right now (deps satisfied, not yet completed). */
  readyJobs(): Job[] {
    return readyJobs(this.state.completed, this.state.jobs)
  }

  isReady(jobId: string): boolean {
    const job = this.state.jobs.find((j) => j.id === jobId)
    if (!job) return false
    return !this.state.completed.has(jobId) && canLaunch(this.state.completed, job)
  }

  // ── L1 / L2 first half: predict the leader ────────────────────────────────

  /** Predict `stationId` as the elected leader. On L1 this resolves the wave. */
  predictLeader(stationId: string): void {
    if (this.state.phase !== "predicting") return
    if (this.state.killedLeaderId !== null) {
      // L2/L4 second half — predicting the successor.
      this.predictSuccessor(stationId)
      return
    }
    const election = this.state.election
    if (!election) return
    this.state.predictedLeaderId = stationId
    if (this.state.level.id === "L1") {
      const out = evaluateLeaderPrediction({
        predictedId: stationId,
        actualId: election.leaderId,
        term: election.term,
      })
      this.finish(out)
      return
    }
    // L2/L4: record the prediction; the player must now kill the leader to proceed.
    this.state.leaderPredicted = true
    this.state.firstPredictedLeaderId = stationId // freeze for succession evaluation
    this.commit()
  }

  // ── L2 / L4: kill the leader and elect a successor ────────────────────────

  /**
   * Kill `stationId`. Only the current leader may be killed (the mechanic is "kill the leader,
   * watch the halo transfer"). Re-runs the election among survivors at term+1.
   */
  killLeader(stationId: string): void {
    if (this.state.phase !== "predicting") return
    if (!this.state.level.killEnabled) return
    const election = this.state.election
    if (!election) return
    if (stationId !== election.leaderId) {
      // Killing a non-leader is a misread of the model.
      this.fail({ killed_non_leader: true, killed_leader: stationId })
      return
    }
    const cluster: ClusterState = {
      stations: this.state.stations,
      term: election.term,
      seed: this.state.level.seed,
    }
    const { state: nextCluster, result } = killLeader(cluster, stationId)
    this.state.stations = nextCluster.stations
    this.state.election = result
    this.state.killedLeaderId = stationId
    // DAG progress (L4) survives the handoff: `completed` is untouched.
    this.state.leaderPredicted = false
    this.state.predictedLeaderId = null
    this.commit()
  }

  /** Predict `stationId` as the successor after a kill (L2) or while resuming (L4). */
  predictSuccessor(stationId: string): void {
    if (this.state.phase !== "predicting") return
    const election = this.state.election
    if (!election || this.state.killedLeaderId === null) return
    if (this.state.level.id === "L2") {
      // Reconstruct the first-term leader for evaluation: re-elect at term 1 from the original
      // roster, since L2 starts from the full cluster.
      const first = electTerm(
        this.state.level.stations.map((id) => ({ id })),
        this.state.level.seed,
      )
      const out = evaluateSuccession({
        firstPredictedId: this.state.firstPredictedLeaderId ?? "",
        firstActualId: first.leaderId,
        firstTerm: first.term,
        successorPredictedId: stationId,
        successorActualId: election.leaderId,
        successorTerm: election.term,
      })
      this.finish(out)
      return
    }
    // L4: the successor prediction gates whether the player understood the recovery; the wave
    // then resolves by finishing the DAG (or failing immediately if predicted wrong is allowed
    // to keep going). We treat the successor guess as a hard gate for L4 too.
    this.state.predictedLeaderId = stationId
    const ok = stationId === election.leaderId
    if (!ok) {
      this.fail({
        leader_killed: true,
        killed_leader: this.state.killedLeaderId,
        successor_prediction_ok: false,
        actual_successor: election.leaderId,
        first_term: this.firstTermForLevel(),
        successor_term: election.term,
      })
      return
    }
    // Successor predicted correctly → resume launching; settle when the DAG is done.
    this.state.leaderPredicted = true
    if (allDone(this.state.completed, this.state.jobs)) {
      this.resolveRecovery()
    } else {
      this.commit()
    }
  }

  // ── L3 / L4: launch jobs in dependency order ──────────────────────────────

  /** Launch (click) job `jobId`. Blocked launches count as a violation and fail the wave. */
  launchJob(jobId: string): void {
    if (this.state.phase !== "predicting") return
    if (this.state.jobs.length === 0) return
    const job = this.state.jobs.find((j) => j.id === jobId)
    if (!job) return
    if (this.state.completed.has(jobId)) return // already done — ignore
    if (!canLaunch(this.state.completed, job)) {
      // A blocked launch is the core misconception this game catches.
      this.state.launchOrder.push(jobId)
      const base =
        this.state.level.id === "L4"
          ? evaluateRecovery({
              jobs: this.state.jobs,
              launchOrder: this.state.launchOrder,
              firstTerm: this.firstTermForLevel(),
              successorTerm: this.state.election?.term ?? 0,
              killedLeaderId: this.state.killedLeaderId,
            })
          : evaluateDagRun({ jobs: this.state.jobs, launchOrder: this.state.launchOrder })
      this.finish(base)
      return
    }
    this.state.completed.add(jobId)
    this.state.launchOrder.push(jobId)
    if (allDone(this.state.completed, this.state.jobs)) {
      if (this.state.level.id === "L4") {
        // L4 may finish before the kill if the player races the DAG; require the kill+resume.
        if (this.state.killedLeaderId === null) {
          // DAG drained without a recovery — instruct the player to kill the leader. Stay in
          // predicting so they can kill, but we still allow it by settling into recovery if a
          // kill has happened. Here: just commit and wait for the kill.
          this.commit()
          return
        }
        this.resolveRecovery()
        return
      }
      const out = evaluateDagRun({ jobs: this.state.jobs, launchOrder: this.state.launchOrder })
      this.finish(out)
      return
    }
    this.commit()
  }

  private resolveRecovery(): void {
    const out = evaluateRecovery({
      jobs: this.state.jobs,
      launchOrder: this.state.launchOrder,
      firstTerm: this.firstTermForLevel(),
      successorTerm: this.state.election?.term ?? 0,
      killedLeaderId: this.state.killedLeaderId,
    })
    this.finish(out)
  }

  private firstTermForLevel(): number {
    return electTerm(
      this.state.level.stations.map((id) => ({ id })),
      this.state.level.seed,
    ).term
  }

  private finish(out: LevelOutcome): void {
    this.state.lastMetrics = out.metrics
    this.state.phase = out.pass ? "cleared" : "failed"
    emitEvidence(this.state.level.id, out.pass, out.metrics)
    this.commit()
  }

  private fail(metrics: Record<string, number | boolean | string>): void {
    this.state.lastMetrics = metrics
    this.state.phase = "failed"
    emitEvidence(this.state.level.id, false, metrics)
    this.commit()
  }

  /** Convenience for the scene/HUD: the valid topological order for the current DAG. */
  topoOrder(): string[] {
    if (this.state.jobs.length === 0) return []
    try {
      return topoOrder(this.state.jobs)
    } catch {
      return []
    }
  }
}

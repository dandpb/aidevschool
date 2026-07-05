import { emitEvidence } from "../evidence/emit"
import {
  buildRebalancePuzzle,
  buildReplayPuzzle,
  canonicalAssignment,
  crewsFor,
  evaluateAssignment,
  evaluateRebalance,
  evaluateReplay,
  evaluateRoute,
  LEVELS,
  type LevelConfig,
  type LevelId,
  levelConfig,
  logFor,
  type RebalancePuzzle,
  type ReplayPuzzle,
  routeTruth,
  type WaveOutcome,
} from "../sim/levels"
import {
  type Assignment,
  assignPartitions,
  type Consumer,
  type ConsumerGroup,
  createGroup,
  type Log,
  type Message,
  partitionOf,
  partitionTail,
  rebalance,
  rewindOffset,
} from "../sim/queue"
import { keyStream, mulberry32 } from "../sim/rng"

export type Phase = "briefing" | "predicting" | "resolving" | "cleared" | "failed"

export interface GameState {
  level: LevelConfig
  phase: Phase
  log: Log
  group: ConsumerGroup
  /** which partition the L1 incoming key hashes to — set when a key is presented */
  pendingKey: { key: string; index: number } | null
  /** L1: tally of correct lane predictions */
  correctRoutes: number
  /** L2: the player's hand-built assignment (partition → crewId) */
  draftAssignment: Map<number, string>
  /** L3: the rebalance puzzle (before-state) and player's predicted new owners */
  rebalancePuzzle: RebalancePuzzle | null
  predictedRebalance: Map<number, string>
  /** L4: the replay puzzle */
  replayPuzzle: ReplayPuzzle | null
  replayRewindTo: number
  predictedReplay: number[]
  /** the set of incoming keys the level will present (L1) */
  routeKeys: string[]
  lastMetrics: Record<string, number | boolean> | null
}

export type Listener = (state: GameState) => void

/** L4 default rewind point: halfway down the lane. */
const DEFAULT_REWIND_TO = 0

export class GameController {
  private state: GameState
  private listeners: Listener[] = []

  constructor(level: LevelId = "L1") {
    this.state = this.freshState(levelConfig(level))
  }

  private freshState(cfg: LevelConfig): GameState {
    const log = logFor(cfg)
    const group = createGroup("g1", crewsFor(cfg.crewCount), cfg.partitionCount)
    return {
      level: cfg,
      phase: "briefing",
      log,
      group,
      pendingKey: null,
      correctRoutes: 0,
      draftAssignment: new Map(canonicalAssignment(cfg.partitionCount, crewsFor(cfg.crewCount))),
      rebalancePuzzle: null,
      predictedRebalance: new Map(),
      replayPuzzle: null,
      replayRewindTo: DEFAULT_REWIND_TO,
      predictedReplay: [],
      routeKeys: keyStream(mulberry32(cfg.seed + 1), 10),
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
    if (this.state.level.id === "L1") this.presentNextRouteKey()
    if (this.state.level.id === "L3") {
      const evt: "join" | "leave" = this.state.level.event === "leave" ? "leave" : "join"
      this.state.rebalancePuzzle = buildRebalancePuzzle(this.state.level, evt)
      this.state.predictedRebalance = new Map()
    }
    if (this.state.level.id === "L4") {
      this.state.replayPuzzle = buildReplayPuzzle(this.state.level, this.state.replayRewindTo)
      this.state.predictedReplay = []
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

  retry(): void {
    this.loadLevel(this.state.level.id)
    this.start()
  }

  // ───────────────────────── L1: route the freight ─────────────────────────

  /** Present the next incoming key (or finish the wave if none remain). */
  private presentNextRouteKey(): void {
    const idx = this.state.pendingKey?.index ?? -1
    const next = idx + 1
    const key = this.state.routeKeys[next]
    if (key === undefined) {
      this.finishWave(evaluateRoute(this.state.correctRoutes, this.state.routeKeys.length))
      return
    }
    this.state.pendingKey = { key, index: next }
  }

  /** Truth: which lane does the current pending key hash to? (HUD hint + smoke test.) */
  pendingKeyPartition(): number | null {
    const k = this.state.pendingKey
    if (!k) return null
    return routeTruth(k.key, this.state.level.partitionCount)
  }

  /** Player predicts the lane for the current incoming freight car. */
  predictRoute(partition: number): void {
    if (this.state.level.id !== "L1" || this.state.phase !== "predicting") return
    const k = this.state.pendingKey
    if (!k) return
    const truth = partitionOf(k.key, this.state.level.partitionCount)
    if (truth === partition) this.state.correctRoutes++
    this.presentNextRouteKey()
    this.commit()
  }

  // ───────────────────────── L2: consumer crews ─────────────────────────

  /** Assign (or reassign) a lane to a crew. */
  assignLane(partition: number, crewId: string): void {
    if (this.state.level.id !== "L2" || this.state.phase !== "predicting") return
    this.state.draftAssignment.set(partition, crewId)
    this.commit()
  }

  /** Use the canonical round-robin assignment (a "show me a valid layout" aid). */
  autoAssign(): void {
    if (this.state.phase !== "predicting") return
    this.state.draftAssignment = new Map(
      canonicalAssignment(this.state.level.partitionCount, crewsFor(this.state.level.crewCount)),
    )
    this.commit()
  }

  /** Lock in the assignment and be judged. */
  lockInAssignment(): void {
    if (this.state.level.id !== "L2" || this.state.phase !== "predicting") return
    const consumers = crewsFor(this.state.level.crewCount)
    const outcome = evaluateAssignment(
      this.state.draftAssignment,
      this.state.level.partitionCount,
      consumers,
    )
    if (outcome.pass) {
      this.state.group = { ...this.state.group, assignment: this.state.draftAssignment }
    }
    this.finishWave(outcome)
    this.commit()
  }

  // ───────────────────────── L3: rebalance ─────────────────────────

  /** Player predicts the new owner of a partition after the join/leave event. */
  predictRebalanceOwner(partition: number, crewId: string): void {
    if (this.state.level.id !== "L3" || this.state.phase !== "predicting") return
    this.state.predictedRebalance.set(partition, crewId)
    this.commit()
  }

  /** Resolve the rebalance event with the player's predicted owners. */
  resolveRebalance(): void {
    if (this.state.level.id !== "L3" || this.state.phase !== "predicting") return
    const puzzle = this.state.rebalancePuzzle
    if (!puzzle) return
    const outcome = evaluateRebalance({
      predicted: this.state.predictedRebalance,
      actual: puzzle.actualAssignment,
      offsetsPreserved: puzzle.offsetsPreserved,
      partitionCount: this.state.level.partitionCount,
    })
    if (outcome.pass) {
      // apply the rebalanced group (offsets preserved, new owners)
      this.state.group = rebalance(puzzle.group, puzzle.after)
    }
    this.finishWave(outcome)
    this.commit()
  }

  // ───────────────────────── L4: replay ─────────────────────────

  /** Player sets where to rewind the lane's offset cursor to. */
  setRewindTo(offset: number): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "predicting") return
    this.state.replayRewindTo = Math.max(0, offset)
    this.commit()
  }

  /** Player marks an offset as "will replay" (toggle). */
  toggleReplayOffset(offset: number): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "predicting") return
    const set = new Set(this.state.predictedReplay)
    if (set.has(offset)) set.delete(offset)
    else set.add(offset)
    this.state.predictedReplay = [...set].sort((a, b) => a - b)
    this.commit()
  }

  /** Resolve the replay with the player's predicted offsets. */
  resolveReplay(): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "predicting") return
    const puzzle = this.state.replayPuzzle
    if (!puzzle) return
    const outcome = evaluateReplay({
      predictedOffsets: this.state.predictedReplay,
      partition: puzzle.partition,
      rewindTo: this.state.replayRewindTo,
      puzzle,
    })
    if (outcome.pass) {
      // demonstrate the rewind on the live group cursor
      this.state.group = rewindOffset(this.state.group, puzzle.partition, this.state.replayRewindTo)
    }
    this.finishWave(outcome)
    this.commit()
  }

  // ───────────────────────── shared ─────────────────────────

  /** Truth helper for the smoke test: ground-truth partition for a key on the current level. */
  routeOfKey(key: string): number {
    return routeTruth(key, this.state.level.partitionCount)
  }

  crewIds(): string[] {
    return crewsFor(this.state.level.crewCount).map((c) => c.id)
  }

  laneTails(): number[] {
    const out: number[] = []
    for (let p = 0; p < this.state.level.partitionCount; p++)
      out.push(partitionTail(this.state.log, p))
    return out
  }

  currentAssignment(): Assignment {
    return this.state.group.assignment
  }

  private finishWave(outcome: WaveOutcome): void {
    this.state.lastMetrics = outcome.metrics
    this.state.phase = outcome.pass ? "cleared" : "failed"
    emitEvidence(this.state.level.id, outcome.pass, outcome.metrics)
  }
}

/** The set of consumer crews a level starts with (re-exported for the HUD legend). */
export function crewsOf(group: ConsumerGroup): readonly Consumer[] {
  return group.consumers
}

/** Messages on a partition lane (for scene + HUD). */
export function laneMessages(log: Log, partition: number): Message[] {
  const out: Message[] = []
  for (const m of log.messages) if (m.partition === partition) out.push(m)
  out.sort((a, b) => a.offset - b.offset)
  return out
}

export { assignPartitions, type Consumer }

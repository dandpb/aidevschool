import type { Job } from "./dag"

export type LevelId = "L1" | "L2" | "L3" | "L4"

export interface LevelConfig {
  id: LevelId
  title: string
  lesson: string
  /** deterministic seed for the election-timeout RNG */
  seed: number
  /** station ids placed on the constellation */
  stations: string[]
  /** the DAG for this level (empty for pure-election L1/L2) */
  jobs: Job[]
  /** whether the leader can be killed mid-wave (L2/L4) */
  killEnabled: boolean
  passRule: string
}

/** The 4-station cluster used by the election levels. */
const CLUSTER = ["alpha", "beta", "gamma", "delta"]

/** A 5-job, 3-layer diamond-ish DAG for the scheduling levels. */
const MISSION_DAG: Job[] = [
  { id: "deploy", deps: [] },
  { id: "migrate-db", deps: ["deploy"] },
  { id: "warm-cache", deps: ["deploy"] },
  { id: "smoke-test", deps: ["migrate-db", "warm-cache"] },
  { id: "announce", deps: ["smoke-test"] },
]

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "L1",
    title: "First election",
    lesson:
      "Each station draws a random election timeout; the lowest-timeout candidate wins a strict majority.",
    seed: 7,
    stations: [...CLUSTER],
    jobs: [],
    killEnabled: false,
    passRule: "Predict the station that wins the leader election.",
  },
  {
    id: "L2",
    title: "Kill the leader",
    lesson:
      "Kill the leader and a successor is elected at a strictly greater term among the survivors.",
    seed: 7,
    stations: [...CLUSTER],
    jobs: [],
    killEnabled: true,
    passRule: "Predict the leader, kill it, then predict the successor.",
  },
  {
    id: "L3",
    title: "DAG ordering",
    lesson: "Jobs have dependencies. Launch them in topological order — a blocked job cannot run.",
    seed: 7,
    stations: ["alpha", "beta"],
    jobs: MISSION_DAG.map((j) => ({ ...j })),
    killEnabled: false,
    passRule: "Launch every job in dependency order; none may be blocked.",
  },
  {
    id: "L4",
    title: "Recover mid-run",
    lesson:
      "Kill the leader mid-run; a new term elects a successor that resumes the DAG where it left off.",
    seed: 7,
    stations: [...CLUSTER],
    jobs: MISSION_DAG.map((j) => ({ ...j })),
    killEnabled: true,
    passRule: "Launch some jobs, survive a leader kill, finish the DAG.",
  },
] as const

export function levelConfig(id: LevelId): LevelConfig {
  const cfg = LEVELS.find((l) => l.id === id)
  if (!cfg) throw new Error(`unknown level ${id}`)
  return cfg
}

export interface LevelOutcome {
  pass: boolean
  metrics: Record<string, number | boolean | string>
}

/** L1: did the player predict the elected leader? */
export function evaluateLeaderPrediction(args: {
  predictedId: string
  actualId: string
  term: number
}): LevelOutcome {
  const ok = args.predictedId === args.actualId
  return {
    pass: ok,
    metrics: {
      leader_prediction_ok: ok,
      predicted_leader: args.predictedId,
      actual_leader: args.actualId,
      term: args.term,
    },
  }
}

/** L2: predict the leader, kill it, predict the successor at a strictly greater term. */
export function evaluateSuccession(args: {
  firstPredictedId: string
  firstActualId: string
  firstTerm: number
  successorPredictedId: string
  successorActualId: string
  successorTerm: number
}): LevelOutcome {
  const firstOk = args.firstPredictedId === args.firstActualId
  const successorOk = args.successorPredictedId === args.successorActualId
  const termIncreased = args.successorTerm > args.firstTerm
  const pass = firstOk && successorOk && termIncreased
  return {
    pass,
    metrics: {
      leader_prediction_ok: firstOk,
      successor_prediction_ok: successorOk,
      term_increased: termIncreased,
      first_term: args.firstTerm,
      successor_term: args.successorTerm,
      successor: args.successorActualId,
    },
  }
}

/**
 * L3: launch every job in dependency-valid order. `launchOrder` is the sequence the player clicked;
 * `topo` is the ground-truth topological order. The run passes iff every launched job was launchable
 * at the moment it was clicked AND the DAG is fully completed.
 */
export function evaluateDagRun(args: {
  jobs: readonly Job[]
  launchOrder: readonly string[]
}): LevelOutcome {
  const known = new Map(args.jobs.map((j) => [j.id, j]))
  const completed = new Set<string>()
  let blockedAttempts = 0
  let violations = 0
  for (const id of args.launchOrder) {
    const job = known.get(id)
    if (!job) continue
    const ready = job.deps.every((d) => completed.has(d))
    if (!ready) {
      violations++
      blockedAttempts++
      continue // a blocked click does not complete the job
    }
    completed.add(id)
  }
  const total = args.jobs.length
  const pass = violations === 0 && completed.size === total
  return {
    pass,
    metrics: {
      jobs_completed: completed.size,
      jobs_total: total,
      topo_valid: violations === 0,
      blocked_attempts: blockedAttempts,
    },
  }
}

/**
 * L4: same DAG discipline as L3, plus a leader-kill + succession must happen mid-run. The DAG
 * completes iff the final completed set covers every job (the kill did not lose progress — the
 * successor resumed from the completed set).
 */
export function evaluateRecovery(args: {
  jobs: readonly Job[]
  launchOrder: readonly string[]
  firstTerm: number
  successorTerm: number
  killedLeaderId: string | null
}): LevelOutcome {
  const dag = evaluateDagRun({ jobs: args.jobs, launchOrder: args.launchOrder })
  const termIncreased = args.successorTerm > args.firstTerm
  const recovered = args.killedLeaderId !== null && termIncreased
  return {
    pass: dag.pass && recovered,
    metrics: {
      ...dag.metrics,
      leader_killed: args.killedLeaderId !== null,
      killed_leader: args.killedLeaderId ?? "",
      first_term: args.firstTerm,
      successor_term: args.successorTerm,
      term_increased: termIncreased,
      resumed: recovered,
    },
  }
}

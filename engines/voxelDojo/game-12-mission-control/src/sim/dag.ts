/**
 * Deterministic DAG-ordered job scheduling (one concept: launch in topological order).
 *
 * Pure TypeScript, zero `three` imports. All rules are reproducible: same jobs + same completed
 * set ⇒ same launchability. The scene only renders this state.
 */

export interface Job {
  id: string
  /** ids of jobs that must be completed before this one can launch. */
  deps: string[]
}

/** Deps that reference jobs not present in the set — useful for diagnostics / levels. */
export function missingDeps(jobs: readonly Job[]): Map<string, string[]> {
  const known = new Set(jobs.map((j) => j.id))
  const missing = new Map<string, string[]>()
  for (const j of jobs) {
    const bad = j.deps.filter((d) => !known.has(d))
    if (bad.length > 0) missing.set(j.id, bad)
  }
  return missing
}

/** Detects a cycle via DFS coloring (white → grey → black). True if any back-edge exists. */
export function hasCycle(jobs: readonly Job[]): boolean {
  const adj = new Map<string, string[]>()
  for (const j of jobs) adj.set(j.id, [...j.deps])
  const color = new Map<string, 0 | 1 | 2>() // 0 white, 1 grey, 2 black
  for (const j of jobs) color.set(j.id, 0)

  const ids = [...adj.keys()]
  const dfs = (id: string): boolean => {
    const c = color.get(id)
    if (c === 1) return true // back-edge ⇒ cycle
    if (c === 2) return false
    color.set(id, 1)
    for (const d of adj.get(id) ?? []) {
      if (!color.has(d)) continue // unknown dep — flagged by missingDeps, not a cycle here
      if (dfs(d)) return true
    }
    color.set(id, 2)
    return false
  }
  for (const id of ids) if (color.get(id) === 0 && dfs(id)) return true
  return false
}

/**
 * Kahn's algorithm. Returns a valid topological launch order (deps before dependents) or throws
 * on a cycle / missing dependency. Ties between equally-ready jobs break by insertion order so
 * the order is deterministic for a given job list.
 */
export function topoOrder(jobs: readonly Job[]): string[] {
  const missing = missingDeps(jobs)
  if (missing.size > 0) {
    const detail = [...missing.entries()]
      .map(([id, deps]) => `${id}→[${deps.join(",")}]`)
      .join("; ")
    throw new Error(`DAG has missing dependencies: ${detail}`)
  }
  const adj = new Map<string, string[]>() // id → dependents
  const indeg = new Map<string, number>()
  for (const j of jobs) {
    adj.set(j.id, [])
    indeg.set(j.id, 0)
  }
  for (const j of jobs) {
    for (const d of j.deps) {
      adj.get(d)?.push(j.id)
      indeg.set(j.id, (indeg.get(j.id) ?? 0) + 1)
    }
  }
  // Ready queue = zero-indegree jobs, in insertion order for determinism.
  const queue: string[] = jobs.filter((j) => (indeg.get(j.id) ?? 0) === 0).map((j) => j.id)
  const order: string[] = []
  while (queue.length > 0) {
    const id = queue.shift() as string
    order.push(id)
    for (const dep of adj.get(id) ?? []) {
      indeg.set(dep, (indeg.get(dep) ?? 0) - 1)
      if ((indeg.get(dep) ?? 0) === 0) queue.push(dep)
    }
  }
  if (order.length !== jobs.length) {
    throw new Error("DAG has a cycle — no valid topological order exists")
  }
  return order
}

/**
 * Jobs whose deps are ALL in `completed` (and not already completed themselves). These are the
 * jobs safe to launch right now. Order follows the job list's insertion order.
 */
export function readyJobs(completed: ReadonlySet<string>, jobs: readonly Job[]): Job[] {
  return jobs.filter((j) => !completed.has(j.id) && j.deps.every((d) => completed.has(d)))
}

/** A job may launch iff every one of its deps is in `completed`. */
export function canLaunch(completed: ReadonlySet<string>, job: Job): boolean {
  return job.deps.every((d) => completed.has(d))
}

/** Layer index for each job (longest path from any root). Roots = layer 0. Used by the scene. */
export function layers(jobs: readonly Job[]): Map<string, number> {
  const layer = new Map<string, number>()
  const byId = new Map(jobs.map((j) => [j.id, j]))
  const depth = (id: string): number => {
    const cached = layer.get(id)
    if (cached !== undefined) return cached
    const job = byId.get(id)
    if (!job || job.deps.length === 0) {
      layer.set(id, 0)
      return 0
    }
    const d = 1 + Math.max(...job.deps.map(depth))
    layer.set(id, d)
    return d
  }
  for (const j of jobs) depth(j.id)
  return layer
}

/** True once every job id is in `completed` (the DAG has fully drained). */
export function allDone(completed: ReadonlySet<string>, jobs: readonly Job[]): boolean {
  return jobs.every((j) => completed.has(j.id))
}

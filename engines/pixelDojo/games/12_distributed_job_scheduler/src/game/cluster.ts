// Raft Ring — pure Raft + fencing-token state machine.
//
// Read-only with respect to the DOM/three.js: every operation is a pure
// function over a `Cluster` value. The scene renders snapshots of the cluster;
// the keyboard handler calls these functions; tests exercise them directly.
//
// Model (one concept, simplified-Raft leader election + fencing token):
//
//   - N=5 scheduler nodes in a ring. QUORUM=3 (majority).
//   - Each node has a `term` (monotonic per-node), a `role`
//     (follower | candidate | leader), and the `votedFor` of the current term.
//   - At most one **canonical leader** per term: the node that won majority
//     quorum. The cluster tracks `currentLeader` and a single monotonic
//     `currentToken` (the fencing token, +1 every new leadership term).
//   - Workers (3, on the outer ring) carry `lastSeenToken`. A worker accepts
//     an orb iff the orb's stamped token is *strictly greater* than
//     lastSeenToken; otherwise rejects with `stale_fencing_token`.
//   - A `Partition` severs node-to-node visibility between two groups. A
//     candidate wins only with votes from its visible side; if no side has
//     quorum, no leader can be elected.
//
// The pedagogical invariants enforced here (and asserted by the gate):
//   1. `stale_token_accepted === 0` — fencing never leaks.
//   2. `duplicate_dispatches === 0` — the same job is never accepted twice.
//   3. `non_leader_dispatch_attempts === 0` — only the canonical leader dispatches.

export const NODE_COUNT = 5
export const QUORUM = 3 // majority of 5
export const WORKER_COUNT = 3

export type NodeId = number // 0..NODE_COUNT-1
export type WorkerId = number // 0..WORKER_COUNT-1
export type NodeRole = "follower" | "candidate" | "leader"
export type Priority = "critical" | "high" | "normal" | "low"

export type Node = {
  readonly id: NodeId
  role: NodeRole
  term: number
  votedFor: NodeId | null
  // The fencing token this node *believes* is current for its leadership
  // term. Only meaningful when role === "leader"; the canonical cluster
  // token is `Cluster.currentToken`. A deposed leader may still believe it
  // holds `leaderToken` while the canonical cluster has moved past it — that
  // is exactly the split-brain scenario the worker fencing check catches.
  leaderToken: number
}

export type Worker = {
  readonly id: WorkerId
  lastSeenToken: number
}

export type Job = {
  readonly id: number
  readonly priority: Priority
  readonly createdAt: number
  // Dispatch ledger for this job. A job may be dispatched at most once by the
  // canonical leader; a stale-leader dispatch attempt counts toward
  // `stale_token_rejections` but does not overwrite the accepted ledger.
  dispatchedByLeader: NodeId | null
  dispatchedAtToken: number | null
  acceptedByWorker: WorkerId | null
  // True if a stale leader tried to dispatch this job and was fenced at the
  // worker (stale token rejection) — surfaces in the wave HUD.
  staleAttempted: boolean
}

export type Partition = {
  readonly a: readonly NodeId[]
  readonly b: readonly NodeId[]
}

export type Metrics = {
  jobs_queued: number
  successful_dispatches: number
  stale_token_rejections: number
  stale_token_accepted: number
  duplicate_dispatches: number
  elections_started: number
  elections_won_with_quorum: number
  quorum_failures: number
  terms_bumped: number
  max_term_reached: number
  partitions_injected: number
  queue_stall_secs: number
  leader_flip_flops: number
  non_leader_dispatch_attempts: number
}

export type Cluster = {
  readonly nodes: readonly Node[]
  readonly workers: readonly Worker[]
  readonly jobs: Job[]
  currentLeader: NodeId | null
  currentToken: number
  partition: Partition | null
  readonly metrics: Metrics
}

export type ElectionOutcome = {
  readonly candidate: NodeId
  readonly term: number
  readonly votesFor: number
  readonly votesNeeded: number
  readonly won: boolean
  readonly reason: string
}

export type DispatchOutcome = {
  readonly kind:
    | "DISPATCHED"
    | "ACCEPTED"
    | "STALE_REJECTED"
    | "STALE_ACCEPTED"
    | "DUPLICATE"
    | "NOT_LEADER"
    | "NO_QUORUM"
    | "QUEUE_EMPTY"
  readonly leader: NodeId | null
  readonly leaderTerm: number
  readonly leaderToken: number
  readonly worker: WorkerId | null
  readonly jobId: number | null
  readonly reason: string
}

// ---- Construction ----------------------------------------------------------

export function createCluster(jobs: readonly Job[]): Cluster {
  const nodes: Node[] = []
  for (let i = 0; i < NODE_COUNT; i += 1) {
    nodes.push({
      id: i,
      role: "follower",
      term: 0,
      votedFor: null,
      leaderToken: 0,
    })
  }
  const workers: Worker[] = []
  for (let i = 0; i < WORKER_COUNT; i += 1) {
    workers.push({ id: i, lastSeenToken: 0 })
  }
  return {
    nodes,
    workers,
    jobs: jobs.map((j) => ({ ...j })),
    currentLeader: null,
    currentToken: 0,
    partition: null,
    metrics: emptyMetrics(jobs.length),
  }
}

export function emptyMetrics(jobsQueued = 0): Metrics {
  return {
    jobs_queued: jobsQueued,
    successful_dispatches: 0,
    stale_token_rejections: 0,
    stale_token_accepted: 0,
    duplicate_dispatches: 0,
    elections_started: 0,
    elections_won_with_quorum: 0,
    quorum_failures: 0,
    terms_bumped: 0,
    max_term_reached: 0,
    partitions_injected: 0,
    queue_stall_secs: 0,
    leader_flip_flops: 0,
    non_leader_dispatch_attempts: 0,
  }
}

// ---- Partition visibility --------------------------------------------------

// Returns the set of node ids that are visible to `nodeId` (i.e. on the same
// side of the partition, or all peers when no partition is active). Includes
// the node itself — quorum is "votes from visible side including self".
export function visibleSide(nodeId: NodeId, partition: Partition | null): readonly NodeId[] {
  if (partition === null) {
    const all: NodeId[] = []
    for (let i = 0; i < NODE_COUNT; i += 1) all.push(i)
    return all
  }
  if (partition.a.includes(nodeId)) return partition.a
  if (partition.b.includes(nodeId)) return partition.b
  // Defensive: node not in either side (shouldn't happen) — treat as alone.
  return [nodeId]
}

export function sideHasQuorum(side: readonly NodeId[]): boolean {
  return side.length >= QUORUM
}

// ---- Election --------------------------------------------------------------

// Start an election at `candidateId`. The candidate bumps its term +1, votes
// for itself, and requests votes from visible peers. A peer grants its vote
// for the candidate iff:
//   - the candidate's term is >= the peer's term, AND
//   - the peer has not already voted for someone else this term
//     (Raft's safety rule).
//
// If votes (including self) reach QUORUM, the candidate becomes leader, the
// cluster's `currentToken` bumps to currentToken + 1 (monotonic per term),
// `currentLeader` updates, and any prior leader is recorded as a flip-flop.
//
// This function is pure with respect to the DOM and returns the outcome; it
// mutates `cluster` in place (the game owns a single mutable accumulator).
export function startElection(cluster: Cluster, candidateId: NodeId): ElectionOutcome {
  const candidate = cluster.nodes[candidateId]
  if (candidate === undefined) {
    return {
      candidate: candidateId,
      term: 0,
      votesFor: 0,
      votesNeeded: QUORUM,
      won: false,
      reason: "unknown node",
    }
  }
  const newTerm = candidate.term + 1
  candidate.term = newTerm
  candidate.role = "candidate"
  candidate.votedFor = candidateId
  cluster.metrics.elections_started += 1
  cluster.metrics.terms_bumped += 1
  if (newTerm > cluster.metrics.max_term_reached) {
    cluster.metrics.max_term_reached = newTerm
  }

  // The candidate votes for itself.
  let votesFor = 1
  const side = visibleSide(candidateId, cluster.partition)

  for (const peerId of side) {
    if (peerId === candidateId) continue
    const peer = cluster.nodes[peerId]
    if (peer === undefined) continue
    // Raft safety: peer grants vote if candidate's term >= peer's term AND
    // peer hasn't voted for someone else this term. (We model "votedFor
    // only valid for the peer's current term" — when terms bump, votedFor
    // resets.)
    if (newTerm > peer.term) {
      peer.term = newTerm // peer learns of the higher term, steps down
      peer.role = "follower"
      peer.votedFor = candidateId
      votesFor += 1
    } else if (newTerm === peer.term && peer.votedFor === null) {
      peer.votedFor = candidateId
      votesFor += 1
    }
    // If peer.term > newTerm, peer rejects (candidate's term is stale).
  }

  const won = votesFor >= QUORUM && sideHasQuorum(side)
  if (!won) {
    // Step back to follower — no quorum means no leadership.
    candidate.role = "follower"
    if (!sideHasQuorum(side)) {
      cluster.metrics.quorum_failures += 1
    }
    return {
      candidate: candidateId,
      term: newTerm,
      votesFor,
      votesNeeded: QUORUM,
      won: false,
      reason: sideHasQuorum(side)
        ? "lost vote (peers rejected)"
        : "minority side — no quorum",
    }
  }

  // Won. Promote.
  const priorLeader = cluster.currentLeader
  candidate.role = "leader"
  cluster.currentToken += 1
  candidate.leaderToken = cluster.currentToken
  cluster.currentLeader = candidateId
  cluster.metrics.elections_won_with_quorum += 1
  if (priorLeader !== null && priorLeader !== candidateId) {
    cluster.metrics.leader_flip_flops += 1
  }
  // Demote any prior leader node (it steps down on seeing the new term — we
  // already bumped its term in the loop above if it was on this side; if it
  // was on the other side of a partition it stays self-promoted, which is
  // exactly the split-brain we want workers to fence).
  if (priorLeader !== null && priorLeader !== candidateId) {
    const prior = cluster.nodes[priorLeader]
    if (prior !== undefined && prior.role === "leader" && prior.term < newTerm) {
      // Visible-side prior leader steps down. Partitioned prior leaders
      // remain "leader" of their minority view (their dispatches get fenced
      // at the workers).
      prior.role = "follower"
    }
  }
  return {
    candidate: candidateId,
    term: newTerm,
    votesFor,
    votesNeeded: QUORUM,
    won: true,
    reason: "won with quorum",
  }
}

// ---- Dispatch --------------------------------------------------------------

// Pick the next job from the queue (priority order: critical > high > normal >
// low; ties broken by createdAt then id). Returns null when no undispatched
// job remains.
export function nextJob(cluster: Cluster): Job | null {
  const pending = cluster.jobs.filter((j) => j.acceptedByWorker === null)
  if (pending.length === 0) return null
  pending.sort(compareJobs)
  return pending[0] ?? null
}

function compareJobs(a: Job, b: Job): number {
  const pa = priorityRank(a.priority)
  const pb = priorityRank(b.priority)
  if (pa !== pb) return pb - pa // higher rank first
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt
  return a.id - b.id
}

function priorityRank(p: Priority): number {
  switch (p) {
    case "critical":
      return 4
    case "high":
      return 3
    case "normal":
      return 2
    case "low":
      return 1
  }
}

// Dispatch the front job from the queue, stamped with the leader's token, to
// the next worker (round-robin by successful dispatch count to spread load).
//
// Outcomes:
//   - NOT_LEADER        — caller is not the canonical cluster leader.
//   - NO_QUORUM         — caller is leader of a minority partition side.
//   - QUEUE_EMPTY       — nothing left to dispatch.
//   - DUPLICATE         — the front job was already accepted; counts against
//                         the gate (two leaders accepted the same job).
//   - STALE_REJECTED    — the orb's token ≤ worker.lastSeenToken; safe fence.
//   - STALE_ACCEPTED    — fencing breach; the gate fails.
//   - ACCEPTED          — happy path; worker.lastSeenToken advances.
//
// `nonLeader` dispatch attempts (NOT_LEADER / NO_QUORUM) increment the
// `non_leader_dispatch_attempts` counter — the gate fails on any such
// attempt. The PASS path is therefore: dispatch only from the canonical
// leader with quorum, never from a stale leader, never twice.
export function dispatch(
  cluster: Cluster,
  callerId: NodeId,
  workerRoundRobin: { next: () => WorkerId },
): DispatchOutcome {
  const caller = cluster.nodes[callerId]
  if (caller === undefined) {
    cluster.metrics.non_leader_dispatch_attempts += 1
    return {
      kind: "NOT_LEADER",
      leader: cluster.currentLeader,
      leaderTerm: caller?.term ?? 0,
      leaderToken: 0,
      worker: null,
      jobId: null,
      reason: "unknown node",
    }
  }

  const canonical = cluster.currentLeader
  if (canonical !== callerId) {
    cluster.metrics.non_leader_dispatch_attempts += 1
    return {
      kind: "NOT_LEADER",
      leader: canonical,
      leaderTerm: caller.term,
      leaderToken: caller.leaderToken,
      worker: null,
      jobId: null,
      reason: "caller is not the canonical leader",
    }
  }

  // Canonical leader — but does it have visible quorum right now?
  const side = visibleSide(callerId, cluster.partition)
  if (!sideHasQuorum(side)) {
    cluster.metrics.non_leader_dispatch_attempts += 1
    return {
      kind: "NO_QUORUM",
      leader: callerId,
      leaderTerm: caller.term,
      leaderToken: caller.leaderToken,
      worker: null,
      jobId: null,
      reason: "leader's partition side lost quorum",
    }
  }

  const job = nextJob(cluster)
  if (job === null) {
    return {
      kind: "QUEUE_EMPTY",
      leader: callerId,
      leaderTerm: caller.term,
      leaderToken: caller.leaderToken,
      worker: null,
      jobId: null,
      reason: "no pending jobs",
    }
  }

  // The orb stamps the leader's CURRENT token at flight time. If a partition
  // separated an old leader (still self-promoted) from the new leader, the
  // old leader's `leaderToken` is stale by construction — but that path is
  // already blocked above by `canonical !== callerId`. The fencing-token
  // check below is the defense-in-depth: it triggers when a stale orb somehow
  // reaches a worker that has seen a higher token.
  const orbToken = caller.leaderToken
  const workerId = workerRoundRobin.next()
  const worker = cluster.workers[workerId]
  if (worker === undefined) {
    return {
      kind: "QUEUE_EMPTY",
      leader: callerId,
      leaderTerm: caller.term,
      leaderToken: orbToken,
      worker: null,
      jobId: job.id,
      reason: "no worker available",
    }
  }

  if (job.acceptedByWorker !== null) {
    // Two-leader dispatch of the same job made it past the canonical check —
    // this is a duplicate. The gate fails.
    cluster.metrics.duplicate_dispatches += 1
    return {
      kind: "DUPLICATE",
      leader: callerId,
      leaderTerm: caller.term,
      leaderToken: orbToken,
      worker: workerId,
      jobId: job.id,
      reason: "job already accepted by another leader",
    }
  }

  if (orbToken > worker.lastSeenToken) {
    // Happy path: fencing token strictly monotonic.
    worker.lastSeenToken = orbToken
    job.dispatchedByLeader = callerId
    job.dispatchedAtToken = orbToken
    job.acceptedByWorker = workerId
    cluster.metrics.successful_dispatches += 1
    return {
      kind: "ACCEPTED",
      leader: callerId,
      leaderTerm: caller.term,
      leaderToken: orbToken,
      worker: workerId,
      jobId: job.id,
      reason: "token strictly monotonic — accepted",
    }
  }

  // Stale token. The worker is the final enforcer — split-brain contained here.
  cluster.metrics.stale_token_rejections += 1
  job.staleAttempted = true
  // A buggy fence would accept here; we mark the leak. The Raft Ring never
  // takes this branch in practice (canonical check above already blocks the
  // stale-leader path), but keeping the counter makes the invariant explicit
  // and surfaces a regression in tests.
  if (orbToken <= worker.lastSeenToken) {
    // strict-less-than => reject. We never accept. If a code change ever
    // inverts this comparison, `stale_token_accepted` will flag it.
    return {
      kind: "STALE_REJECTED",
      leader: callerId,
      leaderTerm: caller.term,
      leaderToken: orbToken,
      worker: workerId,
      jobId: job.id,
      reason: `stale fencing token: orb=${orbToken} ≤ worker=${worker.lastSeenToken}`,
    }
  }
  // Unreachable — kept for exhaustiveness.
  cluster.metrics.stale_token_accepted += 1
  return {
    kind: "STALE_ACCEPTED",
    leader: callerId,
    leaderTerm: caller.term,
    leaderToken: orbToken,
    worker: workerId,
    jobId: job.id,
    reason: "FENCING BREACH",
  }
}

// Simulate a stale-leader dispatch from a deposed node that still believes it
// holds leadership (split-brain). Used to *demonstrate* the worker fence in
// free play; the canonical `dispatch()` blocks this path, but a partitioned
// old leader can still push an orb to a worker that has already advanced —
// the worker rejects it.
//
// This function exists to make the fencing-token check reachable from the
// game's "stale dispatch" input (S key, free-play only) and from a unit test.
export function staleLeaderDispatch(
  cluster: Cluster,
  staleLeaderId: NodeId,
  workerRoundRobin: { next: () => WorkerId },
): DispatchOutcome {
  const stale = cluster.nodes[staleLeaderId]
  if (stale === undefined) {
    return {
      kind: "NOT_LEADER",
      leader: cluster.currentLeader,
      leaderTerm: 0,
      leaderToken: 0,
      worker: null,
      jobId: null,
      reason: "unknown node",
    }
  }
  const job = nextJob(cluster)
  if (job === null) {
    return {
      kind: "QUEUE_EMPTY",
      leader: staleLeaderId,
      leaderTerm: stale.term,
      leaderToken: stale.leaderToken,
      worker: null,
      jobId: null,
      reason: "no pending jobs",
    }
  }
  const workerId = workerRoundRobin.next()
  const worker = cluster.workers[workerId]
  if (worker === undefined) {
    return {
      kind: "QUEUE_EMPTY",
      leader: staleLeaderId,
      leaderTerm: stale.term,
      leaderToken: stale.leaderToken,
      worker: null,
      jobId: job.id,
      reason: "no worker available",
    }
  }
  const orbToken = stale.leaderToken
  if (orbToken > worker.lastSeenToken) {
    // Worker hasn't seen the new leader's token yet — fence fails, accept.
    // (This is the dangerous case; tests cover it.)
    worker.lastSeenToken = orbToken
    job.dispatchedByLeader = staleLeaderId
    job.dispatchedAtToken = orbToken
    job.acceptedByWorker = workerId
    cluster.metrics.stale_token_accepted += 1
    return {
      kind: "STALE_ACCEPTED",
      leader: staleLeaderId,
      leaderTerm: stale.term,
      leaderToken: orbToken,
      worker: workerId,
      jobId: job.id,
      reason: "worker accepted stale token (fence failed)",
    }
  }
  cluster.metrics.stale_token_rejections += 1
  job.staleAttempted = true
  return {
    kind: "STALE_REJECTED",
    leader: staleLeaderId,
    leaderTerm: stale.term,
    leaderToken: orbToken,
    worker: workerId,
    jobId: job.id,
    reason: `stale fencing token rejected at worker: orb=${orbToken} ≤ worker=${worker.lastSeenToken}`,
  }
}

// ---- Partition control -----------------------------------------------------

export function injectPartition(cluster: Cluster, partition: Partition): void {
  cluster.partition = partition
  cluster.metrics.partitions_injected += 1
}

export function liftPartition(cluster: Cluster): void {
  cluster.partition = null
}

// Canonical 2|3 split of N=5 along the ring: {0,1} | {2,3,4}. Used by the
// wave script and the P key.
export function canonicalPartition(): Partition {
  return { a: [0, 1], b: [2, 3, 4] }
}

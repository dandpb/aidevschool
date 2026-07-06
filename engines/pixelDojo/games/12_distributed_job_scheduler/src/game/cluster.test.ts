import {
  type Cluster,
  type NodeId,
  type WorkerId,
  canonicalPartition,
  createCluster,
  dispatch,
  injectPartition,
  liftPartition,
  nextJob,
  QUORUM,
  staleLeaderDispatch,
  startElection,
  visibleSide,
} from "./cluster"
import { defaultWave, resetJobIds } from "./wave"

// Round-robin worker selector the dispatch loop uses. Stateless except for
// the next-index counter; tests build a fresh one per scenario.
function roundRobin(): { next: () => WorkerId } {
  let i = 0
  return {
    next: () => {
      const w: WorkerId = (i % 3) as WorkerId
      i += 1
      return w
    },
  }
}

function freshCluster(): Cluster {
  resetJobIds()
  return createCluster(defaultWave())
}

describe("Raft cluster — initial state", () => {
  test("starts with all followers at term 0 and no leader", () => {
    const c = freshCluster()
    expect(c.currentLeader).toBeNull()
    expect(c.currentToken).toBe(0)
    for (const n of c.nodes) {
      expect(n.role).toBe("follower")
      expect(n.term).toBe(0)
      expect(n.votedFor).toBeNull()
    }
    expect(c.jobs).toHaveLength(8)
    expect(c.workers).toHaveLength(3)
  })
})

describe("Raft cluster — startElection", () => {
  test("candidate bumps term, collects majority votes, wins leadership", () => {
    const c = freshCluster()
    const outcome = startElection(c, 0 as NodeId)
    expect(outcome.won).toBe(true)
    expect(outcome.term).toBe(1)
    expect(outcome.votesFor).toBeGreaterThanOrEqual(QUORUM)
    expect(c.currentLeader).toBe(0)
    expect(c.currentToken).toBe(1)
    expect(c.nodes[0]?.role).toBe("leader")
    expect(c.nodes[0]?.leaderToken).toBe(1)
    expect(c.metrics.elections_started).toBe(1)
    expect(c.metrics.elections_won_with_quorum).toBe(1)
    expect(c.metrics.terms_bumped).toBe(1)
    expect(c.metrics.max_term_reached).toBe(1)
  })

  test("peers step down to follower when they see a higher term", () => {
    const c = freshCluster()
    // Manually promote node 2 to candidate at term 0 to simulate a prior
    // self-promotion; an election from node 0 at term 1 should demote it.
    const n2 = c.nodes[2]
    if (n2 !== undefined) {
      n2.role = "candidate"
      n2.term = 0
      n2.votedFor = 2
    }
    startElection(c, 0 as NodeId)
    expect(c.nodes[2]?.role).toBe("follower")
    expect(c.nodes[2]?.term).toBe(1)
    expect(c.nodes[2]?.votedFor).toBe(0)
  })

  test("a second election at a new term flips leadership and bumps token", () => {
    const c = freshCluster()
    startElection(c, 0 as NodeId)
    expect(c.currentLeader).toBe(0)
    expect(c.currentToken).toBe(1)
    startElection(c, 2 as NodeId)
    expect(c.currentLeader).toBe(2)
    expect(c.currentToken).toBe(2)
    expect(c.nodes[2]?.leaderToken).toBe(2)
    expect(c.metrics.leader_flip_flops).toBe(1)
    // Prior leader (node 0) on the same visible side steps down.
    expect(c.nodes[0]?.role).toBe("follower")
  })
})

describe("Raft cluster — partition visibility & quorum", () => {
  test("no partition: every node sees all 5 peers", () => {
    const side = visibleSide(2 as NodeId, null)
    expect(side).toHaveLength(5)
  })

  test("canonical partition: 2|3 split, only majority side has quorum", () => {
    const p = canonicalPartition()
    expect(visibleSide(0 as NodeId, p)).toHaveLength(2)
    expect(visibleSide(2 as NodeId, p)).toHaveLength(3)
    const minority = visibleSide(0 as NodeId, p)
    const majority = visibleSide(2 as NodeId, p)
    expect(minority.length).toBeLessThan(QUORUM)
    expect(majority.length).toBeGreaterThanOrEqual(QUORUM)
  })

  test("election on minority side fails with no quorum", () => {
    const c = freshCluster()
    startElection(c, 0 as NodeId) // node 0 wins term 1
    injectPartition(c, canonicalPartition()) // {0,1} | {2,3,4}
    // Node 0 is on the minority side now — even if it bumps term, it can't
    // reach quorum from its side.
    const outcome = startElection(c, 1 as NodeId)
    expect(outcome.won).toBe(false)
    expect(outcome.reason).toContain("no quorum")
    expect(c.metrics.quorum_failures).toBeGreaterThanOrEqual(1)
    expect(c.currentLeader).toBe(0) // canonical leader unchanged
  })

  test("majority side can elect a new leader after partition", () => {
    const c = freshCluster()
    startElection(c, 0 as NodeId) // node 0 leader, token 1
    injectPartition(c, canonicalPartition())
    const outcome = startElection(c, 2 as NodeId) // majority side
    expect(outcome.won).toBe(true)
    expect(c.currentLeader).toBe(2)
    expect(c.currentToken).toBe(2) // token bumped on new leadership term
    expect(c.nodes[2]?.leaderToken).toBe(2)
    // Old leader node 0 is on the other side — it still thinks it's leader
    // (split-brain). The fence catches it.
    expect(c.nodes[0]?.role).toBe("leader")
    expect(c.nodes[0]?.leaderToken).toBe(1) // stale
  })

  test("lifting the partition re-heals the cluster", () => {
    const c = freshCluster()
    startElection(c, 0 as NodeId)
    injectPartition(c, canonicalPartition())
    expect(c.partition).not.toBeNull()
    liftPartition(c)
    expect(c.partition).toBeNull()
  })
})

describe("Raft cluster — dispatch", () => {
  test("dispatch requires the canonical leader", () => {
    const c = freshCluster()
    // No leader elected yet.
    const out = dispatch(c, 0 as NodeId, roundRobin())
    expect(out.kind).toBe("NOT_LEADER")
    expect(c.metrics.non_leader_dispatch_attempts).toBe(1)
  })

  test("canonical leader dispatch accepts the front priority job", () => {
    const c = freshCluster()
    startElection(c, 0 as NodeId)
    const out = dispatch(c, 0 as NodeId, roundRobin())
    expect(out.kind).toBe("ACCEPTED")
    expect(out.worker).toBe(0)
    // Front job is critical (id 1) — priority order enforced.
    expect(out.jobId).toBe(1)
    expect(out.leaderToken).toBe(1)
    expect(c.workers[0]?.lastSeenToken).toBe(1)
    expect(c.metrics.successful_dispatches).toBe(1)
  })

  test("dispatch from a non-leader node counts as a discipline violation", () => {
    const c = freshCluster()
    startElection(c, 0 as NodeId) // node 0 is leader
    const out = dispatch(c, 1 as NodeId, roundRobin()) // node 1 is follower
    expect(out.kind).toBe("NOT_LEADER")
    expect(c.metrics.non_leader_dispatch_attempts).toBe(1)
    expect(c.metrics.successful_dispatches).toBe(0)
  })

  test("dispatch from leader on minority side after partition is NO_QUORUM", () => {
    const c = freshCluster()
    startElection(c, 0 as NodeId)
    injectPartition(c, canonicalPartition()) // node 0 now in minority {0,1}
    const out = dispatch(c, 0 as NodeId, roundRobin())
    expect(out.kind).toBe("NO_QUORUM")
    expect(c.metrics.non_leader_dispatch_attempts).toBe(1)
    expect(c.metrics.successful_dispatches).toBe(0)
  })

  test("priority queue: critical dispatches before low", () => {
    const c = freshCluster()
    startElection(c, 0 as NodeId)
    const rr = roundRobin()
    const dispatchedIds: number[] = []
    for (let i = 0; i < 8; i += 1) {
      const out = dispatch(c, 0 as NodeId, rr)
      if (out.jobId !== null) dispatchedIds.push(out.jobId)
    }
    // Expected order: 1 (crit), 2 (high), 3 (high), 4,5,6 (normal), 7,8 (low).
    expect(dispatchedIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  test("all 8 jobs dispatched successfully — happy-path gate", () => {
    const c = freshCluster()
    startElection(c, 0 as NodeId)
    const rr = roundRobin()
    for (let i = 0; i < 8; i += 1) {
      const out = dispatch(c, 0 as NodeId, rr)
      expect(out.kind).toBe("ACCEPTED")
    }
    expect(c.metrics.successful_dispatches).toBe(8)
    expect(c.metrics.stale_token_accepted).toBe(0)
    expect(c.metrics.duplicate_dispatches).toBe(0)
    expect(c.metrics.non_leader_dispatch_attempts).toBe(0)
    expect(nextJob(c)).toBeNull()
  })
})

describe("Raft cluster — fencing token (split-brain defense)", () => {
  test("stale leader dispatch is fenced at the worker after a new leader won", () => {
    const c = freshCluster()
    startElection(c, 0 as NodeId) // node 0 leader, token 1
    // Workers see token 1 from a few dispatches.
    const rr1 = roundRobin()
    for (let i = 0; i < 3; i += 1) dispatch(c, 0 as NodeId, rr1)
    injectPartition(c, canonicalPartition()) // {0,1} | {2,3,4}
    startElection(c, 2 as NodeId) // node 2 new leader, token 2
    // Worker 0's lastSeenToken was bumped to 1 by the first three dispatches.
    // The stale leader (node 0) still has leaderToken 1. Its stale orb is
    // stamped with token 1 — the worker rejects.
    const rr2 = roundRobin()
    // Force the stale dispatch to land on worker 0 (lastSeenToken=1).
    const rrTargetingWorker0 = { next: () => 0 as WorkerId }
    const out = staleLeaderDispatch(c, 0 as NodeId, rrTargetingWorker0)
    expect(out.kind).toBe("STALE_REJECTED")
    expect(c.metrics.stale_token_rejections).toBe(1)
    expect(c.metrics.stale_token_accepted).toBe(0)
    // The job is not marked accepted.
    const probed = c.jobs.find((j) => j.id === out.jobId)
    expect(probed?.acceptedByWorker).toBeNull()
    expect(probed?.staleAttempted).toBe(true)
  })

  test("fencing token is strictly monotonic across terms at workers", () => {
    const c = freshCluster()
    startElection(c, 0 as NodeId) // token 1
    const rr1 = roundRobin()
    dispatch(c, 0 as NodeId, rr1) // worker 0 → 1
    startElection(c, 1 as NodeId) // token 2 (node 0 steps down on same side)
    dispatch(c, 1 as NodeId, rr1) // worker 1 → 2
    startElection(c, 2 as NodeId) // token 3
    dispatch(c, 2 as NodeId, rr1) // worker 2 → 3
    expect(c.workers[0]?.lastSeenToken).toBe(1)
    expect(c.workers[1]?.lastSeenToken).toBe(2)
    expect(c.workers[2]?.lastSeenToken).toBe(3)
    expect(c.currentToken).toBe(3)
  })
})

import { describe, expect, it } from "vitest"
import {
  ack,
  ackCount,
  ackOrder,
  acksNeeded,
  ackUntilQuorum,
  type Ballot,
  commit,
  isCommitted,
  isStale,
  type Node,
  notifyWatchers,
  partition,
  propose,
  quorumOf,
  syncNode,
  tryCommitInPartition,
  type Watcher,
} from "./consensus"
import { mulberry32 } from "./rng"

const N = (n: number): Node[] => Array.from({ length: n }, (_, i) => ({ id: `lh-${i}` }))
const watchers = (keys: Record<string, string[]>): Watcher[] =>
  Object.entries(keys).map(([nodeId, ks]) => ({ nodeId, keys: new Set(ks) }))

describe("quorum is what makes a value 'the truth' (majority commits)", () => {
  it("quorumOf = floor(n/2)+1 across even/odd cluster sizes", () => {
    expect(quorumOf(3)).toBe(2) // 2 of 3
    expect(quorumOf(5)).toBe(3) // 3 of 5
    expect(quorumOf(7)).toBe(4) // 4 of 7
    expect(quorumOf(4)).toBe(3) // 3 of 4 — strict majority, NOT a tie-able half
    expect(quorumOf(6)).toBe(4) // 4 of 6 — strict majority
    expect(quorumOf(1)).toBe(1) // solo
  })

  it("a proposal is NOT committed until > n/2 have acked; one fewer ack stays uncommitted", () => {
    const nodes = N(5) // quorum = 3
    let b = propose(nodes, "heading", "045")
    expect(isCommitted(b)).toBe(false) // 0 acks
    b = ack(b, "lh-0")
    b = ack(b, "lh-1")
    expect(ackCount(b)).toBe(2)
    expect(isCommitted(b)).toBe(false) // 2 acks, need 3
    expect(acksNeeded(b)).toBe(1)
    // acking a 3rd reaches quorum → committed → materialise the Commit (the truth)
    b = ack(b, "lh-2")
    expect(isCommitted(b)).toBe(true)
    const c = commit(b)
    expect(c.value).toBe("045")
    expect(c.quorum).toBe(3)
    expect(c.acks).toHaveLength(3)
  })

  it("acking the same node twice is idempotent — it counts once", () => {
    const b = ack(ack(ack(propose(N(3), "k", "v"), "lh-0"), "lh-0"), "lh-0")
    expect(ackCount(b)).toBe(1)
  })
})

describe("minority partition cannot commit (split-brain prevented)", () => {
  it("the majority side can commit; the minority side cannot", () => {
    const nodes = N(5) // quorum = 3
    const p = partition(nodes, ["lh-0", "lh-1"]) // only 2 nodes on this side
    expect(p.side).toHaveLength(2)
    expect(p.other).toHaveLength(3)
    // minority side (2) ≤ totalN/2 (2.5) → cannot commit
    expect(tryCommitInPartition(p.side, p.totalN)).toBe(false)
    // majority side (3) > totalN/2 → can commit
    expect(tryCommitInPartition(p.other, p.totalN)).toBe(true)
  })

  it("two opposite minority sides can never BOTH commit — no split-brain", () => {
    const nodes = N(4) // quorum = 3
    const sideA = partition(nodes, ["lh-0", "lh-1"]).side // 2 nodes
    const sideB = partition(nodes, ["lh-2", "lh-3"]).side // 2 nodes
    // neither minority (2) exceeds totalN/2 (2) → strict > needed → both false
    expect(tryCommitInPartition(sideA, nodes.length)).toBe(false)
    expect(tryCommitInPartition(sideB, nodes.length)).toBe(false)
    // therefore two disjoint minorities can NEVER both commit a conflicting value
  })

  it("an even 3-vs-3 split on a 6-node cluster lets NEITHER side commit (quorum=4)", () => {
    const nodes = N(6) // quorum = 4
    const p = partition(nodes, ["lh-0", "lh-1", "lh-2"]) // 3 vs 3
    expect(tryCommitInPartition(p.side, nodes.length)).toBe(false)
    expect(tryCommitInPartition(p.other, nodes.length)).toBe(false)
    // nobody can commit until the partition heals — exactly the safety property
  })
})

describe("watchers fire ONLY on commit, not on proposal", () => {
  it("a proposed-but-uncommitted value notifies no one", () => {
    const nodes = N(5)
    const b = propose(nodes, "heading", "045")
    expect(isCommitted(b)).toBe(false)
    // simulate the player trying to notify early — there is no Commit to notify with
    expect(() => commit(b)).toThrow()
  })

  it("on commit, exactly the watchers subscribed to THAT key light up", () => {
    const nodes = N(5)
    const ws = watchers({
      "lh-4": ["heading"],
      "lh-3": ["heading", "colour"],
      "lh-2": ["colour"], // not subscribed to heading → must NOT fire
    })
    const b = ackUntilQuorum(
      propose(nodes, "heading", "045"),
      ackOrder(nodes, mulberry32(7)),
    ).ballot
    const c = commit(b as Ballot)
    expect(isCommitted(b as Ballot)).toBe(true)
    const lit = notifyWatchers(c, ws).sort()
    expect(lit).toEqual(["lh-3", "lh-4"])
  })

  it("a watcher subscribed to a different key does not light up on this commit", () => {
    const c: { key: string; value: string; n: number; quorum: number; acks: string[] } = {
      key: "heading",
      value: "045",
      n: 3,
      quorum: 2,
      acks: ["lh-0", "lh-1"],
    }
    const ws = watchers({ "lh-2": ["colour"], "lh-1": ["heading"] })
    expect(notifyWatchers(c, ws)).toEqual(["lh-1"])
  })
})

describe("deterministic ack ordering (same seed ⇒ same beam-sweep sequence)", () => {
  it("two runs with the same seed ack in the same order", () => {
    const nodes = N(5)
    const a = ackOrder(nodes, mulberry32(99))
    const b = ackOrder(nodes, mulberry32(99))
    expect(a).toEqual(b)
  })

  it("different seeds generally produce different orders", () => {
    const nodes = N(5)
    const a = ackOrder(nodes, mulberry32(1))
    const b = ackOrder(nodes, mulberry32(2))
    expect(a).not.toEqual(b)
  })

  it("ackUntilQuorum stops the instant quorum is reached (the commit flash)", () => {
    const nodes = N(5) // quorum = 3
    const order = ackOrder(nodes, mulberry32(7))
    const { ballot, commit: c } = ackUntilQuorum(propose(nodes, "heading", "045"), order)
    expect(c).not.toBeNull()
    expect((c as { acks: readonly string[] }).acks).toHaveLength(3) // exactly quorum, no more
    expect(isCommitted(ballot)).toBe(true)
  })
})

describe("stale nodes & re-merge catch-up", () => {
  it("a node that never saw the new value is stale; after sync it is not", () => {
    const nodes = N(5)
    const order = ackOrder(nodes, mulberry32(7))
    const c = commit(ackUntilQuorum(propose(nodes, "h", "NORTH"), order).ballot)
    // lh-4 was not in the acking majority → still holds nothing
    let stale: { id: string; value: string | null } = { id: "lh-4", value: null }
    expect(isStale(stale, c.value)).toBe(true)
    stale = syncNode(stale, c)
    expect(isStale(stale, c.value)).toBe(false)
    // a node holding an OLD value is also stale
    const oldHolder = syncNode({ id: "lh-3", value: null }, { ...c, value: "OLD" })
    expect(isStale(oldHolder, c.value)).toBe(true)
  })
})

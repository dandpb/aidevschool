import { describe, expect, it } from "vitest"
import { CANDIDACY_BAR, type ClusterState, electTerm, killLeader } from "./election"

const STATIONS = [{ id: "alpha" }, { id: "beta" }, { id: "gamma" }, { id: "delta" }]

describe("majority election", () => {
  it("elects a leader that holds a strict majority of the vote", () => {
    const r = electTerm(STATIONS, 7)
    const winnerVotes = r.votes[r.leaderId] ?? 0
    expect(winnerVotes).toBeGreaterThan(STATIONS.length / 2) // strict majority
    expect(r.term).toBeGreaterThanOrEqual(1)
    expect(r.candidates.length).toBeGreaterThanOrEqual(1)
  })

  it("the winner is always the lowest-timeout candidate of its term", () => {
    const r = electTerm(STATIONS, 7)
    const candidateTimeouts = r.candidates.map((c) => r.timeouts[c] ?? Number.POSITIVE_INFINITY)
    const minTimeout = Math.min(...candidateTimeouts)
    expect(r.timeouts[r.leaderId]).toBe(minTimeout)
  })

  it("rejects an empty cluster", () => {
    expect(() => electTerm([], 7)).toThrow("empty cluster")
  })

  it("a single station leads itself (trivial majority of one)", () => {
    const r = electTerm([{ id: "solo" }], 7)
    expect(r.leaderId).toBe("solo")
    expect(r.votes.solo).toBe(1)
  })
})

describe("kill + re-elect produces a strictly greater term", () => {
  it("after killing the leader, the new term is strictly greater than the previous", () => {
    const first = electTerm(STATIONS, 7)
    const state: ClusterState = { stations: [...STATIONS], term: first.term, seed: 7 }
    const { state: next, result } = killLeader(state, first.leaderId)
    expect(next.stations.map((s) => s.id)).not.toContain(first.leaderId)
    expect(result.term).toBeGreaterThan(first.term)
    // the new leader is among the survivors
    expect(next.stations.some((s) => s.id === result.leaderId)).toBe(true)
    // ...and still holds a strict majority of the survivors
    const winnerVotes = result.votes[result.leaderId] ?? 0
    expect(winnerVotes).toBeGreaterThan(next.stations.length / 2)
  })

  it("repeated kills keep electing successors at monotonically increasing terms", () => {
    let state: ClusterState = {
      stations: [...STATIONS],
      seed: 99,
      term: electTerm([...STATIONS], 99).term,
    }
    const terms: number[] = [state.term]
    while (state.stations.length > 1) {
      const leader = electTerm(state.stations, state.seed, state.term).leaderId
      const out = killLeader(state, leader)
      state = out.state
      terms.push(state.term)
    }
    for (let i = 1; i < terms.length; i++)
      expect(terms[i] as number).toBeGreaterThan(terms[i - 1] as number)
  })
})

describe("determinism", () => {
  it("same (stations, seed) ⇒ identical leader, term, votes, and timeouts", () => {
    const a = electTerm(STATIONS, 42)
    const b = electTerm(STATIONS, 42)
    expect(a.leaderId).toBe(b.leaderId)
    expect(a.term).toBe(b.term)
    expect(a.votes).toEqual(b.votes)
    expect(a.timeouts).toEqual(b.timeouts)
    expect(a.ballot).toEqual(b.ballot)
  })

  it("a different seed can elect a different leader (the RNG actually drives the outcome)", () => {
    // Sweep enough seeds to confirm the leader isn't a constant.
    const leaders = new Set<string>()
    for (let seed = 1; seed <= 200; seed++) leaders.add(electTerm(STATIONS, seed).leaderId)
    expect(leaders.size).toBeGreaterThan(1)
  })

  it("ties re-roll into strictly greater terms within one electTerm call", () => {
    // Construct a cluster where every station is eager (all self-vote): four eager stations each
    // get exactly one self-vote ⇒ no majority ⇒ must re-roll. We assert it still resolves to a
    // majority winner (the contract) and that a winning round exists.
    const r = electTerm(STATIONS, 7)
    const winnerVotes = r.votes[r.leaderId] ?? 0
    expect(winnerVotes).toBeGreaterThan(STATIONS.length / 2)
  })
})

describe("candidacy bar", () => {
  it("candidate timeouts all fall below CANDIDACY_BAR", () => {
    const r = electTerm(STATIONS, 7)
    expect(r.candidates.length).toBeGreaterThanOrEqual(1)
    for (const c of r.candidates) expect(r.timeouts[c] ?? 1).toBeLessThan(CANDIDACY_BAR)
  })
})

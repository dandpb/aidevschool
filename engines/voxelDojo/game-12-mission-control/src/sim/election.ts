import { mulberry32, termSeed } from "./rng"

/** A station in the cluster. The id is the only identity the election cares about. */
export interface Station {
  id: string
}

/**
 * Simplified Raft election model (one concept: majority vote per term).
 *
 * - Each station draws a randomized **election timeout** in [0, 1) from a seeded RNG.
 * - Eager stations (timeout < CANDIDACY_BAR) become **candidates**; if none are eager the
 *   single lowest-timeout station steps up (someone has to drive the term).
 * - Each candidate votes for itself; every non-candidate votes for the candidate whose timeout
 *   fired first (the lowest-timeout candidate).
 * - A candidate **wins** only with a strict majority (> n/2). If no candidate reaches majority
 *   (a split vote — too many eager stations each self-voting) the term increments and a fresh
 *   RNG draw re-runs the election. Terms are therefore strictly monotonic.
 *
 * This is deliberately smaller than real Raft (no log replication, no partitions) — it isolates
 * the ONE concept this game teaches: a leader is a majority winner of a numbered term.
 */

/** Fraction of [0,1) below which a station becomes a candidate (≈ "timed out first"). */
export const CANDIDACY_BAR = 0.5
/** Cap on split-vote re-rolls so the election always terminates deterministically. */
const MAX_ROUNDS = 64

export interface ElectionResult {
  leaderId: string
  term: number
  /** candidateId → votes received (the tally "majority" is computed from). */
  votes: Record<string, number>
  /** voterStationId → candidateId it voted for (the scene draws vote pulses along these). */
  ballot: Record<string, string>
  /** stationId → election timeout in [0, 1). */
  timeouts: Record<string, number>
  /** candidate station ids for this term. */
  candidates: string[]
  /** split-vote re-rolls it took to reach a majority; 0 = won on the first draw. */
  rounds: number
}

/** Mutable cluster state passed between elections (the controller owns one of these). */
export interface ClusterState {
  stations: Station[]
  term: number
  seed: number
}

function majorityOf(n: number): number {
  // strict majority: smallest integer strictly greater than n/2
  return Math.floor(n / 2) + 1
}

/**
 * Run an election for `stations` starting at `startTerm`. Re-rolls on split votes until a
 * candidate wins a strict majority. Returns the winning term, leader, and full vote breakdown.
 * Pure & deterministic: same (stations, seed, startTerm) ⇒ same result.
 */
export function electTerm(
  stations: readonly Station[],
  seed: number,
  startTerm = 1,
): ElectionResult {
  if (stations.length === 0) throw new Error("cannot elect an empty cluster")
  // A single station leads itself by default (the trivial majority of one).
  if (stations.length === 1) {
    const only = stations[0]
    if (!only) throw new Error("invalid station")
    return {
      leaderId: only.id,
      term: startTerm,
      votes: { [only.id]: 1 },
      ballot: { [only.id]: only.id },
      timeouts: { [only.id]: 0 },
      candidates: [only.id],
      rounds: 0,
    }
  }

  const need = majorityOf(stations.length)
  let term = startTerm
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const rng = mulberry32(termSeed(seed, term))
    const timeouts: Record<string, number> = {}
    let candidates: string[] = []
    for (const s of stations) {
      const t = rng()
      timeouts[s.id] = t
      if (t < CANDIDACY_BAR) candidates.push(s.id)
    }
    // Nobody eager → the lowest-timeout station drives the term on its own.
    if (candidates.length === 0) {
      candidates = [lowestTimeout(stations, timeouts)]
    }
    const candidateSet = new Set(candidates)
    const pick = lowestTimeoutId(candidates, timeouts)

    // Tally: candidates self-vote; everyone else votes for the first-firing candidate.
    const ballot: Record<string, string> = {}
    const votes: Record<string, number> = {}
    for (const c of candidates) votes[c] = 0
    for (const s of stations) {
      const choice = candidateSet.has(s.id) ? s.id : pick
      ballot[s.id] = choice
      votes[choice] = (votes[choice] ?? 0) + 1
    }

    const top = maxTally(votes)
    // Win: exactly one top candidate AND it cleared the strict-majority bar.
    if (top.ids.length === 1 && top.max >= need) {
      return {
        leaderId: top.ids[0] as string,
        term,
        votes,
        ballot,
        timeouts,
        candidates,
        rounds: round,
      }
    }
    // Split vote (tie at the top, or no majority) → next term, fresh RNG draw.
    term++
  }
  // Deterministic fallback after MAX_ROUNDS: the lowest-timeout candidate of the final term leads.
  const rng = mulberry32(termSeed(seed, term))
  const timeouts: Record<string, number> = {}
  for (const s of stations) timeouts[s.id] = rng()
  const leader = lowestTimeout(stations, timeouts)
  return {
    leaderId: leader,
    term,
    votes: { [leader]: stations.length },
    ballot: Object.fromEntries(stations.map((s) => [s.id, leader])),
    timeouts,
    candidates: [leader],
    rounds: MAX_ROUNDS,
  }
}

/**
 * Kill `killedId`, drop it from the cluster, and re-run the election among the survivors at a
 * strictly greater term. Returns the updated cluster state and the new leader's election result.
 */
export function killLeader(
  state: ClusterState,
  killedId: string,
): { state: ClusterState; result: ElectionResult } {
  const survivors = state.stations.filter((s) => s.id !== killedId)
  const next: ClusterState = { ...state, stations: survivors, term: state.term + 1 }
  const result = electTerm(survivors, state.seed, next.term)
  // electTerm may have re-rolled past next.term on a split; reflect the true winning term.
  next.term = result.term
  return { state: next, result }
}

function lowestTimeout(stations: readonly Station[], timeouts: Record<string, number>): string {
  let best = stations[0]?.id ?? ""
  let bestT = Number.POSITIVE_INFINITY
  for (const s of stations) {
    const t = timeouts[s.id] ?? 0
    if (t < bestT) {
      bestT = t
      best = s.id
    }
  }
  return best
}

function lowestTimeoutId(ids: readonly string[], timeouts: Record<string, number>): string {
  let best = ids[0] ?? ""
  let bestT = Number.POSITIVE_INFINITY
  for (const id of ids) {
    const t = timeouts[id] ?? 0
    if (t < bestT) {
      bestT = t
      best = id
    }
  }
  return best
}

function maxTally(votes: Record<string, number>): { ids: string[]; max: number } {
  let max = 0
  for (const v of Object.values(votes)) if (v > max) max = v
  const ids = Object.keys(votes).filter((k) => votes[k] === max)
  return { ids, max }
}

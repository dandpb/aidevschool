// Wave definition — a deterministic queue of jobs the canonical leader must
// dispatch. The smoke wave is 8 jobs with mixed priority so the player sees
// the priority queue at work. The wave is fixed; the gate is whether the
// cluster dispatches them all without a fencing breach.

import type { Job, Priority } from "./cluster"

let nextJobId = 1

function makeJob(priority: Priority, createdAt: number): Job {
  const id = nextJobId
  nextJobId += 1
  return {
    id,
    priority,
    createdAt,
    dispatchedByLeader: null,
    dispatchedAtToken: null,
    acceptedByWorker: null,
    staleAttempted: false,
  }
}

// Reset the auto-incrementing job id counter — only tests call this so the
// deterministic wave is reproducible across runs in the same process.
export function resetJobIds(): void {
  nextJobId = 1
}

// Default smoke wave — 8 jobs in mixed priority order. The canonical
// dispatch order (priority-rank, ties by createdAt) for this wave is:
//   1. critical (id 1)
//   2. high     (id 2)
//   3. high     (id 3)
//   4. normal   (id 4)
//   5. normal   (id 5)
//   6. normal   (id 6)
//   7. low      (id 7)
//   8. low      (id 8)
//
// The wave is sized so the player dispatches 4 from the initial leader
// (term 1), the partition fires, a new leader is elected on the majority
// side (term 2), and the remaining 4 are dispatched from the new leader.
export function defaultWave(): readonly Job[] {
  resetJobIds()
  return [
    makeJob("critical", 1000),
    makeJob("high", 1100),
    makeJob("high", 1200),
    makeJob("normal", 1300),
    makeJob("normal", 1400),
    makeJob("normal", 1500),
    makeJob("low", 1600),
    makeJob("low", 1700),
  ]
}

import { describe, expect, it } from "vitest"
import {
  backpressure,
  dispatch,
  fail,
  isDuplicate,
  isEligible,
  makePool,
  pickNext,
  runningCount,
  type Task,
} from "./queue"
import { mulberry32 } from "./rng"

function task(partial: Partial<Task> & { id: string }): Task {
  return {
    idempotencyKey: partial.id,
    priority: 1,
    enqueuedAt: 0,
    scheduledFor: 0,
    kind: "clear",
    retries: 0,
    maxRetries: 2,
    ...partial,
  }
}

describe("pickNext — bounded priority queue (RF-007)", () => {
  it("picks the highest priority; FIFO breaks ties; id breaks final ties", () => {
    const low = task({ id: "a", priority: 1, enqueuedAt: 0 })
    const high = task({ id: "b", priority: 5, enqueuedAt: 40 })
    const sameHighOlder = task({ id: "c", priority: 5, enqueuedAt: 10 })
    const sameHighSameAge = task({ id: "d", priority: 5, enqueuedAt: 10 })
    expect(pickNext([low, high, sameHighOlder, sameHighSameAge], 100)?.id).toBe("c")
    // tie between c and d resolved deterministically by id
    expect(pickNext([sameHighSameAge, sameHighOlder], 100)?.id).toBe("c")
    expect(pickNext([low], 100)?.id).toBe("a")
    expect(pickNext([], 100)).toBeNull()
  })

  it("gates on scheduled_for (RF-008): not grabbable until the countdown drains", () => {
    const scheduled = task({ id: "s", priority: 9, scheduledFor: 5 })
    const humble = task({ id: "h", priority: 1, scheduledFor: 0 })
    expect(pickNext([scheduled, humble], 4)?.id).toBe("h")
    expect(pickNext([scheduled, humble], 5)?.id).toBe("s")
    expect(isEligible(scheduled, 4)).toBe(false)
    expect(isEligible(scheduled, 5)).toBe(true)
  })

  it("is a total order: same queue + same clock ⇒ same pick (determinism invariant)", () => {
    const queue = [
      task({ id: "x1", priority: 2, enqueuedAt: 3 }),
      task({ id: "x2", priority: 2, enqueuedAt: 1 }),
      task({ id: "x3", priority: 3, enqueuedAt: 9, scheduledFor: 4 }),
    ]
    for (let now = 0; now < 12; now++) {
      const a = pickNext(queue, now)
      const b = pickNext([...queue].reverse(), now)
      expect(a?.id).toBe(b?.id)
    }
  })
})

describe("dispatch — worker pool (RF-005)", () => {
  it("never exceeds worker_count on any tick sequence", () => {
    let pool = makePool(3)
    const tasks = Array.from({ length: 10 }, (_, i) => task({ id: `t${i}` }))
    for (const t of tasks) {
      const next = pickNext([t], 0)
      if (!next) continue
      const res = dispatch(pool, next, 0)
      pool = res.pool
      expect(runningCount(pool)).toBeLessThanOrEqual(pool.workerCount)
    }
    expect(runningCount(pool)).toBe(3)
  })

  it("refuses the (worker_count + 1)-th dispatch", () => {
    let pool = makePool(2)
    for (const id of ["a", "b"]) {
      const res = dispatch(pool, task({ id }), 0)
      expect(res.ok).toBe(true)
      pool = res.pool
    }
    const refused = dispatch(pool, task({ id: "c" }), 0)
    expect(refused.ok).toBe(false)
    expect(runningCount(refused.pool)).toBe(2)
  })

  it("refuses dispatch of a task whose scheduled_for has not drained", () => {
    const res = dispatch(makePool(4), task({ id: "late", scheduledFor: 9 }), 1)
    expect(res.ok).toBe(false)
  })
})

describe("fail — retry/backoff, poison, exhaustion (RF-009 / RF-010)", () => {
  it("transient cracks retry with base * 2^retries + jitter and monotonic next_attempt_at", () => {
    const rng = mulberry32(7)
    const t0 = task({ id: "r", kind: "transient", retries: 0, maxRetries: 3 })
    const p1 = fail(t0, rng, 10)
    expect(p1.action).toBe("retry")
    expect(p1.retries).toBe(1)
    expect(p1.nextAttemptAt).toBeGreaterThanOrEqual(12) // 10 + 2*2^0 + 0..1

    const t1 = { ...t0, retries: p1.retries }
    const p2 = fail(t1, rng, 20)
    expect(p2.action).toBe("retry")
    expect(p2.nextAttemptAt).toBeGreaterThanOrEqual(24) // 20 + 2*2^1 + 0..1
    expect(p2.nextAttemptAt).toBeGreaterThan(p1.nextAttemptAt)

    const t2 = { ...t0, retries: p2.retries }
    const p3 = fail(t2, rng, 100)
    expect(p3.action).toBe("retry")
    expect(p3.nextAttemptAt).toBeGreaterThanOrEqual(108) // 100 + 2*2^2 + 0..1
  })

  it("same seed ⇒ same backoff schedule (determinism)", () => {
    const t = task({ id: "r", kind: "transient", retries: 1, maxRetries: 3 })
    const a = fail(t, mulberry32(42), 50)
    const b = fail(t, mulberry32(42), 50)
    expect(a).toEqual(b)
  })

  it("poison bypasses the annealing rack (straight DLQ, no retry)", () => {
    const plan = fail(
      task({ id: "p", kind: "poison", retries: 0, maxRetries: 5 }),
      mulberry32(1),
      10,
    )
    expect(plan.action).toBe("dlq")
  })

  it("exhausted retries (retries + 1 > max_retries) hit the DLQ", () => {
    const plan = fail(
      task({ id: "e", kind: "transient", retries: 2, maxRetries: 2 }),
      mulberry32(1),
      10,
    )
    expect(plan.action).toBe("dlq")
  })

  it("clear tasks never reach fail() routing in the controller sense — retry budget only applies to cracks", () => {
    // guard the contract: a fresh transient under budget always retries
    const plan = fail(
      task({ id: "fresh", kind: "transient", retries: 0, maxRetries: 2 }),
      mulberry32(3),
      0,
    )
    expect(plan.action).toBe("retry")
  })
})

describe("dedup — idempotency keys (RF-003)", () => {
  it("rejects an active duplicate key and admits a fresh one", () => {
    const active = new Set(["sigil-1"])
    expect(isDuplicate(active, task({ id: "d", idempotencyKey: "sigil-1" }))).toBe(true)
    expect(isDuplicate(active, task({ id: "n", idempotencyKey: "sigil-2" }))).toBe(false)
  })
})

describe("backpressure — bounded hopper (RNF-003 / RF-013)", () => {
  it("reports full at capacity: the next forklift must be rejected (429)", () => {
    expect(backpressure(0, 4)).toBe("open")
    expect(backpressure(3, 4)).toBe("limited")
    expect(backpressure(4, 4)).toBe("full")
    expect(backpressure(5, 4)).toBe("full")
  })
})

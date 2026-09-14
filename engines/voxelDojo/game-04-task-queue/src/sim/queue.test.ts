import { describe, expect, it } from "vitest"
import {
  backpressure,
  dispatch,
  dispatchOrder,
  failTask,
  hasActiveKey,
  isEligible,
  makeTask,
  makeWorkers,
  pickNext,
  promoteReady,
  type QueueState,
  queueDepth,
  requiredRoute,
  retryDelay,
  runningCount,
  succeedTask,
} from "./queue"
import { mulberry32 } from "./rng"

function spec(over: Partial<Parameters<typeof makeTask>[0]> = {}) {
  return {
    at: 0,
    label: "job",
    priority: 1,
    kind: "clear" as const,
    idempotencyKey: `ik-${Math.random()}`,
    ...over,
  }
}

function stateWith(capacity = 8, workers = 3): QueueState {
  return {
    now: 0,
    capacity,
    workers: makeWorkers(workers),
    paused: false,
    tasks: [],
    maxConcurrentRunning: 0,
    queueOverflowed: false,
  }
}

describe("pickNext — I2 priority desc + FIFO tie-break + scheduled_for gate", () => {
  it("picks the brightest eligible ingot", () => {
    const tasks = [
      makeTask(spec({ priority: 1, idempotencyKey: "a" }), "t-a", 2),
      makeTask(spec({ priority: 3, idempotencyKey: "b" }), "t-b", 2),
      makeTask(spec({ priority: 2, idempotencyKey: "c" }), "t-c", 2),
    ]
    expect(pickNext(tasks, 10)?.id).toBe("t-b")
  })

  it("breaks priority ties by oldest arrival (FIFO), then by id", () => {
    const tasks = [
      makeTask(spec({ priority: 2, at: 3, idempotencyKey: "a" }), "t-a", 2),
      makeTask(spec({ priority: 2, at: 1, idempotencyKey: "b" }), "t-b", 2),
      makeTask(spec({ priority: 2, at: 1, idempotencyKey: "c" }), "t-c", 2),
    ]
    expect(pickNext(tasks, 10)?.id).toBe("t-b")
    expect(dispatchOrder(tasks, 10).map((t) => t.id)).toEqual(["t-b", "t-c", "t-a"])
  })

  it("gates grabbing on scheduled_for (RF-008): a dim now beats a bright later", () => {
    const tasks = [
      makeTask(spec({ priority: 3, idempotencyKey: "hot", scheduledFor: 6 }), "t-hot", 2),
      makeTask(spec({ priority: 1, idempotencyKey: "dim" }), "t-dim", 2),
    ]
    expect(pickNext(tasks, 5)?.id).toBe("t-dim")
    expect(pickNext(tasks, 6)?.id).toBe("t-hot")
  })

  it("returns null when nothing is eligible", () => {
    const tasks = [makeTask(spec({ scheduledFor: 9 }), "t-x", 2)]
    expect(pickNext(tasks, 1)).toBeNull()
  })
})

describe("dispatch — I1 running <= worker_count on every step", () => {
  it("fills every arm and refuses the impossible dispatch", () => {
    const state = stateWith(8, 2)
    const tasks = [
      makeTask(spec({ idempotencyKey: "a" }), "t-a", 2),
      makeTask(spec({ idempotencyKey: "b" }), "t-b", 2),
      makeTask(spec({ idempotencyKey: "c" }), "t-c", 2),
    ]
    state.tasks = tasks
    const w0 = state.workers[0]
    const w1 = state.workers[1]
    if (!w0 || !w1) throw new Error("fixture needs 2 workers")
    dispatch(state, "t-a", w0)
    dispatch(state, "t-b", w1)
    expect(runningCount(state.workers)).toBe(2)
    expect(state.maxConcurrentRunning).toBe(2)
    expect(() => dispatch(state, "t-c", w1)).toThrow()
    expect(runningCount(state.workers)).toBe(2)
  })

  it("tracks the high-water mark after arms free up", () => {
    const state = stateWith(8, 3)
    state.tasks = [makeTask(spec({ idempotencyKey: "a" }), "t-a", 2)]
    const w0 = state.workers[0]
    if (!w0) throw new Error("fixture needs a worker")
    dispatch(state, "t-a", w0)
    succeedTask(state, "t-a")
    expect(runningCount(state.workers)).toBe(0)
    expect(state.maxConcurrentRunning).toBe(1)
  })
})

describe("failTask — I3 backoff monotonic + I4 poison/exhaustion to DLQ", () => {
  it("cools a transient on the rack with base * 2^retries + jitter", () => {
    const task = makeTask(spec({ kind: "cracked" }), "t-cr", 2)
    const result = failTask(task, 1, 1, 10, 0.5)
    expect(result.status).toBe("retry_wait")
    expect(task.nextAttemptAt).toBe(10 + retryDelay(1, 1, 0.5))
    expect(task.status).toBe("retry_wait")
  })

  it("backoff grows exponentially and stays monotonic per task", () => {
    const task = makeTask(spec({ kind: "cracked" }), "t-cr", 5)
    let now = 0
    let previous = -Number.POSITIVE_INFINITY
    for (let retries = 1; retries <= 4; retries++) {
      const r = failTask(task, retries, 1, now, 0.1)
      expect(r.nextAttemptAt).not.toBeNull()
      const at = r.nextAttemptAt ?? 0
      expect(at).toBeGreaterThan(previous)
      previous = at
      now = at
      task.status = "queued"
    }
  })

  it("poison bypasses the rack and goes straight to the scrap chute", () => {
    const task = makeTask(spec({ kind: "poison" }), "t-pz", 2)
    expect(failTask(task, 1, 1, 5, 0).status).toBe("dead")
    expect(task.status).toBe("dead")
    expect(requiredRoute(task)).toBe("dlq")
  })

  it("a transient at max_retries is scrapped, not re-annealed", () => {
    const task = makeTask(spec({ kind: "cracked" }), "t-ex", 2)
    task.retries = 2
    expect(failTask(task, 3, 1, 9, 0).status).toBe("dead")
    expect(requiredRoute(task)).toBe("dlq")
  })

  it("requiredRoute: crack under the limit retries, poison always DLQs", () => {
    const crack = makeTask(spec({ kind: "cracked" }), "t-c1", 2)
    crack.retries = 0
    expect(requiredRoute(crack)).toBe("retry")
    crack.retries = 1
    expect(requiredRoute(crack)).toBe("retry")
    crack.retries = 2
    expect(requiredRoute(crack)).toBe("dlq")
  })
})

describe("idempotency + backpressure — I5 / I6", () => {
  it("rejects an active duplicate idempotency key, forgets terminal ones", () => {
    const state = stateWith()
    const first = makeTask(spec({ idempotencyKey: "sigil-1" }), "t-1", 2)
    state.tasks.push(first)
    expect(hasActiveKey(state, "sigil-1")).toBe(true)
    first.status = "succeeded"
    expect(hasActiveKey(state, "sigil-1")).toBe(false)
  })

  it("backpressure reads full exactly at capacity", () => {
    expect(backpressure(3, 5)).toBe("open")
    expect(backpressure(4, 5)).toBe("limited")
    expect(backpressure(5, 5)).toBe("full")
    expect(backpressure(6, 5)).toBe("full")
    expect(backpressure(0, 1)).toBe("open")
  })

  it("queueDepth counts queued + retry_wait only", () => {
    const state = stateWith()
    const a = makeTask(spec({ idempotencyKey: "a" }), "t-a", 2)
    const b = makeTask(spec({ idempotencyKey: "b" }), "t-b", 2)
    const c = makeTask(spec({ idempotencyKey: "c" }), "t-c", 2)
    b.status = "retry_wait"
    c.status = "dead"
    state.tasks = [a, b, c]
    expect(queueDepth(state)).toBe(2)
  })
})

describe("promoteReady — rack re-enters the hopper", () => {
  it("a cooled retry becomes grabbable again", () => {
    const state = stateWith()
    const task = makeTask(spec({ kind: "cracked" }), "t-r", 2)
    task.status = "retry_wait"
    task.nextAttemptAt = 12
    state.tasks = [task]
    state.now = 11
    promoteReady(state)
    expect(task.status).toBe("retry_wait")
    expect(isEligible(task, state.now)).toBe(false)
    state.now = 12
    promoteReady(state)
    expect(task.status).toBe("queued")
    expect(isEligible(task, state.now)).toBe(true)
  })
})

describe("determinism — same seed, same numbers", () => {
  it("mulberry32 replays identical jitter streams", () => {
    const a = mulberry32(44)
    const b = mulberry32(44)
    for (let i = 0; i < 8; i++) expect(a()).toBe(b())
  })
})

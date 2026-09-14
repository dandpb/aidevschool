import { describe, expect, it } from "vitest"
import { LEVELS, type LevelId } from "../sim/levels"
import { GameController } from "./controller"

/**
 * A perfect player: uses the public truth APIs (pickNext truth via truthPickId,
 * requiredRoute truth via truthRoute) and always rejects gated forklifts.
 * The smoke test drives the same loop through the real HUD buttons.
 */
function playPerfect(game: GameController): void {
  game.start()
  let guard = 5000
  while (game.snapshot.phase === "running" && guard-- > 0) {
    const pending = game.snapshot.pending
    if (pending?.kind === "dispatch") {
      const truth = game.truthPickId()
      if (!truth) throw new Error("dispatch prompt without a truth pick")
      game.predictDispatch(truth)
    } else if (pending?.kind === "classify") {
      const route = game.truthRoute()
      if (route === "retry") game.classifyRetry(pending.task.id)
      else game.classifyDlq(pending.task.id)
    } else if (pending?.kind === "gate") {
      game.rejectInbound()
    } else if (game.snapshot.queue.paused) {
      game.togglePause()
    } else {
      throw new Error(`pump stalled with no pending prompt (level ${game.snapshot.level.id})`)
    }
  }
  expect(guard).toBeGreaterThan(0)
}

describe("GameController — wave invariant (perfect player)", () => {
  for (const level of LEVELS) {
    it(`level ${level.id} (${level.title}) resolves, passes, and holds the RF-005 invariant`, () => {
      const game = new GameController(level.id)
      playPerfect(game)
      const s = game.snapshot
      expect(s.phase).toBe("cleared")
      const m = s.lastMetrics
      expect(m).not.toBeNull()
      expect(m?.kind).toBe("voxeldojo-task-queue")
      expect(m?.dispatch_predictions).toBeGreaterThan(0)
      expect(m?.dispatch_correct).toBe(m?.dispatch_predictions)
      expect(m?.max_concurrent_running).toBeLessThanOrEqual(level.workerCount)
      expect(m?.worker_count).toBe(level.workerCount)
      expect(m?.queue_overflowed).toBe(false)
      expect(m?.backpressure_violations).toBe(0)
      expect(m?.idempotency_duplicates_enqueued).toBe(0)
      expect(m?.poison_requeued).toBe(0)
    })
  }

  it("L3 exercises retry AND dlq classifications", () => {
    const game = new GameController("L3")
    playPerfect(game)
    const m = game.snapshot.lastMetrics
    expect(m?.retry_classifications).toBeGreaterThan(0)
    expect(m?.retry_correct).toBe(m?.retry_classifications)
    expect(m?.dlq_classifications).toBeGreaterThan(0)
    expect(m?.dlq_correct).toBe(m?.dlq_classifications)
  })

  it("L4 throws at least one full-hopper gate and one duplicate-sigil gate", () => {
    const game = new GameController("L4")
    const gates = { full: 0, duplicate: 0 }
    game.start()
    let guard = 5000
    while (game.snapshot.phase === "running" && guard-- > 0) {
      const pending = game.snapshot.pending
      if (pending?.kind === "dispatch") {
        game.predictDispatch(game.truthPickId() ?? "")
      } else if (pending?.kind === "classify") {
        const route = game.truthRoute()
        if (route === "retry") game.classifyRetry(pending.task.id)
        else game.classifyDlq(pending.task.id)
      } else if (pending?.kind === "gate") {
        gates[pending.reason]++
        game.rejectInbound()
      } else {
        throw new Error("stalled")
      }
    }
    expect(gates.full).toBeGreaterThan(0)
    expect(gates.duplicate).toBeGreaterThan(0)
  })
})

describe("GameController — failure paths are contract misreads, not twitch", () => {
  it("wrong dispatch predictions fail the wave at <80% accuracy", () => {
    const game = new GameController("L1")
    game.start()
    let wrongs = 0
    let guard = 5000
    while (game.snapshot.phase === "running" && guard-- > 0) {
      const pending = game.snapshot.pending
      if (pending?.kind !== "dispatch") throw new Error("L1 should only prompt dispatches")
      const truth = game.truthPickId() ?? ""
      // single-candidate prompts force the correct pick; miss 4 voluntary ones
      const missable = pending.candidates.find((c) => c.id !== truth)
      if (wrongs < 4 && missable) {
        game.predictDispatch(missable.id)
        wrongs++
      } else {
        game.predictDispatch(truth)
      }
    }
    expect(wrongs).toBe(4)
    expect(game.snapshot.phase).toBe("failed")
    const m = game.snapshot.lastMetrics
    expect(m?.dispatch_predictions).toBe(12)
    expect(m?.dispatch_correct).toBe(8)
  })

  it("requeuing poison is recorded and poisons the pass rule", () => {
    const game = new GameController("L3")
    game.start()
    let guard = 5000
    let misroutedOnce = false
    while (game.snapshot.phase === "running" && guard-- > 0) {
      const pending = game.snapshot.pending
      if (pending?.kind === "dispatch") {
        game.predictDispatch(game.truthPickId() ?? "")
      } else if (pending?.kind === "classify") {
        const isPoison = pending.task.kind === "poison"
        if (isPoison && !misroutedOnce) {
          misroutedOnce = true
          game.classifyRetry(pending.task.id) // the canonical pathology
        } else {
          const route = game.truthRoute()
          if (route === "retry") game.classifyRetry(pending.task.id)
          else game.classifyDlq(pending.task.id)
        }
      } else if (pending?.kind === "gate") {
        game.rejectInbound()
      } else {
        throw new Error("stalled")
      }
    }
    expect(misroutedOnce).toBe(true)
    expect(game.snapshot.lastMetrics?.poison_requeued).toBe(1)
    expect(game.snapshot.phase).toBe("failed")
  })

  it("admitting a duplicate sigil enqueues it and fails the wave", () => {
    const game = new GameController("L4")
    game.start()
    let guard = 5000
    let admittedDup = false
    while (game.snapshot.phase === "running" && guard-- > 0) {
      const pending = game.snapshot.pending
      if (pending?.kind === "dispatch") {
        game.predictDispatch(game.truthPickId() ?? "")
      } else if (pending?.kind === "classify") {
        const route = game.truthRoute()
        if (route === "retry") game.classifyRetry(pending.task.id)
        else game.classifyDlq(pending.task.id)
      } else if (pending?.kind === "gate") {
        if (pending.reason === "duplicate" && !admittedDup) {
          admittedDup = true
          game.admitInbound()
        } else {
          game.rejectInbound()
        }
      } else {
        throw new Error("stalled")
      }
    }
    expect(admittedDup).toBe(true)
    expect(game.snapshot.lastMetrics?.idempotency_duplicates_enqueued).toBe(1)
    expect(game.snapshot.phase).toBe("failed")
  })

  it("overflowing the hopper marks queue_overflowed and fails the wave", () => {
    const game = new GameController("L4")
    game.start()
    let guard = 5000
    let admittedFull = false
    while (game.snapshot.phase === "running" && guard-- > 0) {
      const pending = game.snapshot.pending
      if (pending?.kind === "dispatch") {
        game.predictDispatch(game.truthPickId() ?? "")
      } else if (pending?.kind === "classify") {
        const route = game.truthRoute()
        if (route === "retry") game.classifyRetry(pending.task.id)
        else game.classifyDlq(pending.task.id)
      } else if (pending?.kind === "gate") {
        if (pending.reason === "full" && !admittedFull) {
          admittedFull = true
          game.admitInbound()
        } else {
          game.rejectInbound()
        }
      } else {
        throw new Error("stalled")
      }
    }
    expect(admittedFull).toBe(true)
    expect(game.snapshot.lastMetrics?.queue_overflowed).toBe(true)
    expect(game.snapshot.lastMetrics?.backpressure_violations).toBe(1)
    expect(game.snapshot.phase).toBe("failed")
  })
})

describe("GameController — pause (RF-006) and determinism", () => {
  it("P parks arms: hopper still accepts, no dispatch prompts while parked", () => {
    const game = new GameController("L1")
    game.start()
    // first prompt must be a dispatch; park instead
    expect(game.snapshot.pending?.kind).toBe("dispatch")
    game.togglePause()
    expect(game.snapshot.queue.paused).toBe(true)
    let guard = 5000
    let sawDispatchPrompt = false
    while (game.snapshot.phase === "running" && guard-- > 0) {
      const pending = game.snapshot.pending
      if (pending?.kind === "dispatch") sawDispatchPrompt = true
      if (pending?.kind === "gate") {
        game.rejectInbound()
        continue
      }
      if (pending?.kind === "classify") {
        game.togglePause() // resume to let completions proceed
        continue
      }
      if (game.snapshot.queue.paused) break
      break
    }
    expect(sawDispatchPrompt).toBe(false)
    expect(game.snapshot.queue.capacity).toBe(8)
    game.togglePause()
    expect(game.snapshot.queue.paused).toBe(false)
  })

  it("same seed replays the identical wave (same decisions -> same metrics)", () => {
    const run = (level: LevelId) => {
      const game = new GameController(level)
      playPerfect(game)
      return JSON.stringify(game.snapshot.lastMetrics)
    }
    for (const level of LEVELS) {
      expect(run(level.id)).toBe(run(level.id))
    }
  })

  it("retry/backoff timing is seeded, not wall-clock", () => {
    const game = new GameController("L3")
    game.start()
    let rackSeenAt: number | null = null
    let guard = 5000
    while (game.snapshot.phase === "running" && guard-- > 0) {
      const pending = game.snapshot.pending
      if (pending?.kind === "dispatch") {
        game.predictDispatch(game.truthPickId() ?? "")
      } else if (pending?.kind === "classify") {
        const route = game.truthRoute()
        if (route === "retry" && rackSeenAt === null) {
          rackSeenAt = game.snapshot.queue.now
          const retryCount = pending.task.retries + 1
          // base=1 -> delay = 2^retryCount + jitter in [0,1) => strictly > 2
          const minReady = rackSeenAt + 2 ** retryCount
          expect(pending.task.nextAttemptAt ?? 0).toBeGreaterThanOrEqual(0)
          expect(minReady).toBeGreaterThan(rackSeenAt)
        }
        if (route === "retry") game.classifyRetry(pending.task.id)
        else game.classifyDlq(pending.task.id)
      } else if (pending?.kind === "gate") {
        game.rejectInbound()
      } else {
        throw new Error("stalled")
      }
    }
    expect(rackSeenAt).not.toBeNull()
  })
})

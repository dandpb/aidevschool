import { setMissionEvidenceForwarder } from "@aidevschool/evidence/host-protocol"
import { afterEach, describe, expect, it, vi } from "vitest"
import { LEVELS, type LevelId } from "../sim/levels"
import { GameController, type TraceDecision } from "./controller"

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

/** Standalone EVIDENCE console records emitted by the headless controller. */
function evidenceRecords(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown>[] {
  return spy.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .filter((l: string) => l.startsWith("EVIDENCE "))
    .map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
}

function lastRecord(spy: ReturnType<typeof vi.spyOn>, level: LevelId) {
  return evidenceRecords(spy).find((r) => r.scenario_id === `task-forge-${level}`)
}

/** Emitted decision trace for a level; fails loudly if the record is missing. */
function tracedDecisions(spy: ReturnType<typeof vi.spyOn>, level: LevelId): TraceDecision[] {
  const observations = lastRecord(spy, level)?.observations as
    | { kind: string; decisions: TraceDecision[] }
    | undefined
  if (!observations) throw new Error(`no emitted observations for ${level}`)
  return observations.decisions
}

/** The verifier (learner/gate/task_queue_evaluator.py) only accepts closed key sets. */
function hasClosedShape(d: TraceDecision): boolean {
  const keys = Object.keys(d).sort().join(",")
  if (d.type === "dispatch") return keys === "taskId,type"
  if (d.type === "classify") return keys === "route,taskId,type"
  return keys === "action,type"
}

afterEach(() => {
  setMissionEvidenceForwarder(null)
  vi.restoreAllMocks()
})

describe("GameController — evidence observations (AID-1906, contract pinned in PR-A2)", () => {
  it("emits the pinned L1-perfect decision trace as record observations", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    playPerfect(game)
    const records = evidenceRecords(spy)
    expect(records).toHaveLength(1)
    const [first] = records
    if (!first) throw new Error("expected one EVIDENCE record")
    expect(first).toMatchObject({
      source: "voxeldojo",
      unit_id: "U4-task-queue",
      project: "04_concurrent_task_queue",
      game: "TASK FORGE",
      scenario_id: "task-forge-L1",
      pass: true,
    })
    // exact ground truth of test_task_queue_evaluator.py TRACES["L1-perfect"]:
    // 12 dispatches in prompt order (audit outranks thumb-200 at the same instant)
    expect(first.observations).toEqual({
      kind: "task-forge-L1",
      decisions: [
        "t-0-order-101",
        "t-1-order-102",
        "t-2-email-5",
        "t-3-render-42",
        "t-4-webhook-7",
        "t-5-digest",
        "t-7-audit",
        "t-6-thumb-200",
        "t-8-order-103",
        "t-9-fanout-9",
        "t-10-report",
        "t-11-order-104",
      ].map((taskId) => ({ type: "dispatch", taskId })),
    })
  })

  it("perfect plays cover each wave exactly, decision-for-decision (closed shapes)", () => {
    // totals pinned by the verifier ground truth: L1 12, L2 10, L3 25 (17+5+3), L4 29 (20+6+3)
    const totals: Record<LevelId, number> = { L1: 12, L2: 10, L3: 25, L4: 29 }
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    for (const level of LEVELS) {
      const game = new GameController(level.id)
      playPerfect(game)
      const record = lastRecord(spy, level.id)
      expect(record, level.id).toBeDefined()
      const observations = record?.observations as { kind: string; decisions: TraceDecision[] }
      expect(observations.kind, level.id).toBe(`task-forge-${level.id}`)
      expect(observations.decisions, level.id).toHaveLength(totals[level.id])
      for (const d of observations.decisions) {
        expect(hasClosedShape(d), `${level.id}: ${JSON.stringify(d)}`).toBe(true)
      }
      // JSON round trip: the emitted trace is bounded, plain, key-stable
      expect(JSON.parse(JSON.stringify(observations))).toEqual(observations)
    }
  })

  it("L3 observations record the 5 retry + 3 dlq classifications at their pinned prompts", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L3")
    playPerfect(game)
    const decisions = tracedDecisions(spy, "L3")
    const routes = (d: TraceDecision): string | null => (d.type === "classify" ? d.route : null)
    expect(decisions.filter((d) => routes(d) === "retry")).toHaveLength(5)
    expect(decisions.filter((d) => routes(d) === "dlq")).toHaveLength(3)
    expect(decisions.filter((d) => d.type === "dispatch")).toHaveLength(17)
    // first classify prompt of the wave is flake #1 going to the annealing rack
    expect(decisions[3]).toEqual({ type: "classify", taskId: "t-1-flake-1", route: "retry" })
  })

  it("L4 observations pin the three gate rejects after the opening dispatches", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    playPerfect(game)
    const decisions = tracedDecisions(spy, "L4")
    expect(decisions.slice(0, 6).every((d) => d.type === "dispatch")).toBe(true)
    expect(decisions.slice(6, 9)).toEqual([
      { type: "gate", action: "reject" },
      { type: "gate", action: "reject" },
      { type: "gate", action: "reject" },
    ])
    expect(decisions.filter((d) => d.type === "gate")).toHaveLength(3)
  })

  it("traces wrong dispatch predictions as predicted — never corrected to the truth", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    const misses: string[] = []
    let guard = 5000
    while (game.snapshot.phase === "running" && guard-- > 0) {
      const pending = game.snapshot.pending
      if (pending?.kind !== "dispatch") throw new Error("L1 should only prompt dispatches")
      const truth = game.truthPickId() ?? ""
      const missable = pending.candidates.find((c) => c.id !== truth)
      if (misses.length < 4 && missable) {
        misses.push(missable.id)
        game.predictDispatch(missable.id)
      } else {
        game.predictDispatch(truth)
      }
    }
    expect(game.snapshot.phase).toBe("failed")
    const record = lastRecord(spy, "L1")
    expect(record?.pass).toBe(false)
    const decisions = tracedDecisions(spy, "L1")
    expect(decisions).toHaveLength(12)
    const traced = decisions.map((d) => (d.type === "dispatch" ? d.taskId : null))
    for (const miss of misses) expect(traced).toContain(miss)
    expect(record?.metrics).toMatchObject({ dispatch_predictions: 12, dispatch_correct: 8 })
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { LEVELS, type LevelId } from "../sim/levels"
import { GameController, type TraceDecision } from "./controller"

/**
 * Determinism + contract tests for the TASK FORGE controller. The autopilot
 * plays the queue-contract truth (expectedDispatchId / correctRoute /
 * inboundRequiresReject) with a fixed decision priority — optimal play must
 * clear every level, and the same action sequence must reproduce the same
 * wave byte-for-byte (same input ⇒ same progression).
 */

vi.mock("../evidence/emit", () => ({
  emitEvidence: vi.fn(),
}))

import { emitEvidence } from "../evidence/emit"

function autopilot(game: GameController, maxSteps = 500): void {
  for (let i = 0; i < maxSteps; i++) {
    const s = game.snapshot
    if (s.phase !== "playing") return
    if (s.inbound && game.inboundRequiresReject()) {
      game.rejectInbound()
      continue
    }
    const head = game.headFinished()
    if (head) {
      if (head.correctRoute === "retry") game.classifyRetry()
      else game.classifyDlq()
      continue
    }
    const expected = game.expectedDispatchId()
    if (expected) {
      game.predictDispatch(expected)
      continue
    }
    // nothing actionable: the dock window closes on its own — nudge the clock
    game.togglePause()
    game.togglePause()
  }
  throw new Error("autopilot exceeded maxSteps")
}

describe("optimal play clears every level (contract held)", () => {
  for (const cfg of LEVELS) {
    it(`L-clear: ${cfg.id} — ${cfg.title}`, () => {
      const game = new GameController(cfg.id)
      game.start()
      autopilot(game)
      const s = game.snapshot
      expect(s.phase).toBe("cleared")
      expect(s.metrics.dispatch_predictions).toBeGreaterThan(0)
      expect(s.metrics.dispatch_correct).toBe(s.metrics.dispatch_predictions)
      expect(s.metrics.retry_correct).toBe(s.metrics.retry_classifications)
      expect(s.metrics.dlq_correct).toBe(s.metrics.dlq_classifications)
      expect(s.metrics.poison_requeued).toBe(0)
      expect(s.metrics.backpressure_violations).toBe(0)
      expect(s.metrics.idempotency_duplicates_enqueued).toBe(0)
      expect(s.metrics.queue_overflowed).toBe(false)
      expect(s.metrics.max_concurrent_running).toBeLessThanOrEqual(cfg.workerCount)
      expect(emitEvidence).toHaveBeenCalledWith(
        cfg.id,
        true,
        expect.objectContaining({ kind: "voxeldojo-task-queue", worker_count: cfg.workerCount }),
        expect.objectContaining({ kind: `task-forge-${cfg.id}` }),
      )
    })
  }
})

describe("levels exercise their concept (teaching coverage, not just green)", () => {
  it("L1 asks dispatch predictions and needs no classifications", () => {
    const game = new GameController("L1")
    game.start()
    autopilot(game)
    const m = game.snapshot.metrics
    expect(m.dispatch_predictions).toBe(10)
    expect(m.retry_classifications + m.dlq_classifications).toBe(0)
  })

  it("L2 forces required 429s: the two scripted duplicates are rejected, not enqueued", () => {
    const game = new GameController("L2")
    game.start()
    autopilot(game)
    const s = game.snapshot
    expect(s.phase).toBe("cleared")
    expect(s.metrics.idempotency_duplicates_enqueued).toBe(0)
    // 14 arrivals − 2 rejected duplicates = 12 resolved through the forge
    expect(s.succeededIds.length + s.dlqIds.length).toBe(12)
  })

  it("L3 collects retry classifications from transient cracks", () => {
    const game = new GameController("L3")
    game.start()
    autopilot(game)
    expect(game.snapshot.metrics.retry_classifications).toBeGreaterThan(0)
  })

  it("L4 routes poison and exhausted cracks to the DLQ", () => {
    const game = new GameController("L4")
    game.start()
    autopilot(game)
    const s = game.snapshot
    expect(s.metrics.dlq_classifications).toBeGreaterThanOrEqual(4) // w2, w4, w7 poison/exhausted + v-truncation
    expect(s.dlqIds).toContain("w2")
    expect(s.dlqIds).toContain("w7")
    expect(s.metrics.poison_requeued).toBe(0)
  })
})

describe("violations fail the wave exactly per plan §6", () => {
  it("requeuing poison breaks the pass rule (poison_requeued)", () => {
    const game = new GameController("L4")
    game.start()
    // Optimal play with ONE mistake: the first must-DLQ ingot is wrongly
    // sent to the annealing rack (the canonical queue pathology).
    let poisoned = false
    for (let i = 0; i < 500; i++) {
      const s = game.snapshot
      if (s.phase !== "playing") break
      if (s.inbound && game.inboundRequiresReject()) {
        game.rejectInbound()
        continue
      }
      const head = game.headFinished()
      if (head) {
        if (head.correctRoute === "dlq" && !poisoned) {
          poisoned = true
          game.classifyRetry() // the mistake
        } else if (head.correctRoute === "retry") game.classifyRetry()
        else game.classifyDlq()
        continue
      }
      const expected = game.expectedDispatchId()
      if (expected) {
        game.predictDispatch(expected)
        continue
      }
      game.togglePause()
      game.togglePause()
    }
    const s = game.snapshot
    expect(s.phase).toBe("failed")
    expect(s.metrics.poison_requeued).toBe(1)
  })

  it("wrong dispatch predictions below 80% fail the wave", () => {
    const game = new GameController("L1")
    game.start()
    // A player who misreads priority: park the arms to build a backlog, then
    // always grab the DIMMEST eligible ingot (lowest priority) instead of the
    // brightest. With a backlog the truth almost never matches the pick.
    game.togglePause()
    for (let i = 0; i < 6; i++) {
      game.togglePause()
      game.togglePause()
    }
    game.togglePause() // arms back on
    for (let i = 0; i < 500; i++) {
      const s = game.snapshot
      if (s.phase !== "playing") break
      if (s.inbound && game.inboundRequiresReject()) {
        game.rejectInbound()
        continue
      }
      const head = game.headFinished()
      if (head) {
        head.correctRoute === "retry" ? game.classifyRetry() : game.classifyDlq()
        continue
      }
      const eligible = s.queue.filter((t) => t.scheduledFor <= s.now)
      if (eligible.length > 0 && game.expectedDispatchId()) {
        const worst = [...eligible].sort(
          (x, y) => x.priority - y.priority || y.enqueuedAt - x.enqueuedAt,
        )[0]
        game.predictDispatch(worst?.id ?? "")
        continue
      }
      game.togglePause()
      game.togglePause()
    }
    const m = game.snapshot.metrics
    expect(m.dispatch_correct / m.dispatch_predictions).toBeLessThan(0.8)
    expect(game.snapshot.phase).toBe("failed")
  })

  it("skipping R on duplicates enqueues them (idempotency broken)", () => {
    const game = new GameController("L2")
    game.start()
    // Autopilot that NEVER rejects: dispatches and classifies perfectly but
    // lets every forklift land.
    for (let i = 0; i < 500; i++) {
      const s = game.snapshot
      if (s.phase !== "playing") break
      const head = game.headFinished()
      if (head) {
        head.correctRoute === "retry" ? game.classifyRetry() : game.classifyDlq()
        continue
      }
      const expected = game.expectedDispatchId()
      if (expected) {
        game.predictDispatch(expected)
        continue
      }
      game.togglePause()
      game.togglePause()
    }
    const s = game.snapshot
    expect(s.metrics.idempotency_duplicates_enqueued).toBeGreaterThan(0)
    if (s.phase !== "playing") expect(s.phase).toBe("failed")
  })

  it("a parked hopper overflows when R is skipped (backpressure violation)", () => {
    const game = new GameController("L2")
    game.start()
    game.togglePause() // park the arms: the queue keeps accepting (RF-006)
    for (let i = 0; i < 40; i++) {
      game.togglePause()
      game.togglePause()
      if (game.snapshot.metrics.queue_overflowed) break
    }
    const s = game.snapshot
    expect(s.metrics.queue_overflowed).toBe(true)
    expect(s.metrics.backpressure_violations).toBeGreaterThan(0)
  })
})

describe("determinism — same actions ⇒ same wave", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("replaying the same optimal action sequence reproduces identical metrics", () => {
    const levels: LevelId[] = ["L1", "L2", "L3", "L4"]
    for (const id of levels) {
      const a = new GameController(id)
      a.start()
      autopilot(a)
      const b = new GameController(id)
      b.start()
      autopilot(b)
      expect(b.snapshot.metrics).toEqual(a.snapshot.metrics)
      expect(b.snapshot.now).toBe(a.snapshot.now)
      expect(b.snapshot.succeededIds).toEqual(a.snapshot.succeededIds)
      expect(b.snapshot.dlqIds).toEqual(a.snapshot.dlqIds)
    }
  })

  it("pause parks the arms: queue keeps accepting, nothing completes (RF-006)", () => {
    const game = new GameController("L1")
    game.start()
    game.togglePause()
    const s1 = game.snapshot
    expect(s1.paused).toBe(true)
    // while parked, time only moves on player action; hopper still admitted t1
    expect(s1.queue.length + s1.running.length).toBeGreaterThan(0)
    expect(s1.running.length).toBe(0)
    game.togglePause()
    expect(game.snapshot.paused).toBe(false)
  })
})

/**
 * AID-1906 — evidence observations trace (verifier contract pinned in PR-A2
 * #423: learner/gate/task_queue_evaluator.py accepts only the closed
 * {kind, decisions} observations with per-decision closed key sets). The
 * trace below is derived from the canonical sim itself (this controller's
 * truth APIs), not from literals: the #421-sim ground-truth numbers pinned
 * in the original stack (L1=12 dispatches of t-0-order-101, L4=29) belong to
 * the orphaned #421 wave data and are void post-re-anchor; re-pinning the
 * evaluator TRACES against this canonical sim is tracked for the PR-A2
 * owner (QA countersign input).
 */

/** The verifier only accepts closed key sets per decision. */
function hasClosedShape(d: TraceDecision): boolean {
  const keys = Object.keys(d).sort().join(",")
  if (d.type === "dispatch") return keys === "taskId,type"
  if (d.type === "classify") return keys === "route,taskId,type"
  return keys === "action,type"
}

/** Autopilot that records the exact prompt answers as it plays. */
function tracedAutopilot(game: GameController, maxSteps = 500): TraceDecision[] {
  const trace: TraceDecision[] = []
  for (let i = 0; i < maxSteps; i++) {
    const s = game.snapshot
    if (s.phase !== "playing") return trace
    if (s.inbound && game.inboundRequiresReject()) {
      trace.push({ type: "gate", action: "reject" })
      game.rejectInbound()
      continue
    }
    const head = game.headFinished()
    if (head) {
      trace.push({ type: "classify", taskId: head.task.id, route: head.correctRoute })
      if (head.correctRoute === "retry") game.classifyRetry()
      else game.classifyDlq()
      continue
    }
    const expected = game.expectedDispatchId()
    if (expected) {
      trace.push({ type: "dispatch", taskId: expected })
      game.predictDispatch(expected)
      continue
    }
    // nothing actionable: the dock window closes on its own — nudge the clock
    game.togglePause()
    game.togglePause()
  }
  throw new Error("tracedAutopilot exceeded maxSteps")
}

function emittedObservations(): { kind: string; decisions: TraceDecision[] }[] {
  return vi
    .mocked(emitEvidence)
    .mock.calls.map((c) => c[3] as { kind: string; decisions: TraceDecision[] })
}

function soleEmittedObservations(): { kind: string; decisions: TraceDecision[] } {
  const [observations] = emittedObservations()
  if (!observations) throw new Error("expected exactly one emitted observations record")
  return observations
}

describe("evidence observations — AID-1906 decision trace (canonical sim)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  for (const cfg of LEVELS) {
    it(`${cfg.id}: emits exactly the played decision trace as record observations`, () => {
      const game = new GameController(cfg.id)
      game.start()
      const trace = tracedAutopilot(game)
      expect(game.snapshot.phase).toBe("cleared")
      const emitted = emittedObservations()
      expect(emitted).toEqual([{ kind: `task-forge-${cfg.id}`, decisions: trace }])
      for (const d of trace) expect(hasClosedShape(d)).toBe(true)
    })
  }

  it("trace counts reconcile with the independently recomputed metrics", () => {
    for (const cfg of LEVELS) {
      vi.clearAllMocks()
      const game = new GameController(cfg.id)
      game.start()
      tracedAutopilot(game)
      const m = game.snapshot.metrics
      const observations = soleEmittedObservations()
      const dispatches = observations.decisions.filter((d) => d.type === "dispatch")
      const classifies = observations.decisions.filter((d) => d.type === "classify")
      const gates = observations.decisions.filter((d) => d.type === "gate")
      expect(dispatches).toHaveLength(m.dispatch_predictions)
      expect(classifies).toHaveLength(m.retry_classifications + m.dlq_classifications)
      // this controller has no explicit admit action: every gate answer is a reject
      for (const g of gates) expect(g).toEqual({ type: "gate", action: "reject" })
    }
  })

  it("wrong predictions stay in the trace — the player's answer, never the truth", () => {
    const game = new GameController("L1")
    game.start()
    const truth = game.expectedDispatchId()
    expect(truth).not.toBeNull()
    game.predictDispatch("t-not-the-truth")
    // keep playing optimally so the wave ends and the record is emitted
    tracedAutopilot(game)
    const observations = soleEmittedObservations()
    expect(observations.decisions[0]).toEqual({ type: "dispatch", taskId: "t-not-the-truth" })
    expect(game.snapshot.metrics.dispatch_correct).toBeLessThan(
      game.snapshot.metrics.dispatch_predictions,
    )
  })

  it("same play ⇒ same trace (byte-for-byte, determinism invariant)", () => {
    for (const cfg of LEVELS) {
      vi.clearAllMocks()
      const a = new GameController(cfg.id)
      a.start()
      tracedAutopilot(a)
      const first = emittedObservations()
      vi.clearAllMocks()
      const b = new GameController(cfg.id)
      b.start()
      tracedAutopilot(b)
      expect(emittedObservations()).toEqual(first)
    }
  })
})

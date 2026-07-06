import { describe, expect, it } from "vitest"
import { loadCorePack } from "../content/loadCorePack"
import type { TaskQueueEncounter } from "../content/types"
import {
  applyEncounterAction,
  autoPassEncounter,
  createTaskQueueState,
} from "../game/encounters/taskQueue"
import { validateEvidenceRecord } from "../game/evidence/evidence"

const NOW = new Date("2026-07-05T12:00:00.000Z")

describe("task queue encounter", () => {
  it("processes every legit job and dead-letters every poison job, emitting passing evidence", () => {
    const encounter = concurrentTaskQueueEncounter()
    let state = createTaskQueueState(encounter)
    for (const job of encounter.jobs) {
      // Correct play: legit -> process (admit); poison -> dead-letter (reject).
      state = applyEncounterAction(state, job.type === "legit" ? "admit" : "reject", NOW)
    }

    expect(state.complete).toBe(true)
    expect(state.evidence?.pass).toBe(true)
    expect(validateEvidenceRecord(state.evidence)).toMatchObject({
      project: "04_concurrent_task_queue",
      unit_id: "U-04_concurrent_task_queue",
      pass: true,
      metrics: {
        kind: "pixelquest-task-queue",
        processed: 10,
        poison_dead_lettered: 3,
        poison_retried: 0,
        legit_retried: 0,
        backpressure_peak: 0,
      },
      curriculum_context: {
        concept: "Fila concorrente, backpressure e processamento justo",
        mechanic: "Worker Queue",
        accepted_signal: "tarefa pronta",
        rejected_trap: "job veneno sem lease",
      },
    })
  })

  it("processing a legit job increments processed and keeps the run passing", () => {
    const encounter = concurrentTaskQueueEncounter()
    const state = createTaskQueueState(encounter)

    // Job 0 is the first legit "checkout order #101" — admitting it processes it.
    const afterOne = applyEncounterAction(state, "admit", NOW)

    expect(afterOne.processed).toBe(1)
    expect(afterOne.index).toBe(1)
    expect(afterOne.poisonDeadLettered).toBe(0)
    expect(afterOne.legitRetried).toBe(0)
  })

  it("fails when a poison job is retried (admitted) instead of dead-lettered", () => {
    const encounter = concurrentTaskQueueEncounter()
    let state = createTaskQueueState(encounter)
    // Play the whole stream, but admit every poison job (the trap: retry forever).
    for (const job of encounter.jobs) {
      state = applyEncounterAction(state, job.type === "poison" ? "admit" : "reject", NOW)
    }

    expect(state.complete).toBe(true)
    // Admitting every poison job retries all 3; processing was skipped, so fail.
    expect(state.evidence?.pass).toBe(false)
    const metrics = state.evidence?.metrics
    expect(metrics?.kind).toBe("pixelquest-task-queue")
    if (metrics?.kind === "pixelquest-task-queue") {
      expect(metrics.poison_retried).toBe(3)
      expect(metrics.processed).toBe(0)
    }
  })

  it("keeps backpressure peak under the cap when jobs are processed promptly", () => {
    const encounter = concurrentTaskQueueEncounter()
    let state = createTaskQueueState(encounter)
    // Correct play keeps the queue drained.
    for (const job of encounter.jobs) {
      state = applyEncounterAction(state, job.type === "legit" ? "admit" : "reject", NOW)
    }

    expect(state.backpressurePeak).toBe(0)
    if (state.evidence?.metrics.kind === "pixelquest-task-queue") {
      expect(state.evidence.metrics.backpressure_peak).toBeLessThanOrEqual(4)
      expect(state.evidence.metrics.overheated).toBe(false)
    }
  })

  it("autoPassEncounter produces a passing outcome for the curriculum pack entry", () => {
    const encounter = concurrentTaskQueueEncounter()
    const state = autoPassEncounter(encounter, NOW)

    expect(state.complete).toBe(true)
    expect(state.evidence?.pass).toBe(true)
    expect(validateEvidenceRecord(state.evidence).pass).toBe(true)
    expect(state.processed).toBe(10)
    expect(state.poisonDeadLettered).toBe(3)
    expect(state.poisonRetried).toBe(0)
  })
})

function concurrentTaskQueueEncounter(): TaskQueueEncounter {
  const { pack } = loadCorePack()
  const encounter = pack.encounters.find(
    (candidate) => candidate.project === "04_concurrent_task_queue",
  )
  if (encounter === undefined || encounter.kind !== "task_queue") {
    throw new Error("expected curriculum task_queue encounter for 04_concurrent_task_queue")
  }
  return encounter
}

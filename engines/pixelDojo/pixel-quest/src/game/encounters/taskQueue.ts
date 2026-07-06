import {
  TASK_QUEUE_CONTRACT,
  type TaskQueueEncounter,
  type TaskQueueJob,
} from "../../content/types"
import type { EncounterOutcome } from "../evidence/emitter"
import type { PixelQuestEvidenceRecord } from "../evidence/types"
import {
  applyEncounterStep,
  autoPassEncounterState,
  type EncounterAction,
  type EncounterDriver,
} from "./encounterCore"

// ---------------------------------------------------------------------------
// Action mapping for task_queue (read me)
// ---------------------------------------------------------------------------
// The shared core (encounterCore.ts) fixes `EncounterAction = "admit" | "reject"`
// AND `applyEncounterStep` advances exactly one item per action — there is no
// per-job multi-step retry loop available. So each `TaskQueueJob` in the stream
// is ONE dispatch decision. The three task-queue concepts (process / retry /
// dead-letter) collapse onto the two core actions as follows:
//
//   job type | admit                         | reject
//   ---------|-------------------------------|------------------------------
//   legit    | PROCESS  (correct)            | bounced -> legitRetried (mistake)
//   poison   | RETRY    (trap, builds press) | DEAD-LETTER (correct)
//
// `correctAction`: legit -> "admit", poison -> "reject". The auto-pass therefore
// processes every legit job and dead-letters every poison job on sight — the
// bounded-retry lesson is encoded in the metrics: `poisonRetried` counts poison
// jobs the player retried (admitted) instead of dead-lettering, and the central
// `TASK_QUEUE_CONTRACT.maxPoisonRetried` (= encounter maxRetries) caps tolerated
// retries. Retrying a poison job also keeps it in the queue, so it directly
// inflates `backpressurePeak` — retrying too much fails on two axes.
//
// Backpressure model: `backpressure` is the live queue depth. Between jobs the
// depth drains by `processRate * elapsed`; each arriving job adds 1. Processing
// a legit job (admit) or removing any job (reject) drops depth by 1; retrying a
// poison job (admit) leaves depth unchanged (it is requeued) — that is the
// pressure valve the player must keep under `maxBackpressurePeak`.
// ---------------------------------------------------------------------------

export type TaskQueueEncounterState = {
  readonly definition: TaskQueueEncounter
  readonly index: number
  readonly processed: number
  readonly poisonDeadLettered: number
  readonly poisonRetried: number
  readonly legitRetried: number
  readonly backpressure: number
  readonly backpressurePeak: number
  readonly retriesForCurrentJob: number
  readonly lastAt: number
  readonly complete: boolean
  readonly evidence?: PixelQuestEvidenceRecord
}

export function createTaskQueueState(definition: TaskQueueEncounter): TaskQueueEncounterState {
  return {
    definition,
    index: 0,
    processed: 0,
    poisonDeadLettered: 0,
    poisonRetried: 0,
    legitRetried: 0,
    backpressure: 0,
    backpressurePeak: 0,
    retriesForCurrentJob: 0,
    lastAt: 0,
    complete: false,
  }
}

const driver: EncounterDriver<TaskQueueEncounterState, TaskQueueJob> = {
  itemsOf: (state) => state.definition.jobs,
  correctAction: (job) => (job.type === "legit" ? "admit" : "reject"),
  applyAction: applyJobAction,
  outcomeOf: taskQueueOutcome,
}

export function applyEncounterAction(
  state: TaskQueueEncounterState,
  action: EncounterAction,
  now: Date,
): TaskQueueEncounterState {
  return applyEncounterStep(state, action, now, driver)
}

export function getCurrentJob(state: TaskQueueEncounterState): TaskQueueJob | undefined {
  return state.definition.jobs[state.index]
}

export function autoPassEncounter(
  definition: TaskQueueEncounter,
  now: Date,
): TaskQueueEncounterState {
  return autoPassEncounterState(createTaskQueueState(definition), now, driver)
}

function applyJobAction(
  state: TaskQueueEncounterState,
  job: TaskQueueJob,
  action: EncounterAction,
): TaskQueueEncounterState {
  // 1. Background drain between the previous job and this one, then this job arrives.
  const elapsed = Math.max(0, job.at - state.lastAt)
  const drained = Math.max(0, state.backpressure - elapsed * state.definition.processRate)
  const arrived = drained + 1
  // 2. Apply the player's dispatch decision to the queue depth.
  //    admit on legit  -> processed, leaves the queue (depth - 1)
  //    reject (any)    -> removed from the queue (depth - 1)
  //    admit on poison -> retried / requeued, stays in the queue (depth unchanged)
  const removed = action === "reject" || job.type === "legit"
  const depth = Math.max(0, arrived - (removed ? 1 : 0))
  const base: TaskQueueEncounterState = {
    ...state,
    backpressure: depth,
    backpressurePeak: Math.max(state.backpressurePeak, depth),
    lastAt: job.at,
  }
  // 3. Tally the concept counters.
  if (job.type === "legit" && action === "admit") {
    return { ...base, processed: base.processed + 1, retriesForCurrentJob: 0 }
  }
  if (job.type === "legit" && action === "reject") {
    // legit job bounced (dead-lettered) instead of processed — a mistake.
    return { ...base, legitRetried: base.legitRetried + 1, retriesForCurrentJob: 0 }
  }
  if (job.type === "poison" && action === "admit") {
    // poison job retried instead of dead-lettered — the bounded-retry trap.
    const retriesForCurrentJob = base.retriesForCurrentJob + 1
    return { ...base, poisonRetried: base.poisonRetried + 1, retriesForCurrentJob }
  }
  // poison + reject: correctly dead-lettered.
  return { ...base, poisonDeadLettered: base.poisonDeadLettered + 1, retriesForCurrentJob: 0 }
}

function taskQueueOutcome(state: TaskQueueEncounterState): EncounterOutcome {
  const overheated =
    state.backpressurePeak > TASK_QUEUE_CONTRACT.maxBackpressurePeak ||
    state.poisonRetried > TASK_QUEUE_CONTRACT.maxPoisonRetried
  const pass =
    !overheated &&
    state.processed >= TASK_QUEUE_CONTRACT.minProcessed &&
    state.poisonRetried <= TASK_QUEUE_CONTRACT.maxPoisonRetried &&
    state.backpressurePeak <= TASK_QUEUE_CONTRACT.maxBackpressurePeak &&
    state.legitRetried === 0
  return {
    pass,
    metrics: {
      kind: "pixelquest-task-queue",
      processed: state.processed,
      poison_dead_lettered: state.poisonDeadLettered,
      poison_retried: state.poisonRetried,
      legit_retried: state.legitRetried,
      backpressure_peak: Math.round(state.backpressurePeak),
      overheated,
    },
  }
}

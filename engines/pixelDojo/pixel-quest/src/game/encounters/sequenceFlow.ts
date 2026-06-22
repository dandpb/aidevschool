import type { SequenceEncounter, SequenceStep } from "../../content/types"
import type { PixelQuestEvidenceRecord } from "../evidence/types"
import type { EncounterAction } from "./tokenBucket"

export type SequenceEncounterState = {
  readonly definition: SequenceEncounter
  readonly index: number
  readonly advanced: number
  readonly held: number
  readonly skippedRequired: number
  readonly guardsMissed: number
  readonly heatPeak: number
  readonly complete: boolean
  readonly evidence?: PixelQuestEvidenceRecord
}

export function createSequenceState(definition: SequenceEncounter): SequenceEncounterState {
  return {
    definition,
    index: 0,
    advanced: 0,
    held: 0,
    skippedRequired: 0,
    guardsMissed: 0,
    heatPeak: 0,
    complete: false,
  }
}

export function applySequenceAction(
  state: SequenceEncounterState,
  action: EncounterAction,
  now: Date,
): SequenceEncounterState {
  if (state.complete) {
    return state
  }
  const step = state.definition.steps[state.index]
  if (step === undefined) {
    return finishSequence(state, now)
  }
  const correctAction = step.type === "advance" ? "admit" : "reject"
  const nextState =
    action === correctAction
      ? applyCorrectAction(state, step)
      : applyIncorrectAction(state, step, action)
  return advanceSequence(nextState, now)
}

export function getCurrentSequenceStep(state: SequenceEncounterState): SequenceStep | undefined {
  return state.definition.steps[state.index]
}

export function autoPassSequence(definition: SequenceEncounter, now: Date): SequenceEncounterState {
  let state = createSequenceState(definition)
  for (const step of definition.steps) {
    state = applySequenceAction(state, step.type === "advance" ? "admit" : "reject", now)
  }
  return state.complete ? state : finishSequence(state, now)
}

function applyCorrectAction(
  state: SequenceEncounterState,
  step: SequenceStep,
): SequenceEncounterState {
  if (step.type === "advance") {
    return {
      ...state,
      advanced: state.advanced + 1,
    }
  }
  return {
    ...state,
    held: state.held + 1,
  }
}

function applyIncorrectAction(
  state: SequenceEncounterState,
  step: SequenceStep,
  action: EncounterAction,
): SequenceEncounterState {
  if (step.type === "guard" && action === "admit") {
    const guardsMissed = state.guardsMissed + 1
    return {
      ...state,
      guardsMissed,
      heatPeak: Math.max(state.heatPeak, guardsMissed * 30),
    }
  }
  const skippedRequired = state.skippedRequired + 1
  return {
    ...state,
    skippedRequired,
    heatPeak: Math.max(state.heatPeak, skippedRequired * 18),
  }
}

function advanceSequence(state: SequenceEncounterState, now: Date): SequenceEncounterState {
  const next = {
    ...state,
    index: state.index + 1,
  }
  if (next.index >= next.definition.steps.length) {
    return finishSequence(next, now)
  }
  return next
}

function finishSequence(state: SequenceEncounterState, now: Date): SequenceEncounterState {
  const evidence = buildEvidence(state, now)
  console.log(`EVIDENCE ${JSON.stringify(evidence)}`)
  return {
    ...state,
    complete: true,
    evidence,
  }
}

function buildEvidence(state: SequenceEncounterState, now: Date): PixelQuestEvidenceRecord {
  const total = Math.max(state.definition.steps.length, 1)
  const pass =
    state.advanced >= state.definition.minAdvanced &&
    state.guardsMissed <= state.definition.maxGuardsMissed &&
    state.skippedRequired === 0
  return {
    source: "pixelquest",
    unit_id: state.definition.unit_id,
    project: state.definition.project,
    encounter_id: state.definition.id,
    game: "PixelDojo Quest",
    ts: now.toISOString(),
    pass,
    metrics: {
      target_rate: state.definition.minAdvanced,
      observed_admit_rate: Number((state.advanced / total).toFixed(2)),
      max_burst_1s: state.advanced,
      good_admits: state.advanced,
      legit_rejected: state.skippedRequired,
      abusive_admitted: state.guardsMissed,
      abusive_rejected: state.held,
      heat_peak: state.heatPeak,
      overheated: state.guardsMissed > state.definition.maxGuardsMissed,
    },
    curriculum_context: {
      concept: state.definition.concept,
      mechanic: state.definition.mechanicName,
      accepted_signal: state.definition.goodRequestLabel,
      rejected_trap: state.definition.badRequestLabel,
    },
  }
}

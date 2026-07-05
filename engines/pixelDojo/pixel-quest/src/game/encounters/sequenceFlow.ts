import type { SequenceEncounter, SequenceStep } from "../../content/types"
import type { EncounterOutcome } from "../evidence/emitter"
import type { PixelQuestEvidenceRecord } from "../evidence/types"
import {
  applyEncounterStep,
  autoPassEncounterState,
  type EncounterAction,
  type EncounterDriver,
} from "./encounterCore"

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

const driver: EncounterDriver<SequenceEncounterState, SequenceStep> = {
  itemsOf: (state) => state.definition.steps,
  correctAction: (step) => (step.type === "advance" ? "admit" : "reject"),
  applyAction: applyActionForStep,
  outcomeOf: sequenceOutcome,
}

export function applySequenceAction(
  state: SequenceEncounterState,
  action: EncounterAction,
  now: Date,
): SequenceEncounterState {
  return applyEncounterStep(state, action, now, driver)
}

export function getCurrentSequenceStep(state: SequenceEncounterState): SequenceStep | undefined {
  return state.definition.steps[state.index]
}

export function autoPassSequence(definition: SequenceEncounter, now: Date): SequenceEncounterState {
  return autoPassEncounterState(createSequenceState(definition), now, driver)
}

function applyActionForStep(
  state: SequenceEncounterState,
  step: SequenceStep,
  action: EncounterAction,
): SequenceEncounterState {
  const correctAction = step.type === "advance" ? "admit" : "reject"
  if (action === correctAction) {
    return step.type === "advance"
      ? { ...state, advanced: state.advanced + 1 }
      : { ...state, held: state.held + 1 }
  }
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

function sequenceOutcome(state: SequenceEncounterState): EncounterOutcome {
  const pass =
    state.advanced >= state.definition.minAdvanced &&
    state.guardsMissed <= state.definition.maxGuardsMissed &&
    state.skippedRequired === 0
  return {
    pass,
    metrics: {
      kind: "pixelquest-sequence-flow",
      advanced: state.advanced,
      held: state.held,
      skipped_required: state.skippedRequired,
      guards_missed: state.guardsMissed,
      heat_peak: state.heatPeak,
      overheated: state.guardsMissed > state.definition.maxGuardsMissed,
    },
  }
}

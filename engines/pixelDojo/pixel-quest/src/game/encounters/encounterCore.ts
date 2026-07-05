import {
  buildEncounterEvidence,
  type EncounterOutcome,
  type EvidenceSourceDefinition,
} from "../evidence/emitter"
import type { PixelQuestEvidenceRecord } from "../evidence/types"

export type EncounterAction = "admit" | "reject"

// Shared structural core of every encounter state. Each encounter kind adds
// its own counters on top; the step engine below only touches these fields
// (plus whatever the kind's applyAction returns).
export type EncounterStepState = {
  readonly definition: EvidenceSourceDefinition
  readonly index: number
  readonly complete: boolean
  readonly evidence?: PixelQuestEvidenceRecord
}

// The genuinely distinct logic of an encounter kind, injected into the shared
// step engine: the item list, the correct action per item (for auto-pass), the
// counter transition per action, and the pass/metrics outcome. Thresholds used
// by outcomeOf must come from the centralized contracts in content/types.ts or
// from definition fields derived from them — never re-hardcoded.
export type EncounterDriver<S extends EncounterStepState, I> = {
  readonly itemsOf: (state: S) => readonly I[]
  readonly correctAction: (item: I) => EncounterAction
  readonly applyAction: (state: S, item: I, action: EncounterAction) => S
  readonly outcomeOf: (state: S) => EncounterOutcome
}

// Shared step loop: complete-guard, current item lookup, delegate the counter
// transition, then advance and finish with evidence at the end. This replaces
// the four structurally identical apply/advance/finish copies.
export function applyEncounterStep<S extends EncounterStepState, I>(
  state: S,
  action: EncounterAction,
  now: Date,
  driver: EncounterDriver<S, I>,
): S {
  if (state.complete) {
    return state
  }
  const item = driver.itemsOf(state)[state.index]
  if (item === undefined) {
    return completeEncounterState(state, now, driver)
  }
  return advance(driver.applyAction(state, item, action), now, driver)
}

export function autoPassEncounterState<S extends EncounterStepState, I>(
  initial: S,
  now: Date,
  driver: EncounterDriver<S, I>,
): S {
  let state = initial
  for (const item of driver.itemsOf(initial)) {
    state = applyEncounterStep(state, driver.correctAction(item), now, driver)
  }
  return state.complete ? state : completeEncounterState(state, now, driver)
}

function completeEncounterState<S extends EncounterStepState, I>(
  state: S,
  now: Date,
  driver: EncounterDriver<S, I>,
): S {
  const evidence = buildEncounterEvidence(state.definition, driver.outcomeOf(state), now)
  return Object.assign({}, state, { complete: true, evidence })
}

function advance<S extends EncounterStepState, I>(
  state: S,
  now: Date,
  driver: EncounterDriver<S, I>,
): S {
  const next = Object.assign({}, state, { index: state.index + 1 })
  if (next.index >= driver.itemsOf(next).length) {
    return completeEncounterState(next, now, driver)
  }
  return next
}

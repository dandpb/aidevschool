import type { PolicyCheck, PolicyGateEncounter } from "../../content/types"
import type { EncounterOutcome } from "../evidence/emitter"
import type { PixelQuestEvidenceRecord } from "../evidence/types"
import {
  applyEncounterStep,
  autoPassEncounterState,
  type EncounterAction,
  type EncounterDriver,
} from "./encounterCore"

export type PolicyGateEncounterState = {
  readonly definition: PolicyGateEncounter
  readonly index: number
  readonly allowed: number
  readonly denied: number
  readonly policyLeaks: number
  readonly falseDenies: number
  readonly heatPeak: number
  readonly complete: boolean
  readonly evidence?: PixelQuestEvidenceRecord
}

export function createPolicyGateState(definition: PolicyGateEncounter): PolicyGateEncounterState {
  return {
    definition,
    index: 0,
    allowed: 0,
    denied: 0,
    policyLeaks: 0,
    falseDenies: 0,
    heatPeak: 0,
    complete: false,
  }
}

const driver: EncounterDriver<PolicyGateEncounterState, PolicyCheck> = {
  itemsOf: (state) => state.definition.checks,
  correctAction: (check) => (check.type === "allowed" ? "admit" : "reject"),
  applyAction: applyActionForCheck,
  outcomeOf: policyGateOutcome,
}

export function applyPolicyGateAction(
  state: PolicyGateEncounterState,
  action: EncounterAction,
  now: Date,
): PolicyGateEncounterState {
  return applyEncounterStep(state, action, now, driver)
}

export function getCurrentPolicyCheck(state: PolicyGateEncounterState): PolicyCheck | undefined {
  return state.definition.checks[state.index]
}

export function autoPassPolicyGate(
  definition: PolicyGateEncounter,
  now: Date,
): PolicyGateEncounterState {
  return autoPassEncounterState(createPolicyGateState(definition), now, driver)
}

function applyActionForCheck(
  state: PolicyGateEncounterState,
  check: PolicyCheck,
  action: EncounterAction,
): PolicyGateEncounterState {
  if (check.type === "allowed" && action === "admit") {
    return {
      ...state,
      allowed: state.allowed + 1,
    }
  }
  if (check.type === "denied" && action === "reject") {
    return {
      ...state,
      denied: state.denied + 1,
    }
  }
  if (check.type === "denied" && action === "admit") {
    const policyLeaks = state.policyLeaks + 1
    return {
      ...state,
      policyLeaks,
      heatPeak: Math.max(state.heatPeak, policyLeaks * 40),
    }
  }
  const falseDenies = state.falseDenies + 1
  return {
    ...state,
    falseDenies,
    heatPeak: Math.max(state.heatPeak, falseDenies * 18),
  }
}

function policyGateOutcome(state: PolicyGateEncounterState): EncounterOutcome {
  const pass =
    state.allowed >= state.definition.minAllowed &&
    state.policyLeaks <= state.definition.maxPolicyLeaks &&
    state.falseDenies === 0
  return {
    pass,
    metrics: {
      kind: "pixelquest-policy-gate",
      allowed: state.allowed,
      denied: state.denied,
      policy_leaks: state.policyLeaks,
      false_denies: state.falseDenies,
      heat_peak: state.heatPeak,
      overheated: state.policyLeaks > state.definition.maxPolicyLeaks,
    },
  }
}

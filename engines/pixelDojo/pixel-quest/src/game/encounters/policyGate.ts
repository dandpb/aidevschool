import type { PolicyCheck, PolicyGateEncounter } from "../../content/types"
import type { PixelQuestEvidenceRecord } from "../evidence/types"
import type { EncounterAction } from "./tokenBucket"

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

export function applyPolicyGateAction(
  state: PolicyGateEncounterState,
  action: EncounterAction,
  now: Date,
): PolicyGateEncounterState {
  if (state.complete) {
    return state
  }
  const check = state.definition.checks[state.index]
  if (check === undefined) {
    return finishPolicyGate(state, now)
  }
  return advancePolicyGate(applyActionForCheck(state, check, action), now)
}

export function getCurrentPolicyCheck(state: PolicyGateEncounterState): PolicyCheck | undefined {
  return state.definition.checks[state.index]
}

export function autoPassPolicyGate(
  definition: PolicyGateEncounter,
  now: Date,
): PolicyGateEncounterState {
  let state = createPolicyGateState(definition)
  for (const check of definition.checks) {
    state = applyPolicyGateAction(state, check.type === "allowed" ? "admit" : "reject", now)
  }
  return state.complete ? state : finishPolicyGate(state, now)
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

function advancePolicyGate(state: PolicyGateEncounterState, now: Date): PolicyGateEncounterState {
  const next = {
    ...state,
    index: state.index + 1,
  }
  if (next.index >= next.definition.checks.length) {
    return finishPolicyGate(next, now)
  }
  return next
}

function finishPolicyGate(state: PolicyGateEncounterState, now: Date): PolicyGateEncounterState {
  const evidence = buildEvidence(state, now)
  console.log(`EVIDENCE ${JSON.stringify(evidence)}`)
  return {
    ...state,
    complete: true,
    evidence,
  }
}

function buildEvidence(state: PolicyGateEncounterState, now: Date): PixelQuestEvidenceRecord {
  const total = Math.max(state.definition.checks.length, 1)
  const pass =
    state.allowed >= state.definition.minAllowed &&
    state.policyLeaks <= state.definition.maxPolicyLeaks &&
    state.falseDenies === 0
  return {
    source: "pixelquest",
    unit_id: state.definition.unit_id,
    project: state.definition.project,
    encounter_id: state.definition.id,
    game: "PixelDojo Quest",
    ts: now.toISOString(),
    pass,
    metrics: {
      target_rate: state.definition.minAllowed,
      observed_admit_rate: Number((state.allowed / total).toFixed(2)),
      max_burst_1s: state.allowed,
      good_admits: state.allowed,
      legit_rejected: state.falseDenies,
      abusive_admitted: state.policyLeaks,
      abusive_rejected: state.denied,
      heat_peak: state.heatPeak,
      overheated: state.policyLeaks > state.definition.maxPolicyLeaks,
    },
    curriculum_context: {
      concept: state.definition.concept,
      mechanic: state.definition.mechanicName,
      accepted_signal: state.definition.goodRequestLabel,
      rejected_trap: state.definition.badRequestLabel,
    },
  }
}

import type { RouteCheck, RouteHealthEncounter } from "../../content/types"
import type { PixelQuestEvidenceRecord } from "../evidence/types"
import type { EncounterAction } from "./tokenBucket"

export type RouteHealthEncounterState = {
  readonly definition: RouteHealthEncounter
  readonly index: number
  readonly routed: number
  readonly isolated: number
  readonly badRoutes: number
  readonly goodRejected: number
  readonly heatPeak: number
  readonly complete: boolean
  readonly evidence?: PixelQuestEvidenceRecord
}

export function createRouteHealthState(
  definition: RouteHealthEncounter,
): RouteHealthEncounterState {
  return {
    definition,
    index: 0,
    routed: 0,
    isolated: 0,
    badRoutes: 0,
    goodRejected: 0,
    heatPeak: 0,
    complete: false,
  }
}

export function applyRouteHealthAction(
  state: RouteHealthEncounterState,
  action: EncounterAction,
  now: Date,
): RouteHealthEncounterState {
  if (state.complete) {
    return state
  }
  const check = state.definition.checks[state.index]
  if (check === undefined) {
    return finishRouteHealth(state, now)
  }
  const nextState = applyActionForCheck(state, check, action)
  return advanceRouteHealth(nextState, now)
}

export function getCurrentRouteCheck(state: RouteHealthEncounterState): RouteCheck | undefined {
  return state.definition.checks[state.index]
}

export function autoPassRouteHealth(
  definition: RouteHealthEncounter,
  now: Date,
): RouteHealthEncounterState {
  let state = createRouteHealthState(definition)
  for (const check of definition.checks) {
    state = applyRouteHealthAction(state, check.type === "healthy" ? "admit" : "reject", now)
  }
  return state.complete ? state : finishRouteHealth(state, now)
}

function applyActionForCheck(
  state: RouteHealthEncounterState,
  check: RouteCheck,
  action: EncounterAction,
): RouteHealthEncounterState {
  if (check.type === "healthy" && action === "admit") {
    return {
      ...state,
      routed: state.routed + 1,
    }
  }
  if (check.type === "unhealthy" && action === "reject") {
    return {
      ...state,
      isolated: state.isolated + 1,
    }
  }
  if (check.type === "unhealthy" && action === "admit") {
    const badRoutes = state.badRoutes + 1
    return {
      ...state,
      badRoutes,
      heatPeak: Math.max(state.heatPeak, badRoutes * 35),
    }
  }
  const goodRejected = state.goodRejected + 1
  return {
    ...state,
    goodRejected,
    heatPeak: Math.max(state.heatPeak, goodRejected * 16),
  }
}

function advanceRouteHealth(
  state: RouteHealthEncounterState,
  now: Date,
): RouteHealthEncounterState {
  const next = {
    ...state,
    index: state.index + 1,
  }
  if (next.index >= next.definition.checks.length) {
    return finishRouteHealth(next, now)
  }
  return next
}

function finishRouteHealth(state: RouteHealthEncounterState, now: Date): RouteHealthEncounterState {
  const evidence = buildEvidence(state, now)
  console.log(`EVIDENCE ${JSON.stringify(evidence)}`)
  return {
    ...state,
    complete: true,
    evidence,
  }
}

function buildEvidence(state: RouteHealthEncounterState, now: Date): PixelQuestEvidenceRecord {
  const total = Math.max(state.definition.checks.length, 1)
  const pass =
    state.routed >= state.definition.minRouted &&
    state.badRoutes <= state.definition.maxBadRoutes &&
    state.goodRejected === 0
  return {
    source: "pixelquest",
    unit_id: state.definition.unit_id,
    project: state.definition.project,
    encounter_id: state.definition.id,
    game: "PixelDojo Quest",
    ts: now.toISOString(),
    pass,
    metrics: {
      target_rate: state.definition.minRouted,
      observed_admit_rate: Number((state.routed / total).toFixed(2)),
      max_burst_1s: state.routed,
      good_admits: state.routed,
      legit_rejected: state.goodRejected,
      abusive_admitted: state.badRoutes,
      abusive_rejected: state.isolated,
      heat_peak: state.heatPeak,
      overheated: state.badRoutes > state.definition.maxBadRoutes,
    },
    curriculum_context: {
      concept: state.definition.concept,
      mechanic: state.definition.mechanicName,
      accepted_signal: state.definition.goodRequestLabel,
      rejected_trap: state.definition.badRequestLabel,
    },
  }
}

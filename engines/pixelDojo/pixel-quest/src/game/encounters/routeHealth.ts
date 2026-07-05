import type { RouteCheck, RouteHealthEncounter } from "../../content/types"
import type { EncounterOutcome } from "../evidence/emitter"
import type { PixelQuestEvidenceRecord } from "../evidence/types"
import {
  applyEncounterStep,
  autoPassEncounterState,
  type EncounterAction,
  type EncounterDriver,
} from "./encounterCore"

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

const driver: EncounterDriver<RouteHealthEncounterState, RouteCheck> = {
  itemsOf: (state) => state.definition.checks,
  correctAction: (check) => (check.type === "healthy" ? "admit" : "reject"),
  applyAction: applyActionForCheck,
  outcomeOf: routeHealthOutcome,
}

export function applyRouteHealthAction(
  state: RouteHealthEncounterState,
  action: EncounterAction,
  now: Date,
): RouteHealthEncounterState {
  return applyEncounterStep(state, action, now, driver)
}

export function getCurrentRouteCheck(state: RouteHealthEncounterState): RouteCheck | undefined {
  return state.definition.checks[state.index]
}

export function autoPassRouteHealth(
  definition: RouteHealthEncounter,
  now: Date,
): RouteHealthEncounterState {
  return autoPassEncounterState(createRouteHealthState(definition), now, driver)
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

function routeHealthOutcome(state: RouteHealthEncounterState): EncounterOutcome {
  const pass =
    state.routed >= state.definition.minRouted &&
    state.badRoutes <= state.definition.maxBadRoutes &&
    state.goodRejected === 0
  return {
    pass,
    metrics: {
      kind: "pixelquest-route-health",
      routed: state.routed,
      isolated: state.isolated,
      bad_routes: state.badRoutes,
      good_rejected: state.goodRejected,
      heat_peak: state.heatPeak,
      overheated: state.badRoutes > state.definition.maxBadRoutes,
    },
  }
}

import type { EncounterDefinition } from "../../content/types"
import type { EncounterAction } from "./encounterCore"
import {
  applyPolicyGateAction,
  autoPassPolicyGate,
  createPolicyGateState,
  getCurrentPolicyCheck,
  type PolicyGateEncounterState,
} from "./policyGate"
import {
  applyRouteHealthAction,
  autoPassRouteHealth,
  createRouteHealthState,
  getCurrentRouteCheck,
  type RouteHealthEncounterState,
} from "./routeHealth"
import {
  applySequenceAction,
  autoPassSequence,
  createSequenceState,
  getCurrentSequenceStep,
  type SequenceEncounterState,
} from "./sequenceFlow"
import {
  applyEncounterAction as applyTaskQueueAction,
  autoPassEncounter as autoPassTaskQueue,
  createTaskQueueState,
  getCurrentJob as getCurrentTaskQueueJob,
  type TaskQueueEncounterState,
} from "./taskQueue"
import {
  applyEncounterAction as applyTokenBucketAction,
  autoPassEncounter as autoPassTokenBucket,
  createTokenBucketState,
  getCurrentRequest as getCurrentTokenBucketRequest,
  type TokenBucketEncounterState,
} from "./tokenBucket"

export type EncounterState =
  | TokenBucketEncounterState
  | SequenceEncounterState
  | RouteHealthEncounterState
  | PolicyGateEncounterState
  | TaskQueueEncounterState

export type EncounterPrompt = {
  readonly type: "legit" | "abuse"
  readonly label: string
}

export function createEncounterFromPack(definition: EncounterDefinition): EncounterState {
  switch (definition.kind) {
    case "token_bucket":
      return createTokenBucketState(definition)
    case "sequence_flow":
      return createSequenceState(definition)
    case "route_health":
      return createRouteHealthState(definition)
    case "policy_gate":
      return createPolicyGateState(definition)
    case "task_queue":
      return createTaskQueueState(definition)
  }
}

export function applyEncounterAction(
  state: EncounterState,
  action: EncounterAction,
  now: Date,
): EncounterState {
  if (isTokenBucketState(state)) {
    return applyTokenBucketAction(state, action, now)
  }
  if (isRouteHealthState(state)) {
    return applyRouteHealthAction(state, action, now)
  }
  if (isPolicyGateState(state)) {
    return applyPolicyGateAction(state, action, now)
  }
  if (isTaskQueueState(state)) {
    return applyTaskQueueAction(state, action, now)
  }
  return applySequenceAction(state, action, now)
}

export function autoPassEncounter(definition: EncounterDefinition, now: Date): EncounterState {
  switch (definition.kind) {
    case "token_bucket":
      return autoPassTokenBucket(definition, now)
    case "sequence_flow":
      return autoPassSequence(definition, now)
    case "route_health":
      return autoPassRouteHealth(definition, now)
    case "policy_gate":
      return autoPassPolicyGate(definition, now)
    case "task_queue":
      return autoPassTaskQueue(definition, now)
  }
}

export function getCurrentPrompt(state: EncounterState): EncounterPrompt | undefined {
  if (isTokenBucketState(state)) {
    const request = getCurrentTokenBucketRequest(state)
    if (request === undefined) {
      return undefined
    }
    return {
      type: request.type,
      label:
        request.label ??
        (request.type === "abuse"
          ? state.definition.badRequestLabel
          : state.definition.goodRequestLabel),
    }
  }
  if (isRouteHealthState(state)) {
    const check = getCurrentRouteCheck(state)
    if (check === undefined) {
      return undefined
    }
    return {
      type: check.type === "unhealthy" ? "abuse" : "legit",
      label: check.label,
    }
  }
  if (isPolicyGateState(state)) {
    const check = getCurrentPolicyCheck(state)
    if (check === undefined) {
      return undefined
    }
    return {
      type: check.type === "denied" ? "abuse" : "legit",
      label: `${check.label} [${check.scope}]`,
    }
  }
  if (isTaskQueueState(state)) {
    const job = getCurrentTaskQueueJob(state)
    if (job === undefined) {
      return undefined
    }
    return {
      type: job.type === "poison" ? "abuse" : "legit",
      label:
        job.label ??
        (job.type === "poison"
          ? state.definition.badRequestLabel
          : state.definition.goodRequestLabel),
    }
  }
  const step = getCurrentSequenceStep(state)
  if (step === undefined) {
    return undefined
  }
  return {
    type: step.type === "guard" ? "abuse" : "legit",
    label: step.label,
  }
}

export function encounterProgress(state: EncounterState): {
  readonly index: number
  readonly total: number
  readonly resourceValue: number
  readonly heatPeak: number
} {
  if (isTokenBucketState(state)) {
    return {
      index: state.index,
      total: state.definition.requests.length,
      resourceValue: state.tokens,
      heatPeak: state.heatPeak,
    }
  }
  if (isRouteHealthState(state)) {
    return {
      index: state.index,
      total: state.definition.checks.length,
      resourceValue: state.routed,
      heatPeak: state.heatPeak,
    }
  }
  if (isPolicyGateState(state)) {
    return {
      index: state.index,
      total: state.definition.checks.length,
      resourceValue: state.allowed,
      heatPeak: state.heatPeak,
    }
  }
  if (isTaskQueueState(state)) {
    return {
      index: state.index,
      total: state.definition.jobs.length,
      resourceValue: state.processed,
      heatPeak: state.backpressurePeak,
    }
  }
  return {
    index: state.index,
    total: state.definition.steps.length,
    resourceValue: state.advanced,
    heatPeak: state.heatPeak,
  }
}

function isTokenBucketState(state: EncounterState): state is TokenBucketEncounterState {
  return state.definition.kind === "token_bucket"
}

export function isRouteHealthState(state: EncounterState): state is RouteHealthEncounterState {
  return state.definition.kind === "route_health"
}

export function isPolicyGateState(state: EncounterState): state is PolicyGateEncounterState {
  return state.definition.kind === "policy_gate"
}

export function isTaskQueueState(state: EncounterState): state is TaskQueueEncounterState {
  return state.definition.kind === "task_queue"
}

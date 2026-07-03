import type { InputAction } from "../game/input/actions"
import type { WorldMode } from "../game/simulation/types"

export type RouteState = {
  readonly action: InputAction
  readonly mode: WorldMode
  readonly encounterComplete: boolean
}

export type RouteCommand =
  | { readonly kind: "none" }
  | { readonly kind: "move"; readonly action: Extract<InputAction, { readonly kind: "move" }> }
  | { readonly kind: "apply-encounter"; readonly action: "admit" | "reject" }
  | { readonly kind: "start-quest" }
  | { readonly kind: "interact" }
  | { readonly kind: "open-skill-orbit" }
  | { readonly kind: "orbit-previous" }
  | { readonly kind: "orbit-next" }
  | { readonly kind: "select-skill-orbit" }
  | { readonly kind: "open-help" }
  | { readonly kind: "open-journal" }
  | { readonly kind: "open-practice" }
  | { readonly kind: "start-encounter" }
  | { readonly kind: "close-panel" }

export function routeAction(state: RouteState): RouteCommand {
  if (state.action.kind === "orbit") {
    return routeOrbitShortcut(state.mode, state.encounterComplete)
  }
  if (state.action.kind === "help") {
    return state.mode === "encounter" && !state.encounterComplete
      ? { kind: "none" }
      : { kind: "open-help" }
  }
  if (state.mode === "briefing") {
    return routeBriefing(state.action)
  }
  if (state.mode === "encounter") {
    return routeEncounter(state.action, state.encounterComplete)
  }
  if (state.mode === "dialogue") {
    return state.action.kind === "confirm" ? { kind: "open-practice" } : routeClose(state.action)
  }
  if (state.mode === "practice") {
    return routePractice(state.action)
  }
  if (state.mode === "skill-orbit") {
    return routeSkillOrbit(state.action)
  }
  if (state.mode === "journal" || state.mode === "help") {
    return routeClose(state.action)
  }
  return routeWorld(state.action)
}

function routeOrbitShortcut(mode: WorldMode, encounterComplete: boolean): RouteCommand {
  if (mode === "encounter" && !encounterComplete) {
    return { kind: "none" }
  }
  if (mode === "skill-orbit") {
    return { kind: "close-panel" }
  }
  return mode === "briefing" || mode === "world" ? { kind: "open-skill-orbit" } : { kind: "none" }
}

function routeBriefing(action: InputAction): RouteCommand {
  if (action.kind === "confirm") {
    return { kind: "start-quest" }
  }
  if (action.kind === "journal") {
    return { kind: "open-journal" }
  }
  return { kind: "none" }
}

function routeEncounter(action: InputAction, complete: boolean): RouteCommand {
  if (action.kind === "admit" || action.kind === "reject") {
    return { kind: "apply-encounter", action: action.kind }
  }
  if (action.kind === "journal" && complete) {
    return { kind: "open-journal" }
  }
  if ((action.kind === "confirm" && complete) || action.kind === "cancel") {
    return { kind: "close-panel" }
  }
  return { kind: "none" }
}

function routePractice(action: InputAction): RouteCommand {
  if (action.kind === "confirm") {
    return { kind: "start-encounter" }
  }
  if (action.kind === "journal") {
    return { kind: "open-journal" }
  }
  return routeClose(action)
}

function routeSkillOrbit(action: InputAction): RouteCommand {
  if (action.kind === "move" && action.direction === "east") {
    return { kind: "orbit-next" }
  }
  if (action.kind === "move" && action.direction === "west") {
    return { kind: "orbit-previous" }
  }
  if (action.kind === "confirm") {
    return { kind: "select-skill-orbit" }
  }
  return routeClose(action)
}

function routeWorld(action: InputAction): RouteCommand {
  if (action.kind === "move") {
    return { kind: "move", action }
  }
  if (action.kind === "confirm") {
    return { kind: "interact" }
  }
  if (action.kind === "journal") {
    return { kind: "open-journal" }
  }
  return { kind: "none" }
}

function routeClose(action: InputAction): RouteCommand {
  return action.kind === "confirm" || action.kind === "cancel" || action.kind === "journal"
    ? { kind: "close-panel" }
    : { kind: "none" }
}

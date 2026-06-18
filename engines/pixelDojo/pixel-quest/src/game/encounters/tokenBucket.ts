import type { TokenBucketEncounter } from "../../content/types"
import type { PixelQuestEvidenceRecord } from "../evidence/types"

export type EncounterAction = "admit" | "reject"

export type TokenBucketEncounterState = {
  readonly definition: TokenBucketEncounter
  readonly index: number
  readonly tokens: number
  readonly lastAt: number
  readonly goodAdmits: number
  readonly legitRejected: number
  readonly abusiveAdmitted: number
  readonly abusiveRejected: number
  readonly heat: number
  readonly heatPeak: number
  readonly admitTimes: readonly number[]
  readonly complete: boolean
  readonly evidence?: PixelQuestEvidenceRecord
}

export function createTokenBucketState(
  definition: TokenBucketEncounter,
): TokenBucketEncounterState {
  return {
    definition,
    index: 0,
    tokens: definition.capacity,
    lastAt: 0,
    goodAdmits: 0,
    legitRejected: 0,
    abusiveAdmitted: 0,
    abusiveRejected: 0,
    heat: 0,
    heatPeak: 0,
    admitTimes: [],
    complete: false,
  }
}

export function applyEncounterAction(
  state: TokenBucketEncounterState,
  action: EncounterAction,
  now: Date,
): TokenBucketEncounterState {
  if (state.complete) {
    return state
  }
  const request = state.definition.requests[state.index]
  if (request === undefined) {
    return finishEncounter(state, now)
  }
  const elapsed = Math.max(0, request.at - state.lastAt)
  const tokens = Math.min(
    state.definition.capacity,
    state.tokens + elapsed * state.definition.refillRate,
  )
  const baseState = {
    ...state,
    tokens,
    lastAt: request.at,
  }
  if (action === "reject") {
    const rejectedState =
      request.type === "abuse"
        ? { ...baseState, abusiveRejected: baseState.abusiveRejected + 1 }
        : { ...baseState, legitRejected: baseState.legitRejected + 1 }
    return advanceEncounter(rejectedState, now)
  }
  if (tokens < 1) {
    const missedState =
      request.type === "legit"
        ? { ...baseState, legitRejected: baseState.legitRejected + 1 }
        : { ...baseState, abusiveRejected: baseState.abusiveRejected + 1 }
    return advanceEncounter(missedState, now)
  }
  const nextTokens = tokens - 1
  const nextHeat =
    request.type === "legit"
      ? baseState.heat + state.definition.heatPerLegitAdmit
      : baseState.heat + state.definition.heatPerAbuseAdmit
  const admittedState =
    request.type === "legit"
      ? {
          ...baseState,
          tokens: nextTokens,
          goodAdmits: baseState.goodAdmits + 1,
          heat: nextHeat,
          heatPeak: Math.max(baseState.heatPeak, nextHeat),
          admitTimes: [...baseState.admitTimes, request.at],
        }
      : {
          ...baseState,
          tokens: nextTokens,
          abusiveAdmitted: baseState.abusiveAdmitted + 1,
          heat: nextHeat,
          heatPeak: Math.max(baseState.heatPeak, nextHeat),
          admitTimes: [...baseState.admitTimes, request.at],
        }
  return advanceEncounter(admittedState, now)
}

export function getCurrentRequest(state: TokenBucketEncounterState) {
  return state.definition.requests[state.index]
}

export function finishEncounter(
  state: TokenBucketEncounterState,
  now: Date,
): TokenBucketEncounterState {
  const evidence = buildEvidence(state, now)
  console.log(`EVIDENCE ${JSON.stringify(evidence)}`)
  return {
    ...state,
    complete: true,
    evidence,
  }
}

export function autoPassEncounter(
  definition: TokenBucketEncounter,
  now: Date,
): TokenBucketEncounterState {
  let state = createTokenBucketState(definition)
  for (const request of definition.requests) {
    state = applyEncounterAction(state, request.type === "legit" ? "admit" : "reject", now)
  }
  return state.complete ? state : finishEncounter(state, now)
}

function advanceEncounter(state: TokenBucketEncounterState, now: Date): TokenBucketEncounterState {
  const next = {
    ...state,
    index: state.index + 1,
  }
  if (next.index >= next.definition.requests.length) {
    return finishEncounter(next, now)
  }
  return next
}

function buildEvidence(state: TokenBucketEncounterState, now: Date): PixelQuestEvidenceRecord {
  const lastRequest = state.definition.requests.at(-1)
  const duration = Math.max(lastRequest?.at ?? 1, 1)
  const observedRate = state.goodAdmits / duration
  const overheated = state.heatPeak >= state.definition.heatMax
  const pass =
    !overheated &&
    state.goodAdmits >= 8 &&
    state.abusiveAdmitted === 0 &&
    observedRate <= state.definition.targetRate * 1.35
  return {
    source: "pixelquest",
    unit_id: state.definition.unit_id,
    project: "01_rate_limiter",
    encounter_id: state.definition.id,
    game: "PixelDojo Quest",
    ts: now.toISOString(),
    pass,
    metrics: {
      target_rate: state.definition.targetRate,
      observed_admit_rate: Number(observedRate.toFixed(2)),
      max_burst_1s: maxAdmitsInWindow(state.admitTimes, 1),
      good_admits: state.goodAdmits,
      legit_rejected: state.legitRejected,
      abusive_admitted: state.abusiveAdmitted,
      abusive_rejected: state.abusiveRejected,
      heat_peak: Math.round(state.heatPeak),
      overheated,
    },
  }
}

function maxAdmitsInWindow(times: readonly number[], windowSeconds: number): number {
  let max = 0
  for (let i = 0; i < times.length; i += 1) {
    const start = times[i]
    if (start === undefined) {
      continue
    }
    let count = 0
    for (let j = i; j < times.length; j += 1) {
      const current = times[j]
      if (current !== undefined && current - start <= windowSeconds) {
        count += 1
      }
    }
    max = Math.max(max, count)
  }
  return max
}

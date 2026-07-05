import {
  TOKEN_BUCKET_CONTRACT,
  type TokenBucketEncounter,
  type TokenBucketRequest,
} from "../../content/types"
import type { EncounterOutcome } from "../evidence/emitter"
import type { PixelQuestEvidenceRecord } from "../evidence/types"
import {
  applyEncounterStep,
  autoPassEncounterState,
  type EncounterAction,
  type EncounterDriver,
} from "./encounterCore"

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

const driver: EncounterDriver<TokenBucketEncounterState, TokenBucketRequest> = {
  itemsOf: (state) => state.definition.requests,
  correctAction: (request) => (request.type === "legit" ? "admit" : "reject"),
  applyAction: applyRequestAction,
  outcomeOf: tokenBucketOutcome,
}

export function applyEncounterAction(
  state: TokenBucketEncounterState,
  action: EncounterAction,
  now: Date,
): TokenBucketEncounterState {
  return applyEncounterStep(state, action, now, driver)
}

export function getCurrentRequest(
  state: TokenBucketEncounterState,
): TokenBucketRequest | undefined {
  return state.definition.requests[state.index]
}

export function autoPassEncounter(
  definition: TokenBucketEncounter,
  now: Date,
): TokenBucketEncounterState {
  return autoPassEncounterState(createTokenBucketState(definition), now, driver)
}

function applyRequestAction(
  state: TokenBucketEncounterState,
  request: TokenBucketRequest,
  action: EncounterAction,
): TokenBucketEncounterState {
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
    return request.type === "abuse"
      ? { ...baseState, abusiveRejected: baseState.abusiveRejected + 1 }
      : { ...baseState, legitRejected: baseState.legitRejected + 1 }
  }
  if (tokens < 1) {
    return request.type === "legit"
      ? { ...baseState, legitRejected: baseState.legitRejected + 1 }
      : { ...baseState, abusiveRejected: baseState.abusiveRejected + 1 }
  }
  const nextTokens = tokens - 1
  const nextHeat =
    request.type === "legit"
      ? baseState.heat + state.definition.heatPerLegitAdmit
      : baseState.heat + state.definition.heatPerAbuseAdmit
  return request.type === "legit"
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
}

function tokenBucketOutcome(state: TokenBucketEncounterState): EncounterOutcome {
  const lastRequest = state.definition.requests.at(-1)
  const duration = Math.max(lastRequest?.at ?? 1, 1)
  const observedRate = state.goodAdmits / duration
  const overheated = state.heatPeak >= state.definition.heatMax
  const pass =
    !overheated &&
    state.goodAdmits >= TOKEN_BUCKET_CONTRACT.minGoodAdmits &&
    state.abusiveAdmitted <= TOKEN_BUCKET_CONTRACT.maxAbusiveAdmitted &&
    observedRate <= state.definition.targetRate * TOKEN_BUCKET_CONTRACT.maxObservedRateMultiplier
  return {
    pass,
    metrics: {
      kind: "pixelquest-token-bucket",
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
  let startIdx = 0
  let currentWindowCount = 0

  // ⚡ Bolt: Optimized from O(n^2) nested loop to O(n) sliding window.
  // This significantly reduces iteration overhead for high-frequency token bursts.
  for (let endIdx = 0; endIdx < times.length; endIdx += 1) {
    const current = times[endIdx]
    if (current === undefined) {
      continue
    }

    currentWindowCount += 1

    while (startIdx <= endIdx) {
      const start = times[startIdx]
      if (start === undefined) {
        startIdx += 1
        continue
      }

      if (current - start > windowSeconds) {
        startIdx += 1
        currentWindowCount -= 1
      } else {
        break
      }
    }
    max = Math.max(max, currentWindowCount)
  }
  return max
}

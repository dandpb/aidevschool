import {
  type Assignment,
  assign,
  loadSkew,
  moduloAssign,
  movedKeys,
  type Station,
  theoreticalMovedFraction,
} from "./ring"
import { keyStream, mulberry32 } from "./rng"

export type LevelId = "L1" | "L2" | "L3" | "L4"

export interface LevelConfig {
  id: LevelId
  title: string
  lesson: string
  seed: number
  keyCount: number
  skew: number
  startStations: number
  /** scripted topology event applied mid-wave */
  event: "none" | "join" | "leave"
  moduloMode: boolean
  vnodesUnlocked: boolean
  passRule: string
}

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "L1",
    title: "First ring",
    lesson: "A key belongs to the next station clockwise from its hash.",
    seed: 11,
    keyCount: 12,
    skew: 0,
    startStations: 3,
    event: "none",
    moduloMode: false,
    vnodesUnlocked: false,
    passRule: "Predict the owner of ≥80% of incoming keys.",
  },
  {
    id: "L2",
    title: "Join & leave",
    lesson: "A topology change re-homes only the neighboring arc (~K/N keys).",
    seed: 22,
    keyCount: 400,
    skew: 0,
    startStations: 4,
    event: "join",
    moduloMode: false,
    vnodesUnlocked: false,
    passRule: "Predict the station that loses keys; moved ratio must stay near K/N.",
  },
  {
    id: "L3",
    title: "Skewed world",
    lesson: "Few anchors ⇒ lumpy arcs. Virtual nodes smooth the load.",
    seed: 33,
    keyCount: 600,
    skew: 0.5,
    startStations: 4,
    event: "none",
    moduloMode: false,
    vnodesUnlocked: true,
    passRule: "Bring load skew ≤ 1.6 using the vnode dial.",
  },
  {
    id: "L4",
    title: "Modulo storm",
    lesson: "hash % N moves almost every key on any change. That is why consistent hashing exists.",
    seed: 44,
    keyCount: 400,
    skew: 0,
    startStations: 4,
    event: "join",
    moduloMode: true,
    vnodesUnlocked: false,
    passRule: "State the expected moved fraction for both modes, then survive the storm.",
  },
] as const

export function levelConfig(id: LevelId): LevelConfig {
  const cfg = LEVELS.find((l) => l.id === id)
  if (!cfg) throw new Error(`unknown level ${id}`)
  return cfg
}

export function makeStations(count: number, vnodes = 1): Station[] {
  return Array.from({ length: count }, (_, i) => ({ id: `st-${i}`, vnodes }))
}

export function keysFor(cfg: LevelConfig): string[] {
  return keyStream(mulberry32(cfg.seed), cfg.keyCount, cfg.skew)
}

export interface WaveOutcome {
  pass: boolean
  metrics: Record<string, number | boolean>
}

/** L1: active-recall on ownership. */
export function evaluatePredictions(correct: number, total: number): WaveOutcome {
  const accuracy = total === 0 ? 0 : correct / total
  return {
    pass: accuracy >= 0.8,
    metrics: { owner_predictions: total, owner_prediction_accuracy: round2(accuracy) },
  }
}

/** L2/L4: topology change — did the player predict the moving arc, and did the ring behave? */
export function evaluateTopologyChange(args: {
  keys: readonly string[]
  before: readonly Station[]
  after: readonly Station[]
  moduloMode: boolean
  predictedLoserId: string | null
  actualLoserId: string
  contrastStated: boolean
}): WaveOutcome {
  const assignFn = args.moduloMode ? moduloAssign : assign
  const beforeAssign: Assignment = assignFn(args.keys, args.before)
  const afterAssign: Assignment = assignFn(args.keys, args.after)
  const moved = movedKeys(beforeAssign, afterAssign).length
  const movedRatio = moved / args.keys.length
  const theoretical = theoreticalMovedFraction(args.before.length, args.after.length)
  const predictionOk = args.predictedLoserId === args.actualLoserId
  const withinBound = args.moduloMode ? true : movedRatio <= theoretical * 1.75 + 0.02
  const survived = args.moduloMode ? args.contrastStated : true
  return {
    pass: predictionOk && withinBound && survived,
    metrics: {
      moved_keys: moved,
      moved_ratio: round2(movedRatio),
      theoretical_kn: round2(theoretical),
      arc_prediction_ok: predictionOk,
      modulo_mode: args.moduloMode,
      modulo_contrast_stated: args.contrastStated,
    },
  }
}

/** L3: fix skew with virtual nodes. */
export function evaluateSkewFix(
  keys: readonly string[],
  stations: readonly Station[],
): WaveOutcome {
  const skew = loadSkew(assign(keys, stations), stations)
  const vnodes = stations[0]?.vnodes ?? 1
  return {
    pass: skew <= 1.6 && vnodes > 1,
    metrics: { load_skew: round2(skew), vnodes_used: vnodes },
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

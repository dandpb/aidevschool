import { bucketOf, type HashStrength } from "./hash"
import { keyStream, mulberry32 } from "./rng"
import {
  type Clock,
  createStore,
  type Entry,
  get,
  loadSkew,
  put,
  type Store,
  sweepExpired,
} from "./store"

export type LevelId = "L1" | "L2" | "L3" | "L4"

export interface LevelConfig {
  id: LevelId
  title: string
  lesson: string
  seed: number
  /** number of crates the wave streams in (keys to predict / store). */
  keyCount: number
  /** share of keys drawn from a small hot region (L4 load skew). */
  skew: number
  startShelves: number
  /** ms the wall clock advances per crate (L3 TTL decay). 0 ⇒ no advance. */
  ttlMs: number
  /** TTL assigned to put crates, in ms (L3). 0 ⇒ no TTL / persistent. */
  crateTtlMs: number
  /**
   * Hash strength the level starts at. L1–L3 use `"full"` (a good hash ⇒ stable, even shelves).
   * L4 starts at a poor prefix-only strength so the keyspace visibly skews, and the player dials
   * the strength UP (mixing more of the key) until the load evens out.
   */
  startStrength: HashStrength
  /** L4 maximum hash strength the player may dial up to. */
  maxStrength: number
  passRule: string
}

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "L1",
    title: "Hash → shelf",
    lesson: "A crate always lands on the shelf its key hashes to. Same key ⇒ same shelf.",
    seed: 11,
    keyCount: 12,
    skew: 0,
    startShelves: 6,
    ttlMs: 0,
    crateTtlMs: 0,
    startStrength: "full",
    maxStrength: 32,
    passRule: "Predict the shelf for ≥80% of incoming crates.",
  },
  {
    id: "L2",
    title: "CRUD",
    lesson:
      "put/get/del operate on the hashed slot — get misses return null, del removes the crate.",
    seed: 22,
    keyCount: 10,
    skew: 0,
    startShelves: 6,
    ttlMs: 0,
    crateTtlMs: 0,
    startStrength: "full",
    maxStrength: 32,
    passRule: "Answer every get-probe correctly — a missing key returns null, not an error.",
  },
  {
    id: "L3",
    title: "TTL decay",
    lesson:
      "A crate with a deadline is invisible past it. get returns null; sweep reclaims only expired.",
    seed: 33,
    keyCount: 10,
    skew: 0,
    startShelves: 6,
    ttlMs: 100,
    crateTtlMs: 350,
    startStrength: "full",
    maxStrength: 32,
    passRule: "Predict get-vs-null after decay, then sweep and predict how many vanish.",
  },
  {
    id: "L4",
    title: "Skew",
    lesson:
      "A weak prefix-only hash collides similar keys on one shelf. Mixing more of the key spreads the load.",
    seed: 44,
    keyCount: 400,
    skew: 0.7,
    startShelves: 8,
    ttlMs: 0,
    crateTtlMs: 0,
    startStrength: 2,
    maxStrength: 32,
    passRule: "Dial the hash strength up until load skew ≤ 1.6.",
  },
] as const

export function levelConfig(id: LevelId): LevelConfig {
  const cfg = LEVELS.find((l) => l.id === id)
  if (!cfg) throw new Error(`unknown level ${id}`)
  return cfg
}

/** Deterministic key stream for a level. */
export function keysFor(cfg: LevelConfig): string[] {
  return keyStream(mulberry32(cfg.seed), cfg.keyCount, cfg.skew)
}

/** Build a fresh store pre-loaded with a level's keys (used by L2/L3/L4 setup). */
export function storeFor<V = string>(
  cfg: LevelConfig,
  makeValue: (key: string, i: number) => V,
): {
  store: Store<V>
  keys: string[]
  clock: Clock
} {
  const keys = keysFor(cfg)
  const store = createStore<V>(cfg.startShelves, cfg.startStrength)
  let t = 0
  const clock: Clock = () => t
  keys.forEach((k, i) => {
    t += cfg.ttlMs
    put(store, k, makeValue(k, i), clock, {
      ttlMs: cfg.crateTtlMs > 0 ? cfg.crateTtlMs : null,
    })
  })
  return { store, keys, clock }
}

export interface WaveOutcome {
  pass: boolean
  metrics: Record<string, number | boolean>
}

/** L1: active recall on the stable hash — did the player predict the right shelf? */
export function evaluateShelfPredictions(
  predictions: ReadonlyArray<{ key: string; shelf: number }>,
  shelfCount: number,
): WaveOutcome {
  let correct = 0
  for (const p of predictions) {
    if (p.shelf === bucketOf(p.key, shelfCount)) correct++
  }
  const total = predictions.length
  const accuracy = total === 0 ? 0 : correct / total
  return {
    pass: accuracy >= 0.8,
    metrics: {
      shelf_predictions: total,
      shelf_prediction_accuracy: round2(accuracy),
    },
  }
}

export interface CrudProbe {
  key: string
  /** player predicted whether `get` returns the value (true) or null / missing (false). */
  predictedAlive: boolean
}

/** L2: every get-probe must match the store's truth (present ⇒ value, missing/expired ⇒ null). */
export function evaluateCrud<V>(
  store: Store<V>,
  probes: ReadonlyArray<CrudProbe>,
  now: Clock,
): WaveOutcome {
  let correct = 0
  for (const probe of probes) {
    const alive = get(store, probe.key, now) !== null
    if (alive === probe.predictedAlive) correct++
  }
  const total = probes.length
  const accuracy = total === 0 ? 1 : correct / total
  return {
    pass: accuracy >= 1,
    metrics: {
      crud_probes: total,
      crud_accuracy: round2(accuracy),
    },
  }
}

export interface TtlProbe {
  key: string
  /** player predicted whether get returns the value (true) or null (false). */
  predictedAlive: boolean
}

/** L3: predict get-vs-null after decay, then sweep and predict the expired count. */
export function evaluateTtl<V>(
  store: Store<V>,
  probes: ReadonlyArray<TtlProbe>,
  predictedSwept: number,
  now: Clock,
): WaveOutcome {
  let correct = 0
  for (const p of probes) {
    const alive = get(store, p.key, now) !== null
    if (alive === p.predictedAlive) correct++
  }
  const actualSwept = sweepExpired(store, now).length
  const sweptCorrect = actualSwept === predictedSwept
  const accuracy = probes.length === 0 ? 1 : correct / probes.length
  return {
    pass: accuracy >= 0.8 && sweptCorrect,
    metrics: {
      ttl_probes: probes.length,
      ttl_accuracy: round2(accuracy),
      expired_swept: actualSwept,
      swept_prediction_ok: sweptCorrect,
    },
  }
}

/** L4: fix skew by dialing the hash strength up. Pass iff skew ≤ bound AND strength improved. */
export function evaluateSkewFix<V>(store: Store<V>, now: Clock): WaveOutcome {
  const skew = loadSkew(store, now)
  const strength = store.hashStrength
  const strengthNum = strength === "full" ? Number.MAX_SAFE_INTEGER : strength
  return {
    pass: skew <= 1.6 && strengthNum > 1,
    metrics: {
      load_skew: round2(skew),
      hash_strength: strengthNum === Number.MAX_SAFE_INTEGER ? -1 : strengthNum,
    },
  }
}

/** A level's live entries as key → shelf, for the scene + HUD. */
export function shelfAssignments<V>(store: Store<V>, now: Clock): Map<string, number> {
  const t = now()
  const out = new Map<string, number>()
  for (const [key, entry] of store.entries) {
    const live = entry.deadline === null || entry.deadline > t
    if (live) out.set(key, bucketOf(key, store.shelfCount, store.hashStrength))
  }
  return out
}

/** Convenience: live entry or undefined (used by HUD/scene). */
export function entryOf<V>(store: Store<V>, key: string): Entry<V> | undefined {
  return store.entries.get(key)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

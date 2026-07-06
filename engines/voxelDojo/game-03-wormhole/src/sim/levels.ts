import { mulberry32, urlStream } from "./rng"
import {
  CODE_LEN,
  detectCollision,
  emptyMap,
  hashTruncCode,
  redirect,
  resolveIncrement,
  resolveSalted,
  type ShortMap,
  type Strategy,
  shorten,
  toBase62,
} from "./shortener"

export type LevelId = "L1" | "L2" | "L3" | "L4"
export type ResolutionStrategy = "salted" | "increment"

export interface LevelConfig {
  id: LevelId
  title: string
  lesson: string
  /** deterministic seed for the URL stream */
  seed: number
  /** how many URLs arrive in this wave */
  urlCount: number
  /** the active shortening strategy */
  strategy: Strategy
  /** L3/L4: a constructed pair of URLs that collide under hash_trunc */
  forcedCollision: boolean
  passRule: string
}

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "L1",
    title: "Stamp gate",
    lesson: "A URL is shortened to a base62 code. Predict the gate's code.",
    seed: 11,
    urlCount: 6,
    strategy: "hash_trunc",
    forcedCollision: false,
    passRule: "Predict the base62 code of ≥80% of incoming URLs.",
  },
  {
    id: "L2",
    title: "Redirect",
    lesson:
      "redirect(map, code) sends a traveller to the destination URL. Predict the exit planet.",
    seed: 22,
    urlCount: 6,
    strategy: "hash_trunc",
    forcedCollision: false,
    passRule: "Predict the destination planet of ≥80% of stamped codes.",
  },
  {
    id: "L3",
    title: "Collision",
    lesson: "Truncated hashes collide. Two URLs can map to the same code.",
    seed: 33,
    urlCount: 6,
    strategy: "hash_trunc",
    forcedCollision: true,
    passRule: "Correctly predict whether each new URL collides with an existing code.",
  },
  {
    id: "L4",
    title: "Resolve",
    lesson: "A collision is resolved by re-salting (new code) or incrementing (next free code).",
    seed: 44,
    urlCount: 6,
    strategy: "hash_trunc",
    forcedCollision: true,
    passRule: "Pick a resolution that yields a unique code and a clean wormhole.",
  },
] as const

export function levelConfig(id: LevelId): LevelConfig {
  const cfg = LEVELS.find((l) => l.id === id)
  if (!cfg) throw new Error(`unknown level ${id}`)
  return cfg
}

/** Build the deterministic URL stream for a level. */
export function urlsFor(cfg: LevelConfig): string[] {
  return urlStream(mulberry32(cfg.seed), cfg.urlCount)
}

/**
 * For L3/L4, replace two stream entries with a constructed colliding pair (same hash-truncation,
 * different full hash). Deterministic: same seed ⇒ same pair. Returns the urls and the indices
 * of the two colliding entries (the second one is the "collider").
 */
export function withForcedCollision(
  urls: string[],
  cfg: LevelConfig,
): {
  urls: string[]
  colliderIndex: number
} {
  if (!cfg.forcedCollision) return { urls: [...urls], colliderIndex: -1 }
  const pair = findCollidingPair()
  const out = [...urls]
  const firstIdx = Math.floor(out.length / 2) - 1
  const colliderIdx = firstIdx + 1
  out[firstIdx] = pair[0]
  out[colliderIdx] = pair[1]
  return { urls: out, colliderIndex: colliderIdx }
}

/** Deterministically find a pair of URLs that collide under truncation (birthday attack, O(n)). */
export function findCollidingPair(): [string, string] {
  const base = "https://wormhole.collide/"
  const seen = new Map<string, number>() // truncated code → first index that produced it
  for (let i = 0; i < 500_000; i++) {
    const url = `${base}${i}`
    const code = hashTruncCode(url)
    const prev = seen.get(code)
    if (prev !== undefined) return [`${base}${prev}`, url]
    seen.set(code, i)
  }
  throw new Error("no colliding pair found")
}

export interface WaveOutcome {
  pass: boolean
  metrics: Record<string, number | boolean | string>
}

// ── L1: predict the code ─────────────────────────────────────────────────────

/** Ground-truth code for a URL under the active strategy (used by HUD hints + smoke). */
export function predictedCode(url: string, strategy: Strategy, mapSize: number): string {
  if (strategy === "counter") {
    return toPaddedBase62(mapSize)
  }
  return hashTruncCode(url)
}

/** L1 evaluate: how many code predictions were right? */
export function evaluateCodePredictions(
  correct: number,
  total: number,
  strategy: Strategy,
): WaveOutcome {
  const accuracy = total === 0 ? 0 : correct / total
  return {
    pass: accuracy >= 0.8,
    metrics: {
      code_predictions: total,
      code_prediction_accuracy: round2(accuracy),
      strategy,
    },
  }
}

// ── L2: predict the destination ──────────────────────────────────────────────

/** L2 evaluate: how many redirect-destination predictions were right? */
export function evaluateRedirectPredictions(correct: number, total: number): WaveOutcome {
  const accuracy = total === 0 ? 0 : correct / total
  return {
    pass: accuracy >= 0.8,
    metrics: {
      redirect_predictions: total,
      redirect_prediction_accuracy: round2(accuracy),
    },
  }
}

// ── L3: predict the collision ────────────────────────────────────────────────

export interface CollisionPrediction {
  url: string
  predictedCollision: boolean
  actualCollision: boolean
}

/** L3 evaluate: every collision prediction must be correct (both directions). */
export function evaluateCollisionPredictions(predictions: CollisionPrediction[]): WaveOutcome {
  const total = predictions.length
  const correct = predictions.filter((p) => p.predictedCollision === p.actualCollision).length
  const accuracy = total === 0 ? 0 : correct / total
  return {
    pass: accuracy >= 0.8,
    metrics: {
      collision_predictions: total,
      collision_prediction_accuracy: round2(accuracy),
      collisions_present: predictions.filter((p) => p.actualCollision).length,
    },
  }
}

/** Does `url` collide against the current map under hash_trunc? */
export function wouldCollide(map: ShortMap, url: string): boolean {
  return detectCollision(map, hashTruncCode(url), url)
}

// ── L4: pick the resolution ──────────────────────────────────────────────────

export interface ResolveDecision {
  url: string
  collidingCode: string
  map: ShortMap
  chosen: ResolutionStrategy
}

/** Apply the chosen resolution and return the resulting code + whether it is unique. */
export function applyResolution(decision: ResolveDecision): {
  code: string
  resolved: boolean
  map: ShortMap
} {
  let code: string
  const next = new Map(decision.map)
  if (decision.chosen === "salted") {
    code = resolveSalted(next, decision.url)
  } else {
    code = resolveIncrement(next, decision.collidingCode)
  }
  const resolved = !detectCollision(next, code, decision.url)
  next.set(code, {
    url: decision.url,
    strategy: decision.chosen === "salted" ? "salted" : "hash_trunc",
  })
  return { code, resolved, map: next }
}

/** L4 evaluate: the chosen resolution must produce a unique code AND a working redirect. */
export function evaluateResolution(decision: ResolveDecision): WaveOutcome {
  const { code, resolved, map } = applyResolution(decision)
  // A clean wormhole: the resolved code redirects to the url we wanted.
  const redir = redirect(map, code)
  const cleanRedirect = redir.found && redir.url === decision.url
  const pass = resolved && cleanRedirect
  return {
    pass,
    metrics: {
      resolution_chosen: decision.chosen,
      resolved_code: code,
      resolved_unique: resolved,
      redirect_ok: cleanRedirect,
    },
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function toPaddedBase62(n: number): string {
  return toBase62(n).padStart(CODE_LEN, "0").slice(0, CODE_LEN)
}

/** Build the starting map for a level by shortening all-but-the-last URL. */
export function seedMap(urls: string[], strategy: Strategy): ShortMap {
  let map = emptyMap()
  for (const url of urls) {
    map = shorten(map, url, strategy).map
  }
  return map
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

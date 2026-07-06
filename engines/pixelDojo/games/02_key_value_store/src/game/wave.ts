// Wave definition + op resolution. Each wave is a fixed, deterministic
// sequence of ops the player must resolve in order. Resolution mutates the
// KvStore (the source of truth) and accrues counters in KvMetrics.
//
// The op resolution functions are pure with respect to the DOM/three.js — they
// take a store, a clock `now`, and a player-chosen shelf, and return an OpOutcome
// describing what happened. The 3D scene reads the store + metrics to render.

import type { KvStore } from "./kvstore"

export type KvOp =
  | { readonly kind: "SET"; readonly key: string; readonly value: string }
  | { readonly kind: "GET"; readonly key: string }
  | { readonly kind: "DEL"; readonly key: string }
  | { readonly kind: "EXPIRE"; readonly key: string; readonly ttlMs: number }
  | { readonly kind: "PERSIST"; readonly key: string }

export type KvMetrics = {
  readonly puts_total: number
  readonly puts_correct: number
  readonly gets_total: number
  readonly gets_correct: number
  readonly misses_total: number
  readonly misses_correct: number
  readonly dels_total: number
  readonly dels_correct: number
  readonly expire_total: number
  readonly expire_correct: number
  readonly stale_reads: number
  readonly wrong_bucket_routes: number
  readonly collisions_chained: number
  readonly overflow: boolean
}

export type OpOutcome = {
  readonly kind: KvOp["kind"]
  readonly key: string
  readonly shelfChosen: number
  readonly shelfExpected: number
  // What actually happened at the store level.
  readonly result:
    | "PUT"
    | "HIT"
    | "MISS"
    | "DELETED"
    | "EXPIRED"
    | "PERSISTED"
    | "WRONG_ROUTE"
    | "NOOP"
  // Did this op satisfy the wave's correctness rule?
  readonly correct: boolean
}

export function emptyMetrics(): KvMetrics {
  return {
    puts_total: 0,
    puts_correct: 0,
    gets_total: 0,
    gets_correct: 0,
    misses_total: 0,
    misses_correct: 0,
    dels_total: 0,
    dels_correct: 0,
    expire_total: 0,
    expire_correct: 0,
    stale_reads: 0,
    wrong_bucket_routes: 0,
    collisions_chained: 0,
    overflow: false,
  }
}

// Mutates `metrics` in place by resolving `op` against `store` using
// `shelfChosen` as the player's routing decision. Returns the OpOutcome so the
// caller can drive HUD feedback. `now` is the epoch-ms clock the game passes
// in (it owns time, so TTL behavior is deterministic under test).
export function resolveOp(
  store: KvStore<string>,
  metrics: KvMetrics,
  op: KvOp,
  shelfChosen: number,
  now: number,
): OpOutcome {
  const shelfExpected = store.bucketIndex(op.key)
  const wrongShelf = shelfChosen !== shelfExpected

  if (op.kind === "SET") {
    const depthBefore = store.chainDepth(shelfExpected)
    if (wrongShelf) {
      // The crate clips through the floor — it is NOT stored. Routing error.
      return applyOutcome(metrics, {
        kind: op.kind,
        key: op.key,
        shelfChosen,
        shelfExpected,
        result: "WRONG_ROUTE",
        correct: false,
      })
    }
    store.set(op.key, op.value, now)
    const depthAfter = store.chainDepth(shelfExpected)
    const collision = depthAfter > depthBefore
    return applyOutcome(
      metrics,
      {
        kind: op.kind,
        key: op.key,
        shelfChosen,
        shelfExpected,
        result: "PUT",
        correct: true,
      },
      { puts: true, collision },
    )
  }

  if (op.kind === "GET") {
    if (wrongShelf) {
      return applyOutcome(metrics, {
        kind: op.kind,
        key: op.key,
        shelfChosen,
        shelfExpected,
        result: "WRONG_ROUTE",
        correct: false,
      })
    }
    const got = store.get(op.key, now)
    if (got.status === "HIT") {
      return applyOutcome(
        metrics,
        {
          kind: op.kind,
          key: op.key,
          shelfChosen,
          shelfExpected,
          result: "HIT",
          correct: true,
        },
        { getHit: true },
      )
    }
    // MISS — was it correct? A MISS is correct when no live crate is there.
    // The store guarantees this (lazy TTL), so a MISS at the right shelf is
    // always a correct MISS — never a stale read.
    return applyOutcome(
      metrics,
      {
        kind: op.kind,
        key: op.key,
        shelfChosen,
        shelfExpected,
        result: "MISS",
        correct: true,
      },
      { getMiss: true },
    )
  }

  if (op.kind === "DEL") {
    if (wrongShelf) {
      return applyOutcome(metrics, {
        kind: op.kind,
        key: op.key,
        shelfChosen,
        shelfExpected,
        result: "WRONG_ROUTE",
        correct: false,
      })
    }
    const removed = store.del(op.key, now)
    return applyOutcome(
      metrics,
      {
        kind: op.kind,
        key: op.key,
        shelfChosen,
        shelfExpected,
        result: removed ? "DELETED" : "NOOP",
        correct: removed,
      },
      { del: removed },
    )
  }

  if (op.kind === "EXPIRE") {
    if (wrongShelf) {
      return applyOutcome(metrics, {
        kind: op.kind,
        key: op.key,
        shelfChosen,
        shelfExpected,
        result: "WRONG_ROUTE",
        correct: false,
      })
    }
    const applied = store.expire(op.key, op.ttlMs, now)
    return applyOutcome(
      metrics,
      {
        kind: op.kind,
        key: op.key,
        shelfChosen,
        shelfExpected,
        result: applied ? "EXPIRED" : "NOOP",
        correct: applied,
      },
      { expire: applied },
    )
  }

  // PERSIST
  if (wrongShelf) {
    return applyOutcome(metrics, {
      kind: op.kind,
      key: op.key,
      shelfChosen,
      shelfExpected,
      result: "WRONG_ROUTE",
      correct: false,
    })
  }
  const persisted = store.persist(op.key, now)
  return applyOutcome(
    metrics,
    {
      kind: op.kind,
      key: op.key,
      shelfChosen,
      shelfExpected,
      result: persisted ? "PERSISTED" : "NOOP",
      correct: persisted,
    },
    { expire: persisted },
  )
}

// The default smoke-test wave. N=8, hash = sum-of-char-codes mod 8.
// Exercises: SET, GET-live, EXPIRE + drain → GET-MISS, SET-overwrite, DEL,
// GET-MISS-after-DEL. Deterministic; the smoke spec computes the expected
// shelf for each op from the same hashKey() the store uses.
export function defaultWave(): readonly KvOp[] {
  return [
    { kind: "SET", key: "user:42", value: "alice" }, // shelf 7
    { kind: "SET", key: "cart:9", value: "x" }, // shelf 5
    { kind: "GET", key: "user:42" }, // shelf 7 → HIT
    { kind: "EXPIRE", key: "user:42", ttlMs: 1200 }, // shelf 7 → live becomes dark after 1.2s
    { kind: "GET", key: "user:42" }, // shelf 7 → MISS (expired)
    { kind: "SET", key: "user:42", value: "alice2" }, // shelf 7 → overwrite, persistent
    { kind: "GET", key: "user:42" }, // shelf 7 → HIT
    { kind: "DEL", key: "cart:9" }, // shelf 5 → DELETED
    { kind: "GET", key: "cart:9" }, // shelf 5 → MISS (deleted)
  ]
}

type ApplyDelta = {
  readonly puts?: boolean
  readonly getHit?: boolean
  readonly getMiss?: boolean
  readonly del?: boolean
  readonly expire?: boolean
  readonly collision?: boolean
}

// Mutates the metrics object in place — KvMetrics fields are readonly on the
// type, but the game accumulates into a single mutable accumulator that is
// re-published as a fresh object after each op (see withMetrics).
function applyOutcome(metrics: KvMetrics, outcome: OpOutcome, delta: ApplyDelta = {}): OpOutcome {
  const m = metrics as WritableMetrics
  if (outcome.result === "WRONG_ROUTE") {
    m.wrong_bucket_routes += 1
    return outcome
  }
  if (delta.puts) {
    m.puts_total += 1
    if (outcome.correct) m.puts_correct += 1
  }
  if (delta.getHit) {
    m.gets_total += 1
    if (outcome.correct) m.gets_correct += 1
  }
  if (delta.getMiss) {
    m.misses_total += 1
    if (outcome.correct) m.misses_correct += 1
  }
  if (outcome.kind === "DEL") {
    m.dels_total += 1
    if (delta.del) m.dels_correct += 1
  }
  if (outcome.kind === "EXPIRE" || outcome.kind === "PERSIST") {
    m.expire_total += 1
    if (delta.expire) m.expire_correct += 1
  }
  if (delta.collision) {
    m.collisions_chained += 1
  }
  return outcome
}

type WritableMetrics = {
  puts_total: number
  puts_correct: number
  gets_total: number
  gets_correct: number
  misses_total: number
  misses_correct: number
  dels_total: number
  dels_correct: number
  expire_total: number
  expire_correct: number
  stale_reads: number
  wrong_bucket_routes: number
  collisions_chained: number
  overflow: boolean
}

// Deterministic Level-1 wave for the Log River Delta game.
//
// Scripted so the smoke spec can drive it to a PASS by exact key presses.
// Wave shape:
//   - 4 tributaries (payments, checkout, inventory, auth)
//   - 4 bursts, each with 12 droplets = 48 spawn attempts
//   - 5 of those are re-emitted log_ids (deduped, RF-020)
//   - 4 droplets in burst 1 form a 4-span cross-service trace (corr_42):
//       span s1 (checkout, root,  ts 1000)
//       span s2 (payments, p=s1,  ts 1100)
//       span s3 (inventory,p=s1,  ts 1200)
//       span s4 (checkout, p=s2,  ts 1300)
//   - One error log from payments in burst 2 ("payments timeout") used for
//     the filter contract.
//
// Contracts (in order):
//   1. Query "find the error log"            (filter: level=error)
//   2. Trace "reconstruct corr_42"           (filter: correlation=corr_42)
//
// Player drive (smoke): B B B B  → wait for aging → F E×5 Z  → F×2 E Z T.

import type { Burst, Contract, LogEntry, LogLevel, LogSource } from "./logriver"
import { SOURCES } from "./logriver"

type EntrySeed = {
  readonly log_id: string
  readonly level: LogLevel
  readonly source: LogSource
  readonly correlation_id: string
  readonly trace_id: string
  readonly span_id: string
  readonly parent_span_id: string | null
  readonly ts_ms: number
  readonly message: string
}

function makeEntry(seed: EntrySeed, rawBytes: number): LogEntry {
  return { ...seed, raw_bytes: rawBytes }
}

// Narrow strictly-typed indexed access — throws if `idx` is out of bounds.
function seedAt(arr: readonly EntrySeed[], idx: number): EntrySeed {
  const v = arr[idx]
  if (v === undefined) {
    throw new Error(`seedAt: missing index ${idx}`)
  }
  return { ...v }
}

// Repetitive JSON payload — repetitive on purpose so cold-segment compression
// reaches the ≥ 3:1 target (RNF-008). The string is the same shape repeated
// across all logs; only the ids differ.
function rawBytesFor(logId: string): number {
  // ~220 bytes of repetitive structured-JSON boilerplate per log.
  const boilerplate =
    '{"service":"payments","env":"prod","host":"p-01","attrs":{"user_id":"u","route":"/charge","method":"POST"}}'
  return 48 + logId.length + boilerplate.length
}

// === Burst 1: the trace (corr_42) + 8 unrelated info logs ===

const traceSpans: readonly EntrySeed[] = [
  {
    log_id: "log-trace-1",
    level: "info",
    source: "checkout",
    correlation_id: "corr_42",
    trace_id: "trace-42",
    span_id: "s1",
    parent_span_id: null,
    ts_ms: 1000,
    message: "checkout ok POST /cart",
  },
  {
    log_id: "log-trace-2",
    level: "info",
    source: "payments",
    correlation_id: "corr_42",
    trace_id: "trace-42",
    span_id: "s2",
    parent_span_id: "s1",
    ts_ms: 1100,
    message: "payments charged POST /charge",
  },
  {
    log_id: "log-trace-3",
    level: "info",
    source: "inventory",
    correlation_id: "corr_42",
    trace_id: "trace-42",
    span_id: "s3",
    parent_span_id: "s1",
    ts_ms: 1200,
    message: "inventory reserve sku-7",
  },
  {
    log_id: "log-trace-4",
    level: "warn",
    source: "checkout",
    correlation_id: "corr_42",
    trace_id: "trace-42",
    span_id: "s4",
    parent_span_id: "s2",
    ts_ms: 1300,
    message: "checkout slow retry",
  },
]

function fillerEntries(prefix: string, count: number, startTs: number): EntrySeed[] {
  const out: EntrySeed[] = []
  for (let i = 0; i < count; i += 1) {
    const source = SOURCES[i % SOURCES.length] ?? "auth"
    if (source === undefined) {
      continue
    }
    out.push({
      log_id: `log-${prefix}-${i}`,
      level: "info",
      source,
      correlation_id: `corr-bg-${prefix}-${i}`,
      trace_id: `trace-bg-${prefix}-${i}`,
      span_id: `bg-${prefix}-${i}`,
      parent_span_id: null,
      ts_ms: startTs + i * 10,
      message: "ok background",
    })
  }
  return out
}

const burst1Entries: readonly LogEntry[] = [
  ...traceSpans.map((seed) => makeEntry(seed, rawBytesFor(seed.log_id))),
  ...fillerEntries("b1", 8, 2000).map((seed) => makeEntry(seed, rawBytesFor(seed.log_id))),
]

// === Burst 2: 12 entries, including 1 error (timeout) + 3 duplicates ===

const burst2Seeds: EntrySeed[] = [
  {
    log_id: "log-err-timeout",
    level: "error",
    source: "payments",
    correlation_id: "corr-err-1",
    trace_id: "trace-err-1",
    span_id: "err-1",
    parent_span_id: null,
    ts_ms: 3000,
    message: "payments timeout upstream",
  },
  {
    log_id: "log-err-denied",
    level: "warn",
    source: "auth",
    correlation_id: "corr-err-2",
    trace_id: "trace-err-2",
    span_id: "err-2",
    parent_span_id: null,
    ts_ms: 3050,
    message: "auth denied token",
  },
  // 3 duplicates of burst 1 logs (will be deduped).
  seedAt(traceSpans, 0),
  seedAt(traceSpans, 1),
  seedAt(fillerEntries("b1", 8, 2000), 0),
  ...fillerEntries("b2", 7, 4000),
]

const burst2Entries: readonly LogEntry[] = burst2Seeds.map((seed) =>
  makeEntry(seed, rawBytesFor(seed.log_id)),
)

// === Burst 3: 12 entries, 1 duplicate ===

const burst3Seeds: EntrySeed[] = [
  seedAt(traceSpans, 2), // duplicate
  ...fillerEntries("b3", 11, 5000),
]

const burst3Entries: readonly LogEntry[] = burst3Seeds.map((seed) =>
  makeEntry(seed, rawBytesFor(seed.log_id)),
)

// === Burst 4: 12 entries, 1 duplicate ===

const burst4Seeds: EntrySeed[] = [
  seedAt(traceSpans, 3), // duplicate
  ...fillerEntries("b4", 11, 6000),
]

const burst4Entries: readonly LogEntry[] = burst4Seeds.map((seed) =>
  makeEntry(seed, rawBytesFor(seed.log_id)),
)

export function defaultWave(): readonly Burst[] {
  return [
    { id: "burst-1", source: "checkout", entries: burst1Entries },
    { id: "burst-2", source: "payments", entries: burst2Entries },
    { id: "burst-3", source: "inventory", entries: burst3Entries },
    { id: "burst-4", source: "auth", entries: burst4Entries },
  ]
}

export const WAVE_CORRELATIONS: readonly string[] = [
  "corr_42",
  "corr-err-1",
  "corr-err-2",
  "corr-bg-b1-0",
  "corr-bg-b2-0",
]

// The error timeout log is the contract-1 target.
function findEntry(logId: string, bursts: readonly Burst[]): LogEntry {
  for (const burst of bursts) {
    for (const entry of burst.entries) {
      if (entry.log_id === logId) {
        return entry
      }
    }
  }
  throw new Error(`wave: missing entry ${logId}`)
}

export function defaultContracts(): readonly Contract[] {
  const bursts = defaultWave()
  const errorEntry = findEntry("log-err-timeout", bursts)
  const traceEntries = traceSpans.map((seed) => findEntry(seed.log_id, bursts))
  return [
    {
      id: "query-error",
      kind: "filter",
      prompt: "Find the ERROR-level log from payments (filter level=error)",
      expected: [errorEntry],
      filter: { dimension: "level", value: "error" },
    },
    {
      id: "trace-corr-42",
      kind: "trace",
      prompt: "Reconstruct trace corr_42 (filter correlation=corr_42, then T)",
      correlation_id: "corr_42",
      expected: traceEntries,
    },
  ]
}

export const WAVE_CONFIG = {
  weirSlotsMax: 8,
  batchWindowMs: 6000,
  retentionMs: 45_000,
}

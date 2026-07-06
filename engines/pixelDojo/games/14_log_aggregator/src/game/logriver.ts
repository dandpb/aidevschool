// Log River Delta — pure logic model of a structured-log aggregation pipeline.
//
// This module is the testable core. It owns no three.js state and no DOM —
// only the data model of the pipeline:
//
//   tributaries → bursts → weir (bounded buffer) → indexer → hot/warm/cold
//                  ↑ log_id dedup membrane          ↑ query/trace layer
//
// The concept (one concept per game): high-throughput structured-log
// ingestion through a bounded pipeline with queryable indexes, retention,
// and cross-service trace reconstruction via correlation IDs.
//
// The contract is intentionally pure: a `RiverState` value plus a handful of
// reducer-style functions. The three.js scene (game/scene.ts) renders a
// projection of this state; the controller (main.ts) translates keyboard
// input into state transitions.

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal"

export const LEVELS: readonly LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"]

export type LogSource = "payments" | "checkout" | "inventory" | "auth"

export const SOURCES: readonly LogSource[] = ["payments", "checkout", "inventory", "auth"]

// A single structured JSON log envelope. Fields mirror the curriculum spec
// (RF-001 .. RF-020): level, source, correlation_id / trace_id / span_id /
// parent_span_id for distributed tracing, ts_ms event time, message for
// full-text, raw_bytes for compression accounting.
export type LogEntry = {
  readonly log_id: string
  readonly level: LogLevel
  readonly source: LogSource
  readonly correlation_id: string
  readonly trace_id: string
  readonly span_id: string
  readonly parent_span_id: string | null
  readonly ts_ms: number
  readonly message: string
  readonly raw_bytes: number
}

export type Burst = {
  readonly id: string
  readonly source: LogSource
  readonly entries: readonly LogEntry[]
}

// Tier of a accepted log: hot = recently indexed, warm = aged, cold =
// compressed into a cold segment. Retention deletion removes the log
// entirely (it evaporates and is no longer queryable).
export type Tier = "hot" | "warm" | "cold" | "evicted"

export type IndexedLog = {
  readonly entry: LogEntry
  tier: Tier
  // ms since ingestion, advanced by the controller's clock. Crosses tier
  // thresholds at TIER_HOT_MS / TIER_WARM_MS / TIER_COLD_MS.
  age_ms: number
  // Set when the log matches the active query — the scene magnetizes it.
  magnetized: boolean
  // Set when the log has been slotted into the Trace Tower.
  in_trace: boolean
}

export type FilterDimension = "level" | "source" | "correlation" | "keyword"

export type QueryFilter = {
  dimension: FilterDimension
  // Per-dimension value (level → LogLevel, source → LogSource,
  // correlation → correlation_id string, keyword → substring of message).
  // null means "no value selected" — firing a query with a null value is a
  // deliberately-too-broad scan (rejected as 413 query_too_broad).
  value: string | null
}

export type QueryContract = {
  readonly id: string
  readonly kind: "filter"
  readonly prompt: string
  readonly expected: readonly LogEntry[]
  readonly filter: QueryFilter
}

export type TraceContract = {
  readonly id: string
  readonly kind: "trace"
  readonly prompt: string
  readonly correlation_id: string
  // Expected spans in timestamp-ascending order. The player's assembled trace
  // must match this set AND be stackable in timestamp order with each non-root
  // span's parent_span_id present in the trace.
  readonly expected: readonly LogEntry[]
}

export type Contract = QueryContract | TraceContract

export type Metrics = {
  logs_accepted: number
  backpressure_rejects: number
  duplicates_detected: number
  duplicates_double_counted: number
  indexer_lag_peak_ms: number
  hot_segments: number
  cold_segments: number
  cold_raw_bytes: number
  cold_compressed_bytes: number
  compression_ratio: number
  retention_deletes: number
  required_logs_expired_before_query: number
  queries_run: number
  queries_correct: number
  queries_wrong_filter: number
  queries_too_broad: number
  traces_requested: number
  traces_reconstructed_correctly: number
  traces_out_of_order: number
  trace_span_services_spanned: number
  starvation_events: number
}

export type Phase =
  // Burst is at the tributary mouth, player must press B before the timer
  // expires or droplets hit the weir one-by-one and overflow it.
  | "await_batch"
  // A burst was just batched; the next burst (if any) is spawned shortly.
  | "ingesting"
  // All bursts ingested; indexer is finishing, droplets are aging.
  | "settling"
  // A query/trace contract is posted; player must set filters + fire probe.
  | "contract"
  // Trace droplets are magnetized on the result rail; player presses T to
  // drop them into the Trace Tower.
  | "trace_assemble"
  | "finished"

export type RiverState = {
  readonly bursts: readonly Burst[]
  burstIndex: number
  // The burst currently waiting at the weir (null between bursts / after the
  // last burst). When the per-burst timer `batch_window_ms` hits zero with
  // no B press, the burst is force-flushed as single droplets and any
  // overflow is counted as backpressure.
  currentBurst: Burst | null
  batch_window_ms: number
  // Weir buffer: N slots. Batched flush uses 1 slot; unbatched flush uses
  // min(entries, free slots) slots and rejects the rest as backpressure.
  weirSlotsUsed: number
  weirSlotsMax: number
  // Membrane of seen log_ids for dedup (RF-020). Re-ingesting an existing
  // log_id from the same source MUST NOT create duplicate query results.
  seenLogIds: Set<string>
  indexed: IndexedLog[]
  // Distinct correlation_ids present in the wave (for the correlation filter
  // value cycle).
  correlations: readonly string[]
  contracts: readonly Contract[]
  contractIndex: number
  activeContract: Contract | null
  filter: QueryFilter
  lastQueryMatches: LogEntry[]
  lastQueryTooBroad: boolean
  lastQueryWrong: boolean
  // Trace Tower: spans dropped by the player, in drop order. Validated on
  // each T press; correct order required for traces_reconstructed_correctly.
  traceTower: LogEntry[]
  metrics: Metrics
  phase: Phase
  // Game clock (ms). Advanced by the controller; drives tier aging and the
  // batch window countdown.
  clock_ms: number
  // Indexing lag: each accepted log has a freshness budget (RNF-004). The
  // controller models this as time-to-queryable; peak lag is captured here.
  indexerPendingLagMs: number
  // Per-log retention deadline. Logs past RETENTION_MS are evicted (tier
  // becomes "evicted", retention_deletes += 1). Required logs are flagged
  // `required` (set by the active contract) — if they evaporate before the
  // player queries them, `required_logs_expired_before_query` increments.
  retentionMs: number
  toast: string | null
  toastUntilMs: number
  banner: string | null
  bannerKind: "pass" | "fail" | "info" | null
}

// Hot→warm→cold pacing: a log crosses all three tiers before evaluatePass() freezes the metrics.
export const TIER_HOT_MS = 500
export const TIER_WARM_MS = 1000
export const TIER_COLD_MS = 2000
// Cold-segment compression: each cold log's raw_bytes is divided by this
// factor to derive compressed_bytes. Repetitive JSON in the benchmark corpus
// reaches ≥ 3:1 — the game models that directly so the ratio is verifiable.
export const COMPRESSION_FACTOR = 3.25
// Freshness budget: an accepted log must become queryable (magnetizable)
// within this many ms or it counts against indexer lag (RNF-004).
export const INDEXER_FRESHNESS_BUDGET_MS = 1000

export function emptyMetrics(): Metrics {
  return {
    logs_accepted: 0,
    backpressure_rejects: 0,
    duplicates_detected: 0,
    duplicates_double_counted: 0,
    indexer_lag_peak_ms: 0,
    hot_segments: 0,
    cold_segments: 0,
    cold_raw_bytes: 0,
    cold_compressed_bytes: 0,
    compression_ratio: 0,
    retention_deletes: 0,
    required_logs_expired_before_query: 0,
    queries_run: 0,
    queries_correct: 0,
    queries_wrong_filter: 0,
    queries_too_broad: 0,
    traces_requested: 0,
    traces_reconstructed_correctly: 0,
    traces_out_of_order: 0,
    trace_span_services_spanned: 0,
    starvation_events: 0,
  }
}

export type RiverConfig = {
  readonly bursts: readonly Burst[]
  readonly contracts: readonly Contract[]
  readonly weirSlotsMax: number
  readonly batchWindowMs: number
  readonly retentionMs: number
  readonly correlations: readonly string[]
}

export function initRiver(config: RiverConfig): RiverState {
  const first = config.bursts[0]
  return {
    bursts: config.bursts,
    burstIndex: 0,
    currentBurst: first ?? null,
    batch_window_ms: first === undefined ? 0 : config.batchWindowMs,
    weirSlotsUsed: 0,
    weirSlotsMax: config.weirSlotsMax,
    seenLogIds: new Set<string>(),
    indexed: [],
    correlations: config.correlations,
    contracts: config.contracts,
    contractIndex: 0,
    activeContract: null,
    filter: { dimension: "level", value: null },
    lastQueryMatches: [],
    lastQueryTooBroad: false,
    lastQueryWrong: false,
    traceTower: [],
    metrics: emptyMetrics(),
    phase: first === undefined ? "settling" : "await_batch",
    clock_ms: 0,
    indexerPendingLagMs: 0,
    retentionMs: config.retentionMs,
    toast: null,
    toastUntilMs: 0,
    banner: null,
    bannerKind: null,
  }
}

// Tick the game clock by `dt_ms`. Drives: batch-window countdown, per-log
// tier aging, retention sweep, indexer-freshness lag accumulation. Pure: it
// mutates the supplied state in place (the controller treats state as a
// mutable scratchpad) but reads no externals.
export function tick(state: RiverState, dt_ms: number): void {
  state.clock_ms += dt_ms
  if (state.phase === "finished") {
    return
  }
  // Batch window countdown: when it hits zero with the burst still pending,
  // the burst is force-flushed as single droplets (one per slot, overflow
  // counted as backpressure). This is the failure mode the spec calls
  // "saturated buffer → 429 ingest_backpressure".
  if (state.phase === "await_batch" && state.currentBurst !== null) {
    state.batch_window_ms -= dt_ms
    if (state.batch_window_ms <= 0) {
      flushUnbatched(state, state.currentBurst)
      state.currentBurst = null
      advanceToNextBurst(state)
    }
  }
  // Aging: every accepted log drifts hot → warm → cold → evicted based on
  // age. Cold logs accumulate compressed-bytes accounting.
  let hotCount = 0
  let coldCount = 0
  let coldRaw = 0
  let coldCompressed = 0
  let peakLag = state.metrics.indexer_lag_peak_ms
  for (const log of state.indexed) {
    if (log.tier === "evicted") {
      continue
    }
    log.age_ms += dt_ms
    // Indexer freshness: a log is queryable once its age exceeds the
    // freshness budget (modeling the indexing pipeline's flush interval).
    if (log.age_ms < INDEXER_FRESHNESS_BUDGET_MS) {
      const remaining = INDEXER_FRESHNESS_BUDGET_MS - log.age_ms
      if (remaining > peakLag) {
        peakLag = remaining
      }
    }
    // Retention sweep.
    if (log.age_ms > state.retentionMs) {
      log.tier = "evicted"
      state.metrics.retention_deletes += 1
      const required = isRequired(state, log.entry)
      if (required) {
        state.metrics.required_logs_expired_before_query += 1
      }
      continue
    }
    if (log.age_ms >= TIER_COLD_MS) {
      log.tier = "cold"
      coldCount += 1
      coldRaw += log.entry.raw_bytes
      coldCompressed += Math.ceil(log.entry.raw_bytes / COMPRESSION_FACTOR)
    } else if (log.age_ms >= TIER_WARM_MS) {
      log.tier = "warm"
    } else {
      log.tier = "hot"
      hotCount += 1
    }
  }
  state.metrics.hot_segments = hotCount
  state.metrics.cold_segments = coldCount
  state.metrics.cold_raw_bytes = coldRaw
  state.metrics.cold_compressed_bytes = coldCompressed
  state.metrics.compression_ratio = coldCompressed === 0 ? 0 : coldRaw / coldCompressed
  state.metrics.indexer_lag_peak_ms = peakLag
  // Once all bursts are in and aging, we move to the contract phase once
  // enough logs have crossed into warm (indexing has flushed).
  if (state.phase === "ingesting" && state.currentBurst === null) {
    const ready = state.indexed.some((log) => log.age_ms >= INDEXER_FRESHNESS_BUDGET_MS)
    if (ready || state.indexed.length > 0) {
      advanceToContract(state)
    }
  }
  if (state.phase === "settling") {
    // Brief settle phase between batching and the first contract.
    advanceToContract(state)
  }
  // Toast expiry.
  if (state.toast !== null && state.clock_ms > state.toastUntilMs) {
    state.toast = null
  }
}

// === Intake: batched vs unbatched ===

export function batchCurrentBurst(state: RiverState): void {
  if (state.phase !== "await_batch" || state.currentBurst === null) {
    return
  }
  const burst = state.currentBurst
  if (state.weirSlotsUsed + 1 > state.weirSlotsMax) {
    // Weir full → reject the whole batch (rare; the wave budget is sized so
    // the player can fit every batch if they press B each round).
    state.metrics.backpressure_rejects += burst.entries.length
    flashToast(state, `429 ingest_backpressure: weir full (${burst.entries.length} dropped)`)
  } else {
    state.weirSlotsUsed += 1
    ingestEntries(state, burst.entries)
    flashToast(state, `Batched ${burst.entries.length} logs from ${burst.source} → 1 weir slot`)
  }
  state.currentBurst = null
  advanceToNextBurst(state)
}

function flushUnbatched(state: RiverState, burst: Burst): void {
  // Unbatched flush: each droplet claims one slot. Overflow droplets are
  // rejected as backpressure.
  let accepted = 0
  let rejected = 0
  for (const _entry of burst.entries) {
    if (state.weirSlotsUsed >= state.weirSlotsMax) {
      rejected += 1
    } else {
      state.weirSlotsUsed += 1
      accepted += 1
    }
  }
  if (accepted > 0) {
    ingestEntries(state, burst.entries.slice(0, accepted))
  }
  state.metrics.backpressure_rejects += rejected
  if (rejected > 0) {
    flashToast(state, `429 ingest_backpressure: ${rejected} logs overflowed the weir`)
  }
}

function ingestEntries(state: RiverState, entries: readonly LogEntry[]): void {
  for (const entry of entries) {
    if (state.seenLogIds.has(entry.log_id)) {
      // Idempotent ingestion (RF-020). The duplicate is absorbed at the
      // dedup membrane and never reaches the indexer or the query layer.
      state.metrics.duplicates_detected += 1
      continue
    }
    state.seenLogIds.add(entry.log_id)
    state.indexed.push({
      entry,
      tier: "hot",
      age_ms: 0,
      magnetized: false,
      in_trace: false,
    })
    state.metrics.logs_accepted += 1
  }
}

function advanceToNextBurst(state: RiverState): void {
  state.burstIndex += 1
  const next = state.bursts[state.burstIndex]
  if (next === undefined) {
    state.phase = "ingesting"
    return
  }
  state.currentBurst = next
  state.batch_window_ms = 6000
  state.phase = "await_batch"
}

// === Contracts (query + trace) ===

function advanceToContract(state: RiverState): void {
  if (state.activeContract !== null) {
    return
  }
  const contract = state.contracts[state.contractIndex]
  if (contract === undefined) {
    finishWave(state)
    return
  }
  state.activeContract = contract
  state.phase = "contract"
  // Reset filter to a benign default; player must deliberately select.
  state.filter = { dimension: "level", value: null }
  state.lastQueryMatches = []
  state.lastQueryTooBroad = false
  state.lastQueryWrong = false
  state.traceTower = []
  for (const log of state.indexed) {
    log.magnetized = false
    log.in_trace = false
  }
}

// Cycle the active filter dimension: level → source → correlation → keyword
// → level. Primary query-setup action (F).
export function cycleFilterDimension(state: RiverState): void {
  if (state.phase !== "contract") {
    return
  }
  const order: readonly FilterDimension[] = ["level", "source", "correlation", "keyword"]
  const idx = order.indexOf(state.filter.dimension)
  const nextIdx = (idx + 1) % order.length
  const next = order[nextIdx]
  if (next === undefined) {
    return
  }
  state.filter = { dimension: next, value: null }
}

// Cycle the active filter's value forward (E) or backward (Q).
export function cycleFilterValue(state: RiverState, direction: 1 | -1): void {
  if (state.phase !== "contract") {
    return
  }
  const dim = state.filter.dimension
  let values: readonly string[]
  if (dim === "level") {
    values = LEVELS
  } else if (dim === "source") {
    values = SOURCES
  } else if (dim === "correlation") {
    values = state.correlations
  } else {
    // keyword dimension: a small fixed palette drawn from the wave's
    // messages, plus "timeout" / "denied" / "charged" / "ok".
    values = ["timeout", "denied", "charged", "ok", "slow"]
  }
  const currentIdx = state.filter.value === null ? -1 : values.indexOf(state.filter.value)
  let nextIdx: number
  if (direction === 1) {
    nextIdx = currentIdx + 1
    if (nextIdx >= values.length) {
      nextIdx = -1
    }
  } else {
    nextIdx = currentIdx - 1
    if (nextIdx < -1) {
      nextIdx = values.length - 1
    }
  }
  const nextValue = nextIdx === -1 ? null : (values[nextIdx] ?? null)
  state.filter = { dimension: dim, value: nextValue }
}

// Fire the query probe (Z). Returns the matched entries, magnetizes them in
// the indexed list, and evaluates correctness against the active contract.
export function fireQuery(state: RiverState): readonly LogEntry[] {
  if (state.phase !== "contract" || state.activeContract === null) {
    return []
  }
  const contract = state.activeContract
  // No value selected → deliberately too-broad scan.
  if (state.filter.value === null) {
    state.metrics.queries_run += 1
    state.metrics.queries_too_broad += 1
    state.lastQueryTooBroad = true
    state.lastQueryWrong = true
    state.lastQueryMatches = []
    flashToast(state, "413 query_too_broad: select a filter value first")
    return []
  }
  const matches = queryIndexed(state, state.filter)
  state.metrics.queries_run += 1
  state.lastQueryTooBroad = false
  state.lastQueryMatches = [...matches]
  for (const log of state.indexed) {
    log.magnetized = matches.some((m) => m.log_id === log.entry.log_id)
  }
  if (contract.kind === "filter") {
    evaluateFilterQuery(state, contract, matches)
  } else {
    // Trace contract: a correct correlation query yields exactly the trace's
    // spans. Player still needs to press T to assemble (validated there).
    const correctSet = sameIdSet(matches, contract.expected)
    if (!correctSet) {
      state.metrics.queries_wrong_filter += 1
      state.lastQueryWrong = true
      flashToast(state, `Wrong trace droplets — filter to correlation ${contract.correlation_id}`)
    } else {
      state.lastQueryWrong = false
      flashToast(state, `Trace droplets magnetized — press T to assemble`)
    }
  }
  return matches
}

function queryIndexed(state: RiverState, filter: QueryFilter): LogEntry[] {
  const liveOnly = state.indexed.filter((log) => log.tier !== "evicted")
  if (filter.dimension === "level" && filter.value !== null) {
    return liveOnly.filter((log) => log.entry.level === filter.value).map((log) => log.entry)
  }
  if (filter.dimension === "source" && filter.value !== null) {
    return liveOnly
      .filter((log) => log.entry.source === (filter.value as LogSource))
      .map((log) => log.entry)
  }
  if (filter.dimension === "correlation" && filter.value !== null) {
    return liveOnly
      .filter((log) => log.entry.correlation_id === filter.value)
      .map((log) => log.entry)
  }
  if (filter.dimension === "keyword" && filter.value !== null) {
    return liveOnly
      .filter((log) => log.entry.message.includes(filter.value ?? ""))
      .map((log) => log.entry)
  }
  return []
}

function evaluateFilterQuery(
  state: RiverState,
  contract: QueryContract,
  matches: readonly LogEntry[],
): void {
  const correct = sameIdSet(matches, contract.expected)
  if (correct) {
    state.metrics.queries_correct += 1
    state.lastQueryWrong = false
    flashToast(state, `Query OK — ${matches.length} log(s) matched`)
    advanceContract(state)
  } else {
    state.metrics.queries_wrong_filter += 1
    state.lastQueryWrong = true
    flashToast(
      state,
      `Wrong filter — query returned ${matches.length}, contract wanted ${contract.expected.length}`,
    )
  }
}

// Drop the current magnetized set into the Trace Tower (T). Validates that
// the dropped spans match the trace contract AND can be stacked in timestamp
// order with each non-root span's parent present.
export function assembleTrace(state: RiverState): void {
  if (state.phase !== "contract" || state.activeContract === null) {
    return
  }
  const contract = state.activeContract
  if (contract.kind !== "trace") {
    return
  }
  state.metrics.traces_requested += 1
  const dropped = [...state.lastQueryMatches]
  if (!sameIdSet(dropped, contract.expected)) {
    state.metrics.traces_out_of_order += 1
    flashToast(state, "Trace droplets missing — query the right correlation first")
    return
  }
  // Reconstruct: order by ts_ms ascending, validate each non-root span's
  // parent is present.
  const sorted = [...dropped].sort((a, b) => a.ts_ms - b.ts_ms)
  const ids = new Set(sorted.map((e) => e.span_id))
  for (const span of sorted) {
    if (span.parent_span_id !== null && !ids.has(span.parent_span_id)) {
      state.metrics.traces_out_of_order += 1
      flashToast(state, `Span ${span.span_id} missing parent ${span.parent_span_id}`)
      return
    }
  }
  state.traceTower = sorted
  for (const log of state.indexed) {
    if (sorted.some((s) => s.log_id === log.entry.log_id)) {
      log.in_trace = true
    }
  }
  state.metrics.traces_reconstructed_correctly += 1
  const services = new Set(sorted.map((s) => s.source))
  state.metrics.trace_span_services_spanned = Math.max(
    state.metrics.trace_span_services_spanned,
    services.size,
  )
  flashToast(state, `Trace reconstructed — ${sorted.length} spans across ${services.size} services`)
  advanceContract(state)
}

function advanceContract(state: RiverState): void {
  state.contractIndex += 1
  state.activeContract = null
  // Clear magnetization before next contract.
  for (const log of state.indexed) {
    log.magnetized = false
  }
  state.lastQueryMatches = []
  const next = state.contracts[state.contractIndex]
  if (next === undefined) {
    finishWave(state)
    return
  }
  state.activeContract = next
  state.phase = "contract"
  state.filter = { dimension: "level", value: null }
}

function finishWave(state: RiverState): void {
  state.phase = "finished"
  // Side-effect contract: never publish learning-state channels. Only the
  // EVIDENCE emitter owns the verdict.
  const pass = evaluatePass(state.metrics)
  state.bannerKind = pass ? "pass" : "fail"
  state.banner = pass ? "EVIDENCE PASS" : "EVIDENCE FAIL"
}

// === Pass evaluation (mirrors the plan's pass rule) ===

export function evaluatePass(m: Metrics): boolean {
  return (
    m.backpressure_rejects === 0 &&
    m.duplicates_double_counted === 0 &&
    m.queries_wrong_filter === 0 &&
    m.queries_too_broad === 0 &&
    m.traces_reconstructed_correctly === m.traces_requested &&
    m.traces_out_of_order === 0 &&
    m.required_logs_expired_before_query === 0 &&
    m.compression_ratio >= 3.0 &&
    m.starvation_events === 0
  )
}

// === Helpers ===

function sameIdSet(a: readonly LogEntry[], b: readonly LogEntry[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  const ids = new Set(a.map((e) => e.log_id))
  for (const entry of b) {
    if (!ids.has(entry.log_id)) {
      return false
    }
  }
  return true
}

function isRequired(state: RiverState, entry: LogEntry): boolean {
  // A log is "required" if it is part of any pending or future contract's
  // expected set (the player must keep it queryable until they query it).
  for (let i = state.contractIndex; i < state.contracts.length; i += 1) {
    const contract = state.contracts[i]
    if (contract === undefined) {
      continue
    }
    if (contract.expected.some((e) => e.log_id === entry.log_id)) {
      return true
    }
  }
  return false
}

function flashToast(state: RiverState, message: string): void {
  state.toast = message
  state.toastUntilMs = state.clock_ms + 2500
}

// === Filter value lookup helpers (for the scene + smoke) ===

export function levelColor(level: LogLevel): readonly [number, number, number] {
  switch (level) {
    case "trace":
      return [0.95, 0.95, 0.95]
    case "debug":
      return [0.25, 0.85, 0.95]
    case "info":
      return [0.3, 0.55, 1.0]
    case "warn":
      return [1.0, 0.78, 0.25]
    case "error":
      return [1.0, 0.35, 0.35]
    case "fatal":
      return [0.95, 0.3, 0.95]
    default:
      return [0.6, 0.6, 0.6]
  }
}

// Stable dye palette for correlation IDs. Up to 8 distinct dyes.
const DYE_PALETTE: readonly (readonly [number, number, number])[] = [
  [1.0, 0.55, 0.3], // orange
  [0.55, 1.0, 0.45], // lime
  [0.7, 0.45, 1.0], // violet
  [1.0, 0.45, 0.75], // pink
  [0.45, 1.0, 0.9], // teal
  [1.0, 0.95, 0.35], // gold
  [0.55, 0.7, 1.0], // sky
  [0.95, 0.65, 0.4], // amber
]

export function correlationDye(
  correlationId: string,
  palette: readonly string[],
): readonly [number, number, number] {
  const idx = palette.indexOf(correlationId)
  const safe = idx === -1 ? 0 : idx
  return DYE_PALETTE[safe % DYE_PALETTE.length] ?? [0.6, 0.6, 0.6]
}

export function sourcePosition(source: LogSource): readonly [number, number] {
  // XZ position of the tributary mouth on the back wall. Used by both logic
  // (to compute spawn order) and scene (to place stream meshes).
  const idx = SOURCES.indexOf(source)
  return [-3 + idx * 2, -6]
}

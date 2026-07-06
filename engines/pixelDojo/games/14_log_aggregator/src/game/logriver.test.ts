// Vitest unit tests for the Log River Delta pure-logic core.
//
// Drives the deterministic defaultWave() / defaultContracts() scenario to a
// PASS through the public reducer API (no three.js, no DOM) and asserts each
// gate metric. Also exercises the documented failure modes (backpressure,
// duplicate double-count guard, too-broad query, wrong-trace assembly).

import { describe, expect, it } from "vitest"
import {
  assembleTrace,
  batchCurrentBurst,
  type Contract,
  cycleFilterDimension,
  cycleFilterValue,
  evaluatePass,
  fireQuery,
  initRiver,
  type LogEntry,
  type LogLevel,
  type LogSource,
  type RiverState,
  tick,
} from "./logriver"
import { defaultContracts, defaultWave, WAVE_CONFIG, WAVE_CORRELATIONS } from "./wave"

function buildState(
  bursts = defaultWave(),
  contracts: readonly Contract[] = defaultContracts(),
): RiverState {
  return initRiver({
    bursts,
    contracts,
    weirSlotsMax: WAVE_CONFIG.weirSlotsMax,
    batchWindowMs: WAVE_CONFIG.batchWindowMs,
    retentionMs: WAVE_CONFIG.retentionMs,
    correlations: WAVE_CORRELATIONS,
  })
}

// Drive `dt_ms` per tick for `totalMs` (1ms ticks keep aging precise).
function run(state: RiverState, totalMs: number): void {
  for (let elapsed = 0; elapsed < totalMs; elapsed += 1) {
    tick(state, 1)
  }
}

function levelEntry(level: LogLevel, source: LogSource, logId: string): LogEntry {
  return {
    log_id: logId,
    level,
    source,
    correlation_id: "corr-x",
    trace_id: "trace-x",
    span_id: logId,
    parent_span_id: null,
    ts_ms: 0,
    message: "msg",
    raw_bytes: 300,
  }
}

describe("Log River Delta — happy path", () => {
  it("clears the wave with zero backpressure, dedup, indexed query, and a reconstructed trace", () => {
    const state = buildState()
    // 4 batches — all bursts ingested, zero overflow.
    batchCurrentBurst(state)
    batchCurrentBurst(state)
    batchCurrentBurst(state)
    batchCurrentBurst(state)
    expect(state.metrics.backpressure_rejects).toBe(0)
    // 48 spawn attempts, 5 duplicates → 43 unique accepted.
    expect(state.metrics.logs_accepted).toBe(43)
    expect(state.metrics.duplicates_detected).toBe(5)
    expect(state.metrics.duplicates_double_counted).toBe(0)

    // Wait past indexer freshness AND past TIER_COLD_MS so the contract
    // phase appears and compression has reached ≥ 3:1 by finish time.
    run(state, 2300)
    expect(state.phase).toBe("contract")
    expect(state.activeContract?.kind).toBe("filter")

    // Contract 1: level=error. Default dimension is level; press E until error.
    cycleFilterValue(state, 1) // null → trace
    cycleFilterValue(state, 1) // trace → debug
    cycleFilterValue(state, 1) // debug → info
    cycleFilterValue(state, 1) // info → warn
    cycleFilterValue(state, 1) // warn → error
    const matches = fireQuery(state)
    expect(matches.map((m) => m.log_id)).toEqual(["log-err-timeout"])
    expect(state.metrics.queries_correct).toBe(1)
    expect(state.metrics.queries_wrong_filter).toBe(0)
    expect(state.activeContract?.kind).toBe("trace")

    // Contract 2: trace corr_42. Cycle dimension to correlation, pick corr_42.
    cycleFilterDimension(state) // level → source
    cycleFilterDimension(state) // source → correlation
    cycleFilterValue(state, 1) // null → corr_42
    const traceMatches = fireQuery(state)
    expect(traceMatches).toHaveLength(4)
    assembleTrace(state)
    expect(state.metrics.traces_reconstructed_correctly).toBe(1)
    expect(state.metrics.traces_out_of_order).toBe(0)
    expect(state.metrics.trace_span_services_spanned).toBe(3)

    // Wave finished — metrics frozen at this point (tick no-ops in finished).
    expect(state.phase).toBe("finished")
    expect(state.metrics.compression_ratio).toBeGreaterThanOrEqual(3.0)
    expect(evaluatePass(state.metrics)).toBe(true)
  })
})

describe("Log River Delta — failure modes", () => {
  it("counts backpressure when the weir overflows", () => {
    const bigBurst = {
      id: "big",
      source: "payments" as LogSource,
      entries: Array.from({ length: 12 }, (_, i) => levelEntry("info", "payments", `big-${i}`)),
    }
    // weirSlotsMax=2, batchWindowMs=large → no time-out, but the second
    // batch arrives while the first still occupies both slots... actually
    // batchCurrentBurst fits in 1 slot, so we need unbatched flush. Use a
    // tiny batch window so the burst auto-flushes as single droplets.
    const state = initRiver({
      bursts: [bigBurst],
      contracts: [],
      weirSlotsMax: 2,
      batchWindowMs: 50,
      retentionMs: 60_000,
      correlations: [],
    })
    // Don't press B — let the timer expire and force unbatched flush.
    run(state, 60)
    expect(state.metrics.backpressure_rejects).toBe(10) // 12 droplets, 2 slots → 10 rejected
    expect(state.metrics.logs_accepted).toBe(2)
  })

  it("rejects too-broad queries (no value selected)", () => {
    const state = buildState()
    batchCurrentBurst(state)
    batchCurrentBurst(state)
    batchCurrentBurst(state)
    batchCurrentBurst(state)
    run(state, 2300)
    // Filter default is level=null; firing now is too broad.
    fireQuery(state)
    expect(state.metrics.queries_too_broad).toBe(1)
    expect(state.metrics.queries_correct).toBe(0)
  })

  it("flags a wrong filter result", () => {
    const state = buildState()
    batchCurrentBurst(state)
    batchCurrentBurst(state)
    batchCurrentBurst(state)
    batchCurrentBurst(state)
    run(state, 2300)
    // Pick level=info — many info logs exist, not the single error contract.
    cycleFilterValue(state, 1) // trace
    cycleFilterValue(state, 1) // debug
    cycleFilterValue(state, 1) // info
    fireQuery(state)
    expect(state.metrics.queries_wrong_filter).toBe(1)
    expect(state.metrics.queries_correct).toBe(0)
  })

  it("blocks trace assembly when the wrong correlation was queried", () => {
    const state = buildState()
    batchCurrentBurst(state)
    batchCurrentBurst(state)
    batchCurrentBurst(state)
    batchCurrentBurst(state)
    run(state, 2300)
    // Satisfy contract 1 first.
    cycleFilterValue(state, 1)
    cycleFilterValue(state, 1)
    cycleFilterValue(state, 1)
    cycleFilterValue(state, 1)
    cycleFilterValue(state, 1) // error
    fireQuery(state)
    // Now contract 2 is active. Pick a WRONG correlation.
    cycleFilterDimension(state) // source
    cycleFilterDimension(state) // correlation
    cycleFilterValue(state, 1) // corr_42
    cycleFilterValue(state, 1) // corr-err-1 (wrong)
    fireQuery(state)
    assembleTrace(state)
    expect(state.metrics.traces_out_of_order).toBe(1)
    expect(state.metrics.traces_reconstructed_correctly).toBe(0)
  })

  it("evaluatePass returns false when compression < 3:1", () => {
    const m = {
      logs_accepted: 10,
      backpressure_rejects: 0,
      duplicates_detected: 0,
      duplicates_double_counted: 0,
      indexer_lag_peak_ms: 0,
      hot_segments: 10,
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
    expect(evaluatePass(m)).toBe(false)
  })
})

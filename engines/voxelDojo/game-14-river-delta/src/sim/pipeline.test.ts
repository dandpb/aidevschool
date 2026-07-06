import { describe, expect, it } from "vitest"
import {
  collectTrace,
  enrichStage,
  filterStage,
  injectCorrelation,
  injectCorrelationAll,
  mergeSources,
  runPipeline,
  runPipelineStream,
  type StageEvent,
  traceSources,
  traceStages,
  transformStage,
} from "./pipeline"
import { logStream, mulberry32 } from "./rng"

/** Convenience pipeline: transform → filter → enrich. */
function samplePipeline() {
  return {
    stages: [
      transformStage("normalize", (l) => ({
        ...l,
        level: l.level === "fatal" ? "error" : l.level,
      })),
      filterStage("drop-debug", (l) => l.level !== "debug"),
      enrichStage("tag-env", () => ({ env: "prod" })),
    ],
  }
}

function mkLog(
  source: string,
  correlationId: string,
  level: "debug" | "info" = "info",
): {
  logId: string
  source: string
  level: "debug" | "info"
  message: string
  correlationId: string
  attributes: Record<string, never>
} {
  return {
    logId: `${source}-${correlationId}`,
    source,
    level,
    message: `${source} ${correlationId}`,
    correlationId,
    attributes: {},
  }
}

describe("pipeline stages run in order and a filter drops", () => {
  it("walks source → transform → filter → enrich → sink and survives a passing record", () => {
    const p = samplePipeline()
    const res = runPipeline(p, mkLog("api", "req-1", "info"))
    expect(res.reached).toBe(true)
    expect(res.droppedAt).toBeNull()
    const stages = res.events.map((e) => e.stage)
    expect(stages).toEqual(["source", "normalize", "drop-debug", "tag-env", "sink"])
    // enrich added env:prod on the surviving record
    expect(res.out?.attributes.env).toBe("prod")
  })

  it("a filter drops a debug record at the filter stage and it never reaches the sink", () => {
    const p = samplePipeline()
    const res = runPipeline(p, mkLog("api", "req-2", "debug"))
    expect(res.reached).toBe(false)
    expect(res.droppedAt).toBe("drop-debug")
    // the event log stops at the drop: source → normalize → drop(at filter)
    const stages = res.events.map((e) => e.stage)
    expect(stages).toEqual(["source", "normalize", "drop-debug"])
    // the dropped event is flagged passed:false
    const drop = res.events[res.events.length - 1]
    expect(drop?.passed).toBe(false)
    // the enrich stage never ran
    expect(stages).not.toContain("tag-env")
    expect(stages).not.toContain("sink")
  })

  it("a transform stage actually mutates the flowing record (fatal → error survives the filter)", () => {
    const p = samplePipeline()
    const fatalLog = { ...mkLog("api", "req-3"), level: "fatal" as const }
    const res = runPipeline(p, fatalLog)
    // normalize turned fatal into error, so drop-debug let it through
    expect(res.reached).toBe(true)
    expect(res.out?.level).toBe("error")
  })
})

describe("correlation ID propagates through every stage", () => {
  it("the id stamped upstream is carried by every stage-event of that record", () => {
    const p = samplePipeline()
    const raw = { ...mkLog("api", "UNSTAMPED"), correlationId: "" }
    const stamped = injectCorrelation(raw, "req-trace-1")
    const res = runPipeline(p, stamped)
    for (const e of res.events) {
      expect(e.correlationId).toBe("req-trace-1")
    }
  })

  it("injectCorrelationAll stamps an entire stream with the same id", () => {
    const raw = [mkLog("api", "x"), mkLog("worker", "x")]
    const stamped = injectCorrelationAll(raw, "req-bulk")
    expect(stamped.every((l) => l.correlationId === "req-bulk")).toBe(true)
    // original stream is untouched (pure)
    expect(raw[0]?.correlationId).toBe("x")
  })
})

describe("collectTrace returns exactly the correlated sub-sequence across sources", () => {
  it("reconstructs one request's path spanning multiple sources and stages", () => {
    const p = samplePipeline()
    // three records across two sources, two correlation ids
    const apiA = mkLog("api", "trace-1", "info")
    const workerA = { ...mkLog("worker", "trace-1", "info"), logId: "worker-trace-1" }
    const apiB = mkLog("api", "trace-2", "debug") // dropped at filter
    const merged = mergeSources([[apiA, apiB], [workerA]])
    const events = runPipelineStream(p, merged)

    const trace = collectTrace(events, "trace-1")
    // trace-1 records are apiA (reached) + workerA (reached). Each produces 5 events
    // (source, normalize, drop-debug, tag-env, sink). No trace-2 events.
    expect(trace.every((e) => e.correlationId === "trace-1")).toBe(true)
    expect(trace.length).toBe(10) // 2 records × 5 events
    // the trace spans both sources
    expect(new Set(traceSources(trace))).toEqual(new Set(["api", "worker"]))
    // every trace event passed (trace-1 was never dropped)
    expect(trace.every((e) => e.passed)).toBe(true)
    // the dropped debug record (trace-2) is NOT in the trace
    expect(trace.some((e) => e.correlationId === "trace-2")).toBe(false)
  })

  it("the trace preserves globally monotonic flow order even when sources interleave", () => {
    const p = samplePipeline()
    const merged = mergeSources([
      [mkLog("api", "t-a"), mkLog("api", "t-b")],
      [mkLog("worker", "t-a"), mkLog("worker", "t-b")],
    ])
    const events = runPipelineStream(p, merged)
    const traceA = collectTrace(events, "t-a")
    // indices are strictly increasing within the trace
    const idx = traceA.map((e) => e.index)
    for (let i = 1; i < idx.length; i++) expect(idx[i]).toBeGreaterThan(idx[i - 1] as number)
    // and the trace is exactly the t-a sub-sequence of the full event log
    const expected = events.filter((e) => e.correlationId === "t-a")
    expect(traceA.map((e) => e.index)).toEqual(expected.map((e) => e.index))
  })

  it("traceStages lists the rapids a surviving record passed through", () => {
    const p = samplePipeline()
    const events = runPipelineStream(p, [mkLog("api", "t-x", "info")])
    const trace = collectTrace(events, "t-x")
    expect(traceStages(trace)).toEqual(["normalize", "drop-debug", "tag-env", "sink"])
  })
})

describe("determinism (same seed ⇒ same logs ⇒ same trace)", () => {
  it("two log streams from the same seed produce identical records", () => {
    const a = logStream(mulberry32(42), "api", 20)
    const b = logStream(mulberry32(42), "api", 20)
    expect(a).toEqual(b)
  })

  it("same seed ⇒ same merged stream ⇒ same event log ⇒ same trace", () => {
    const p = samplePipeline()
    const build = () => {
      const api = logStream(mulberry32(7), "api", 8)
      const worker = logStream(mulberry32(99), "worker", 8)
      return runPipelineStream(p, mergeSources([api, worker]))
    }
    const events1 = build()
    const events2 = build()
    expect(events1.map((e: StageEvent) => e.index)).toEqual(events2.map((e) => e.index))
    // pick the first correlation id present and confirm the trace is identical
    const firstId = events1[0]?.correlationId ?? ""
    expect(collectTrace(events1, firstId).map((e) => e.stage)).toEqual(
      collectTrace(events2, firstId).map((e) => e.stage),
    )
  })
})

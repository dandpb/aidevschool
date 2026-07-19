/**
 * Log pipeline + correlation-ID simulation core.
 *
 * HEADLESS & DETERMINISTIC — zero `three` imports, no DOM, no wall clock.
 * The Three.js scene in src/scene only renders snapshots of this state.
 *
 * The ONE concept: a log pipeline is a delta.
 *   - tributaries (sources) emit log records
 *   - the records converge and flow through an ordered list of pipeline STAGES
 *     (transform / filter / enrich); a filter stage can DROP a record
 *   - a CORRELATION ID injected upstream stamps every record that belongs to one
 *     request, so the same id lets you follow ONE request's path across every
 *     tributary and stage
 *   - collectTrace(events, id) reconstructs that path: the exact sub-sequence of
 *     stage-events sharing the id, in flow order, across all sources and stages
 */

export type Level = "trace" | "debug" | "info" | "warn" | "error" | "fatal"
export type Attr = string | number | boolean

/** A structured log record. `correlationId` is the dye that ties one request's records together. */
export interface LogRecord {
  logId: string
  /** tributary / source name this record entered from */
  source: string
  level: Level
  message: string
  correlationId: string
  attributes: Record<string, Attr>
}

/**
 * A pipeline stage. `fn` returns:
 *   - a (possibly transformed/enriched) LogRecord to keep flowing, OR
 *   - `null` to DROP the record at this stage (filter semantics)
 * `kind` is descriptive only — the rule is purely "fn returns null ⇒ drop".
 */
export interface Stage {
  name: string
  kind: "transform" | "filter" | "enrich"
  fn: (log: LogRecord) => LogRecord | null
}

export interface Pipeline {
  stages: Stage[]
}

/**
 * One observable event as a record flows through the delta. The trace IS the
 * sub-sequence of these events sharing a correlationId. `stage` names the point:
 *   "source" — record emitted by a tributary
 *   <stage.name> — record passing through (or being dropped at) that rapid
 *   "sink" — record reached the lake
 */
export interface StageEvent {
  logId: string
  correlationId: string
  source: string
  stage: string
  /** monotonic flow order across the whole merged stream — drives trace ordering */
  index: number
  /** true = flowed through; false = dropped at this stage (filter rejected) */
  passed: boolean
  /** snapshot of the record at this point (after the stage's transform/enrich) */
  log: LogRecord
}

// ─── correlation ID (the dye) ─────────────────────────────────────────────────

/** Stamp a correlation id onto a record. Pure: returns a new record. */
export function injectCorrelation(log: LogRecord, id: string): LogRecord {
  return { ...log, correlationId: id }
}

/** Bulk-inject the same id onto every record of a stream. Pure. */
export function injectCorrelationAll(logs: readonly LogRecord[], id: string): LogRecord[] {
  return logs.map((l) => injectCorrelation(l, id))
}

// ─── running the pipeline ─────────────────────────────────────────────────────

export interface RunResult {
  /** every stage-event the record produced (source → stages → sink|drop), in order */
  events: StageEvent[]
  /** the record reached the sink (passed every stage) */
  reached: boolean
  /** the stage name that dropped it, if any */
  droppedAt: string | null
  /** the final record (post-transform/enrich) if reached, else null (the last live snapshot is in `events`) */
  out: LogRecord | null
}

/**
 * Walk one record through the pipeline, emitting a stage-event at every point.
 *   - emit a "source" event first
 *   - apply each stage in order; emit a passed event per stage survived
 *   - if a stage returns null, emit a dropped event there and stop
 *   - if every stage is survived, emit a "sink" event
 * `startIndex` is the flow-order index of the source event; subsequent events
 * take successive indices, so a merged stream has a globally monotonic order.
 * Pure: returns the result; never mutates the input record.
 */
export function runPipeline(p: Pipeline, log: LogRecord, startIndex = 0): RunResult {
  const events: StageEvent[] = []
  let index = startIndex
  events.push({
    logId: log.logId,
    correlationId: log.correlationId,
    source: log.source,
    stage: "source",
    index,
    passed: true,
    log,
  })
  index++

  let current: LogRecord | null = log
  let droppedAt: string | null = null

  for (const stage of p.stages) {
    if (current === null) break
    const next = stage.fn(current)
    if (next === null) {
      events.push({
        logId: current.logId,
        correlationId: current.correlationId,
        source: current.source,
        stage: stage.name,
        index,
        passed: false,
        log: current,
      })
      droppedAt = stage.name
      index++
      break
    }
    current = next
    events.push({
      logId: current.logId,
      correlationId: current.correlationId,
      source: current.source,
      stage: stage.name,
      index,
      passed: true,
      log: current,
    })
    index++
  }

  const reached = current !== null && droppedAt === null
  if (reached && current !== null) {
    events.push({
      logId: current.logId,
      correlationId: current.correlationId,
      source: current.source,
      stage: "sink",
      index,
      passed: true,
      log: current,
    })
    index++
  }

  return { events, reached, droppedAt, out: reached ? current : null }
}

// ─── multi-source merge ───────────────────────────────────────────────────────

/**
 * Deterministically merge per-source log streams into one flow-ordered stream.
 * Streams are concatenated in SOURCE-ORDER; within a source, insertion order is
 * preserved. The result is the canonical ingestion order the pipeline sees.
 * Pure & deterministic: same inputs ⇒ same merged stream.
 */
export function mergeSources(streams: ReadonlyArray<readonly LogRecord[]>): LogRecord[] {
  const merged: LogRecord[] = []
  for (const stream of streams) merged.push(...stream)
  return merged
}

/**
 * Run a whole merged stream through the pipeline, assigning globally monotonic
 * flow-order indices. Returns the full event log the trace is reconstructed from.
 * Pure & deterministic.
 */
export function runPipelineStream(p: Pipeline, merged: readonly LogRecord[]): StageEvent[] {
  const all: StageEvent[] = []
  let index = 0
  for (const log of merged) {
    const res = runPipeline(p, log, index)
    index += res.events.length
    all.push(...res.events)
  }
  return all
}

// ─── trace reconstruction (the lesson of L3/L4) ───────────────────────────────

/**
 * Reconstruct the trace for one correlation id: the sub-sequence of stage-events
 * sharing that id, in flow order, across ALL sources and stages. This is the
 * exact correlated sub-sequence — nothing more, nothing less.
 * Pure & deterministic.
 */
export function collectTrace(events: readonly StageEvent[], correlationId: string): StageEvent[] {
  return events.filter((e) => e.correlationId === correlationId).sort((a, b) => a.index - b.index)
}

/**
 * The set of distinct sources that carry a given correlation id — i.e. which
 * tributaries the dyed request flowed in from. Used by L3's "predict the path".
 */
export function traceSources(trace: readonly StageEvent[]): string[] {
  const seen = new Set<string>()
  for (const e of trace) seen.add(e.source)
  return [...seen]
}

/**
 * The ordered list of stages a trace passed through (excluding drops). Used by
 * L3's "predict the dyed path through the rapids".
 */
export function traceStages(trace: readonly StageEvent[]): string[] {
  return trace.filter((e) => e.passed && e.stage !== "source").map((e) => e.stage)
}

// ─── stage builders (transform / filter / enrich) ─────────────────────────────

/** A transform stage: rewrite a record (e.g. normalize a field). Must not return null. */
export function transformStage(name: string, fn: (log: LogRecord) => LogRecord): Stage {
  return { name, kind: "transform", fn }
}

/** A filter stage: drop the record when `keep` returns false. */
export function filterStage(name: string, keep: (log: LogRecord) => boolean): Stage {
  return { name, kind: "filter", fn: (log) => (keep(log) ? log : null) }
}

/** An enrich stage: add/overwrite attributes on the record. */
export function enrichStage(name: string, enrich: (log: LogRecord) => Record<string, Attr>): Stage {
  return {
    name,
    kind: "enrich",
    fn: (log) => ({ ...log, attributes: { ...log.attributes, ...enrich(log) } }),
  }
}

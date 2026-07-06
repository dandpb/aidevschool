import {
  collectTrace,
  enrichStage,
  filterStage,
  injectCorrelation,
  type LogRecord,
  type Pipeline,
  runPipelineStream,
  type StageEvent,
  traceSources,
  transformStage,
} from "./pipeline"
import { logStream, mulberry32 } from "./rng"

export type LevelId = "L1" | "L2" | "L3" | "L4"

export interface LevelConfig {
  id: LevelId
  title: string
  lesson: string
  /** deterministic seed base */
  seed: number
  /** tributary (source) names placed on the delta */
  sources: string[]
  /** log records per source */
  perSource: number
  /** pipeline stages on the shared channel */
  pipeline: Pipeline
  /** the correlation id the player must trace (L3/L4) */
  traceId: string
  passRule: string
}

/** A small shared pipeline used by the levels: normalize → filter → enrich. */
function deltaPipeline(): Pipeline {
  return {
    stages: [
      transformStage("normalize", (l) => ({
        ...l,
        level: l.level === "fatal" ? "error" : l.level,
      })),
      filterStage("drop-trace", (l) => l.level !== "trace"),
      enrichStage("tag-env", () => ({ env: "prod" })),
    ],
  }
}

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "L1",
    title: "Convergence",
    lesson: "Each log enters the delta from exactly one tributary (source).",
    seed: 11,
    sources: ["api", "worker", "auth"],
    perSource: 4,
    pipeline: { stages: [] },
    traceId: "req-L1",
    passRule: "Predict which tributary each log entered from.",
  },
  {
    id: "L2",
    title: "Pipeline stage",
    lesson: "A filter stage drops logs whose predicate fails; the rest flow through.",
    seed: 22,
    sources: ["api", "worker"],
    perSource: 6,
    pipeline: deltaPipeline(),
    traceId: "req-L2",
    passRule: "Predict whether each log passes the filter stage.",
  },
  {
    id: "L3",
    title: "Inject dye",
    lesson:
      "Inject a correlation ID upstream; it colors every record of one request across all tributaries.",
    seed: 33,
    sources: ["api", "worker", "auth"],
    perSource: 5,
    pipeline: deltaPipeline(),
    traceId: "req-dye",
    passRule: "Inject dye at one source and predict the dyed path.",
  },
  {
    id: "L4",
    title: "Trace",
    lesson:
      "collectTrace returns exactly the sub-sequence of logs sharing a correlation id, across all sources and stages.",
    seed: 44,
    sources: ["api", "worker", "auth", "cron"],
    perSource: 6,
    pipeline: deltaPipeline(),
    traceId: "req-dye",
    passRule: "Collect the full trace for the correlation id.",
  },
] as const

export function levelConfig(id: LevelId): LevelConfig {
  const cfg = LEVELS.find((l) => l.id === id)
  if (!cfg) throw new Error(`unknown level ${id}`)
  return cfg
}

// ─── deterministic level state ────────────────────────────────────────────────

/**
 * The full set of log records that will flow through the delta for a level.
 *
 * For L3/L4 the dye (traceId) is stamped across a SUBSET of sources — the first
 * two tributaries carry the dyed request, the rest stay un-dyed. This is the
 * lesson: a correlation id ties together records that span SOME sources, and the
 * player must predict exactly that set (not all sources, not just one).
 */
export function logsFor(cfg: LevelConfig): LogRecord[] {
  const dyeSources = new Set(cfg.sources.slice(0, 2))
  const streams = cfg.sources.map((src, i) => {
    const rng = mulberry32(cfg.seed + i * 101)
    const logs = logStream(rng, src, cfg.perSource)
    if ((cfg.id === "L3" || cfg.id === "L4") && dyeSources.has(src)) {
      // dye every other record in the carrying tributaries so the trace spans
      // multiple records per source (a real request emits several logs).
      return logs.map((l, j) => (j % 2 === 0 ? injectCorrelation(l, cfg.traceId) : l))
    }
    return logs
  })
  // merge deterministically in source order
  return streams.flat()
}

/** The full stage-event log for a level, with globally monotonic flow order. */
export function eventsFor(cfg: LevelConfig): StageEvent[] {
  return runPipelineStream(cfg.pipeline, logsFor(cfg))
}

// ─── level evaluation ─────────────────────────────────────────────────────────

export interface WaveOutcome {
  pass: boolean
  metrics: Record<string, number | boolean | string>
}

/**
 * L1 — Convergence: for each prompt the player predicts which tributary (source)
 * a given log entered from. `predictions` is sourceId-per-logId; `truth` is the
 * ground-truth map (logId → source). Pass at ≥80% accuracy.
 */
export function evaluateConvergence(args: {
  predictions: Record<string, string>
  truth: Record<string, string>
  promptCount: number
}): WaveOutcome {
  let correct = 0
  let answered = 0
  for (const [logId, predicted] of Object.entries(args.predictions)) {
    answered++
    if (args.truth[logId] === predicted) correct++
  }
  const accuracy = args.promptCount === 0 ? 0 : correct / args.promptCount
  return {
    pass: accuracy >= 0.8 && answered === args.promptCount,
    metrics: {
      source_predictions: answered,
      source_prediction_accuracy: round2(accuracy),
    },
  }
}

/**
 * L2 — Pipeline stage: predict whether each prompt log passes the filter stage
 * (true) or is dropped (false). The ground truth is derived from the event log:
 * a log is dropped iff its last event is a filter stage with passed:false.
 */
export function evaluateFilter(args: {
  predictions: Record<string, boolean>
  events: readonly StageEvent[]
  promptLogIds: string[]
}): WaveOutcome {
  const dropped = droppedLogIds(args.events)
  let correct = 0
  for (const id of args.promptLogIds) {
    const truth = !dropped.has(id)
    if (args.predictions[id] === truth) correct++
  }
  const accuracy = args.promptLogIds.length === 0 ? 0 : correct / args.promptLogIds.length
  return {
    pass: accuracy >= 0.8,
    metrics: {
      filter_predictions: args.promptLogIds.length,
      filter_prediction_accuracy: round2(accuracy),
    },
  }
}

/**
 * L3 — Inject dye: the player injects the trace id at one source and predicts
 * the SET of sources the dyed request will flow through. Pass iff the predicted
 * source-set exactly equals the ground-truth source-set for the trace id.
 */
export function evaluateDyePath(args: {
  events: readonly StageEvent[]
  traceId: string
  predictedSources: string[]
  injectSource: string
}): WaveOutcome {
  const trace = collectTrace(args.events, args.traceId)
  const truthSources = new Set(traceSources(trace))
  const predicted = new Set(args.predictedSources)
  const setsEqual =
    truthSources.size === predicted.size && [...truthSources].every((s) => predicted.has(s))
  // The injection source must be one of the truth sources (you can't dye a
  // tributary the request never entered from).
  const injectValid = truthSources.has(args.injectSource)
  const traceLength = trace.length
  return {
    pass: setsEqual && injectValid && traceLength > 0,
    metrics: {
      dyed_sources_predicted: predicted.size,
      dyed_sources_actual: truthSources.size,
      source_set_correct: setsEqual,
      inject_source_valid: injectValid,
      trace_events: traceLength,
    },
  }
}

/**
 * L4 — Trace: the player collects a set of logIds they believe belong to the
 * trace. Pass iff that set is EXACTLY the set of logIds in the ground-truth
 * trace for the correlation id (no extras, no missing).
 */
export function evaluateTrace(args: {
  events: readonly StageEvent[]
  traceId: string
  collectedLogIds: string[]
}): WaveOutcome {
  const trace = collectTrace(args.events, args.traceId)
  const truthIds = new Set(trace.map((e) => e.logId))
  const collected = new Set(args.collectedLogIds)
  const missing = [...truthIds].filter((id) => !collected.has(id)).length
  const extra = [...collected].filter((id) => !truthIds.has(id)).length
  const exact = truthIds.size === collected.size && missing === 0 && extra === 0
  return {
    pass: exact,
    metrics: {
      trace_log_ids_actual: truthIds.size,
      trace_log_ids_collected: collected.size,
      missing_log_ids: missing,
      extra_log_ids: extra,
      trace_exact: exact,
    },
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Set of logIds whose final event is a filter drop (passed:false at a filter stage). */
export function droppedLogIds(events: readonly StageEvent[]): Set<string> {
  const lastByLog = new Map<string, StageEvent>()
  for (const e of events) lastByLog.set(e.logId, e)
  const dropped = new Set<string>()
  for (const e of lastByLog.values()) {
    if (!e.passed) dropped.add(e.logId)
  }
  return dropped
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

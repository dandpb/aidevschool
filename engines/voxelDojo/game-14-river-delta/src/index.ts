export type { EvidenceRecord } from "./evidence/emit"
export type { GameState, Listener, Phase } from "./game/controller"
export { GameController } from "./game/controller"
export type { LevelConfig, LevelId, WaveOutcome } from "./sim/levels"
export {
  droppedLogIds,
  evaluateConvergence,
  evaluateDyePath,
  evaluateFilter,
  evaluateTrace,
  eventsFor,
  LEVELS,
  levelConfig,
  logsFor,
} from "./sim/levels"
export type {
  Attr,
  Level,
  LogRecord,
  Pipeline,
  RunResult,
  Stage,
  StageEvent,
} from "./sim/pipeline"
export {
  collectTrace,
  enrichStage,
  filterStage,
  injectCorrelation,
  injectCorrelationAll,
  mergeSources,
  runPipeline,
  runPipelineStream,
  traceSources,
  traceStages,
  transformStage,
} from "./sim/pipeline"
export type { Rng } from "./sim/rng"
export { logStream, mulberry32 } from "./sim/rng"

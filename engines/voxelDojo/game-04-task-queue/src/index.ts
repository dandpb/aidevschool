export type { EvidenceRecord } from "./evidence/emit"
export type {
  Classification,
  FinishedTask,
  GameState,
  Listener,
  Phase,
  RunningTask,
} from "./game/controller"
export { GameController } from "./game/controller"
export type { Arrival, LevelConfig, LevelId, WaveMetrics } from "./sim/levels"
export {
  DOCK_WINDOW,
  emptyMetrics,
  evaluateWave,
  hopperLevel,
  LEVELS,
  levelConfig,
  WORK_BEATS,
} from "./sim/levels"
export type {
  BackpressureLevel,
  FailPlan,
  FailureKind,
  Task,
  WorkerPool,
  WorkerSlot,
} from "./sim/queue"
export {
  backpressure,
  dispatch,
  fail,
  isDuplicate,
  isEligible,
  makePool,
  pickNext,
  runningCount,
} from "./sim/queue"

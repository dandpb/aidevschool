export type { EvidenceRecord } from "./evidence/emit"
export type { GameState, Listener, Phase, Prompt } from "./game/controller"
export { GameController } from "./game/controller"
export type { LevelConfig, LevelId, WaveMetrics, WaveOutcome } from "./sim/levels"
export { evaluateQueueWave, LEVELS, levelConfig } from "./sim/levels"
export type {
  ArrivalSpec,
  BackpressureState,
  FinishOutcome,
  ForgeWorker,
  IngotKind,
  QueueState,
  SimTask,
  TaskStatus,
} from "./sim/queue"
export {
  allTerminal,
  backpressure,
  deadLetterTask,
  dispatch,
  dispatchOrder,
  failTask,
  finishOutcome,
  hasActiveKey,
  idleWorker,
  isEligible,
  makeTask,
  makeWorkers,
  pickNext,
  promoteReady,
  queueDepth,
  requiredRoute,
  retryDelay,
  runningCount,
  succeedTask,
} from "./sim/queue"

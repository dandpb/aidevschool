export type { EvidenceRecord } from "./evidence/emit"
export type { GameState, Listener, Phase } from "./game/controller"
export { GameController, laneMessages } from "./game/controller"
export type { LevelConfig, LevelId, RebalancePuzzle, ReplayPuzzle, WaveOutcome } from "./sim/levels"
export {
  buildRebalancePuzzle,
  buildReplayPuzzle,
  canonicalAssignment,
  crewsFor,
  evaluateAssignment,
  evaluateRebalance,
  evaluateReplay,
  evaluateRoute,
  LEVELS,
  levelConfig,
  logFor,
  routeTruth,
} from "./sim/levels"
export type {
  Assignment,
  AssignStrategy,
  Consumer,
  ConsumerGroup,
  Log,
  Message,
  OffsetMap,
} from "./sim/queue"
export {
  advanceOffset,
  appendLog,
  appendMany,
  assignPartitions,
  createGroup,
  createLog,
  isCompleteAssignment,
  partitionOf,
  partitionSlice,
  partitionTail,
  pendingForGroup,
  rebalance,
  replay,
  replayPartition,
  rewindOffset,
  stableHash,
} from "./sim/queue"

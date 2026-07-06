export type { EvidenceRecord } from "./evidence/emit"
export type { GameState, Listener, Phase } from "./game/controller"
export { GameController } from "./game/controller"
export type { AlertState, Histogram } from "./sim/histogram"
export {
  bucketIndex,
  makeHistogram,
  mean,
  percentile,
  quantileFromCounts,
  record,
  recordAll,
  reset,
  setAlert,
} from "./sim/histogram"
export type { LevelConfig, LevelId, LevelOutcome } from "./sim/levels"
export {
  contrastDistributions,
  evaluateAlertPrediction,
  evaluateBucketPrediction,
  evaluateDistributionChoice,
  evaluatePercentileBucket,
  filledHistogram,
  LEVELS,
  levelConfig,
  samplesFor,
} from "./sim/levels"

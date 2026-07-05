export type { EvidenceRecord } from "./evidence/emit"
export type { GameState, Listener, Phase } from "./game/controller"
export { GameController, LEVELS } from "./game/controller"
export type { LevelConfig, LevelId, WaveOutcome } from "./sim/levels"
export {
  evaluateAppendOrder,
  evaluateProjection,
  evaluateReplay,
  evaluateTwoViews,
  LIFECYCLE_ORDER,
  levelConfig,
  STATUS_CHOICES,
} from "./sim/levels"
export type {
  Event,
  Log,
  OrderEvent,
  OrderStatus,
  OrderStatusProjectionState,
  Projection,
  ShipmentListProjectionState,
} from "./sim/sourcing"
export {
  append,
  appendAll,
  checkpointIndex,
  fold,
  isStrictlyOrdered,
  length,
  orderStatusProjection,
  project,
  replay,
  shipmentListProjection,
  stableSortByTs,
} from "./sim/sourcing"

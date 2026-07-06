export type { EvidenceRecord } from "./evidence/emit"
export type { GameState, Listener, Phase } from "./game/controller"
export { GameController } from "./game/controller"
export type { HashStrength } from "./sim/hash"
export { bucketOf, fnv1a, hashKey } from "./sim/hash"
export type {
  CrudProbe,
  LevelConfig,
  LevelId,
  TtlProbe,
  WaveOutcome,
} from "./sim/levels"
export {
  evaluateCrud,
  evaluateShelfPredictions,
  evaluateSkewFix,
  evaluateTtl,
  keysFor,
  LEVELS,
  levelConfig,
  storeFor,
} from "./sim/levels"
export type { Clock, Entry, PutOptions, Store, StoreMap } from "./sim/store"
export {
  assignToShelves,
  createStore,
  del,
  get,
  isExpired,
  loadPerShelf,
  loadSkew,
  put,
  rawHash,
  readdress,
  remainingTtl,
  shelfOf,
  sweepExpired,
} from "./sim/store"

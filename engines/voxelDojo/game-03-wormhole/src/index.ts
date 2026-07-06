export type { EvidenceRecord } from "./evidence/emit"
export type { GameState, Listener, Phase } from "./game/controller"
export { GameController, RESOLUTION_OPTIONS } from "./game/controller"
export type { CollisionPrediction, LevelConfig, LevelId, ResolutionStrategy } from "./sim/levels"
export {
  evaluateCodePredictions,
  evaluateCollisionPredictions,
  evaluateRedirectPredictions,
  findCollidingPair,
  LEVELS,
  levelConfig,
  predictedCode,
  urlsFor,
  withForcedCollision,
} from "./sim/levels"
export type {
  RedirectResult,
  ShortEntry,
  ShortenResult,
  ShortMap,
  Strategy,
} from "./sim/shortener"
export {
  CODE_LEN,
  detectCollision,
  emptyMap,
  fromBase62,
  hashTruncCode,
  redirect,
  resolveIncrement,
  resolveSalted,
  shorten,
  shortHash,
  toBase62,
} from "./sim/shortener"

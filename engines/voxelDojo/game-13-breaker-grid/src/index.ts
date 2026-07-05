export type { EvidenceRecord } from "./evidence/emit"
export type { FlowRecord, GameState, Listener, Phase } from "./game/controller"
export { GameController, makeDistrict } from "./game/controller"
export type {
  Breaker,
  BreakerEvent,
  CircuitState,
  District,
  RequestEvent,
  RouteResult,
  WaveStats,
} from "./sim/breaker"
export {
  bulkheadAcquire,
  bulkheadRelease,
  burst,
  makeBreaker,
  makeDistrict as makeBreakerDistrict,
  routeRequest,
  serveRequest,
  simulateWave,
  stepBreaker,
} from "./sim/breaker"
export type { LevelConfig, LevelId, WaveOutcome } from "./sim/levels"
export {
  districtsFor,
  evaluateBulkhead,
  evaluateCascade,
  evaluateProbe,
  evaluateTrip,
  LEVELS,
  levelConfig,
  makeBurst,
  serveOne,
} from "./sim/levels"

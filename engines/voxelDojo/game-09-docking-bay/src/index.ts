export type { EvidenceRecord } from "./evidence/emit"
export type { GameState, Listener, Phase } from "./game/controller"
export { GameController } from "./game/controller"
export type {
  CapabilityScenario,
  LevelConfig,
  LevelId,
  LevelOutcome,
  SandboxProbe,
  WavePod,
} from "./sim/levels"
export {
  capabilityScenario,
  evaluateCapabilityChoice,
  evaluateDockWave,
  evaluateMismatchWave,
  evaluateSandboxWave,
  HOST_CONTRACT,
  LEVELS,
  levelConfig,
  podWave,
  sandboxProbe,
} from "./sim/levels"
export type { Capability, Contract, DockResult, Host, PluginManifest } from "./sim/plugin"
export {
  canInvoke,
  checkContract,
  dock,
  invoke,
  missingMethods,
  SandboxViolation,
  sandboxCapFor,
} from "./sim/plugin"

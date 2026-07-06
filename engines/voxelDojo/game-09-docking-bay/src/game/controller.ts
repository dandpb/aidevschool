import { emitEvidence } from "../evidence/emit"
import {
  type CapabilityScenario,
  capabilityScenario,
  evaluateCapabilityChoice,
  evaluateDockWave,
  evaluateMismatchWave,
  evaluateSandboxWave,
  HOST_CONTRACT,
  LEVELS,
  type LevelConfig,
  type LevelId,
  type LevelOutcome,
  levelConfig,
  podWave,
  type SandboxProbe,
  sandboxProbe,
  type WavePod,
} from "../sim/levels"
import type { Capability, Host, PluginManifest } from "../sim/plugin"
import { dock, invoke, SandboxViolation, sandboxCapFor } from "../sim/plugin"

export type Phase =
  | "briefing"
  | "predicting" // dock / pick-missing / allow-block / capability-set
  | "cleared"
  | "failed"

export interface GameState {
  level: LevelConfig
  phase: Phase
  /** L1/L2 wave of incoming pods */
  pods: WavePod[]
  /** L1: which pods the player predicted will dock, in order */
  dockPredictions: Map<string, boolean>
  /** L2: podId → the method the player predicted is missing */
  mismatchPredictions: Map<string, Capability | "none">
  /** L3: the docked plugin probe + the player's allow/block classifications */
  probe: SandboxProbe | null
  sandboxChoices: Map<Capability, boolean>
  /** L4: the least-privilege scenario + the player's chosen set */
  scenario: CapabilityScenario | null
  chosenCapabilities: Capability[]
  /** the host station backing the sim (built from the host contract) */
  host: Host
  lastMetrics: Record<string, number | boolean> | null
}

export type Listener = (state: GameState) => void

/**
 * DOCKING BAY state machine.
 *
 * Phases per level:
 * - L1: briefing → predicting (predict dock for each pod) → cleared/failed
 * - L2: briefing → predicting (pick the missing method on each rejected pod) → cleared/failed
 * - L3: briefing → predicting (allow/block each invoked method) → cleared/failed
 * - L4: briefing → predicting (toggle the minimal capability set) → cleared/failed
 *
 * All randomness flows from the level seed, so the same level is replayable and the Playwright smoke
 * can drive the public API deterministically.
 */
export class GameController {
  private state: GameState
  private listeners: Listener[] = []

  constructor(level: LevelId = "L1") {
    this.state = this.freshState(levelConfig(level))
  }

  private freshState(cfg: LevelConfig): GameState {
    const host: Host = {
      id: "host",
      contract: HOST_CONTRACT,
      impls: stubImpls(),
      docked: new Map(),
    }
    const base: GameState = {
      level: cfg,
      phase: "briefing",
      pods: [],
      dockPredictions: new Map(),
      mismatchPredictions: new Map(),
      probe: null,
      sandboxChoices: new Map(),
      scenario: null,
      chosenCapabilities: [],
      host,
      lastMetrics: null,
    }
    if (cfg.id === "L1") base.pods = podWave(cfg, 6)
    if (cfg.id === "L2") base.pods = podWave(cfg, 5)
    if (cfg.id === "L3") base.probe = sandboxProbe(cfg)
    if (cfg.id === "L4") base.scenario = capabilityScenario(cfg)
    return base
  }

  get snapshot(): GameState {
    return this.state
  }

  subscribe(fn: Listener): void {
    this.listeners.push(fn)
    fn(this.state)
  }

  private commit(): void {
    for (const fn of this.listeners) fn(this.state)
  }

  start(): void {
    this.state.phase = "predicting"
    this.commit()
  }

  loadLevel(level: LevelId): void {
    this.state = this.freshState(levelConfig(level))
    this.commit()
  }

  nextLevel(): void {
    const idx = LEVELS.findIndex((l) => l.id === this.state.level.id)
    const next = LEVELS[idx + 1]
    if (next) this.loadLevel(next.id)
  }

  retry(): void {
    this.loadLevel(this.state.level.id)
    this.start()
  }

  // ── L1: predict whether a pod will dock ────────────────────────────────────

  /** Record a dock prediction for `podId` and advance; resolving the wave when all are predicted. */
  predictDock(podId: string, willDock: boolean): void {
    if (this.state.level.id !== "L1" || this.state.phase !== "predicting") return
    this.state.dockPredictions.set(podId, willDock)
    if (this.state.dockPredictions.size >= this.state.pods.length) {
      this.resolveDockWave()
      return
    }
    this.commit()
  }

  private resolveDockWave(): void {
    const predictions = this.state.pods.map((pod) => ({
      pod,
      predictedDock: this.state.dockPredictions.get(pod.id) ?? false,
    }))
    const out = evaluateDockWave(predictions)
    // Dock every pod the truth says docks, so the scene shows the final state.
    for (const pod of this.state.pods) {
      const truth = pod.claimsContract.every((c) => HOST_CONTRACT.includes(c))
      if (truth) {
        dock(this.state.host, {
          id: pod.id,
          claimsContract: pod.claimsContract,
          capabilities: pod.capabilities,
        })
      }
    }
    this.finish(out)
  }

  // ── L2: pick the missing contract method on a rejected pod ─────────────────

  /** Record the predicted-missing method for `podId`; resolves when all pods are covered. */
  predictMissing(podId: string, method: Capability | "none"): void {
    if (this.state.level.id !== "L2" || this.state.phase !== "predicting") return
    this.state.mismatchPredictions.set(podId, method)
    if (this.state.mismatchPredictions.size >= this.state.pods.length) {
      this.resolveMismatchWave()
      return
    }
    this.commit()
  }

  private resolveMismatchWave(): void {
    const predictions = this.state.pods.map((pod) => ({
      pod,
      predictedMissing: this.state.mismatchPredictions.get(pod.id) ?? "none",
    }))
    const out = evaluateMismatchWave(predictions)
    // Dock every pod that actually covers the contract (the success cases).
    for (const pod of this.state.pods) {
      const truth = pod.claimsContract.every((c) => HOST_CONTRACT.includes(c))
      if (truth) {
        dock(this.state.host, {
          id: pod.id,
          claimsContract: pod.claimsContract,
          capabilities: pod.capabilities,
        })
      }
    }
    this.finish(out)
  }

  // ── L3: classify each invoked method as allow (inside) or block (outside) ───

  /** Toggle/record the allow-block classification for `method`; resolves when all are classified. */
  classifyInvoke(method: Capability, allow: boolean): void {
    if (this.state.level.id !== "L3" || this.state.phase !== "predicting") return
    if (!this.state.probe) return
    this.state.sandboxChoices.set(method, allow)
    if (this.state.sandboxChoices.size >= this.state.probe.invokedMethods.length) {
      this.resolveSandboxWave()
      return
    }
    this.commit()
  }

  private resolveSandboxWave(): void {
    const probe = this.state.probe
    if (!probe) return
    // Dock the probe plugin so the scene shows its force-field bubble.
    dock(this.state.host, probe.manifest)
    const classifications = probe.invokedMethods.map((method) => ({
      method,
      predictedAllow: this.state.sandboxChoices.get(method) ?? false,
    }))
    const out = evaluateSandboxWave(probe, classifications)
    this.finish(out)
  }

  // ── L4: pick the minimal capability set ────────────────────────────────────

  /** Toggle a capability in the chosen set. */
  toggleCapability(method: Capability): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "predicting") return
    const set = new Set(this.state.chosenCapabilities)
    if (set.has(method)) set.delete(method)
    else set.add(method)
    this.state.chosenCapabilities = [...set]
    this.commit()
  }

  /** Lock in the current chosen set and be judged on sufficiency + minimality. */
  lockInCapabilities(): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "predicting") return
    if (!this.state.scenario) return
    const out = evaluateCapabilityChoice(this.state.scenario, this.state.chosenCapabilities)
    if (out.pass) {
      // Dock the plugin with the minimal chosen cap so the scene shows its tight bubble.
      const manifest: PluginManifest = {
        ...this.state.scenario.manifest,
        capabilities: this.state.chosenCapabilities,
      }
      dock(this.state.host, manifest)
    }
    this.finish(out)
  }

  // ── shared / convenience for the scene + HUD + tests ───────────────────────

  /** Ground truth: does a pod cover the host contract (would it dock)? */
  podWouldDock(pod: WavePod): boolean {
    return pod.claimsContract.every((c) => HOST_CONTRACT.includes(c))
  }

  /** Ground truth: the first contract method a pod omits, or "none" if it covers the contract. */
  podMissing(pod: WavePod): Capability | "none" {
    const missing = HOST_CONTRACT.filter((c) => !pod.claimsContract.includes(c))
    return missing.length === 0 ? "none" : (missing[0] as Capability)
  }

  /** Ground truth: would `method` be permitted inside the probe's sandbox bubble? */
  probeAllows(method: Capability): boolean {
    return this.state.probe?.sandboxCap.includes(method) ?? false
  }

  /** Run an invoke live (for the scene flash on a disallowed call). Returns ok/violation. */
  tryInvoke(pluginId: string, method: Capability): { ok: boolean; result?: unknown } {
    try {
      const result = invoke(this.state.host, pluginId, method)
      return { ok: true, result }
    } catch (err) {
      if (err instanceof SandboxViolation) return { ok: false }
      throw err
    }
  }

  /** The minimal correct capability set for L4 (ground truth for the smoke test). */
  minimalCapabilities(): Capability[] {
    if (!this.state.scenario) return []
    return [...this.state.scenario.requiredCalls]
  }

  /** The sandbox cap a plugin would be granted for the given request (for HUD/scene sizing). */
  capFor(manifest: PluginManifest): Capability[] {
    return sandboxCapFor(manifest, HOST_CONTRACT)
  }

  private finish(out: LevelOutcome): void {
    this.state.lastMetrics = out.metrics
    this.state.phase = out.pass ? "cleared" : "failed"
    emitEvidence(this.state.level.id, out.pass, out.metrics)
    this.commit()
  }
}

/** Default host implementations — each capability echoes its name (pure, deterministic). */
function stubImpls(): Host["impls"] {
  const out: Record<string, (...args: unknown[]) => unknown> = {}
  for (const c of HOST_CONTRACT) {
    out[c] = (...args: unknown[]) => `${c}(${args.join(",")})`
  }
  return out
}

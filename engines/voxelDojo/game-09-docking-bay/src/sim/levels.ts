import type { Capability, Contract, PluginManifest } from "./plugin"
import { mulberry32 } from "./rng"

export type LevelId = "L1" | "L2" | "L3" | "L4"

/** The host contract every level shares (the fixed connector shape of the station's port). */
export const HOST_CONTRACT: Contract = ["connect", "readState", "writeState", "log"]

export interface LevelConfig {
  id: LevelId
  title: string
  lesson: string
  seed: number
  passRule: string
}

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "L1",
    title: "Dock the pod",
    lesson:
      "The docking clamp does a structural shape check: a pod docks only if its claimed connector covers every method the host's port demands.",
    seed: 11,
    passRule: "Predict dock-success vs clamp-rejection for each pod (≥80% correct).",
  },
  {
    id: "L2",
    title: "Contract mismatch",
    lesson:
      "The contract is a required method set. A single missing method fails the clamp — predict exactly which one.",
    seed: 22,
    passRule: "Name the exact missing contract method on each rejected pod.",
  },
  {
    id: "L3",
    title: "Sandbox cap",
    lesson:
      "Once docked, a force-field bubble caps what the pod can reach. An invoked method outside the bubble is blocked.",
    seed: 33,
    passRule: "Predict allow (inside the bubble) vs block for every invoked method.",
  },
  {
    id: "L4",
    title: "Capability scope",
    lesson:
      "Least privilege: grant the smallest capability envelope that covers the plugin's required calls — sufficient AND minimal.",
    seed: 44,
    passRule: "Pick the minimal capability set (every call covered, nothing over-granted).",
  },
] as const

export function levelConfig(id: LevelId): LevelConfig {
  const cfg = LEVELS.find((l) => l.id === id)
  if (!cfg) throw new Error(`unknown level ${id}`)
  return cfg
}

// ── Deterministic manifest wave generation ──────────────────────────────────

/**
 * A pod the player judges in L1/L2. `claimsContract` is the connector shape it advertises; a pod is
 * dockable iff its claim covers the host contract. Deterministic from the level seed.
 */
export interface WavePod {
  id: string
  /** what the pod claims to implement — the connector shape the clamp probes */
  claimsContract: Contract
  /** the capabilities the pod requests (used in L1 only to show intent) */
  capabilities: Capability[]
}

/** Deterministically build a wave of pods whose dock outcomes are mix of success/failure. */
export function podWave(cfg: LevelConfig, count: number): WavePod[] {
  const rng = mulberry32(cfg.seed)
  const pods: WavePod[] = []
  for (let i = 0; i < count; i++) {
    // ~half the pods drop one contract method (manufacture mismatches); the rest cover it.
    const dropChance = 0.5
    const claims = HOST_CONTRACT.filter((c) => !(rng() < dropChance && c !== "connect"))
    const capabilities = HOST_CONTRACT.filter(() => rng() > 0.35)
    pods.push({
      id: `pod-${i}`,
      claimsContract: claims.length === 0 ? ["connect"] : claims,
      capabilities: capabilities.length === 0 ? ["readState"] : capabilities,
    })
  }
  return pods
}

// ── L3: a docked plugin + the methods to judge allow/block ──────────────────

export interface SandboxProbe {
  /** the docked plugin under test (its claim covers the host contract, so it docks) */
  manifest: PluginManifest
  /** the sandbox cap it was granted (= intersection of request ∩ contract) */
  sandboxCap: Capability[]
  /** methods the player must classify as allow (inside) / block (outside) */
  invokedMethods: Capability[]
}

/**
 * Build an L3 probe: a plugin that docks with a partial capability set, and a mix of methods to
 * classify — some inside the bubble (allow), some outside (block). Deterministic.
 */
export function sandboxProbe(cfg: LevelConfig): SandboxProbe {
  const rng = mulberry32(cfg.seed)
  // Request exactly two of the four host capabilities deterministically.
  const requestable = HOST_CONTRACT.filter(() => rng() > 0.5)
  const capabilities: Capability[] = requestable.length === 0 ? ["readState"] : requestable
  const manifest: PluginManifest = {
    id: "pod-docked",
    claimsContract: HOST_CONTRACT,
    capabilities,
  }
  // Methods to classify: every host method appears once, deterministic order.
  const invokedMethods = [...HOST_CONTRACT]
  const sandboxCap = capabilities.filter((c) => HOST_CONTRACT.includes(c))
  return { manifest, sandboxCap, invokedMethods }
}

// ── L4: the minimal-capability least-privilege scenario ─────────────────────

export interface CapabilityScenario {
  manifest: PluginManifest
  /** the calls the plugin actually needs to make (the job it must do) */
  requiredCalls: Capability[]
  /** the candidate capability sets the player chooses among */
  options: Capability[][]
}

/**
 * Build an L4 least-privilege scenario: the plugin must make a set of required calls, and the player
 * picks the minimal capability set that covers exactly those calls (no over-grant, no missing grant).
 * Deterministic.
 */
export function capabilityScenario(cfg: LevelConfig): CapabilityScenario {
  const rng = mulberry32(cfg.seed)
  // Pick two required calls deterministically from the host contract.
  const shuffled = [...HOST_CONTRACT].sort(() => rng() - 0.5)
  const requiredCalls = shuffled.slice(0, 2)
  const manifest: PluginManifest = {
    id: "pod-least",
    claimsContract: HOST_CONTRACT,
    capabilities: requiredCalls,
  }
  // Candidate options: minimal set, an over-granted superset, an insufficient subset.
  const minimal = [...requiredCalls]
  const overGranted = [...HOST_CONTRACT]
  const insufficient = requiredCalls.slice(0, 1)
  return { manifest, requiredCalls, options: [minimal, overGranted, insufficient] }
}

// ── Evaluation ──────────────────────────────────────────────────────────────

export interface LevelOutcome {
  pass: boolean
  metrics: Record<string, number | boolean>
}

/** Alias kept for symmetry with the result of every evaluate* function. */
export type WaveOutcome = LevelOutcome

/** L1: ≥80% dock predictions correct. */
export function evaluateDockWave(
  predictions: ReadonlyArray<{ pod: WavePod; predictedDock: boolean }>,
): WaveOutcome {
  let correct = 0
  for (const p of predictions) {
    const truth = p.pod.claimsContract.every((c) => HOST_CONTRACT.includes(c))
    if (truth === p.predictedDock) correct++
  }
  const total = predictions.length
  const accuracy = total === 0 ? 0 : correct / total
  return {
    pass: accuracy >= 0.8,
    metrics: {
      dock_predictions: total,
      dock_prediction_accuracy: round2(accuracy),
      contracts_checked: total,
    },
  }
}

/** L2: every missing-method prediction must be exact (the first gap, order-stable). */
export function evaluateMismatchWave(
  predictions: ReadonlyArray<{ pod: WavePod; predictedMissing: Capability | "none" }>,
): WaveOutcome {
  let correct = 0
  for (const p of predictions) {
    const truth = HOST_CONTRACT.filter((c) => !p.pod.claimsContract.includes(c))
    const truthMissing = truth.length === 0 ? "none" : (truth[0] as Capability)
    if (truthMissing === p.predictedMissing) correct++
  }
  const total = predictions.length
  const accuracy = total === 0 ? 0 : correct / total
  return {
    pass: accuracy === 1,
    metrics: {
      mismatch_predictions: total,
      mismatch_prediction_accuracy: round2(accuracy),
      missing_methods_named: correct,
    },
  }
}

/** L3: every allow/block classification must be correct. */
export function evaluateSandboxWave(
  probe: SandboxProbe,
  classifications: ReadonlyArray<{ method: Capability; predictedAllow: boolean }>,
): WaveOutcome {
  let correct = 0
  for (const c of classifications) {
    const truth = probe.sandboxCap.includes(c.method)
    if (truth === c.predictedAllow) correct++
  }
  const total = classifications.length
  const accuracy = total === 0 ? 0 : correct / total
  return {
    pass: accuracy === 1,
    metrics: {
      sandbox_probes: total,
      sandbox_accuracy: round2(accuracy),
      capabilities_granted: probe.sandboxCap.length,
    },
  }
}

/** L4: the chosen capability set must be sufficient (covers every required call) AND minimal. */
export function evaluateCapabilityChoice(
  scenario: CapabilityScenario,
  chosen: Capability[],
): WaveOutcome {
  const requiredSet = new Set(scenario.requiredCalls)
  const chosenSet = new Set(chosen)
  // sufficient: every required call is covered
  const sufficient = [...requiredSet].every((c) => chosenSet.has(c))
  // minimal: no granted capability is unused (not required) — every grant must be required
  const minimal = [...chosenSet].every((c) => requiredSet.has(c))
  const pass = sufficient && minimal
  return {
    pass,
    metrics: {
      required_calls_covered: sufficient,
      no_overgrant: minimal,
      least_privilege: pass,
      granted_count: chosen.length,
      required_count: scenario.requiredCalls.length,
    },
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

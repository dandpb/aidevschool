// Wave state machine + step resolution for the Ring Keeper game.
//
// Each wave is a fixed, deterministic sequence of steps the player must resolve
// in order. There are exactly three step kinds, each mapped to one keystroke:
//
//   release-orb         SPACE  — release the lead key orb; it auto-flies to
//                                 its ring owner under the active strategy.
//   add-node-required   A      — drop a new shard tower at a preset ring
//                                 position (node join / arc split).
//   remove-node-required X     — remove the named tower (node leave/failure).
//
// Resolution mutates the HashRing (the source of truth) and accrues counters
// in the WaveState.accum accumulator. The 3D scene reads ring + lockedKeys to
// render. The wave is pure with respect to the DOM/three.js — testable headless.

import { hashToRing, HashRing, type NodeId, type Strategy } from "./ring"

export type WaveStep =
  | { readonly kind: "release-orb"; readonly key: string; readonly isHot: boolean }
  | {
      readonly kind: "add-node-required"
      readonly nodeId: NodeId
      readonly vnodes: readonly number[]
      readonly balancesHotKey: boolean
      readonly reason: string
    }
  | {
      readonly kind: "remove-node-required"
      readonly nodeId: NodeId
      readonly reason: string
    }

export type Accumulator = {
  keys_routed: number
  misroutes: number
  keys_remapped: number
  churn_events_survived: number
  node_adds: number
  node_removes: number
  spills: number
}

export type Metrics = {
  readonly kind: "threejs-ring-keeper"
  readonly keys_routed: number
  readonly misroutes: number
  readonly keys_remapped: number
  readonly remap_budget: number
  readonly churn_events_survived: number
  readonly node_adds: number
  readonly node_removes: number
  readonly hot_key_balanced: boolean
  readonly spills: number
  readonly spill_budget: number
  readonly strategies_used: readonly Strategy[]
  readonly modn_used_at_churn: boolean
  readonly node_count_final: number
  readonly wave_cleared: boolean
  readonly wave_target: number
}

export type LockedKey = {
  readonly id: number
  readonly key: string
  readonly hashPos: number
  readonly isHot: boolean
  owner: NodeId | null
}

export type WaveState = {
  readonly ring: HashRing
  readonly steps: readonly WaveStep[]
  stepIndex: number
  strategy: Strategy
  readonly lockedKeys: LockedKey[]
  readonly accum: Accumulator
  hotKeyBalanceRequired: boolean
  hotKeyBalanced: boolean
  readonly strategiesUsed: Set<Strategy>
  modnUsedAtChurn: boolean
  finished: boolean
  private_nextKeyId: number
  readonly waveTarget: number
  readonly spillBudget: number
  readonly remapBudget: number
}

export type StepOutcome =
  | { readonly kind: "advanced"; readonly step: WaveStep }
  | { readonly kind: "wrong-key"; readonly expected: string; readonly got: string }
  | { readonly kind: "ignored-toggle"; readonly strategy: Strategy }
  | { readonly kind: "no-step" }
  | { readonly kind: "already-finished" }

export function emptyAccumulator(): Accumulator {
  return {
    keys_routed: 0,
    misroutes: 0,
    keys_remapped: 0,
    churn_events_survived: 0,
    node_adds: 0,
    node_removes: 0,
    spills: 0,
  }
}

export function createWaveState(
  ring: HashRing,
  steps: readonly WaveStep[],
  opts: { readonly waveTarget: number; readonly spillBudget: number; readonly remapBudget: number },
): WaveState {
  return {
    ring,
    steps,
    stepIndex: 0,
    strategy: "ring",
    lockedKeys: [],
    accum: emptyAccumulator(),
    hotKeyBalanceRequired: false,
    hotKeyBalanced: false,
    strategiesUsed: new Set<Strategy>(["ring"]),
    modnUsedAtChurn: false,
    finished: false,
    private_nextKeyId: 0,
    waveTarget: opts.waveTarget,
    spillBudget: opts.spillBudget,
    remapBudget: opts.remapBudget,
  }
}

export function currentStep(state: WaveState): WaveStep | null {
  return state.steps[state.stepIndex] ?? null
}

// The single key each step expects. SPACE releases an orb; A adds; X removes.
// Strategy toggles (1 = MOD-N, 2 = RING) are handled separately — they don't
// advance the wave.
export function expectedKeyFor(step: WaveStep): string {
  switch (step.kind) {
    case "release-orb":
      return "Space"
    case "add-node-required":
      return "a"
    case "remove-node-required":
      return "x"
  }
}

export function handleKey(state: WaveState, rawKey: string): StepOutcome {
  if (state.finished) {
    return { kind: "already-finished" }
  }
  // Strategy toggles never advance the wave; they switch the active routing
  // strategy the next churn will be evaluated under.
  if (rawKey === "1") {
    state.strategy = "modn"
    state.strategiesUsed.add("modn")
    return { kind: "ignored-toggle", strategy: "modn" }
  }
  if (rawKey === "2") {
    state.strategy = "ring"
    state.strategiesUsed.add("ring")
    return { kind: "ignored-toggle", strategy: "ring" }
  }
  const step = currentStep(state)
  if (step === null) {
    return { kind: "no-step" }
  }
  const expected = expectedKeyFor(step)
  const got = rawKey === "Space" ? "Space" : rawKey.toLowerCase()
  const want = expected === "Space" ? "Space" : expected.toLowerCase()
  if (got !== want) {
    return { kind: "wrong-key", expected: want, got }
  }
  applyStep(state, step)
  return { kind: "advanced", step }
}

// Snapshot the wave's metrics as a readonly record. Called by the evidence
// builder when the wave resolves (pass or fail).
export function snapshotMetrics(state: WaveState): Metrics {
  return {
    kind: "threejs-ring-keeper",
    keys_routed: state.accum.keys_routed,
    misroutes: state.accum.misroutes,
    keys_remapped: state.accum.keys_remapped,
    remap_budget: state.remapBudget,
    churn_events_survived: state.accum.churn_events_survived,
    node_adds: state.accum.node_adds,
    node_removes: state.accum.node_removes,
    hot_key_balanced: state.hotKeyBalanced || !state.hotKeyBalanceRequired,
    spills: state.accum.spills,
    spill_budget: state.spillBudget,
    strategies_used: [...state.strategiesUsed].sort(),
    modn_used_at_churn: state.modnUsedAtChurn,
    node_count_final: state.ring.size(),
    wave_cleared: state.finished,
    wave_target: state.waveTarget,
  }
}

function applyStep(state: WaveState, step: WaveStep): void {
  if (step.kind === "release-orb") {
    releaseOrb(state, step)
  } else if (step.kind === "add-node-required") {
    addNode(state, step)
  } else {
    removeNode(state, step)
  }
  state.stepIndex += 1
  if (state.stepIndex >= state.steps.length) {
    state.finished = true
  }
}

function releaseOrb(state: WaveState, step: WaveStep & { readonly kind: "release-orb" }): void {
  const hashPos = hashToRing(step.key)
  const owner = state.ring.owner(hashPos, state.strategy)
  const locked: LockedKey = {
    id: state.private_nextKeyId,
    key: step.key,
    hashPos,
    isHot: step.isHot,
    owner,
  }
  state.private_nextKeyId += 1
  state.lockedKeys.push(locked)
  state.accum.keys_routed += 1
  if (step.isHot) {
    state.hotKeyBalanceRequired = true
  }
}

function addNode(state: WaveState, step: WaveStep & { readonly kind: "add-node-required" }): void {
  // Snapshot current owners so we can count remaps caused by the join.
  const prevOwners = state.lockedKeys.map((k) => k.owner)
  state.ring.add(step.nodeId, step.vnodes)
  let remapped = 0
  for (let i = 0; i < state.lockedKeys.length; i += 1) {
    const k = state.lockedKeys[i]
    if (k === undefined) continue
    const newOwner = state.ring.owner(k.hashPos, state.strategy)
    if (newOwner !== prevOwners[i]) {
      remapped += 1
    }
    k.owner = newOwner
  }
  state.accum.node_adds += 1
  state.accum.churn_events_survived += 1
  state.accum.keys_remapped += remapped
  if (state.strategy === "modn") {
    state.modnUsedAtChurn = true
  }
  state.strategiesUsed.add(state.strategy)
  if (step.balancesHotKey) {
    state.hotKeyBalanced = true
  }
}

function removeNode(state: WaveState, step: WaveStep & { readonly kind: "remove-node-required" }): void {
  const prevOwners = state.lockedKeys.map((k) => k.owner)
  state.ring.remove(step.nodeId)
  let remapped = 0
  for (let i = 0; i < state.lockedKeys.length; i += 1) {
    const k = state.lockedKeys[i]
    if (k === undefined) continue
    const newOwner = state.ring.owner(k.hashPos, state.strategy)
    if (newOwner !== prevOwners[i]) {
      remapped += 1
    }
    k.owner = newOwner
  }
  state.accum.node_removes += 1
  state.accum.churn_events_survived += 1
  state.accum.keys_remapped += remapped
  if (state.strategy === "modn") {
    state.modnUsedAtChurn = true
  }
  state.strategiesUsed.add(state.strategy)
}

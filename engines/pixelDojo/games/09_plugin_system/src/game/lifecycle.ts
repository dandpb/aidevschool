// Pure plugin-lifecycle state machine for the Plugin Docking Bay.
//
// The game's three.js layer (../main.ts) is a thin shell over this module:
// every key press maps to a single transition function here, and the returned
// state + metrics feed the HUD and the evidence emitter. Keeping the rules pure
// means the same code paths run under Vitest (deterministic) and in the browser
// (visualized), so a green unit test is a real signal that the wave can pass.
//
// The lifecycle this module encodes is the curriculum's RF-003 contract:
//
//        load → init → start → stop → unload
//
// with side-channels for:
//   - capability denial (RF-006): undeclared runtime demands MUST be denied
//   - version negotiation (RF-005): mismatched pods MUST be rejected at init
//   - sandbox isolation (RF-007/RNF-001): start without a sandbox is allowed
//     but a later panic vents to the host instead of being contained
//   - hook dispatch (RF-008/RF-009): subscribers are notified in priority order

export type LifecycleState =
  // Spawning: pod is on the inbound conveyor, not yet admitted.
  | "spawning"
  // Loaded: pod has been admitted to a dock but its manifest is unchecked.
  | "loaded"
  // Inited: version negotiation passed; capabilities declared; ready for sandbox/start.
  | "inited"
  // Running: pod is active and may receive hook events / spawn prompts / panic.
  | "running"
  // Stopped: pod is quiescent; only legalUnload can follow.
  | "stopped"
  // Rejected: version mismatch was denied at init; pod is being retired.
  | "rejected"
  // Unloaded: terminal clean state — pod is gone, dock freed, no leak.
  | "unloaded"

export type PromptKind =
  | { readonly kind: "version-mismatch" }
  | { readonly kind: "undeclared-capability"; readonly capability: string }

export interface PluginPod {
  readonly id: string
  /** Inclusive [min, max] api version range the plugin claims to support. */
  readonly apiVersionRange: readonly [number, number]
  /** Capabilities declared at init; anything else is denied at runtime. */
  readonly declaredCapabilities: readonly string[]
  /** Hook dispatch priority — lower number fires first. */
  readonly priority: number
  /** Deterministic runtime panic — only fires once `running` for > panicAfterMs. */
  readonly panicAfterMs: number | null
  /** Undeclared capability demand surfaced at runtime (or null if none). */
  readonly undeclaredDemand: string | null
  state: LifecycleState
  sandboxed: boolean
  /** ms the pod has been in `running` (reset on transition in/out). */
  runningMs: number
  panicked: boolean
  panicContained: boolean
  /** Prompt currently awaiting a player ruling on this pod. */
  activePrompt: PromptKind | null
  /** Has the undeclared demand already been surfaced (so it doesn't repeat). */
  demandSurfaced: boolean
}

export interface WaveMetrics {
  readonly kind: "threejs-plugin-lifecycle"
  pods_loaded: number
  pods_started_sandboxed: number
  pods_started_unsandboxed: number
  undeclared_denied: number
  undeclared_leaked: number
  version_mismatches_total: number
  version_mismatches_handled: number
  invalid_transitions_attempted: number
  hooks_dispatched_in_order: number
  hooks_out_of_order: number
  panics_contained: number
  panics_vented: number
  plugins_unloaded_clean: number
  host_damage: number
}

export type WaveStatus = "wave-running" | "wave-clear" | "wave-failed"

export interface Wave {
  readonly hostApiVersion: number
  readonly pods: PluginPod[]
  targetIndex: number
  readonly metrics: WaveMetrics
  status: WaveStatus
  /** Monotonic ms clock the game ticks each frame. */
  elapsedMs: number
}

export interface PodSpec {
  readonly id: string
  readonly apiVersionRange: readonly [number, number]
  readonly declaredCapabilities: readonly string[]
  readonly priority: number
  readonly panicAfterMs: number | null
  readonly undeclaredDemand: string | null
}

export function createWave(hostApiVersion: number, specs: readonly PodSpec[]): Wave {
  const pods: PluginPod[] = specs.map((spec) => ({
    id: spec.id,
    apiVersionRange: spec.apiVersionRange,
    declaredCapabilities: spec.declaredCapabilities,
    priority: spec.priority,
    panicAfterMs: spec.panicAfterMs,
    undeclaredDemand: spec.undeclaredDemand,
    state: "spawning",
    sandboxed: false,
    runningMs: 0,
    panicked: false,
    panicContained: false,
    activePrompt: null,
    demandSurfaced: false,
  }))
  return {
    hostApiVersion,
    pods,
    targetIndex: 0,
    metrics: freshMetrics(),
    status: "wave-running",
    elapsedMs: 0,
  }
}

export function freshMetrics(): WaveMetrics {
  return {
    kind: "threejs-plugin-lifecycle",
    pods_loaded: 0,
    pods_started_sandboxed: 0,
    pods_started_unsandboxed: 0,
    undeclared_denied: 0,
    undeclared_leaked: 0,
    version_mismatches_total: 0,
    version_mismatches_handled: 0,
    invalid_transitions_attempted: 0,
    hooks_dispatched_in_order: 0,
    hooks_out_of_order: 0,
    panics_contained: 0,
    panics_vented: 0,
    plugins_unloaded_clean: 0,
    host_damage: 0,
  }
}

/** Find the index of the next pod that can still be interacted with. */
function nextTargetable(wave: Wave, from: number): number {
  if (wave.pods.length === 0) return -1
  for (let offset = 1; offset <= wave.pods.length; offset += 1) {
    const idx = (from + offset) % wave.pods.length
    const pod = wave.pods[idx]
    if (pod && pod.state !== "unloaded") {
      return idx
    }
  }
  return from
}

export function cycleTarget(wave: Wave): Wave {
  if (wave.status !== "wave-running") return wave
  const next = nextTargetable(wave, wave.targetIndex)
  return next === -1 ? wave : { ...wave, targetIndex: next }
}

function withMetrics(wave: Wave, patch: Partial<WaveMetrics>): Wave {
  return { ...wave, metrics: { ...wave.metrics, ...patch } }
}

function withPod(wave: Wave, index: number, updater: (pod: PluginPod) => PluginPod): Wave {
  const pods = wave.pods.map((pod, i) => (i === index ? updater(pod) : pod))
  return { ...wave, pods }
}

function versionOk(pod: PluginPod, host: number): boolean {
  const [min, max] = pod.apiVersionRange
  return host >= min && host <= max
}

/** Advance the targeted pod through its next legal lifecycle transition. */
export function advance(wave: Wave): Wave {
  if (wave.status !== "wave-running") return wave
  const pod = wave.pods[wave.targetIndex]
  if (!pod) return wave

  // An active prompt must be resolved before any further advance.
  if (pod.activePrompt !== null) return wave

  switch (pod.state) {
    case "spawning": {
      let next = withPod(wave, wave.targetIndex, (p) => ({ ...p, state: "loaded" }))
      next = withMetrics(next, { pods_loaded: next.metrics.pods_loaded + 1 })
      return next
    }
    case "loaded": {
      // Init: negotiate version. Mismatch surfaces a prompt and stalls.
      if (!versionOk(pod, wave.hostApiVersion)) {
        const prompt: PromptKind = { kind: "version-mismatch" }
        return withMetrics(
          withPod(wave, wave.targetIndex, (p) => ({ ...p, activePrompt: prompt })),
          {
            version_mismatches_total: wave.metrics.version_mismatches_total + 1,
          },
        )
      }
      return withPod(wave, wave.targetIndex, (p) => ({ ...p, state: "inited" }))
    }
    case "inited": {
      // Start: sandboxed or not. The metric discipline happens here.
      const sandboxed = pod.sandboxed
      const metricsPatch: Partial<WaveMetrics> = sandboxed
        ? { pods_started_sandboxed: wave.metrics.pods_started_sandboxed + 1 }
        : { pods_started_unsandboxed: wave.metrics.pods_started_unsandboxed + 1 }
      return withMetrics(
        withPod(wave, wave.targetIndex, (p) => ({
          ...p,
          state: "running",
          runningMs: 0,
          demandSurfaced: false,
        })),
        metricsPatch,
      )
    }
    case "running": {
      // Stop. Legal forward transition.
      return withPod(wave, wave.targetIndex, (p) => ({ ...p, state: "stopped", runningMs: 0 }))
    }
    case "stopped": {
      // Unload. Clean only if the pod was not panicked-uncontained or rejected mid-run.
      let next = withPod(wave, wave.targetIndex, (p) => ({
        ...p,
        state: "unloaded",
        sandboxed: false,
      }))
      next = withMetrics(next, {
        plugins_unloaded_clean: next.metrics.plugins_unloaded_clean + 1,
      })
      next = recomputeStatus(next)
      return next
    }
    case "rejected": {
      // Force-unload a rejected pod. Counts as clean because the rejection was the
      // correct handling path (the rule is `version_mismatches_handled === total`,
      // not "pod reached running").
      let next = withPod(wave, wave.targetIndex, (p) => ({
        ...p,
        state: "unloaded",
        sandboxed: false,
      }))
      next = withMetrics(next, {
        plugins_unloaded_clean: next.metrics.plugins_unloaded_clean + 1,
      })
      next = recomputeStatus(next)
      return next
    }
    case "unloaded": {
      // No-op.
      return wave
    }
    default: {
      return wave
    }
  }
}

/** Toggle the sandbox bubble. Only effective between `inited` and `start`. */
export function toggleSandbox(wave: Wave): Wave {
  if (wave.status !== "wave-running") return wave
  const pod = wave.pods[wave.targetIndex]
  if (!pod) return wave
  if (pod.state !== "inited") return wave
  return withPod(wave, wave.targetIndex, (p) => ({ ...p, sandboxed: !p.sandboxed }))
}

/** Deny the active prompt on the targeted pod. */
export function denyPrompt(wave: Wave): Wave {
  if (wave.status !== "wave-running") return wave
  const pod = wave.pods[wave.targetIndex]
  if (!pod || pod.activePrompt === null) return wave

  if (pod.activePrompt.kind === "version-mismatch") {
    // Correct ruling: reject the pod at init.
    let next = withPod(wave, wave.targetIndex, (p) => ({
      ...p,
      activePrompt: null,
      state: "rejected",
    }))
    next = withMetrics(next, {
      version_mismatches_handled: next.metrics.version_mismatches_handled + 1,
    })
    return next
  }
  // undeclared-capability prompt.
  let next = withPod(wave, wave.targetIndex, (p) => ({
    ...p,
    activePrompt: null,
    demandSurfaced: true,
  }))
  next = withMetrics(next, {
    undeclared_denied: next.metrics.undeclared_denied + 1,
  })
  return next
}

/**
 * Allow the active prompt on the targeted pod. ALWAYS the wrong move under the
 * plan's pass rule (it leaks an undeclared capability or pushes a mismatched
 * pod past init). Used by the FAIL-path tests in the suite; the smoke run never
 * calls it.
 */
export function allowPrompt(wave: Wave): Wave {
  if (wave.status !== "wave-running") return wave
  const pod = wave.pods[wave.targetIndex]
  if (!pod || pod.activePrompt === null) return wave

  if (pod.activePrompt.kind === "version-mismatch") {
    // Wrong: let the mismatched pod through. It still goes to `inited` but the
    // wave is now poisoned: `version_mismatches_handled` stays short of `total`.
    return withPod(wave, wave.targetIndex, (p) => ({ ...p, activePrompt: null, state: "inited" }))
  }
  // Wrong: leak the undeclared capability. Host takes damage.
  let next = withPod(wave, wave.targetIndex, (p) => ({
    ...p,
    activePrompt: null,
    demandSurfaced: true,
  }))
  next = withMetrics(next, {
    undeclared_leaked: next.metrics.undeclared_leaked + 1,
    host_damage: next.metrics.host_damage + 1,
  })
  return next
}

/**
 * Drive the wave forward by `dtMs`. Surfaces runtime prompts (undeclared
 * demands) and panics deterministically. Returns the new wave.
 */
export function tick(wave: Wave, dtMs: number): Wave {
  if (wave.status !== "wave-running") return wave
  let next: Wave = { ...wave, elapsedMs: wave.elapsedMs + dtMs }

  next = next.pods.reduce((current, _pod, index) => tickPod(current, index, dtMs), next)
  next = maybeFireHook(next)
  next = recomputeStatus(next)
  return next
}

function tickPod(wave: Wave, index: number, dtMs: number): Wave {
  const pod = wave.pods[index]
  if (!pod) return wave
  if (pod.state !== "running") return wave
  if (pod.panicked) return wave

  const runningMs = pod.runningMs + dtMs
  let patched: PluginPod = { ...pod, runningMs }

  // Surface the undeclared demand once, after a short delay.
  if (
    patched.undeclaredDemand !== null &&
    !patched.demandSurfaced &&
    patched.activePrompt === null &&
    runningMs >= 600
  ) {
    patched = {
      ...patched,
      activePrompt: { kind: "undeclared-capability", capability: patched.undeclaredDemand },
    }
    return withPod(wave, index, () => patched)
  }

  // Panic check.
  if (patched.panicAfterMs !== null && runningMs >= patched.panicAfterMs) {
    if (patched.sandboxed) {
      // Contained: bubble flashes, auto-stop. Host undamaged.
      let next = withPod(wave, index, (p) => ({
        ...p,
        panicked: true,
        panicContained: true,
        state: "stopped",
        runningMs: 0,
      }))
      next = withMetrics(next, { panics_contained: next.metrics.panics_contained + 1 })
      return next
    }
    // Vented: explosion reaches the host.
    let next = withPod(wave, index, (p) => ({
      ...p,
      panicked: true,
      panicContained: false,
      state: "stopped",
      runningMs: 0,
    }))
    next = withMetrics(next, {
      panics_vented: next.metrics.panics_vented + 1,
      host_damage: next.metrics.host_damage + 1,
    })
    return next
  }

  return withPod(wave, index, () => patched)
}

/**
 * Fire one hook tick when at least one pod is `running`. Subscribers are
 * dispatched in ascending (priority, id) order. Since the dispatcher sorts
 * deterministically, every tick is in-order by construction — but the counter
 * lets the evidence record show dispatch actually happened.
 */
function maybeFireHook(wave: Wave): Wave {
  const running = wave.pods.filter((p) => p.state === "running")
  if (running.length === 0) return wave
  // Sorted dispatch: lower priority first, ties by id ascending.
  const ordered = [...running].sort((a, b) =>
    a.priority !== b.priority ? a.priority - b.priority : a.id.localeCompare(b.id),
  )
  // Sanity invariant: if a future code path bypassed the sort, this flag would
  // let the evidence betray it. By construction it stays true here.
  const inOrder = ordered.every((p, i) => {
    if (i === 0) return true
    const prev = ordered[i - 1]
    if (prev === undefined) return false
    return (
      prev.priority < p.priority ||
      (prev.priority === p.priority && prev.id.localeCompare(p.id) <= 0)
    )
  })
  return withMetrics(wave, {
    hooks_dispatched_in_order: wave.metrics.hooks_dispatched_in_order + (inOrder ? 1 : 0),
    hooks_out_of_order: wave.metrics.hooks_out_of_order + (inOrder ? 0 : 1),
  })
}

function recomputeStatus(wave: Wave): Wave {
  if (wave.status !== "wave-running") return wave
  const allDone = wave.pods.every((p) => p.state === "unloaded")
  if (allDone) {
    return { ...wave, status: "wave-clear" }
  }
  return wave
}

/** Apply the plan's pass rule. True iff the wave is clear and every gate holds. */
export function isPass(wave: Wave): boolean {
  if (wave.status !== "wave-clear") return false
  const m = wave.metrics
  return (
    m.pods_started_unsandboxed === 0 &&
    m.undeclared_leaked === 0 &&
    m.version_mismatches_handled === m.version_mismatches_total &&
    m.invalid_transitions_attempted === 0 &&
    m.hooks_out_of_order === 0 &&
    m.host_damage === 0 &&
    m.plugins_unloaded_clean === m.pods_loaded
  )
}

/** Force an invalid transition (the "trap" action — never used by the smoke run). */
export function forceInvalidTransition(wave: Wave): Wave {
  if (wave.status !== "wave-running") return wave
  return withMetrics(wave, {
    invalid_transitions_attempted: wave.metrics.invalid_transitions_attempted + 1,
  })
}

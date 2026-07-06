import { describe, expect, it } from "vitest"
import {
  advance,
  allowPrompt,
  createWave,
  cycleTarget,
  denyPrompt,
  forceInvalidTransition,
  isPass,
  type PodSpec,
  tick,
  toggleSandbox,
  type Wave,
} from "./lifecycle"

// Three deterministic pods that exercise every rule the pass gate enforces:
//   - alpha    : version-ok, declares `network`, will demand `fs:/etc` (undeclared)
//                and never panics. Tests the capability-denial rule.
//   - beta     : version-MISMATCH. Tests version_mismatches_handled === total.
//   - gamma    : version-ok, declares nothing, panics at +1200 ms when running.
//                Tests sandboxed panic containment.
const SPECS: readonly PodSpec[] = [
  {
    id: "alpha",
    apiVersionRange: [2, 4],
    declaredCapabilities: ["network"],
    priority: 10,
    panicAfterMs: null,
    undeclaredDemand: "fs:/etc",
  },
  {
    id: "beta",
    apiVersionRange: [5, 5],
    declaredCapabilities: [],
    priority: 20,
    panicAfterMs: null,
    undeclaredDemand: null,
  },
  {
    id: "gamma",
    apiVersionRange: [3, 4],
    declaredCapabilities: [],
    priority: 30,
    panicAfterMs: 1200,
    undeclaredDemand: null,
  },
]

function startWave(): Wave {
  return createWave(3, SPECS)
}

/** Drive the targeted pod from spawning through the named state, no shortcuts. */
function driveTo(wave: Wave, targetState: "inited" | "running" | "stopped" | "unloaded"): Wave {
  let w = wave
  for (let i = 0; i < 6; i += 1) {
    const pod = w.pods[w.targetIndex]
    if (!pod) break
    if (pod.state === targetState) break
    const maxApi = pod.apiVersionRange[1]
    if (pod.state === "loaded" && targetState === "inited" && maxApi !== undefined && maxApi < 3) {
      // version-mismatched pod; deny at init instead of advancing
      w = advance(w) // surfaces the version-mismatch prompt
      w = denyPrompt(w) // reject
      continue
    }
    w = advance(w)
  }
  return w
}

describe("plugin lifecycle state machine", () => {
  it("creates pods in `spawning` and counts zero metrics", () => {
    const wave = startWave()
    expect(wave.pods).toHaveLength(3)
    for (const pod of wave.pods) {
      expect(pod.state).toBe("spawning")
      expect(pod.sandboxed).toBe(false)
    }
    expect(wave.status).toBe("wave-running")
    expect(wave.metrics.pods_loaded).toBe(0)
  })

  it("advances alpha through load and init when the version range matches", () => {
    let wave = startWave()
    wave = advance(wave) // spawning -> loaded
    expect(wave.pods[0]?.state).toBe("loaded")
    expect(wave.metrics.pods_loaded).toBe(1)

    wave = advance(wave) // loaded -> inited (version ok)
    expect(wave.pods[0]?.state).toBe("inited")
    expect(wave.pods[0]?.activePrompt).toBeNull()
  })

  it("surfaces a version-mismatch prompt at init when the range does not intersect host", () => {
    let wave = startWave()
    wave = cycleTarget(wave) // alpha -> beta
    wave = cycleTarget(wave) // beta -> gamma
    wave = cycleTarget(wave) // gamma -> alpha (we want beta targeted)
    wave = cycleTarget(wave) // alpha -> beta
    expect(wave.pods[wave.targetIndex]?.id).toBe("beta")

    wave = advance(wave) // spawning -> loaded
    wave = advance(wave) // loaded -> version-mismatch prompt
    expect(wave.pods[wave.targetIndex]?.state).toBe("loaded")
    expect(wave.pods[wave.targetIndex]?.activePrompt?.kind).toBe("version-mismatch")
    expect(wave.metrics.version_mismatches_total).toBe(1)
    expect(wave.metrics.version_mismatches_handled).toBe(0)

    wave = denyPrompt(wave)
    expect(wave.pods[wave.targetIndex]?.state).toBe("rejected")
    expect(wave.metrics.version_mismatches_handled).toBe(1)
  })

  it("requires the sandbox bubble to count starts as sandboxed", () => {
    let wave = startWave()
    wave = driveTo(wave, "inited")
    // Without toggling sandbox: start counts as unsandboxed.
    wave = advance(wave) // inited -> running
    expect(wave.metrics.pods_started_sandboxed).toBe(0)
    expect(wave.metrics.pods_started_unsandboxed).toBe(1)

    // Reset and try again with sandbox on.
    let w2 = startWave()
    w2 = driveTo(w2, "inited")
    w2 = toggleSandbox(w2)
    expect(w2.pods[w2.targetIndex]?.sandboxed).toBe(true)
    w2 = advance(w2) // inited -> running
    expect(w2.metrics.pods_started_sandboxed).toBe(1)
    expect(w2.metrics.pods_started_unsandboxed).toBe(0)
  })

  it("surfaces the undeclared capability prompt after a tick of running and counts the deny", () => {
    let wave = startWave()
    wave = driveTo(wave, "inited")
    wave = toggleSandbox(wave)
    wave = advance(wave) // -> running
    wave = tick(wave, 700) // past the 600 ms demand threshold

    const pod = wave.pods[0]
    expect(pod?.state).toBe("running")
    expect(pod?.activePrompt?.kind).toBe("undeclared-capability")
    if (pod?.activePrompt?.kind === "undeclared-capability") {
      expect(pod.activePrompt.capability).toBe("fs:/etc")
    }
    wave = denyPrompt(wave)
    expect(wave.metrics.undeclared_denied).toBe(1)
    expect(wave.metrics.undeclared_leaked).toBe(0)
  })

  it("contains a sandboxed panic and vents an unsandboxed one", () => {
    let wave = startWave()
    // Target gamma (priority 30, panics at 1200 ms)
    wave = cycleTarget(wave) // alpha -> beta
    wave = cycleTarget(wave) // beta -> gamma
    expect(wave.pods[wave.targetIndex]?.id).toBe("gamma")
    wave = advance(wave) // spawning -> loaded
    wave = advance(wave) // loaded -> inited (gamma version-ok)
    wave = toggleSandbox(wave)
    wave = advance(wave) // -> running
    wave = tick(wave, 1300) // past panic threshold

    expect(wave.pods[wave.targetIndex]?.state).toBe("stopped")
    expect(wave.pods[wave.targetIndex]?.panicked).toBe(true)
    expect(wave.pods[wave.targetIndex]?.panicContained).toBe(true)
    expect(wave.metrics.panics_contained).toBe(1)
    expect(wave.metrics.panics_vented).toBe(0)
    expect(wave.metrics.host_damage).toBe(0)

    // Now repeat WITHOUT the sandbox; expect vent + damage.
    let w2 = startWave()
    w2 = cycleTarget(w2)
    w2 = cycleTarget(w2)
    w2 = advance(w2)
    w2 = advance(w2)
    // Skip toggleSandbox deliberately.
    w2 = advance(w2) // inited -> running (unsandboxed)
    w2 = tick(w2, 1300)
    expect(w2.metrics.panics_contained).toBe(0)
    expect(w2.metrics.panics_vented).toBe(1)
    expect(w2.metrics.host_damage).toBe(1)
  })

  it("dispatches hooks in priority order whenever at least one pod is running", () => {
    let wave = startWave()
    wave = driveTo(wave, "running") // alpha running
    const before = wave.metrics.hooks_dispatched_in_order
    wave = tick(wave, 100)
    expect(wave.metrics.hooks_dispatched_in_order).toBeGreaterThan(before)
    expect(wave.metrics.hooks_out_of_order).toBe(0)
  })

  it("passes the full clean wave and emits pass=true", () => {
    let wave = startWave()

    // ---- alpha: load, init, sandbox, start, deny undeclared, stop, unload ----
    wave = advance(wave) // -> loaded
    wave = advance(wave) // -> inited
    wave = toggleSandbox(wave)
    wave = advance(wave) // -> running
    wave = tick(wave, 700) // surface the undeclared prompt
    wave = denyPrompt(wave)
    wave = advance(wave) // -> stopped
    wave = advance(wave) // -> unloaded

    // ---- beta: load, init -> mismatch, deny, rejected -> unloaded ----
    wave = cycleTarget(wave) // alpha(unloaded) -> beta
    wave = advance(wave) // -> loaded
    wave = advance(wave) // surfaces mismatch prompt
    wave = denyPrompt(wave) // rejected
    wave = advance(wave) // rejected -> unloaded

    // ---- gamma: load, init, sandbox, start, panic-contained, unload ----
    wave = cycleTarget(wave) // beta(unloaded) -> gamma
    wave = advance(wave) // -> loaded
    wave = advance(wave) // -> inited
    wave = toggleSandbox(wave)
    wave = advance(wave) // -> running
    wave = tick(wave, 1300) // panic contained -> auto-stopped
    wave = advance(wave) // -> unloaded

    expect(wave.status).toBe("wave-clear")
    expect(isPass(wave)).toBe(true)
    expect(wave.metrics.pods_loaded).toBe(3)
    expect(wave.metrics.plugins_unloaded_clean).toBe(3)
    expect(wave.metrics.pods_started_sandboxed).toBe(2)
    expect(wave.metrics.pods_started_unsandboxed).toBe(0)
    expect(wave.metrics.undeclared_denied).toBe(1)
    expect(wave.metrics.undeclared_leaked).toBe(0)
    expect(wave.metrics.version_mismatches_total).toBe(1)
    expect(wave.metrics.version_mismatches_handled).toBe(1)
    expect(wave.metrics.invalid_transitions_attempted).toBe(0)
    expect(wave.metrics.panics_contained).toBe(1)
    expect(wave.metrics.panics_vented).toBe(0)
    expect(wave.metrics.host_damage).toBe(0)
    expect(wave.metrics.hooks_out_of_order).toBe(0)
  })

  it("fails the wave when an undeclared capability is allowed through", () => {
    let wave = startWave()
    wave = advance(wave) // -> loaded
    wave = advance(wave) // -> inited
    wave = toggleSandbox(wave)
    wave = advance(wave) // -> running
    wave = tick(wave, 700) // surface undeclared
    wave = allowPrompt(wave) // WRONG
    expect(wave.metrics.undeclared_leaked).toBe(1)
    expect(wave.metrics.host_damage).toBe(1)
  })

  it("counts an invalid transition when the trap action fires", () => {
    let wave = startWave()
    wave = forceInvalidTransition(wave)
    expect(wave.metrics.invalid_transitions_attempted).toBe(1)
  })
})

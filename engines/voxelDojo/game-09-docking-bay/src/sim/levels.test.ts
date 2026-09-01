import { describe, expect, it } from "vitest"
import { evaluateDockWave, HOST_CONTRACT, levelConfig, podWave, type WavePod } from "./levels"
import { checkContract } from "./plugin"

/**
 * Dock-truth semantics pins (AID-467 fix-forward).
 *
 * The lesson says: "a pod docks only if its claimed connector covers every
 * method the host's port demands" — i.e. dock iff HOST ⊆ claims (exactly the
 * clamp's `checkContract`). The L1 evaluator used to test the reverse
 * direction (claims ⊆ HOST), which the wave generator guarantees by
 * construction, making the truth constant-true: every pod "docked", no
 * rejection was ever possible, and the level was unteachable. These tests pin
 * the corrected direction and the rejection case.
 */

const FULL: WavePod = {
  id: "pod-full",
  claimsContract: [...HOST_CONTRACT],
  capabilities: ["readState"],
}

const DROPPED_LOG: WavePod = {
  id: "pod-dropped-log",
  // omits "log" — the clamp must reject this connector
  claimsContract: ["connect", "readState", "writeState"],
  capabilities: ["readState"],
}

const COVERING_WITH_EXTRAS: WavePod = {
  id: "pod-extras",
  // covers the host contract and claims one extra method; covering is a
  // superset check, so extras still dock
  claimsContract: [...HOST_CONTRACT, "telemetry"],
  capabilities: [],
}

describe("dock wave truth = clamp contract check (HOST ⊆ claims)", () => {
  it("a pod covering the host contract docks", () => {
    expect(checkContract(FULL, HOST_CONTRACT)).toBe(true)
    const out = evaluateDockWave([
      { pod: FULL, predictedDock: true },
      { pod: DROPPED_LOG, predictedDock: false },
    ])
    expect(out.pass).toBe(true)
    expect(out.metrics.dock_prediction_accuracy).toBe(1)
  })

  it("REJECTION CASE: a pod that dropped a contract method is blocked — predicting it docks is wrong", () => {
    expect(checkContract(DROPPED_LOG, HOST_CONTRACT)).toBe(false)
    // Truthful predictions on the same wave pass…
    expect(
      evaluateDockWave([
        { pod: FULL, predictedDock: true },
        { pod: DROPPED_LOG, predictedDock: false },
      ]).pass,
    ).toBe(true)
    // …while the former constant-true oracle (predict every pod docks) fails.
    const allDock = evaluateDockWave([
      { pod: FULL, predictedDock: true },
      { pod: DROPPED_LOG, predictedDock: true },
    ])
    expect(allDock.pass).toBe(false)
    expect(allDock.metrics.dock_prediction_accuracy).toBe(0.5)
  })

  it("claims beyond the host contract still dock (cover = superset)", () => {
    expect(checkContract(COVERING_WITH_EXTRAS, HOST_CONTRACT)).toBe(true)
    expect(evaluateDockWave([{ pod: COVERING_WITH_EXTRAS, predictedDock: true }]).pass).toBe(true)
  })
})

describe("generated L1/L2 waves stay a teachable mix under the corrected truth", () => {
  it("L1 wave has dockers AND rejected pods; the truth oracle clears it, all-dock does not", () => {
    const wave = podWave(levelConfig("L1"), 6)
    const truth = wave.map((pod) => checkContract(pod, HOST_CONTRACT))
    expect(truth.some(Boolean)).toBe(true)
    expect(truth.every(Boolean)).toBe(false)

    const oracle = evaluateDockWave(
      wave.map((pod, i) => ({ pod, predictedDock: truth[i] === true })),
    )
    expect(oracle.pass).toBe(true)
    expect(oracle.metrics.dock_prediction_accuracy).toBe(1)

    const constantTrue = evaluateDockWave(wave.map((pod) => ({ pod, predictedDock: true })))
    expect(constantTrue.pass).toBe(false)
  })

  it("L2 wave has dockers AND rejected pods", () => {
    const wave = podWave(levelConfig("L2"), 5)
    const truth = wave.map((pod) => checkContract(pod, HOST_CONTRACT))
    expect(truth.some(Boolean)).toBe(true)
    expect(truth.every(Boolean)).toBe(false)
  })
})

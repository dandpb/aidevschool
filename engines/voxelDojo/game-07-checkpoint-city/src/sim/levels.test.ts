import { describe, expect, it } from "vitest"
import {
  buildLayers,
  buildWave,
  evaluatePredictions,
  evaluateReorder,
  levelConfig,
  type PredictionTarget,
} from "./levels"
import { runPipeline } from "./middleware"

describe("L1 — through the walls (every request is valid)", () => {
  const cfg = levelConfig("L1")
  const wave = buildWave(cfg)
  it("waves a request for every slot, all predicting 'reaches the handler'", () => {
    expect(wave).toHaveLength(cfg.waveSize)
    for (const w of wave) {
      expect(w.answer).toBe("reaches-handler")
      expect(w.truth.reachedHandler).toBe(true)
    }
  })
  it("100% accuracy clears; below 80% fails", () => {
    const allRight = wave.map(() => "reaches-handler" as PredictionTarget)
    expect(evaluatePredictions(wave, allRight).pass).toBe(true)
    // pretend the player said 'auth' for everything (wrong) → 0% accuracy
    const allWrong = wave.map(() => "auth" as PredictionTarget)
    expect(evaluatePredictions(wave, allWrong).pass).toBe(false)
  })
})

describe("L2 — forged badge (the HMAC check is the lesson)", () => {
  const cfg = levelConfig("L2")
  const wave = buildWave(cfg)
  it("every forged/tampered token is rejected at auth; valid ones reach the handler", () => {
    expect(wave).toHaveLength(cfg.waveSize)
    const hasAuthReject = wave.some((w) => w.answer === "auth")
    const hasPass = wave.some((w) => w.answer === "reaches-handler")
    expect(hasAuthReject).toBe(true)
    expect(hasPass).toBe(true)
    for (const w of wave) {
      if (w.answer === "auth") {
        expect(w.truth.rejectedAt).toBe("auth")
        expect(w.truth.reachedHandler).toBe(false)
      } else {
        expect(w.truth.reachedHandler).toBe(true)
      }
    }
  })
  it("is deterministic — same seed ⇒ same wave, replayable", () => {
    const again = buildWave(cfg)
    expect(again.map((w) => w.answer)).toEqual(wave.map((w) => w.answer))
  })
})

describe("L3 — rate limit rejects the (cap+1)th request", () => {
  const cfg = levelConfig("L3")
  const wave = buildWave(cfg)
  it("passes exactly `rateCap` requests, then rejects the rest at rate-limit", () => {
    const passed = wave.filter((w) => w.answer === "reaches-handler").length
    const bounced = wave.filter((w) => w.answer === "rate-limit").length
    expect(passed).toBe(cfg.rateCap)
    expect(bounced).toBe(cfg.waveSize - cfg.rateCap)
    // the boundary: request index === rateCap is the first bounce
    const boundary = wave[cfg.rateCap]
    expect(boundary?.answer).toBe("rate-limit")
    expect(boundary?.truth.rejectedAt).toBe("rate-limit")
  })
  it("predictions matching the boundary clear the wave", () => {
    const right = wave.map((w) => w.answer)
    expect(evaluatePredictions(wave, right).pass).toBe(true)
    expect(evaluatePredictions(wave, right).metrics.correct_predictions).toBe(cfg.waveSize)
  })
})

describe("L4 — order matters", () => {
  const cfg = levelConfig("L4")
  const task = cfg.reorder

  it("the probe is rejected at a DIFFERENT wall under the given vs target order", () => {
    if (!task) throw new Error("no reorder task")
    const givenStack = buildLayers(cfg.secret, cfg.rateCap, task.given)
    const targetStack = buildLayers(cfg.secret, cfg.rateCap, task.target)
    const givenTruth = runPipeline(givenStack, task.probe)
    const targetTruth = runPipeline(targetStack, task.probe)
    // given order = rate-limit first (cap 0) → rejects at rate-limit
    expect(givenTruth.rejectedAt).toBe("rate-limit")
    // target order = logging → auth → rate-limit → forged token dies at auth
    expect(targetTruth.rejectedAt).toBe("auth")
    expect(givenTruth.rejectedAt).not.toBe(targetTruth.rejectedAt)
  })

  it("evaluateReorder passes only with the exact target order + correct probe prediction", () => {
    if (!task) throw new Error("no reorder task")
    const good = evaluateReorder({ task, playerOrder: [...task.target], probePrediction: "auth" })
    expect(good.pass).toBe(true)
    expect(good.metrics.reorder_correct).toBe(true)

    const wrongOrder = evaluateReorder({
      task,
      playerOrder: [...task.given],
      probePrediction: "auth",
    })
    expect(wrongOrder.pass).toBe(false)
    expect(wrongOrder.metrics.reorder_correct).toBe(false)

    const wrongProbe = evaluateReorder({
      task,
      playerOrder: [...task.target],
      probePrediction: "rate-limit",
    })
    expect(wrongProbe.pass).toBe(false)
    expect(wrongProbe.metrics.probe_prediction_ok).toBe(false)
  })
})

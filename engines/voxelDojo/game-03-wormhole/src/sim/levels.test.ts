import { describe, expect, it } from "vitest"
import { type CollisionPrediction, evaluateCollisionPredictions } from "./levels"

/**
 * Permanent unit coverage for the L3 gate `evaluateCollisionPredictions` (AID-3275, part b).
 * The contract under test is the IMPLEMENTED pass rule — accuracy >= 0.8 over graded
 * predictions — not the stricter wording of the sim doc-comment; production behavior is
 * intentionally unchanged by these tests.
 * Fixtures are hand-built with literal expected metrics so a regression in grading,
 * threshold, rounding, or collisions_present accounting fails against fixed numbers
 * instead of numbers recomputed by the same loop being tested.
 */

function p(
  url: string,
  predictedCollision: boolean,
  actualCollision: boolean,
): CollisionPrediction {
  return { url, predictedCollision, actualCollision }
}

describe("evaluateCollisionPredictions — L3 grading gate", () => {
  it("empty wave fails closed with zeroed metrics", () => {
    expect(evaluateCollisionPredictions([])).toEqual({
      pass: false,
      metrics: {
        collision_predictions: 0,
        collision_prediction_accuracy: 0,
        collisions_present: 0,
      },
    })
  })

  it("all-correct wave over mixed truths passes with accuracy 1", () => {
    const predictions = [
      p("https://wormhole.test/a", false, false), // true negative
      p("https://wormhole.test/b", true, true), // true positive
      p("https://wormhole.test/c", false, false), // true negative
      p("https://wormhole.test/d", true, true), // true positive
      p("https://wormhole.test/e", false, false), // true negative
    ]
    expect(evaluateCollisionPredictions(predictions)).toEqual({
      pass: true,
      metrics: {
        collision_predictions: 5,
        collision_prediction_accuracy: 1,
        collisions_present: 2,
      },
    })
  })

  it("grades both directions of a wrong prediction (false alarm and miss)", () => {
    const predictions = [
      p("https://wormhole.test/a", true, false), // false alarm → wrong
      p("https://wormhole.test/b", false, true), // miss → wrong
      p("https://wormhole.test/c", true, true), // right
      p("https://wormhole.test/d", false, false), // right
      p("https://wormhole.test/e", false, false), // right
    ]
    // Only 3/5 agree in either direction → 0.6 → below the 0.8 gate.
    expect(evaluateCollisionPredictions(predictions)).toEqual({
      pass: false,
      metrics: {
        collision_predictions: 5,
        collision_prediction_accuracy: 0.6,
        collisions_present: 2, // actual collisions are b and c, regardless of the guesses
      },
    })
  })

  it("threshold boundary: 4/5 correct (0.8 exactly) passes", () => {
    const predictions = [
      p("https://wormhole.test/a", true, true), // right
      p("https://wormhole.test/b", true, true), // right
      p("https://wormhole.test/c", false, false), // right
      p("https://wormhole.test/d", false, false), // right
      p("https://wormhole.test/e", true, false), // the single false alarm
    ]
    expect(evaluateCollisionPredictions(predictions)).toEqual({
      pass: true,
      metrics: {
        collision_predictions: 5,
        collision_prediction_accuracy: 0.8,
        collisions_present: 2,
      },
    })
  })

  it("threshold boundary: 3/5 correct (0.6) fails even with zero real collisions", () => {
    const predictions = [
      p("https://wormhole.test/a", false, false), // right
      p("https://wormhole.test/b", false, false), // right
      p("https://wormhole.test/c", false, false), // right
      p("https://wormhole.test/d", true, false), // false alarm
      p("https://wormhole.test/e", true, false), // false alarm
    ]
    expect(evaluateCollisionPredictions(predictions)).toEqual({
      pass: false,
      metrics: {
        collision_predictions: 5,
        collision_prediction_accuracy: 0.6,
        collisions_present: 0, // nothing actually collided
      },
    })
  })

  it("rounds the reported accuracy to 2 decimals without changing the pass rule", () => {
    // 2/3 = 0.666… → reported as 0.67, still below the gate.
    const twoOfThree = [
      p("https://wormhole.test/a", false, false),
      p("https://wormhole.test/b", true, true),
      p("https://wormhole.test/c", true, false),
    ]
    expect(evaluateCollisionPredictions(twoOfThree).metrics.collision_prediction_accuracy).toBe(
      0.67,
    )
    expect(evaluateCollisionPredictions(twoOfThree).pass).toBe(false)

    // 5/6 = 0.8333… → reported as 0.83, still passing the >= 0.8 gate.
    const fiveOfSix = [
      p("https://wormhole.test/a", false, false),
      p("https://wormhole.test/b", true, true),
      p("https://wormhole.test/c", false, false),
      p("https://wormhole.test/d", false, false),
      p("https://wormhole.test/e", false, false),
      p("https://wormhole.test/f", false, true), // the single miss
    ]
    expect(evaluateCollisionPredictions(fiveOfSix).metrics.collision_prediction_accuracy).toBe(0.83)
    expect(evaluateCollisionPredictions(fiveOfSix).pass).toBe(true)
  })

  it("collisions_present counts actualCollision, never predictedCollision", () => {
    // Optimistic play: every guess says "collide", but only one url actually does.
    // A HUD/metric that counted predictions would report 2; the actual count is 1.
    const predictions = [
      p("https://wormhole.test/a", true, false),
      p("https://wormhole.test/b", true, false),
      p("https://wormhole.test/c", false, true),
    ]
    expect(evaluateCollisionPredictions(predictions)).toEqual({
      pass: false, // 0/3 agree
      metrics: {
        collision_predictions: 3,
        collision_prediction_accuracy: 0,
        collisions_present: 1,
      },
    })
  })
})

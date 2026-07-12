/**
 * Per-building construction state machine. Five stages, ~8 sim-seconds each,
 * advancing on `tick(dt)`. The `frame → roofed` transition commits a
 * procedural variation (palette + roof style + height + garden/awning flags)
 * that the renderers use to pick geometry and colours.
 */

import { type BuildingVariation, buildingVariation } from "./variation"

export type ConstructionStage = "plot" | "foundation" | "frame" | "roofed" | "inhabited"

export const STAGE_SECONDS = 8

const STAGE_ORDER: readonly ConstructionStage[] = [
  "plot",
  "foundation",
  "frame",
  "roofed",
  "inhabited",
]

/**
 * Pure state machine. The Town owns one of these per Building and ticks it
 * once per simulation step. The renderers read `getStage()` to pick geometry
 * and `getVariation()` once the building crosses into `roofed`.
 */
export class BuildingConstruction {
  #stage: ConstructionStage = "plot"
  #elapsed = 0
  #variation: BuildingVariation | null = null
  readonly seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  /** Advance by `dt` sim-seconds. Idempotent once `inhabited` is reached. */
  tick(dt: number): void {
    if (!(dt > 0)) return
    if (this.#stage === "inhabited") return
    this.#elapsed += dt
    // Loop while we have enough elapsed time to cross a stage boundary. The
    // loop re-checks the stage inside the body because `#advance` may have
    // pushed us to `inhabited`. The cast widens past TypeScript's narrowing
    // so the re-check compiles.
    while (this.#elapsed >= STAGE_SECONDS) {
      this.#elapsed -= STAGE_SECONDS
      this.#advance()
      if ((this.#stage as ConstructionStage) === "inhabited") break
    }
  }

  #advance(): void {
    const idx = STAGE_ORDER.indexOf(this.#stage)
    const next = STAGE_ORDER[idx + 1] ?? "inhabited"
    this.#stage = next
    // Variation is locked in at the frame→roofed transition. Anything later
    // would race with the renderer rebuilding its meshes; anything earlier
    // would re-roll colours each time the walls were drawn.
    if (next === "roofed" && this.#variation === null) {
      this.#variation = buildingVariation(this.seed)
    }
  }

  getStage(): ConstructionStage {
    return this.#stage
  }

  /** 0..1 progress through the current stage. 1.0 means "ready to advance". */
  getProgress(): number {
    if (this.#stage === "inhabited") return 1
    return Math.min(1, this.#elapsed / STAGE_SECONDS)
  }

  /** `null` until the building first reaches `roofed`. */
  getVariation(): BuildingVariation | null {
    return this.#variation
  }
}

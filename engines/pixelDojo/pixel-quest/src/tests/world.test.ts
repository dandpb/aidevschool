import { describe, expect, it } from "vitest"
import { loadCorePack } from "../content/loadCorePack"
import type { PixelQuestEvidenceRecord } from "../game/evidence/types"
import type { WorldState } from "../game/simulation/types"
import { createWorld, getInteraction, movePlayer, recordEvidence } from "../game/simulation/world"

describe("world simulation", () => {
  it("starts facing SONDA and exposes an npc interaction", () => {
    const { pack } = loadCorePack()
    const world = createWorld(pack, "rate-limiter-lab")

    expect(world.player.position).toEqual({ x: 7, y: 9 })
    expect(getInteraction(world)).toMatchObject({ kind: "npc" })
  })

  it("blocks the gate until evidence passes for the required unit", () => {
    const { pack } = loadCorePack()
    const world = createWorld(pack, "rate-limiter-lab")
    const nearGate: WorldState = {
      ...world,
      player: {
        position: { x: 14, y: 3 },
        facing: "north",
      },
    }

    expect(movePlayer(nearGate, "north").player.position).toEqual({ x: 14, y: 3 })

    const unlockedWorld = recordEvidence(nearGate, makeEvidence(true))

    expect(movePlayer(unlockedWorld, "north").player.position).toEqual({ x: 14, y: 2 })
  })
})

function makeEvidence(pass: boolean): PixelQuestEvidenceRecord {
  return {
    source: "pixelquest",
    unit_id: "U0-sonda-rate-limiter-robustness",
    project: "01_rate_limiter",
    encounter_id: "encounter-token-bucket-01",
    game: "PixelDojo Quest",
    ts: "2026-06-11T12:00:00.000Z",
    pass,
    metrics: {
      target_rate: 1.5,
      observed_admit_rate: 0.72,
      max_burst_1s: 2,
      good_admits: 8,
      legit_rejected: 0,
      abusive_admitted: 0,
      abusive_rejected: 4,
      heat_peak: 56,
      overheated: false,
    },
  }
}

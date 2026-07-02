import { describe, expect, it } from "vitest"
import { firstCurriculumRegionId } from "../content/curriculumPack"
import { loadCorePack } from "../content/loadCorePack"
import type { PixelQuestEvidenceRecord } from "../game/evidence/types"
import type { WorldState } from "../game/simulation/types"
import {
  createWorld,
  enterRegion,
  enterWorld,
  getInteraction,
  movePlayer,
  recordEvidence,
} from "../game/simulation/world"

describe("world simulation", () => {
  it("starts facing SONDA and exposes an npc interaction", () => {
    const { pack } = loadCorePack()
    const world = createWorld(pack, firstCurriculumRegionId())

    expect(world.mode).toBe("briefing")
    expect(world.progress.phase).toBe("briefing")
    expect(world.player.position).toEqual({ x: 7, y: 9 })
    expect(getInteraction(world)).toMatchObject({ kind: "npc" })
  })

  it("enters the playable map from briefing", () => {
    const { pack } = loadCorePack()
    const world = enterWorld(createWorld(pack, firstCurriculumRegionId()))

    expect(world.mode).toBe("world")
    expect(world.progress.phase).toBe("map")
  })

  it("blocks the gate until evidence passes for the required unit", () => {
    const { pack } = loadCorePack()
    const world = createWorld(pack, firstCurriculumRegionId())
    const nearGate: WorldState = {
      ...world,
      player: {
        position: { x: 14, y: 3 },
        facing: "north",
      },
    }

    expect(movePlayer(nearGate, "north").player.position).toEqual({ x: 14, y: 3 })

    const unlockedWorld = recordEvidence(nearGate, makeEvidence(true))

    expect(unlockedWorld.progress.phase).toBe("evidence")
    expect(movePlayer(unlockedWorld, "north").player.position).toEqual({ x: 14, y: 2 })
  })

  it("can advance from one curriculum lab to the next after passing evidence", () => {
    const { pack } = loadCorePack()
    const world = createWorld(pack, firstCurriculumRegionId())
    const unlockedWorld = recordEvidence(world, makeEvidence(true))
    const gate = unlockedWorld.region.gates[0]
    if (gate?.nextRegionId === undefined) {
      throw new Error("expected next curriculum region")
    }

    const nextWorld = enterRegion(unlockedWorld, gate.nextRegionId)

    expect(nextWorld.region.project).toBe("02_key_value_store")
    expect(nextWorld.progress.completedUnitIds).toContain("U0-sonda-rate-limiter-robustness")
  })
})

function makeEvidence(pass: boolean): PixelQuestEvidenceRecord {
  return {
    source: "pixelquest",
    unit_id: "U0-sonda-rate-limiter-robustness",
    project: "01_rate_limiter",
    encounter_id: "encounter-agent-quest-01",
    game: "PixelDojo Quest",
    ts: "2026-06-11T12:00:00.000Z",
    pass,
    metrics: {
      target_rate: 5,
      observed_admit_rate: 0.5,
      max_burst_1s: 5,
      good_admits: 5,
      legit_rejected: 0,
      abusive_admitted: 0,
      abusive_rejected: 5,
      heat_peak: 0,
      overheated: false,
    },
  }
}

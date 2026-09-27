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
import { makeTokenBucketEvidence } from "./fixtures/evidence"

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

  describe("movePlayer", () => {
    it("moves player in all cardinal directions when destination is walkable", () => {
      const { pack } = loadCorePack()
      const world = createWorld(pack, firstCurriculumRegionId())
      const baseWorld: WorldState = {
        ...world,
        player: { position: { x: 2, y: 8 }, facing: "north" },
      }

      const movedNorth = movePlayer(baseWorld, "north")
      expect(movedNorth.player.position).toEqual({ x: 2, y: 7 })
      expect(movedNorth.player.facing).toBe("north")

      const movedSouth = movePlayer(baseWorld, "south")
      expect(movedSouth.player.position).toEqual({ x: 2, y: 9 })
      expect(movedSouth.player.facing).toBe("south")

      const movedEast = movePlayer(baseWorld, "east")
      expect(movedEast.player.position).toEqual({ x: 3, y: 8 })
      expect(movedEast.player.facing).toBe("east")

      const movedWest = movePlayer(baseWorld, "west")
      expect(movedWest.player.position).toEqual({ x: 1, y: 8 })
      expect(movedWest.player.facing).toBe("west")
    })

    it("updates facing direction but stays in place when destination is a wall or out of bounds", () => {
      const { pack } = loadCorePack()
      const world = createWorld(pack, firstCurriculumRegionId())
      const atTopLeft: WorldState = {
        ...world,
        player: { position: { x: 0, y: 0 }, facing: "south" },
      }

      const movedNorth = movePlayer(atTopLeft, "north")
      expect(movedNorth.player.position).toEqual({ x: 0, y: 0 })
      expect(movedNorth.player.facing).toBe("north")

      const movedWest = movePlayer(atTopLeft, "west")
      expect(movedWest.player.position).toEqual({ x: 0, y: 0 })
      expect(movedWest.player.facing).toBe("west")
    })

    it("updates facing direction but stays in place when blocked by an NPC", () => {
      const { pack } = loadCorePack()
      const world = createWorld(pack, firstCurriculumRegionId())
      const nearNpc: WorldState = {
        ...world,
        player: { position: { x: 7, y: 9 }, facing: "south" },
      }

      const movedNorth = movePlayer(nearNpc, "north")
      expect(movedNorth.player.position).toEqual({ x: 7, y: 9 })
      expect(movedNorth.player.facing).toBe("north")
    })
  })
})

function makeEvidence(pass: boolean): PixelQuestEvidenceRecord {
  return makeTokenBucketEvidence(pass)
}

import { describe, expect, it } from "vitest"
import { firstCurriculumRegionId } from "../content/curriculumPack"
import { loadCorePack } from "../content/loadCorePack"
import type { PixelQuestEvidenceRecord } from "../game/evidence/types"
import { selectedSkillOrbitStation, skillOrbitStations } from "../game/simulation/skillOrbit"
import {
  createWorld,
  enterSelectedSkillOrbitRegion,
  enterSkillOrbit,
  recordEvidence,
  selectSkillOrbit,
} from "../game/simulation/world"
import { makeTokenBucketEvidence } from "./fixtures/evidence"

describe("skill orbit simulation", () => {
  it("builds one station per curriculum unit and starts on the current lab", () => {
    const { pack } = loadPack()
    const world = enterSkillOrbit(createWorld(pack, firstCurriculumRegionId()))

    const stations = skillOrbitStations(world)
    const selected = selectedSkillOrbitStation(world)

    expect(stations).toHaveLength(18)
    expect(world.mode).toBe("skill-orbit")
    expect(world.progress.phase).toBe("orbit")
    expect(selected.project).toBe("01_rate_limiter")
    expect(selected.title).toBe("Duelo 1: Rate Limiter")
    expect(selected.completed).toBe(false)
    expect(selected.locked).toBe(false)
  })

  it("cycles between stations without changing completion state", () => {
    const { pack } = loadPack()
    const world = enterSkillOrbit(createWorld(pack, firstCurriculumRegionId()))

    const nextWorld = selectSkillOrbit(world, "next")
    const previousWorld = selectSkillOrbit(nextWorld, "previous")

    expect(selectedSkillOrbitStation(nextWorld)).toMatchObject({
      project: "02_key_value_store",
      locked: true,
      completed: false,
    })
    expect(selectedSkillOrbitStation(previousWorld).project).toBe("01_rate_limiter")
  })

  it("does not jump into a locked lab until prerequisite evidence exists", () => {
    const { pack } = loadPack()
    const lockedWorld = selectSkillOrbit(
      enterSkillOrbit(createWorld(pack, firstCurriculumRegionId())),
      "next",
    )

    const blockedWorld = enterSelectedSkillOrbitRegion(lockedWorld)
    const unlockedWorld = selectSkillOrbit(
      enterSkillOrbit(
        recordEvidence(createWorld(pack, firstCurriculumRegionId()), makeEvidence(true)),
      ),
      "next",
    )
    const nextWorld = enterSelectedSkillOrbitRegion(unlockedWorld)

    expect(blockedWorld.region.project).toBe("01_rate_limiter")
    expect(blockedWorld.mode).toBe("skill-orbit")
    expect(nextWorld.region.project).toBe("02_key_value_store")
    expect(nextWorld.mode).toBe("world")
  })
})

function loadPack(): ReturnType<typeof import("../content/loadCorePack").loadCorePack> {
  return loadCorePack()
}

function makeEvidence(pass: boolean): PixelQuestEvidenceRecord {
  return makeTokenBucketEvidence(pass)
}
